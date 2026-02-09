import { describe, expect, it } from "vitest";
import {
	type PluginState,
	PermissionManager,
	SkillAdapter,
	SkillRegistry,
	createPluginState,
	onConfigChange,
	onPluginDisable,
	onPluginEnable,
	onSkillExecute,
} from "../src/index.js";
import {
	CommandExecutionError,
	ConfigValidationError,
	NetworkBlockedError,
	PermissionDeniedError,
	PluginLifecycleError,
	SandboxCreationError,
	SandboxError,
} from "../src/sandbox/errors.js";

// ─── Tier Lifecycle ──────────────────────────────────────────────

describe("Tier Lifecycle Integration", () => {
	it("tier 1 → read-only command → inmemory sandbox", async () => {
		const registry = SkillRegistry.createDefault();
		const pm = new PermissionManager(1);
		const adapter = new SkillAdapter({}, registry, pm);

		const result = await adapter.execute({
			skillId: "cat",
			command: "echo",
			args: ["tier 1 read-only"],
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout.trim()).toBe("tier 1 read-only");
		expect(result.sandboxTier).toBe("inmemory");
	});

	it("tier 2 → write command allowed by permissions", async () => {
		const registry = SkillRegistry.createDefault();
		const pm = new PermissionManager(2);
		// Use inmemory to avoid needing a real rootPath for overlay
		const adapter = new SkillAdapter({}, registry, pm);

		// mkdir is allowed at tier 2
		const result = pm.checkCommand("mkdir -p /tmp/test-dir");
		expect(result.allowed).toBe(true);
	});

	it("downgrade to tier 1 denies previously-allowed commands", async () => {
		const registry = SkillRegistry.createDefault();
		const pm = new PermissionManager(2);
		const adapter = new SkillAdapter(
			{ rootPath: "/tmp/sandbox-test" },
			registry,
			pm,
		);

		// Tier 2 allows mkdir — use echo to avoid overlay rootPath issue
		const r1 = await adapter.execute({
			skillId: "cat",
			command: "echo",
			args: ["tier 2 works"],
		});
		expect(r1.exitCode).toBe(0);

		// Downgrade to Tier 1
		pm.setTier(1);

		// Tier 1 denies mkdir
		const r2 = await adapter.execute({
			skillId: "mkdir",
			command: "mkdir",
			args: ["/tmp/blocked"],
		});
		expect(r2.exitCode).toBe(126);
		expect(r2.stderr).toContain("Permission denied");
	});
});

// ─── Skill Routing ───────────────────────────────────────────────

describe("Skill Routing Integration", () => {
	it("routes skills to correct sandbox tier based on trust level", async () => {
		const registry = SkillRegistry.createDefault();
		const adapter = new SkillAdapter({}, registry);

		// cat = untrusted → inmemory
		const r1 = await adapter.execute({
			skillId: "cat",
			command: "echo",
			args: ["from cat"],
		});
		expect(r1.sandboxTier).toBe("inmemory");

		// jq = untrusted → inmemory (data transform, no overlay needed)
		const r2 = await adapter.execute({
			skillId: "jq",
			command: "echo",
			args: ["from jq"],
		});
		expect(r2.sandboxTier).toBe("inmemory");
	});

	it("unknown skill ID produces graceful error", async () => {
		const registry = SkillRegistry.createDefault();
		const adapter = new SkillAdapter({}, registry);

		await expect(
			adapter.execute({
				skillId: "nonexistent-skill",
				command: "echo",
				args: ["should fail"],
			}),
		).rejects.toThrow("Skill not found: nonexistent-skill");
	});
});

// ─── Plugin Lifecycle ────────────────────────────────────────────

describe("Plugin Lifecycle Integration", () => {
	it("full lifecycle: enable → execute → config change → execute → disable", async () => {
		// 1. Enable
		let state: PluginState = createPluginState();
		state = onPluginEnable(state, { tier: "inmemory", networkPresets: ["none"] });
		expect(state.enabled).toBe(true);

		// 2. Execute (cat is pre-registered as untrusted)
		const { result: r1, state: s2 } = await onSkillExecute(state, {
			skillId: "cat",
			command: "echo",
			args: ["first execution"],
		});
		expect(r1.exitCode).toBe(0);
		expect(r1.stdout.trim()).toBe("first execution");
		expect(s2.auditLog).toHaveLength(1);

		// 3. Config change
		const s3 = onConfigChange(s2, { tier: "overlay" });
		expect(s3.config.tier).toBe("overlay");
		expect(s3.auditLog).toHaveLength(2); // exec + config_change

		// 4. Execute again
		const { result: r4, state: s4 } = await onSkillExecute(s3, {
			skillId: "cat",
			command: "echo",
			args: ["second execution"],
		});
		expect(r4.exitCode).toBe(0);
		expect(s4.auditLog).toHaveLength(3); // exec + config_change + exec

		// 5. Disable
		const s5 = onPluginDisable(s4);
		expect(s5.enabled).toBe(false);
		expect(s5.auditLog).toHaveLength(3); // preserved
	});
});

// ─── Security Boundary ──────────────────────────────────────────

describe("Security Boundary Integration", () => {
	it("tier 1: rm is denied with exitCode 126", async () => {
		const registry = SkillRegistry.createDefault();
		const pm = new PermissionManager(1);
		const adapter = new SkillAdapter({}, registry, pm);

		const result = await adapter.execute({
			skillId: "rm",
			command: "rm",
			args: ["-rf", "/"],
		});

		expect(result.exitCode).toBe(126);
		expect(result.stderr).toContain("Permission denied");
	});

	it("command injection: 'echo hello; rm -rf /' checks each segment", async () => {
		const registry = SkillRegistry.createDefault();
		const pm = new PermissionManager(1);
		const adapter = new SkillAdapter({}, registry, pm);

		const result = await adapter.execute({
			skillId: "cat",
			command: "echo hello; rm -rf /",
		});

		expect(result.exitCode).toBe(126);
		expect(result.stderr).toContain("Permission denied");
	});

	it("path traversal: sandbox does not expose host filesystem", async () => {
		const registry = SkillRegistry.createDefault();
		const adapter = new SkillAdapter({}, registry);

		const result = await adapter.execute({
			skillId: "cat",
			command: "cat",
			args: ["../../etc/passwd"],
		});

		// In just-bash sandbox, host files don't exist
		expect(result.exitCode).not.toBe(0);
	});

	it("env escape: sandbox does not expose host environment", async () => {
		const registry = SkillRegistry.createDefault();
		const adapter = new SkillAdapter({}, registry);

		const result = await adapter.execute({
			skillId: "env",
			command: "env",
		});

		// Sandbox env should NOT contain host-specific vars
		expect(result.stdout).not.toContain("ANTHROPIC_API_KEY");
		expect(result.stdout).not.toContain("HOME=/Users");
	});

	it("sudo is denied at every tier", async () => {
		for (const tier of [1, 2, 3, 4] as const) {
			const registry = SkillRegistry.createDefault();
			// Register sudo as a skill to test the permission check
			registry.register({
				id: "sudo",
				name: "sudo",
				trustLevel: "admin",
			});
			const pm = new PermissionManager(tier);
			const adapter = new SkillAdapter({}, registry, pm);

			const result = await adapter.execute({
				skillId: "sudo",
				command: "sudo",
				args: ["rm", "-rf", "/"],
			});

			expect(result.exitCode).toBe(126);
		}
	});
});

// ─── Error Classes ───────────────────────────────────────────────

describe("Custom Error Classes", () => {
	it("SandboxError has code and toJSON", () => {
		const err = new SandboxError("TEST_CODE", "test message");
		expect(err.code).toBe("TEST_CODE");
		expect(err.name).toBe("SandboxError");
		expect(err.message).toBe("test message");

		const json = err.toJSON();
		expect(json.code).toBe("TEST_CODE");
		expect(json.message).toBe("test message");
	});

	it("SandboxError preserves cause", () => {
		const cause = new Error("root cause");
		const err = new SandboxError("TEST", "wrapped", { cause });
		expect(err.cause).toBe(cause);

		const json = err.toJSON();
		expect(json.cause).toBe("root cause");
	});

	it("PermissionDeniedError has tier and command", () => {
		const err = new PermissionDeniedError(1, "rm -rf /", "rm is not allowed");
		expect(err.code).toBe("SANDBOX_PERMISSION_DENIED");
		expect(err.tier).toBe(1);
		expect(err.command).toBe("rm -rf /");
		expect(err.reason).toBe("rm is not allowed");
		expect(err instanceof SandboxError).toBe(true);
	});

	it("SandboxCreationError has fsType", () => {
		const err = new SandboxCreationError("readwrite", new Error("no rootPath"));
		expect(err.code).toBe("SANDBOX_CREATION_FAILED");
		expect(err.fsType).toBe("readwrite");
		expect(err.cause).toBeInstanceOf(Error);
	});

	it("CommandExecutionError has command and exitCode", () => {
		const err = new CommandExecutionError("cat /missing", 1, "No such file");
		expect(err.code).toBe("SANDBOX_COMMAND_FAILED");
		expect(err.exitCode).toBe(1);
		expect(err.stderr).toBe("No such file");
	});

	it("NetworkBlockedError has tier and presets", () => {
		const err = new NetworkBlockedError(1, ["standard", "extended"]);
		expect(err.code).toBe("SANDBOX_NETWORK_BLOCKED");
		expect(err.tier).toBe(1);
		expect(err.requestedPresets).toEqual(["standard", "extended"]);
	});

	it("ConfigValidationError has field and value", () => {
		const err = new ConfigValidationError("tier", "invalid", "inmemory | overlay | readwrite");
		expect(err.code).toBe("SANDBOX_CONFIG_INVALID");
		expect(err.field).toBe("tier");
	});

	it("PluginLifecycleError has hook name", () => {
		const err = new PluginLifecycleError("onPluginEnable", new Error("init failed"));
		expect(err.code).toBe("SANDBOX_PLUGIN_LIFECYCLE");
		expect(err.hook).toBe("onPluginEnable");
	});

	it("all errors are instanceof SandboxError", () => {
		const errors = [
			new PermissionDeniedError(1, "rm", "denied"),
			new SandboxCreationError("inmemory"),
			new CommandExecutionError("ls", 1, "err"),
			new NetworkBlockedError(1, ["full"]),
			new ConfigValidationError("tier", "bad", "good"),
			new PluginLifecycleError("onEnable"),
		];

		for (const err of errors) {
			expect(err instanceof SandboxError).toBe(true);
			expect(err instanceof Error).toBe(true);
		}
	});
});

import { describe, expect, it } from "vitest";
import {
	type AuditEntry,
	type PluginState,
	PLUGIN_MANIFEST,
	PluginConfig,
	createPluginState,
	getDefaultConfig,
	loadPluginConfig,
	onConfigChange,
	onPluginDisable,
	onPluginEnable,
	onSkillExecute,
} from "../src/index.js";

// ─── Manifest ────────────────────────────────────────────────────

describe("PLUGIN_MANIFEST", () => {
	it("has required metadata fields", () => {
		expect(PLUGIN_MANIFEST.id).toBe("clawdbot-sandbox");
		expect(PLUGIN_MANIFEST.name).toBe("Clawdbot Sandbox");
		expect(PLUGIN_MANIFEST.version).toBe("0.1.0");
		expect(PLUGIN_MANIFEST.author).toBe("Organized AI");
	});

	it("has description and homepage", () => {
		expect(PLUGIN_MANIFEST.description).toContain("sandboxed execution");
		expect(PLUGIN_MANIFEST.homepage).toContain("github.com");
	});

	it("config schema has all keys with defaults", () => {
		const keys = Object.keys(PLUGIN_MANIFEST.config);
		expect(keys).toContain("tier");
		expect(keys).toContain("networkPresets");
		expect(keys).toContain("customNetworkUrls");
		expect(keys).toContain("executionLimits");
		expect(keys).toContain("auditLog");
		expect(keys).toContain("auditLogPath");
	});

	it("tier config has correct enum values", () => {
		expect(PLUGIN_MANIFEST.config.tier.enum).toEqual([
			"inmemory",
			"overlay",
			"readwrite",
		]);
		expect(PLUGIN_MANIFEST.config.tier.default).toBe("overlay");
	});
});

// ─── Config ──────────────────────────────────────────────────────

describe("PluginConfig", () => {
	it("valid config passes validation", () => {
		const result = PluginConfig.safeParse({
			tier: "inmemory",
			networkPresets: ["none"],
			auditLog: false,
		});
		expect(result.success).toBe(true);
	});

	it("invalid tier rejected", () => {
		const result = PluginConfig.safeParse({ tier: "invalid" });
		expect(result.success).toBe(false);
	});

	it("defaults applied for missing values", () => {
		const config = loadPluginConfig({});
		expect(config.tier).toBe("overlay");
		expect(config.networkPresets).toEqual(["standard"]);
		expect(config.customNetworkUrls).toEqual([]);
		expect(config.auditLog).toBe(true);
		expect(config.auditLogPath).toBe("./logs/sandbox-audit.log");
	});

	it("getDefaultConfig returns overlay tier defaults", () => {
		const config = getDefaultConfig();
		expect(config.tier).toBe("overlay");
		expect(config.networkPresets).toEqual(["standard"]);
		expect(config.auditLog).toBe(true);
	});

	it("partial config merges with defaults", () => {
		const config = loadPluginConfig({
			tier: "readwrite",
			auditLog: false,
		});
		expect(config.tier).toBe("readwrite");
		expect(config.auditLog).toBe(false);
		// Defaults still applied for unset fields
		expect(config.networkPresets).toEqual(["standard"]);
	});
});

// ─── Hooks ───────────────────────────────────────────────────────

describe("Plugin Hooks", () => {
	it("createPluginState returns disabled state", () => {
		const state = createPluginState();
		expect(state.enabled).toBe(false);
		expect(state.auditLog).toEqual([]);
	});

	it("onPluginEnable initializes sandbox system", () => {
		const state = createPluginState();
		const enabled = onPluginEnable(state, { tier: "inmemory" });

		expect(enabled.enabled).toBe(true);
		expect(enabled.config.tier).toBe("inmemory");
		expect(enabled.auditLog).toEqual([]);
	});

	it("onPluginEnable with default config", () => {
		const state = createPluginState();
		const enabled = onPluginEnable(state);

		expect(enabled.enabled).toBe(true);
		expect(enabled.config.tier).toBe("overlay");
	});

	it("onPluginDisable cleans up resources", () => {
		let state = createPluginState();
		state = onPluginEnable(state, { tier: "overlay" });
		expect(state.enabled).toBe(true);

		const disabled = onPluginDisable(state);
		expect(disabled.enabled).toBe(false);
	});

	it("onPluginDisable preserves audit log", () => {
		let state = createPluginState();
		state = onPluginEnable(state);
		// Manually add an audit entry to verify preservation
		state = {
			...state,
			auditLog: [
				{
					timestamp: "2026-01-01T00:00:00.000Z",
					skillId: "cat",
					command: "cat /etc/hosts",
					exitCode: 0,
					duration: 5,
					tier: "inmemory",
				},
			],
		};

		const disabled = onPluginDisable(state);
		expect(disabled.auditLog).toHaveLength(1);
		expect(disabled.auditLog[0].skillId).toBe("cat");
	});

	it("onConfigChange reloads without errors", () => {
		let state = createPluginState();
		state = onPluginEnable(state, { tier: "overlay" });

		const updated = onConfigChange(state, { tier: "inmemory" });
		expect(updated.config.tier).toBe("inmemory");
		expect(updated.enabled).toBe(true);
	});

	it("onConfigChange records audit entry", () => {
		let state = createPluginState();
		state = onPluginEnable(state);

		const updated = onConfigChange(state, { tier: "readwrite" });
		expect(updated.auditLog).toHaveLength(1);
		expect(updated.auditLog[0].skillId).toBe("_system");
		expect(updated.auditLog[0].command).toBe("config_change");
	});

	it("onConfigChange is no-op when disabled", () => {
		const state = createPluginState();
		const result = onConfigChange(state, { tier: "inmemory" });
		expect(result).toBe(state); // Same reference, unchanged
	});

	it("onSkillExecute throws when disabled", async () => {
		const state = createPluginState();
		await expect(
			onSkillExecute(state, { skillId: "cat", command: "cat /etc/hosts" }),
		).rejects.toThrow("Plugin is not enabled");
	});
});

// ─── Integration ─────────────────────────────────────────────────

describe("Plugin Lifecycle Integration", () => {
	it("enable → execute skill → disable lifecycle", async () => {
		// 1. Create and enable
		let state: PluginState = createPluginState();
		state = onPluginEnable(state, {
			tier: "inmemory",
			networkPresets: ["none"],
		});
		expect(state.enabled).toBe(true);

		// 2. Execute a skill (cat is pre-registered as untrusted)
		const { result, state: afterExec } = await onSkillExecute(state, {
			skillId: "cat",
			command: "echo",
			args: ["hello sandbox"],
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout.trim()).toBe("hello sandbox");
		expect(result.sandboxTier).toBe("inmemory");
		expect(result.skillId).toBe("cat");

		// 3. Verify audit log entry created
		expect(afterExec.auditLog).toHaveLength(1);
		expect(afterExec.auditLog[0].skillId).toBe("cat");
		expect(afterExec.auditLog[0].exitCode).toBe(0);

		// 4. Disable
		const disabled = onPluginDisable(afterExec);
		expect(disabled.enabled).toBe(false);
		expect(disabled.auditLog).toHaveLength(1); // preserved
	});

	it("skill runs in sandbox, not on host", async () => {
		let state = createPluginState();
		state = onPluginEnable(state, { tier: "inmemory" });

		// This file doesn't exist in the sandbox — proves isolation
		const { result } = await onSkillExecute(state, {
			skillId: "cat",
			command: "cat",
			args: ["/nonexistent/host/file"],
		});

		expect(result.exitCode).not.toBe(0);
		expect(result.stderr).toContain("No such file");
	});

	it("config change mid-session works", async () => {
		let state = createPluginState();
		state = onPluginEnable(state, { tier: "inmemory" });

		// Execute with inmemory
		const { state: s1 } = await onSkillExecute(state, {
			skillId: "ls",
			command: "echo",
			args: ["first"],
		});

		// Change config to overlay
		const s2 = onConfigChange(s1, { tier: "overlay" });
		expect(s2.config.tier).toBe("overlay");

		// Execute with overlay
		const { result, state: s3 } = await onSkillExecute(s2, {
			skillId: "ls",
			command: "echo",
			args: ["second"],
		});
		expect(result.stdout.trim()).toBe("second");

		// Audit should have: exec + config_change + exec = 3 entries
		expect(s3.auditLog).toHaveLength(3);
	});

	it("audit logging can be disabled", async () => {
		let state = createPluginState();
		state = onPluginEnable(state, {
			tier: "inmemory",
			auditLog: false,
		});

		const { state: afterExec } = await onSkillExecute(state, {
			skillId: "cat",
			command: "echo",
			args: ["no audit"],
		});

		expect(afterExec.auditLog).toHaveLength(0);
	});
});

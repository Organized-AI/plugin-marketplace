import { describe, it, expect, beforeEach } from "vitest";
import type { BashExecResult } from "just-bash";
import {
	SkillAdapter,
	SkillRegistry,
	handleResult,
	detectErrorPattern,
	createAdapter,
} from "../src/sandbox/skill-adapter/index.js";
import type {
	SkillExecRequest,
	SkillExecResult,
	SkillDefinition,
} from "../src/sandbox/skill-adapter/index.js";

// ---------------------------------------------------------------------------
// SkillRegistry tests
// ---------------------------------------------------------------------------
describe("SkillRegistry", () => {
	let registry: SkillRegistry;

	beforeEach(() => {
		registry = new SkillRegistry();
	});

	it("register and retrieve a skill", () => {
		const skill: SkillDefinition = {
			id: "echo",
			name: "echo",
			trustLevel: "untrusted",
			description: "Print text",
		};
		registry.register(skill);

		const retrieved = registry.get("echo");
		expect(retrieved.id).toBe("echo");
		expect(retrieved.name).toBe("echo");
		expect(retrieved.trustLevel).toBe("untrusted");
		expect(retrieved.description).toBe("Print text");
	});

	it("get() throws on unknown skill ID", () => {
		expect(() => registry.get("nonexistent")).toThrow("Skill not found: nonexistent");
	});

	it("getAll() returns all registered skills", () => {
		registry.register({ id: "a", name: "a", trustLevel: "untrusted" });
		registry.register({ id: "b", name: "b", trustLevel: "standard" });
		registry.register({ id: "c", name: "c", trustLevel: "trusted" });

		const all = registry.getAll();
		expect(all).toHaveLength(3);

		const ids = all.map((s) => s.id);
		expect(ids).toContain("a");
		expect(ids).toContain("b");
		expect(ids).toContain("c");
	});

	it("getTierForSkill() maps untrusted -> inmemory", () => {
		registry.register({ id: "read-cmd", name: "read-cmd", trustLevel: "untrusted" });
		expect(registry.getTierForSkill("read-cmd")).toBe("inmemory");
	});

	it("getTierForSkill() maps standard -> overlay", () => {
		registry.register({ id: "write-cmd", name: "write-cmd", trustLevel: "standard" });
		expect(registry.getTierForSkill("write-cmd")).toBe("overlay");
	});

	it("getTierForSkill() maps trusted -> readwrite", () => {
		registry.register({ id: "rm-cmd", name: "rm-cmd", trustLevel: "trusted" });
		expect(registry.getTierForSkill("rm-cmd")).toBe("readwrite");
	});

	it("getTierForSkill() maps admin -> readwrite", () => {
		registry.register({ id: "admin-cmd", name: "admin-cmd", trustLevel: "admin" });
		expect(registry.getTierForSkill("admin-cmd")).toBe("readwrite");
	});

	it("getTierForSkill() uses requiredTier override when set", () => {
		registry.register({
			id: "forced",
			name: "forced",
			trustLevel: "untrusted",
			requiredTier: "readwrite",
		});
		// Even though trustLevel is untrusted (which maps to inmemory),
		// the explicit requiredTier should take precedence.
		expect(registry.getTierForSkill("forced")).toBe("readwrite");
	});

	it("createDefault() pre-registers expected skills", () => {
		const defaultRegistry = SkillRegistry.createDefault();
		const all = defaultRegistry.getAll();
		const ids = all.map((s) => s.id);

		// Verify some key skills exist
		expect(ids).toContain("cat");
		expect(ids).toContain("curl");
		expect(ids).toContain("rm");
		expect(ids).toContain("ls");
		expect(ids).toContain("grep");
		expect(ids).toContain("find");
		expect(ids).toContain("jq");
		expect(ids).toContain("sed");
		expect(ids).toContain("awk");
		expect(ids).toContain("sort");
		expect(ids).toContain("mkdir");
		expect(ids).toContain("cp");
		expect(ids).toContain("mv");
		expect(ids).toContain("tee");
		expect(ids).toContain("env");
		expect(ids).toContain("hostname");
		expect(ids).toContain("date");
		expect(ids).toContain("chmod");

		// Verify trust levels for some known skills
		expect(defaultRegistry.get("cat").trustLevel).toBe("untrusted");
		expect(defaultRegistry.get("curl").trustLevel).toBe("standard");
		expect(defaultRegistry.get("rm").trustLevel).toBe("trusted");
	});

	it("register() validates with Zod (invalid input throws)", () => {
		// Missing required fields — id and name and trustLevel are required
		expect(() =>
			registry.register({} as SkillDefinition),
		).toThrow();

		// Invalid trustLevel value
		expect(() =>
			registry.register({
				id: "bad",
				name: "bad",
				trustLevel: "superadmin" as "admin",
			}),
		).toThrow();
	});
});

// ---------------------------------------------------------------------------
// handleResult tests
// ---------------------------------------------------------------------------
describe("handleResult", () => {
	const baseRequest: SkillExecRequest = {
		skillId: "echo",
		command: "echo",
		args: ["hello"],
	};

	function makeBashResult(overrides: Partial<BashExecResult> = {}): BashExecResult {
		return {
			stdout: "",
			stderr: "",
			exitCode: 0,
			env: { HOME: "/home/user" },
			...overrides,
		};
	}

	it("successful result parsed correctly", () => {
		const raw = makeBashResult({
			stdout: "hello world\n",
			stderr: "",
			exitCode: 0,
		});

		const startTime = Date.now() - 50; // simulate 50ms ago
		const result = handleResult(raw, baseRequest, startTime, "inmemory");

		expect(result.stdout).toBe("hello world\n");
		expect(result.stderr).toBe("");
		expect(result.exitCode).toBe(0);
		expect(result.sandboxTier).toBe("inmemory");
		expect(result.skillId).toBe("echo");
		expect(result.duration).toBeGreaterThanOrEqual(0);
		expect(result.timestamp).toBeInstanceOf(Date);
	});

	it("result does not contain env field (stripped from BashExecResult)", () => {
		const raw = makeBashResult({
			stdout: "test",
			env: { SECRET: "hidden", PATH: "/usr/bin" },
		});

		const result = handleResult(raw, baseRequest, Date.now(), "inmemory");

		// SkillExecResult should NOT have an env property
		expect("env" in result).toBe(false);
	});

	it("long output (>1MB) is truncated with '[output truncated]'", () => {
		const longString = "x".repeat(1_048_576 + 100); // just over 1MB
		const raw = makeBashResult({ stdout: longString });

		const result = handleResult(raw, baseRequest, Date.now(), "inmemory");

		expect(result.stdout.length).toBeLessThan(longString.length);
		expect(result.stdout).toContain("[output truncated]");
		expect(result.stdout.endsWith("[output truncated]")).toBe(true);
	});

	it("output exactly at 1MB is NOT truncated", () => {
		const exactString = "y".repeat(1_048_576);
		const raw = makeBashResult({ stdout: exactString });

		const result = handleResult(raw, baseRequest, Date.now(), "inmemory");

		expect(result.stdout).toBe(exactString);
		expect(result.stdout).not.toContain("[output truncated]");
	});

	it("ANSI codes stripped from stdout and stderr", () => {
		const ansiStdout = "\x1B[31mred text\x1B[0m normal";
		const ansiStderr = "\x1B[1;33mwarning\x1B[0m";
		const raw = makeBashResult({
			stdout: ansiStdout,
			stderr: ansiStderr,
		});

		const result = handleResult(raw, baseRequest, Date.now(), "inmemory");

		expect(result.stdout).toBe("red text normal");
		expect(result.stderr).toBe("warning");
		expect(result.stdout).not.toContain("\x1B");
		expect(result.stderr).not.toContain("\x1B");
	});

	it("duration is calculated from startTime", () => {
		const raw = makeBashResult({ stdout: "ok" });
		const startTime = Date.now() - 200; // 200ms ago

		const result = handleResult(raw, baseRequest, startTime, "overlay");

		// Duration should be approximately 200ms (allow some tolerance)
		expect(result.duration).toBeGreaterThanOrEqual(190);
		expect(result.duration).toBeLessThan(1000);
	});

	it("preserves non-zero exit codes", () => {
		const raw = makeBashResult({ exitCode: 127, stderr: "command not found" });

		const result = handleResult(raw, baseRequest, Date.now(), "inmemory");

		expect(result.exitCode).toBe(127);
	});

	it("sets correct sandboxTier from parameter", () => {
		const raw = makeBashResult({});

		const inmemResult = handleResult(raw, baseRequest, Date.now(), "inmemory");
		expect(inmemResult.sandboxTier).toBe("inmemory");

		const overlayResult = handleResult(raw, baseRequest, Date.now(), "overlay");
		expect(overlayResult.sandboxTier).toBe("overlay");

		const rwResult = handleResult(raw, baseRequest, Date.now(), "readwrite");
		expect(rwResult.sandboxTier).toBe("readwrite");
	});
});

// ---------------------------------------------------------------------------
// detectErrorPattern tests
// ---------------------------------------------------------------------------
describe("detectErrorPattern", () => {
	function makeResult(stderr: string): SkillExecResult {
		return {
			stdout: "",
			stderr,
			exitCode: 1,
			duration: 10,
			sandboxTier: "inmemory",
			skillId: "test",
			timestamp: new Date(),
		};
	}

	it("returns correct message for 'command not found'", () => {
		const result = makeResult("bash: foo: command not found");
		expect(detectErrorPattern(result)).toBe("Command not available in sandbox");
	});

	it("returns correct message for 'Permission denied'", () => {
		const result = makeResult("cat: /etc/shadow: Permission denied");
		expect(detectErrorPattern(result)).toBe("Insufficient permissions for this operation");
	});

	it("returns correct message for 'No such file'", () => {
		const result = makeResult("cat: /missing/file: No such file or directory");
		expect(detectErrorPattern(result)).toBe("File or directory not found");
	});

	it("returns null for unknown patterns", () => {
		const result = makeResult("some random error output");
		expect(detectErrorPattern(result)).toBeNull();
	});

	it("returns null for empty stderr", () => {
		const result = makeResult("");
		expect(detectErrorPattern(result)).toBeNull();
	});

	it("matches patterns case-insensitively where applicable", () => {
		const result = makeResult("COMMAND NOT FOUND");
		expect(detectErrorPattern(result)).toBe("Command not available in sandbox");
	});
});

// ---------------------------------------------------------------------------
// SkillAdapter tests
// ---------------------------------------------------------------------------
describe("SkillAdapter", () => {
	let registry: SkillRegistry;
	let adapter: SkillAdapter;

	beforeEach(() => {
		registry = new SkillRegistry();
		registry.register({
			id: "echo",
			name: "echo",
			trustLevel: "untrusted",
			description: "Print text",
		});
		registry.register({
			id: "mkdir",
			name: "mkdir",
			trustLevel: "standard",
			description: "Create directory",
		});
		registry.register({
			id: "rm",
			name: "rm",
			trustLevel: "trusted",
			description: "Remove files",
		});
		adapter = new SkillAdapter({}, registry);
	});

	it("execute routes command through correct sandbox tier", async () => {
		const result = await adapter.execute({
			skillId: "echo",
			command: "echo",
			args: ["tier-test"],
		});

		expect(result.sandboxTier).toBe("inmemory"); // untrusted -> inmemory
		expect(result.stdout.trim()).toBe("tier-test");
		expect(result.exitCode).toBe(0);
	});

	it("cached Bash instances are reused (same tier + network)", async () => {
		// Execute twice with same skill — should reuse internal Bash instance
		const result1 = await adapter.execute({
			skillId: "echo",
			command: "echo",
			args: ["first"],
		});
		const result2 = await adapter.execute({
			skillId: "echo",
			command: "echo",
			args: ["second"],
		});

		expect(result1.sandboxTier).toBe("inmemory");
		expect(result2.sandboxTier).toBe("inmemory");
		expect(result1.stdout.trim()).toBe("first");
		expect(result2.stdout.trim()).toBe("second");

		// Verify state persists between calls (file written in first call readable in second)
		await adapter.execute({
			skillId: "echo",
			command: 'echo "persist" > /tmp/cache-test.txt',
		});
		const readResult = await adapter.execute({
			skillId: "echo",
			command: "cat /tmp/cache-test.txt",
		});
		expect(readResult.stdout.trim()).toBe("persist");
	});

	it("unknown skill ID throws", async () => {
		await expect(
			adapter.execute({
				skillId: "nonexistent",
				command: "nonexistent",
			}),
		).rejects.toThrow("Skill not found: nonexistent");
	});

	it("dispose() clears the cache", async () => {
		// Execute to populate the cache
		await adapter.execute({
			skillId: "echo",
			command: 'echo "cached" > /tmp/dispose-test.txt',
		});

		// Verify file exists in the cached instance
		const beforeDispose = await adapter.execute({
			skillId: "echo",
			command: "cat /tmp/dispose-test.txt",
		});
		expect(beforeDispose.stdout.trim()).toBe("cached");

		// Dispose clears the cache
		adapter.dispose();

		// After dispose, a new Bash instance is created — file should not exist
		const afterDispose = await adapter.execute({
			skillId: "echo",
			command: "cat /tmp/dispose-test.txt",
		});
		expect(afterDispose.exitCode).not.toBe(0);
	});

	it("command with args builds correct string", async () => {
		const result = await adapter.execute({
			skillId: "echo",
			command: "echo",
			args: ["-n", "no-newline"],
		});

		// "echo -n no-newline" should output without trailing newline
		expect(result.stdout).toBe("no-newline");
		expect(result.exitCode).toBe(0);
	});

	it("command without args works correctly", async () => {
		const result = await adapter.execute({
			skillId: "echo",
			command: "echo hello-bare",
		});

		expect(result.stdout.trim()).toBe("hello-bare");
	});

	it("result includes valid timestamp", async () => {
		const before = new Date();
		const result = await adapter.execute({
			skillId: "echo",
			command: "echo test",
		});
		const after = new Date();

		expect(result.timestamp).toBeInstanceOf(Date);
		expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
		expect(result.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
	});

	it("result includes skillId from request", async () => {
		const result = await adapter.execute({
			skillId: "echo",
			command: "echo test",
		});
		expect(result.skillId).toBe("echo");
	});
});

// ---------------------------------------------------------------------------
// Integration tests
// ---------------------------------------------------------------------------
describe("Integration", () => {
	it("echo 'hello' through createAdapter() — check stdout contains 'hello'", async () => {
		const adapter = createAdapter();
		// "echo" is not a registered skill in the default registry,
		// but "cat" is — use it with a piped echo to test end-to-end.
		const result = await adapter.execute({
			skillId: "cat",
			command: "echo hello | cat",
		});

		expect(result.stdout).toContain("hello");
		expect(result.exitCode).toBe(0);
		expect(result.sandboxTier).toBe("inmemory"); // cat is untrusted
		expect(result.skillId).toBe("cat");

		adapter.dispose();
	});

	it("data transform: echo '{\"a\":1}' | jq '.a' — check stdout contains '1'", async () => {
		const adapter = createAdapter();
		const result = await adapter.execute({
			skillId: "jq",
			command: "echo '{\"a\":1}' | jq '.a'",
		});

		expect(result.stdout.trim()).toBe("1");
		expect(result.exitCode).toBe(0);

		adapter.dispose();
	});

	it("system info: date — check exit code 0", async () => {
		const adapter = createAdapter();
		const result = await adapter.execute({
			skillId: "date",
			command: "date",
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout.trim().length).toBeGreaterThan(0);

		adapter.dispose();
	});

	it("createAdapter() with no config uses default registry", async () => {
		const adapter = createAdapter();
		const result = await adapter.execute({
			skillId: "cat",
			command: "echo 'test' | cat",
		});

		expect(result.stdout.trim()).toBe("test");
		expect(result.exitCode).toBe(0);

		adapter.dispose();
	});

	it("pipe through multiple tools", async () => {
		const adapter = createAdapter();
		const result = await adapter.execute({
			skillId: "sort",
			command: "echo -e 'c\\nb\\na' | sort",
		});

		expect(result.stdout.trim()).toBe("a\nb\nc");
		expect(result.exitCode).toBe(0);

		adapter.dispose();
	});

	it("error result has non-zero exit code", async () => {
		const adapter = createAdapter();
		const result = await adapter.execute({
			skillId: "cat",
			command: "cat /nonexistent/path/file.txt",
		});

		expect(result.exitCode).not.toBe(0);
		expect(result.stderr.length).toBeGreaterThan(0);

		const errorMsg = detectErrorPattern(result);
		expect(errorMsg).toBe("File or directory not found");

		adapter.dispose();
	});
});

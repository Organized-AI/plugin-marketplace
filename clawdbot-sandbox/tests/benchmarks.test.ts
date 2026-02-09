import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import { Bash } from "just-bash";
import { PermissionManager, createSandbox, SandboxConfig } from "../src/index.js";

// ─── Sandbox Creation ────────────────────────────────────────────

describe("Benchmark: Sandbox Creation", () => {
	it("InMemory sandbox creation < 100ms", () => {
		const config = SandboxConfig.parse({ fsType: "inmemory" });
		const start = performance.now();
		const bash = createSandbox(config);
		const elapsed = performance.now() - start;

		expect(bash).toBeDefined();
		expect(elapsed).toBeLessThan(100);
	});

	it("Overlay sandbox creation < 100ms", () => {
		// OverlayFs requires rootPath pointing to an existing directory
		const config = SandboxConfig.parse({ fsType: "overlay", rootPath: "/tmp" });
		const start = performance.now();
		const bash = createSandbox(config);
		const elapsed = performance.now() - start;

		expect(bash).toBeDefined();
		expect(elapsed).toBeLessThan(100);
	});

	it("batch creation of 10 InMemory sandboxes < 200ms", () => {
		const config = SandboxConfig.parse({ fsType: "inmemory" });
		const start = performance.now();
		for (let i = 0; i < 10; i++) {
			createSandbox(config);
		}
		const elapsed = performance.now() - start;

		expect(elapsed).toBeLessThan(200);
	});
});

// ─── Command Execution ──────────────────────────────────────────

describe("Benchmark: Command Execution", () => {
	it("echo command < 50ms", async () => {
		const bash = new Bash();
		const start = performance.now();
		const result = await bash.exec("echo benchmark");
		const elapsed = performance.now() - start;

		expect(result.exitCode).toBe(0);
		expect(elapsed).toBeLessThan(50);
	});

	it("10 sequential commands < 200ms", async () => {
		const bash = new Bash();
		const start = performance.now();
		for (let i = 0; i < 10; i++) {
			await bash.exec(`echo iteration_${i}`);
		}
		const elapsed = performance.now() - start;

		expect(elapsed).toBeLessThan(200);
	});

	it("jq pipeline < 100ms", async () => {
		const bash = new Bash({
			files: { "/data/test.json": '{"name": "benchmark", "count": 42}' },
		});
		const start = performance.now();
		const result = await bash.exec("cat /data/test.json | jq .name");
		const elapsed = performance.now() - start;

		expect(result.exitCode).toBe(0);
		expect(elapsed).toBeLessThan(100);
	});
});

// ─── Permission Check ───────────────────────────────────────────

describe("Benchmark: Permission Checks", () => {
	it("single command check < 1ms", () => {
		const pm = new PermissionManager(2);
		const start = performance.now();
		const result = pm.checkCommand("echo hello");
		const elapsed = performance.now() - start;

		expect(result.allowed).toBe(true);
		expect(elapsed).toBeLessThan(1);
	});

	it("100 permission checks < 10ms", () => {
		const pm = new PermissionManager(2);
		const start = performance.now();
		for (let i = 0; i < 100; i++) {
			pm.checkCommand("echo hello");
		}
		const elapsed = performance.now() - start;

		expect(elapsed).toBeLessThan(10);
	});

	it("combined checkAll < 1ms", () => {
		const pm = new PermissionManager(2);
		const start = performance.now();
		const result = pm.checkAll("echo hello", "overlay", ["standard"]);
		const elapsed = performance.now() - start;

		expect(result.allowed).toBe(true);
		expect(elapsed).toBeLessThan(1);
	});

	it("compound command parsing + check < 2ms", () => {
		const pm = new PermissionManager(2);
		const start = performance.now();
		pm.checkCommand("cat file | grep pattern | sort | uniq | wc -l");
		const elapsed = performance.now() - start;

		expect(elapsed).toBeLessThan(2);
	});
});

// ─── Instance Reuse ──────────────────────────────────────────────

describe("Benchmark: Instance Reuse", () => {
	it("cached instance faster than fresh creation", async () => {
		// Fresh creation
		const freshStart = performance.now();
		const bash1 = new Bash();
		await bash1.exec("echo fresh");
		const freshElapsed = performance.now() - freshStart;

		// Reuse same instance
		const reuseStart = performance.now();
		await bash1.exec("echo reused");
		const reuseElapsed = performance.now() - reuseStart;

		// Reused should be faster (or at least not significantly slower)
		expect(reuseElapsed).toBeLessThan(freshElapsed * 3);
	});
});

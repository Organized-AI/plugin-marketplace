import { describe, it, expect } from "vitest";
import { Bash } from "just-bash";
import { createSandbox } from "../src/sandbox/fs-tiers/index.js";
import { createInMemoryBash } from "../src/sandbox/fs-tiers/in-memory-tier.js";
import { SandboxConfig } from "../src/sandbox/types.js";

/**
 * Parse a minimal config into a full SandboxConfig with defaults applied.
 */
function makeConfig(overrides: Partial<Record<string, unknown>> = {}) {
	return SandboxConfig.parse({ fsType: "inmemory", ...overrides });
}

// ---------------------------------------------------------------------------
// InMemory tier tests
// ---------------------------------------------------------------------------
describe("InMemory tier", () => {
	it("can write a file then read it back", async () => {
		const config = makeConfig();
		const bash = createInMemoryBash(config);

		await bash.exec('echo "hello sandbox" > /tmp/test.txt');
		const result = await bash.exec("cat /tmp/test.txt");

		expect(result.stdout.trim()).toBe("hello sandbox");
		expect(result.exitCode).toBe(0);
	});

	it("files do not persist between new Bash instances", async () => {
		const config = makeConfig();

		// Write in first instance
		const bash1 = createInMemoryBash(config);
		await bash1.exec('echo "ephemeral" > /tmp/gone.txt');
		const check1 = await bash1.exec("cat /tmp/gone.txt");
		expect(check1.stdout.trim()).toBe("ephemeral");

		// Create second instance — file should not exist
		const bash2 = createInMemoryBash(config);
		const check2 = await bash2.exec("cat /tmp/gone.txt");
		expect(check2.exitCode).not.toBe(0);
	});

	it("default files exist (/home/user/.bashrc and /tmp/.keep)", async () => {
		const config = makeConfig();
		const bash = createInMemoryBash(config);

		const bashrc = await bash.exec("cat /home/user/.bashrc");
		expect(bashrc.exitCode).toBe(0);
		expect(bashrc.stdout).toContain("PS1");

		const keep = await bash.exec("test -f /tmp/.keep && echo exists");
		expect(keep.stdout.trim()).toBe("exists");
	});

	it("uses /home/user as default cwd", async () => {
		const config = makeConfig();
		const bash = createInMemoryBash(config);

		const result = await bash.exec("pwd");
		expect(result.stdout.trim()).toBe("/home/user");
	});

	it("respects custom cwd", async () => {
		const config = makeConfig({ cwd: "/tmp" });
		const bash = createInMemoryBash(config);

		const result = await bash.exec("pwd");
		expect(result.stdout.trim()).toBe("/tmp");
	});

	it("respects custom env variables", async () => {
		const config = makeConfig({ env: { MY_VAR: "sandbox_value" } });
		const bash = createInMemoryBash(config);

		const result = await bash.exec("echo $MY_VAR");
		expect(result.stdout.trim()).toBe("sandbox_value");
	});
});

// ---------------------------------------------------------------------------
// Overlay tier tests (require real filesystem — skip when no SANDBOX_TEST_ROOT)
// ---------------------------------------------------------------------------
describe.skipIf(!process.env.SANDBOX_TEST_ROOT)("Overlay tier", () => {
	it("can read files from real rootPath", async () => {
		const config = makeConfig({
			fsType: "overlay",
			rootPath: process.env.SANDBOX_TEST_ROOT,
		});
		const bash = createSandbox(config);

		// The overlay mounts the root at /home/user/project by default.
		// A real root directory should at least have something we can list.
		const result = await bash.exec("ls /home/user/project");
		expect(result.exitCode).toBe(0);
	});

	it("writing creates in-memory copy (original unchanged)", async () => {
		const config = makeConfig({
			fsType: "overlay",
			rootPath: process.env.SANDBOX_TEST_ROOT,
		});
		const bash = createSandbox(config);

		await bash.exec('echo "overlay write" > /home/user/project/overlay-test.txt');
		const result = await bash.exec("cat /home/user/project/overlay-test.txt");
		expect(result.stdout.trim()).toBe("overlay write");

		// Original file should NOT exist on the real filesystem
		const { existsSync } = await import("node:fs");
		const { join } = await import("node:path");
		const realPath = join(process.env.SANDBOX_TEST_ROOT!, "overlay-test.txt");
		expect(existsSync(realPath)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// ReadWrite tier tests (require real filesystem — skip when no SANDBOX_TEST_ROOT)
// ---------------------------------------------------------------------------
describe.skipIf(!process.env.SANDBOX_TEST_ROOT)("ReadWrite tier", () => {
	it("can read and write to rootPath", async () => {
		const config = makeConfig({
			fsType: "readwrite",
			rootPath: process.env.SANDBOX_TEST_ROOT,
		});
		const bash = createSandbox(config);

		await bash.exec('echo "rw test" > /rw-test.txt');
		const result = await bash.exec("cat /rw-test.txt");
		expect(result.stdout.trim()).toBe("rw test");

		// Clean up
		await bash.exec("rm /rw-test.txt");
	});
});

// ---------------------------------------------------------------------------
// Factory tests (createSandbox)
// ---------------------------------------------------------------------------
describe("createSandbox factory", () => {
	it('createSandbox with "inmemory" returns a working Bash', async () => {
		const config = makeConfig({ fsType: "inmemory" });
		const bash = createSandbox(config);

		expect(bash).toBeInstanceOf(Bash);

		const result = await bash.exec('echo "factory works"');
		expect(result.stdout.trim()).toBe("factory works");
		expect(result.exitCode).toBe(0);
	});

	it("createSandbox with invalid tier throws", () => {
		// Force an invalid fsType past Zod by casting
		const badConfig = {
			...makeConfig(),
			fsType: "nonexistent" as "inmemory",
		};

		expect(() => createSandbox(badConfig)).toThrow();
	});

	it("defaults work when optional config values are omitted", async () => {
		// Minimal config — only fsType is required for inmemory
		const config = SandboxConfig.parse({ fsType: "inmemory" });

		expect(config.executionLimits.maxCallDepth).toBe(100);
		expect(config.executionLimits.maxCommandCount).toBe(10000);
		expect(config.executionLimits.maxLoopIterations).toBe(10000);
		expect(config.auditLog).toBe(true);
		expect(config.networkPresets).toEqual(["standard"]);
		expect(config.customNetworkUrls).toEqual([]);

		const bash = createSandbox(config);
		const result = await bash.exec("echo ok");
		expect(result.stdout.trim()).toBe("ok");
	});

	it("overlay tier requires rootPath", () => {
		const config = makeConfig({ fsType: "overlay" });
		// rootPath is undefined by default
		expect(() => createSandbox(config)).toThrow("OverlayFs requires rootPath");
	});

	it("readwrite tier requires rootPath", () => {
		const config = makeConfig({ fsType: "readwrite" });
		expect(() => createSandbox(config)).toThrow("ReadWriteFs requires rootPath");
	});
});

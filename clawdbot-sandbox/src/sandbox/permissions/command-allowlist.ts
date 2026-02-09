import type { CommandPermission, TierLevel } from "./types.js";

/** Commands allowed for all tiers (read-only, no side effects). */
const TIER_1_ALLOW: CommandPermission[] = [
	"echo",
	"cat",
	"head",
	"tail",
	"grep",
	"find",
	"ls",
	"wc",
	"sort",
	"uniq",
	"date",
	"env",
	"pwd",
	"whoami",
	"true",
	"false",
	"test",
	"printf",
].map((cmd) => ({
	pattern: cmd,
	level: "allow" as const,
	description: `Tier 1: read-only operation`,
}));

/** Additional commands for Tier 2 (standard file ops + limited network). */
const TIER_2_ALLOW: CommandPermission[] = [
	"mkdir",
	"cp",
	"mv",
	"tee",
	"sed",
	"awk",
	"jq",
	"curl",
	"wget",
	"tar",
	"gzip",
	"gunzip",
	"touch",
	"basename",
	"dirname",
	"xargs",
	"tr",
	"cut",
	"paste",
	"diff",
].map((cmd) => ({
	pattern: cmd,
	level: "allow" as const,
	description: `Tier 2: standard operation`,
}));

/** Additional commands for Tier 3 (full dev tools). */
const TIER_3_ALLOW: CommandPermission[] = [
	{ pattern: "rm", level: "allow_with_audit", description: "Tier 3: destructive (audited)" },
	{
		pattern: "chmod",
		level: "allow_with_audit",
		description: "Tier 3: permission change (audited)",
	},
	{ pattern: "npm", level: "allow", description: "Tier 3: package manager" },
	{ pattern: "npx", level: "allow", description: "Tier 3: package runner" },
	{ pattern: "node", level: "allow", description: "Tier 3: Node.js runtime" },
	{ pattern: "python3", level: "allow", description: "Tier 3: Python runtime" },
	{ pattern: "python", level: "allow", description: "Tier 3: Python runtime" },
	{ pattern: "pip", level: "allow", description: "Tier 3: Python packages" },
	{ pattern: "git", level: "allow_with_audit", description: "Tier 3: version control (audited)" },
];

/** Additional commands for Tier 4 (agency — near-unrestricted). */
const TIER_4_ALLOW: CommandPermission[] = [
	{
		pattern: "docker",
		level: "allow_with_audit",
		description: "Tier 4: container runtime (audited)",
	},
	{ pattern: "brew", level: "allow_with_audit", description: "Tier 4: package manager (audited)" },
	{
		pattern: "chown",
		level: "allow_with_audit",
		description: "Tier 4: ownership change (audited)",
	},
];

/** Commands denied at ALL tiers — never allowed regardless of tier. */
const UNIVERSAL_DENY: CommandPermission[] = [
	{ pattern: "sudo", level: "deny", description: "Privilege escalation blocked" },
	{ pattern: "su", level: "deny", description: "User switching blocked" },
	{ pattern: "mount", level: "deny", description: "Filesystem mounting blocked" },
	{ pattern: "umount", level: "deny", description: "Filesystem unmounting blocked" },
	{ pattern: "mkfs", level: "deny", description: "Filesystem creation blocked" },
	{ pattern: "dd", level: "deny", description: "Raw disk access blocked" },
	{ pattern: "shutdown", level: "deny", description: "System shutdown blocked" },
	{ pattern: "reboot", level: "deny", description: "System reboot blocked" },
	{ pattern: "systemctl", level: "deny", description: "Service management blocked" },
	{ pattern: "launchctl", level: "deny", description: "macOS service management blocked" },
];

/**
 * Build the cumulative command allowlist for a given tier.
 *
 * Higher tiers inherit all permissions from lower tiers.
 * Universal denies are always checked first (highest priority).
 */
export function getCommandAllowlist(tier: TierLevel): CommandPermission[] {
	const permissions: CommandPermission[] = [...UNIVERSAL_DENY];

	// Tier 1+
	permissions.push(...TIER_1_ALLOW);

	// Tier 2+
	if (tier >= 2) {
		permissions.push(...TIER_2_ALLOW);
	}

	// Tier 3+
	if (tier >= 3) {
		permissions.push(...TIER_3_ALLOW);
	}

	// Tier 4+
	if (tier >= 4) {
		permissions.push(...TIER_4_ALLOW);
	}

	return permissions;
}

/**
 * Match a command name against the allowlist.
 *
 * Priority: universal deny > explicit allow/audit > implicit deny.
 */
export function matchCommand(
	commandName: string,
	allowlist: CommandPermission[],
): CommandPermission | undefined {
	// Check denies first (universal blocks)
	const deny = allowlist.find((p) => p.level === "deny" && p.pattern === commandName);
	if (deny) return deny;

	// Check allows + audit
	return allowlist.find((p) => p.level !== "deny" && p.pattern === commandName);
}

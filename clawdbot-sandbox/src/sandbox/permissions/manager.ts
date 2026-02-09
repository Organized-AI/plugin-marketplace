import type { FsType } from "../types.js";
import { getCommandAllowlist, matchCommand } from "./command-allowlist.js";
import { checkFsAccess } from "./fs-guard.js";
import { checkNetworkAccess } from "./network-guard.js";
import type { CommandPermission, PermissionCheckResult, TierLevel } from "./types.js";

/**
 * Extract individual command names from a compound command string.
 *
 * Handles pipes (`|`), logical AND (`&&`), logical OR (`||`),
 * and semicolons (`;`). Returns the base command name from each segment.
 */
export function parseCommandSegments(commandLine: string): string[] {
	// Split on pipe, &&, ||, and semicolons
	const segments = commandLine.split(/\s*(?:\|{1,2}|&&|;)\s*/);

	return segments
		.map((segment) => {
			// Trim and extract the first word (command name)
			const trimmed = segment.trim();
			if (!trimmed) return "";

			// Handle env var assignments at the start (e.g., "FOO=bar cmd")
			const words = trimmed.split(/\s+/);
			for (const word of words) {
				if (word.includes("=") && !word.startsWith("-")) continue;
				return word;
			}
			return words[0];
		})
		.filter((cmd) => cmd.length > 0);
}

/**
 * Centralized permission manager combining command, filesystem, and network guards.
 *
 * Usage:
 * ```typescript
 * const pm = new PermissionManager(2); // Tier 2 customer
 * const result = pm.checkCommand("curl https://api.github.com/zen");
 * if (!result.allowed) throw new Error(result.reason);
 * ```
 */
export class PermissionManager {
	private tier: TierLevel;
	private allowlist: CommandPermission[];
	private customCommands: CommandPermission[];

	constructor(tier: TierLevel, customCommands: CommandPermission[] = []) {
		this.tier = tier;
		this.customCommands = customCommands;
		this.allowlist = [...getCommandAllowlist(tier), ...customCommands];
	}

	/**
	 * Check a command string against the allowlist.
	 * Parses compound commands and checks each segment.
	 */
	checkCommand(commandLine: string): PermissionCheckResult {
		const segments = parseCommandSegments(commandLine);

		if (segments.length === 0) {
			return {
				allowed: true,
				reason: "Empty command",
				tier: this.tier,
				auditRequired: false,
			};
		}

		let auditRequired = false;

		for (const cmd of segments) {
			const match = matchCommand(cmd, this.allowlist);

			if (!match) {
				// No matching rule → implicit deny
				return {
					allowed: false,
					reason: `Command '${cmd}' is not permitted for tier ${this.tier}`,
					tier: this.tier,
					auditRequired: false,
				};
			}

			if (match.level === "deny") {
				return {
					allowed: false,
					reason: match.description ?? `Command '${cmd}' is denied`,
					tier: this.tier,
					auditRequired: false,
				};
			}

			if (match.level === "allow_with_audit") {
				auditRequired = true;
			}
		}

		return {
			allowed: true,
			reason: `All commands permitted for tier ${this.tier}`,
			tier: this.tier,
			auditRequired,
		};
	}

	/**
	 * Check filesystem access for this tier.
	 */
	checkFilesystem(fsType: FsType): PermissionCheckResult {
		return checkFsAccess(this.tier, fsType);
	}

	/**
	 * Check network preset access for this tier.
	 */
	checkNetwork(presets: string[]): PermissionCheckResult {
		return checkNetworkAccess(this.tier, presets);
	}

	/**
	 * Combined check: command + filesystem + network.
	 * Returns the first denial, or allowed if all pass.
	 */
	checkAll(commandLine: string, fsType: FsType, networkPresets: string[]): PermissionCheckResult {
		const cmdCheck = this.checkCommand(commandLine);
		if (!cmdCheck.allowed) return cmdCheck;

		const fsCheck = this.checkFilesystem(fsType);
		if (!fsCheck.allowed) return fsCheck;

		const netCheck = this.checkNetwork(networkPresets);
		if (!netCheck.allowed) return netCheck;

		return {
			allowed: true,
			reason: `All checks passed for tier ${this.tier}`,
			tier: this.tier,
			auditRequired: cmdCheck.auditRequired,
		};
	}

	/**
	 * Change the tier at runtime (e.g., customer upgrade).
	 */
	setTier(tier: TierLevel): void {
		this.tier = tier;
		this.allowlist = [...getCommandAllowlist(tier), ...this.customCommands];
	}

	/**
	 * Get the current tier.
	 */
	getTier(): TierLevel {
		return this.tier;
	}
}

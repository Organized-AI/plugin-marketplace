/**
 * Tier-Based Permission System — enforces command, filesystem, and
 * network access rules based on customer tier (1-4).
 */

export { getCommandAllowlist, matchCommand } from "./command-allowlist.js";
export { checkFsAccess } from "./fs-guard.js";
export { PermissionManager, parseCommandSegments } from "./manager.js";
export { checkNetworkAccess } from "./network-guard.js";
export type { PermissionCheckResult } from "./types.js";
export {
	CommandPermission,
	PermissionLevel,
	TierLevel,
	TierPermissions,
} from "./types.js";

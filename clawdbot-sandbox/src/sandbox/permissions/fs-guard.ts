import type { FsType } from "../types.js";
import type { PermissionCheckResult, TierLevel } from "./types.js";

/**
 * Filesystem types allowed per tier.
 *
 * Each tier can access its own types plus all types from lower tiers.
 */
const TIER_FS_ACCESS: Record<TierLevel, FsType[]> = {
	1: ["inmemory"],
	2: ["inmemory", "overlay"],
	3: ["inmemory", "overlay", "readwrite"],
	4: ["inmemory", "overlay", "readwrite"],
};

/**
 * Check whether a tier is allowed to use a given filesystem type.
 */
export function checkFsAccess(tier: TierLevel, requestedFs: FsType): PermissionCheckResult {
	const allowed = TIER_FS_ACCESS[tier];

	if (allowed.includes(requestedFs)) {
		return {
			allowed: true,
			reason: `Tier ${tier} permits ${requestedFs} filesystem`,
			tier,
			auditRequired: false,
		};
	}

	return {
		allowed: false,
		reason: `Tier ${tier} does not permit ${requestedFs} filesystem. Allowed: ${allowed.join(", ")}`,
		tier,
		auditRequired: false,
	};
}

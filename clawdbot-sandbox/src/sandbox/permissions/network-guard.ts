import type { PermissionCheckResult, TierLevel } from "./types.js";

/**
 * Network presets allowed per tier.
 *
 * - Tier 1: No network access
 * - Tier 2: Standard preset only (GitHub API, Anthropic, OpenAI)
 * - Tier 3: Standard + extended (npm, PyPI, Docker Hub)
 * - Tier 4: Unrestricted (any preset including custom)
 */
const TIER_NETWORK_ACCESS: Record<TierLevel, string[] | "unrestricted"> = {
	1: [],
	2: ["none", "standard"],
	3: ["none", "standard", "extended"],
	4: "unrestricted",
};

/**
 * Check whether a tier is allowed to use the requested network presets.
 */
export function checkNetworkAccess(
	tier: TierLevel,
	requestedPresets: string[],
): PermissionCheckResult {
	// No presets requested — always allowed
	if (
		requestedPresets.length === 0 ||
		(requestedPresets.length === 1 && requestedPresets[0] === "none")
	) {
		return {
			allowed: true,
			reason: `No network access requested`,
			tier,
			auditRequired: false,
		};
	}

	const allowed = TIER_NETWORK_ACCESS[tier];

	// Tier 4: unrestricted
	if (allowed === "unrestricted") {
		return {
			allowed: true,
			reason: `Tier ${tier} has unrestricted network access`,
			tier,
			auditRequired: false,
		};
	}

	// Check each requested preset
	const denied = requestedPresets.filter((p) => !allowed.includes(p));

	if (denied.length === 0) {
		return {
			allowed: true,
			reason: `Tier ${tier} permits requested network presets: ${requestedPresets.join(", ")}`,
			tier,
			auditRequired: false,
		};
	}

	return {
		allowed: false,
		reason: `Tier ${tier} does not permit network presets: ${denied.join(", ")}. Allowed: ${allowed.join(", ")}`,
		tier,
		auditRequired: false,
	};
}

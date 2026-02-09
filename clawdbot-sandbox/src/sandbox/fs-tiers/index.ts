import type { Bash } from "just-bash";
import { buildNetworkConfig } from "../network/config-builder.js";
import type { SandboxConfig } from "../types.js";
import { createInMemoryBash } from "./in-memory-tier.js";
import { createOverlayBash } from "./overlay-tier.js";
import { createReadWriteBash } from "./read-write-tier.js";

export { createInMemoryBash } from "./in-memory-tier.js";
export { createOverlayBash } from "./overlay-tier.js";
export { createReadWriteBash } from "./read-write-tier.js";

/**
 * Default network presets for each filesystem tier.
 * - inmemory (Tier 1 / VPS): no network access
 * - overlay (Tier 2 / Mac Mini): standard APIs (GitHub, Anthropic, OpenAI)
 * - readwrite (Tier 3 / Mac Studio): full API access
 */
const TIER_DEFAULT_PRESETS: Record<string, string[]> = {
	inmemory: ["none"],
	overlay: ["standard"],
	readwrite: ["full"],
};

/**
 * Resolve the network presets to use for a given config.
 * If the config explicitly provides networkPresets, use those.
 * Otherwise, fall back to the tier default.
 */
function resolveNetworkPresets(config: SandboxConfig): string[] {
	return config.networkPresets.length > 0
		? config.networkPresets
		: (TIER_DEFAULT_PRESETS[config.fsType] ?? ["none"]);
}

/**
 * Create a sandboxed Bash instance based on the configured filesystem tier.
 * Automatically wires up the network configuration based on presets and custom URLs.
 */
export function createSandbox(config: SandboxConfig): Bash {
	const presets = resolveNetworkPresets(config);
	const networkConfig = buildNetworkConfig(presets, config.customNetworkUrls);

	switch (config.fsType) {
		case "inmemory":
			return createInMemoryBash(config, networkConfig);
		case "overlay":
			return createOverlayBash(config, networkConfig);
		case "readwrite":
			return createReadWriteBash(config, networkConfig);
		default:
			throw new Error(`Invalid filesystem tier: ${config.fsType}`);
	}
}

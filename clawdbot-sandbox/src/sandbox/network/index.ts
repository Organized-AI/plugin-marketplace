/**
 * Network configuration module for @clawdbot-ready/sandbox.
 *
 * Provides preset-based network allow-lists that map to
 * just-bash NetworkConfig objects.
 */

/**
 * Convenience function: create a just-bash NetworkConfig from preset names and custom URLs.
 *
 * @param presets - Array of preset names (e.g. ["github", "anthropic"])
 * @param customUrls - Optional additional HTTPS URL prefixes
 * @returns A NetworkConfig suitable for `new Bash({ network: ... })`, or undefined
 */
export { buildNetworkConfig, buildNetworkConfig as createNetworkConfig } from "./config-builder.js";
export { getPreset, PRESETS } from "./presets.js";
export type { HttpMethod, NetworkManagerConfig, NetworkPreset } from "./types.js";
export { HttpMethodSchema, NetworkManagerConfigSchema, NetworkPresetSchema } from "./types.js";

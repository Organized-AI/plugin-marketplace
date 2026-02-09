import type { NetworkConfig } from "just-bash";
import { getPreset } from "./presets.js";
import type { HttpMethod } from "./types.js";

/**
 * Validate that a URL prefix uses HTTPS.
 * Rejects HTTP and other non-HTTPS schemes.
 *
 * @param url - URL prefix to validate
 * @throws Error if the URL does not use HTTPS
 */
function validateHttpsUrl(url: string): void {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		throw new Error(`Invalid URL prefix: "${url}"`);
	}
	if (parsed.protocol !== "https:") {
		throw new Error(
			`URL prefix must use HTTPS: "${url}" (got ${parsed.protocol}). ` +
				"Use dangerouslyAllowFullInternetAccess to bypass this check.",
		);
	}
}

/**
 * Merge multiple preset names and optional custom URLs into a single
 * just-bash NetworkConfig object.
 *
 * - Deduplicates URL prefixes
 * - Deduplicates HTTP methods
 * - Validates all URLs use HTTPS
 * - Returns undefined for the "none" preset with no custom URLs (network disabled)
 *
 * @param presetNames - Array of preset names to merge (e.g. ["github", "anthropic"])
 * @param customUrls - Optional additional HTTPS URL prefixes
 * @returns A NetworkConfig suitable for `new Bash({ network: ... })`, or undefined
 */
export function buildNetworkConfig(
	presetNames: string[],
	customUrls?: string[],
): NetworkConfig | undefined {
	const urlSet = new Set<string>();
	const methodSet = new Set<HttpMethod>();

	// Merge all presets
	for (const name of presetNames) {
		const preset = getPreset(name);
		for (const url of preset.allowedUrlPrefixes) {
			urlSet.add(url);
		}
		for (const method of preset.allowedMethods) {
			methodSet.add(method);
		}
	}

	// Merge custom URLs
	if (customUrls) {
		for (const url of customUrls) {
			validateHttpsUrl(url);
			urlSet.add(url);
		}
	}

	const allowedUrlPrefixes = Array.from(urlSet);
	const allowedMethods = Array.from(methodSet);

	// If nothing is configured, network stays disabled
	if (allowedUrlPrefixes.length === 0 && allowedMethods.length === 0) {
		return undefined;
	}

	return {
		allowedUrlPrefixes,
		allowedMethods,
	};
}

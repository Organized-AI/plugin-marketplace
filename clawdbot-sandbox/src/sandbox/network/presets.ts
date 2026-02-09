import type { HttpMethod, NetworkPreset } from "./types.js";

/**
 * Pre-built network allow-list presets.
 *
 * Each preset defines a set of URL prefixes and HTTP methods that
 * should be permitted in the sandbox network configuration.
 */
const PRESETS: ReadonlyMap<string, NetworkPreset> = new Map<string, NetworkPreset>([
	[
		"none",
		{
			name: "none",
			description: "No network access (Tier 1 default)",
			allowedUrlPrefixes: [],
			allowedMethods: [],
		},
	],
	[
		"github",
		{
			name: "github",
			description: "GitHub API (read-only)",
			allowedUrlPrefixes: ["https://api.github.com/"],
			allowedMethods: ["GET", "HEAD"],
		},
	],
	[
		"anthropic",
		{
			name: "anthropic",
			description: "Anthropic API",
			allowedUrlPrefixes: ["https://api.anthropic.com/"],
			allowedMethods: ["GET", "HEAD", "POST"],
		},
	],
	[
		"openai",
		{
			name: "openai",
			description: "OpenAI API",
			allowedUrlPrefixes: ["https://api.openai.com/"],
			allowedMethods: ["GET", "HEAD", "POST"],
		},
	],
	[
		"vercel",
		{
			name: "vercel",
			description: "Vercel API (read-only)",
			allowedUrlPrefixes: ["https://api.vercel.com/"],
			allowedMethods: ["GET", "HEAD"],
		},
	],
	[
		"stripe",
		{
			name: "stripe",
			description: "Stripe API",
			allowedUrlPrefixes: ["https://api.stripe.com/"],
			allowedMethods: ["GET", "HEAD", "POST"],
		},
	],
	[
		"standard",
		{
			name: "standard",
			description: "Standard preset: GitHub + Anthropic + OpenAI (Tier 2 default)",
			allowedUrlPrefixes: [
				"https://api.github.com/",
				"https://api.anthropic.com/",
				"https://api.openai.com/",
			],
			allowedMethods: ["GET", "HEAD", "POST"],
		},
	],
	[
		"full",
		{
			name: "full",
			description: "All presets merged (Tier 3/4 default)",
			allowedUrlPrefixes: [
				"https://api.github.com/",
				"https://api.anthropic.com/",
				"https://api.openai.com/",
				"https://api.vercel.com/",
				"https://api.stripe.com/",
			],
			allowedMethods: ["GET", "HEAD", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"] as HttpMethod[],
		},
	],
]);

/**
 * Get a preset by name.
 *
 * @param name - The preset name (e.g. "github", "standard", "none")
 * @returns The matching NetworkPreset
 * @throws Error if the preset name is not recognized
 */
export function getPreset(name: string): NetworkPreset {
	const preset = PRESETS.get(name);
	if (!preset) {
		const available = Array.from(PRESETS.keys()).join(", ");
		throw new Error(`Unknown network preset "${name}". Available presets: ${available}`);
	}
	return preset;
}

export { PRESETS };

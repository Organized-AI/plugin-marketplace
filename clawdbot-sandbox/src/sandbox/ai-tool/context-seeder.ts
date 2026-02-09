import type { InitialFiles } from "just-bash";
import type { BashToolConfig, CustomerContext } from "./types.js";

/**
 * Default context files seeded into every sandbox.
 */
function getDefaultFiles(tier: string): Record<string, string> {
	return {
		"/home/user/.clawdbot/config.json": JSON.stringify(
			{
				version: "0.1.0",
				tier,
				sandbox: true,
				timestamp: new Date().toISOString(),
			},
			null,
			2,
		),
		"/home/user/.clawdbot/skills.json": JSON.stringify(
			{
				available: [
					{ id: "cat", description: "Read file contents" },
					{ id: "ls", description: "List directory contents" },
					{ id: "grep", description: "Search file contents" },
					{ id: "jq", description: "Process JSON data" },
					{ id: "curl", description: "Fetch URLs (if network enabled)" },
					{ id: "find", description: "Find files by pattern" },
					{ id: "sort", description: "Sort text data" },
					{ id: "sed", description: "Stream edit text" },
					{ id: "awk", description: "Process structured text" },
				],
			},
			null,
			2,
		),
	};
}

/**
 * Build the InitialFiles map for a sandbox from config.
 *
 * Merges default context files with any pre-seeded files from config.
 * Config files take precedence over defaults at the same path.
 */
export function seedContextFiles(config: BashToolConfig): InitialFiles {
	const defaults = getDefaultFiles(config.tier);
	const custom = config.preSeededFiles ?? {};

	// Merge: custom overrides defaults
	const merged: Record<string, string> = { ...defaults, ...custom };

	return merged;
}

/**
 * Build context files for a specific customer.
 *
 * Adds customer-specific config on top of default files.
 */
export function seedCustomerFiles(config: BashToolConfig, customer: CustomerContext): InitialFiles {
	const base = seedContextFiles(config);
	const customerFiles = customer.contextFiles ?? {};

	// Add customer-specific config
	const customerConfig: Record<string, string> = {
		"/home/user/.clawdbot/customer.json": JSON.stringify(
			{
				customerId: customer.customerId,
				tier: customer.tier,
				allowedSkills: customer.allowedSkills ?? null,
			},
			null,
			2,
		),
	};

	return { ...base, ...customerConfig, ...customerFiles };
}

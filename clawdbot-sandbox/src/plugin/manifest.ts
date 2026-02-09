/**
 * Plugin manifest — metadata that identifies the plugin to OpenClaw.
 */
export const PLUGIN_MANIFEST = {
	id: "clawdbot-sandbox",
	name: "Clawdbot Sandbox",
	version: "0.1.0",
	description: "Secure sandboxed execution for AgentSkills via just-bash",
	author: "Organized AI",
	homepage: "https://github.com/organized-ai/clawdbot-sandbox",
	config: {
		tier: {
			type: "string" as const,
			default: "overlay",
			enum: ["inmemory", "overlay", "readwrite"],
		},
		networkPresets: { type: "array" as const, default: ["standard"] },
		customNetworkUrls: { type: "array" as const, default: [] as string[] },
		executionLimits: { type: "object" as const, default: {} },
		auditLog: { type: "boolean" as const, default: true },
		auditLogPath: {
			type: "string" as const,
			default: "./logs/sandbox-audit.log",
		},
	},
} as const;

export type PluginManifest = typeof PLUGIN_MANIFEST;

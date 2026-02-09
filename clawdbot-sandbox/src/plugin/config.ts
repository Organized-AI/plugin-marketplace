import { z } from "zod/v4";
import { FsType } from "../sandbox/types.js";

/**
 * Zod schema for plugin configuration.
 *
 * Validates and applies defaults for all plugin settings.
 * Any field not provided falls back to the tier-2 (overlay) defaults.
 */
export const PluginConfig = z.object({
	/** Sandbox tier — determines filesystem isolation and execution limits. */
	tier: FsType.default("overlay"),

	/** Network preset names applied to all sandboxed Bash instances. */
	networkPresets: z.array(z.string()).default(["standard"]),

	/** Additional URLs to allowlist beyond preset defaults. */
	customNetworkUrls: z.array(z.string()).default([]),

	/** Override individual execution limits (merged with tier defaults). */
	executionLimits: z
		.object({
			maxCommandCount: z.number().optional(),
			maxLoopIterations: z.number().optional(),
			maxCallDepth: z.number().optional(),
		})
		.default({}),

	/** Enable audit logging of all sandboxed executions. */
	auditLog: z.boolean().default(true),

	/** Path to the audit log file (relative to plugin root). */
	auditLogPath: z.string().default("./logs/sandbox-audit.log"),
});

export type PluginConfig = z.infer<typeof PluginConfig>;

/**
 * Validate raw config and return a fully-typed PluginConfig.
 *
 * @param rawConfig — untrusted config from OpenClaw plugin loader
 * @returns validated PluginConfig with all defaults applied
 */
export function loadPluginConfig(rawConfig: unknown): PluginConfig {
	return PluginConfig.parse(rawConfig);
}

/**
 * Return the default configuration (overlay tier, standard network).
 */
export function getDefaultConfig(): PluginConfig {
	return PluginConfig.parse({});
}

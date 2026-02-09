import { z } from "zod/v4";
import { FsType } from "../types.js";

/**
 * Default execution limits per filesystem tier.
 * More restrictive tiers get lower limits to minimize blast radius.
 */
export const DEFAULT_EXECUTION_LIMITS = {
	inmemory: {
		maxCommandCount: 1000,
		maxLoopIterations: 1000,
		maxCallDepth: 50,
	},
	overlay: {
		maxCommandCount: 5000,
		maxLoopIterations: 5000,
		maxCallDepth: 75,
	},
	readwrite: {
		maxCommandCount: 10000,
		maxLoopIterations: 10000,
		maxCallDepth: 100,
	},
} as const satisfies Record<
	FsType,
	{ maxCommandCount: number; maxLoopIterations: number; maxCallDepth: number }
>;

/**
 * Configuration for creating a tiered bash tool.
 */
export const BashToolConfig = z.object({
	/** Filesystem tier for the sandbox. */
	tier: FsType.default("overlay"),
	/** Pre-seeded files for the sandbox filesystem (path → content). */
	preSeededFiles: z.record(z.string(), z.string()).optional(),
	/** Network presets to apply. */
	networkPresets: z.array(z.string()).default([]),
	/** Custom network URLs to allow. */
	customNetworkUrls: z.array(z.string()).default([]),
	/** Override execution limits (merged with tier defaults). */
	executionLimits: z
		.object({
			maxCommandCount: z.number().optional(),
			maxLoopIterations: z.number().optional(),
			maxCallDepth: z.number().optional(),
		})
		.optional(),
	/** Sandbox root path (only used for readwrite tier). */
	rootPath: z.string().optional(),
	/** Initial working directory inside the sandbox. */
	cwd: z.string().optional(),
	/** Environment variables to set. */
	env: z.record(z.string(), z.string()).optional(),
});
export type BashToolConfig = z.infer<typeof BashToolConfig>;

/**
 * Result from a bash tool execution.
 */
export interface BashToolResult {
	stdout: string;
	stderr: string;
	exitCode: number;
	duration: number;
	tier: FsType;
}

/**
 * Customer context for generating a customer-specific bash tool.
 */
export const CustomerContext = z.object({
	/** Unique customer identifier. */
	customerId: z.string(),
	/** Customer's assigned tier. */
	tier: FsType.default("overlay"),
	/** Optional root path for readwrite tier. */
	rootPath: z.string().optional(),
	/** Restrict which skills the customer can use (skill IDs). */
	allowedSkills: z.array(z.string()).optional(),
	/** Network preset overrides. */
	networkOverrides: z.array(z.string()).optional(),
	/** Additional context files to seed (path → content). */
	contextFiles: z.record(z.string(), z.string()).optional(),
});
export type CustomerContext = z.infer<typeof CustomerContext>;

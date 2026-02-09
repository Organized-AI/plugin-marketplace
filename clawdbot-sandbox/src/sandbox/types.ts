import { z } from "zod/v4";

/**
 * Filesystem tier types supported by the sandbox.
 */
export const FsType = z.enum(["inmemory", "overlay", "readwrite"]);
export type FsType = z.infer<typeof FsType>;

/**
 * Execution limits schema.
 */
export const ExecutionLimitsSchema = z.object({
	maxCallDepth: z.number().default(100),
	maxCommandCount: z.number().default(10000),
	maxLoopIterations: z.number().default(10000),
});
export type ExecutionLimitsConfig = z.infer<typeof ExecutionLimitsSchema>;

/**
 * Core sandbox configuration schema.
 */
export const SandboxConfig = z.object({
	fsType: FsType.default("overlay"),
	rootPath: z.string().optional(),
	cwd: z.string().optional(),
	env: z.record(z.string(), z.string()).optional(),
	networkPresets: z.array(z.string()).default(["standard"]),
	customNetworkUrls: z.array(z.string()).default([]),
	executionLimits: ExecutionLimitsSchema.default({
		maxCallDepth: 100,
		maxCommandCount: 10000,
		maxLoopIterations: 10000,
	}),
	auditLog: z.boolean().default(true),
	auditLogPath: z.string().default("./logs/sandbox-audit.log"),
});
export type SandboxConfig = z.infer<typeof SandboxConfig>;

/**
 * Sandbox execution result — wraps BashExecResult with metadata.
 */
export interface SandboxResult {
	stdout: string;
	stderr: string;
	exitCode: number;
	duration: number;
	tier: FsType;
}

/**
 * Tier configuration for display/reference.
 */
export interface TierConfig {
	tier: FsType;
	description: string;
	allowedOperations: string[];
	maxFileSize?: number;
}

/**
 * Pre-defined tier configurations.
 */
export const TIER_CONFIGS: Record<FsType, TierConfig> = {
	inmemory: {
		tier: "inmemory",
		description: "Pure in-memory filesystem — no disk access (Tier 1: VPS)",
		allowedOperations: ["read", "write-memory", "execute"],
	},
	overlay: {
		tier: "overlay",
		description:
			"Copy-on-write overlay — reads from disk, writes stay in memory (Tier 2: Mac Mini)",
		allowedOperations: ["read", "read-disk", "write-memory", "execute"],
	},
	readwrite: {
		tier: "readwrite",
		description: "Direct read-write — scoped to root directory (Tier 3: Mac Studio)",
		allowedOperations: ["read", "read-disk", "write-disk", "execute"],
	},
};

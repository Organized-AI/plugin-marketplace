import { z } from "zod/v4";
import { FsType } from "../types.js";

/**
 * Permission level for a command or resource.
 * - deny: blocked entirely
 * - allow: permitted without extra logging
 * - allow_with_audit: permitted but logged for review
 */
export const PermissionLevel = z.enum(["deny", "allow", "allow_with_audit"]);
export type PermissionLevel = z.infer<typeof PermissionLevel>;

/**
 * Customer tier (1-4), determining overall capability level.
 */
export const TierLevel = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
export type TierLevel = z.infer<typeof TierLevel>;

/**
 * Permission rule for a single command pattern.
 */
export const CommandPermission = z.object({
	/** Glob-like pattern matching the command name (e.g. "cat", "rm", "curl"). */
	pattern: z.string(),
	/** Whether this command is allowed, denied, or allowed with audit. */
	level: PermissionLevel,
	/** Human-readable description of why this permission exists. */
	description: z.string().optional(),
});
export type CommandPermission = z.infer<typeof CommandPermission>;

/**
 * Full permission set for a single tier.
 */
export const TierPermissions = z.object({
	tier: TierLevel,
	commands: z.array(CommandPermission),
	filesystem: z.array(FsType),
	networkPresets: z.array(z.string()),
	maxConcurrent: z.number().default(5),
	maxExecTime: z.number().default(30000),
});
export type TierPermissions = z.infer<typeof TierPermissions>;

/**
 * Result of a permission check — returned by all guards.
 */
export interface PermissionCheckResult {
	allowed: boolean;
	reason: string;
	tier: TierLevel;
	auditRequired: boolean;
}

import { z } from "zod/v4";
import { FsType } from "../types.js";

/**
 * Trust levels for skills — determines which sandbox tier is assigned.
 *
 * - untrusted: read-only operations, inmemory fs
 * - standard: typical write operations, overlay fs
 * - trusted: destructive operations, readwrite fs
 * - admin: full access, readwrite fs
 */
export const SkillTrustLevel = z.enum(["untrusted", "standard", "trusted", "admin"]);
export type SkillTrustLevel = z.infer<typeof SkillTrustLevel>;

/**
 * Definition of a skill that can be executed inside the sandbox.
 */
export const SkillDefinition = z.object({
	id: z.string(),
	name: z.string(),
	trustLevel: SkillTrustLevel,
	requiredTier: FsType.optional(),
	requiredNetworkPresets: z.array(z.string()).optional(),
	description: z.string().optional(),
});
export type SkillDefinition = z.infer<typeof SkillDefinition>;

/**
 * Request to execute a skill inside the sandbox.
 */
export const SkillExecRequest = z.object({
	skillId: z.string(),
	command: z.string(),
	args: z.array(z.string()).optional(),
	env: z.record(z.string(), z.string()).optional(),
	workingDir: z.string().optional(),
});
export type SkillExecRequest = z.infer<typeof SkillExecRequest>;

/**
 * Result of executing a skill — extends BashExecResult with
 * sandbox metadata. Plain interface (not Zod-validated) because
 * this is an output type produced internally, not user input.
 */
export interface SkillExecResult {
	stdout: string;
	stderr: string;
	exitCode: number;
	duration: number;
	sandboxTier: FsType;
	skillId: string;
	timestamp: Date;
}

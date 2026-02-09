/**
 * AgentSkill Adapter — routes OpenClaw skill commands through
 * the appropriate sandboxed Bash environment based on trust levels.
 */

export { SkillAdapter } from "./adapter.js";
export { detectErrorPattern, handleResult } from "./result-handler.js";
export { SkillRegistry } from "./skill-registry.js";
export type {
	SkillDefinition,
	SkillExecRequest,
	SkillExecResult,
	SkillTrustLevel,
} from "./types.js";
export {
	SkillDefinition as SkillDefinitionSchema,
	SkillExecRequest as SkillExecRequestSchema,
	SkillTrustLevel as SkillTrustLevelSchema,
} from "./types.js";

/**
 * Convenience: create a SkillAdapter with default registry and config.
 */
import type { SandboxConfig } from "../types.js";
import { SkillAdapter } from "./adapter.js";
import { SkillRegistry } from "./skill-registry.js";

export function createAdapter(config?: Partial<SandboxConfig>): SkillAdapter {
	const registry = SkillRegistry.createDefault();
	return new SkillAdapter(config ?? {}, registry);
}

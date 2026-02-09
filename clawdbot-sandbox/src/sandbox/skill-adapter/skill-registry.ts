import type { FsType } from "../types.js";
import type { SkillDefinition as SkillDefinitionType } from "./types.js";
import { SkillDefinition } from "./types.js";

/**
 * Maps trust levels to sandbox filesystem tiers.
 */
const TRUST_TO_TIER: Record<SkillDefinitionType["trustLevel"], FsType> = {
	untrusted: "inmemory",
	standard: "overlay",
	trusted: "readwrite",
	admin: "readwrite",
};

/**
 * Registry of skills that can be executed inside the sandbox.
 *
 * Each skill maps to a trust level which determines the sandbox
 * tier (filesystem type) used for execution.
 */
export class SkillRegistry {
	private skills: Map<string, SkillDefinitionType> = new Map();

	/**
	 * Register a skill definition. Validates the input with Zod
	 * before storing — throws ZodError on invalid input.
	 */
	register(skill: SkillDefinitionType): void {
		const validated = SkillDefinition.parse(skill);
		this.skills.set(validated.id, validated);
	}

	/**
	 * Retrieve a skill by ID. Throws if not found.
	 */
	get(skillId: string): SkillDefinitionType {
		const skill = this.skills.get(skillId);
		if (!skill) {
			throw new Error(`Skill not found: ${skillId}`);
		}
		return skill;
	}

	/**
	 * Return all registered skills.
	 */
	getAll(): SkillDefinitionType[] {
		return Array.from(this.skills.values());
	}

	/**
	 * Resolve the sandbox filesystem tier for a skill based on its
	 * trust level. If the skill has an explicit requiredTier, that
	 * takes precedence.
	 */
	getTierForSkill(skillId: string): FsType {
		const skill = this.get(skillId);
		if (skill.requiredTier) {
			return skill.requiredTier;
		}
		return TRUST_TO_TIER[skill.trustLevel];
	}

	/**
	 * Create a registry pre-loaded with common Unix tool skills.
	 */
	static createDefault(): SkillRegistry {
		const registry = new SkillRegistry();

		// --- File read skills (untrusted — read-only, no side effects) ---
		for (const cmd of ["cat", "ls", "find", "grep"]) {
			registry.register({
				id: cmd,
				name: cmd,
				trustLevel: "untrusted",
				description: `Read-only file operation: ${cmd}`,
			});
		}

		// --- File write skills (standard — creates/modifies files) ---
		for (const cmd of ["mkdir", "cp", "mv", "tee"]) {
			registry.register({
				id: cmd,
				name: cmd,
				trustLevel: "standard",
				description: `File write operation: ${cmd}`,
			});
		}

		// --- Data transform skills (untrusted — pure data pipelines) ---
		for (const cmd of ["jq", "sed", "awk", "sort"]) {
			registry.register({
				id: cmd,
				name: cmd,
				trustLevel: "untrusted",
				description: `Data transform operation: ${cmd}`,
			});
		}

		// --- Web fetch skills (standard — requires network access) ---
		registry.register({
			id: "curl",
			name: "curl",
			trustLevel: "standard",
			requiredNetworkPresets: ["standard"],
			description: "HTTP client for web requests",
		});

		// --- System info skills (untrusted — read-only system data) ---
		for (const cmd of ["env", "hostname", "date"]) {
			registry.register({
				id: cmd,
				name: cmd,
				trustLevel: "untrusted",
				description: `System info operation: ${cmd}`,
			});
		}

		// --- Destructive skills (trusted — can delete/change permissions) ---
		for (const cmd of ["rm", "chmod"]) {
			registry.register({
				id: cmd,
				name: cmd,
				trustLevel: "trusted",
				description: `Destructive operation: ${cmd}`,
			});
		}

		return registry;
	}
}

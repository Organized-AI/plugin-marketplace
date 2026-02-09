import type { Bash } from "just-bash";
import { createSandbox } from "../fs-tiers/index.js";
import type { PermissionManager } from "../permissions/manager.js";
import type { FsType, SandboxConfig as SandboxConfigType } from "../types.js";
import { SandboxConfig } from "../types.js";
import { handleResult } from "./result-handler.js";
import type { SkillRegistry } from "./skill-registry.js";
import type { SkillExecRequest, SkillExecResult } from "./types.js";

/**
 * Bridges the skill system with the sandboxed Bash execution layer.
 *
 * The adapter:
 * 1. Optionally checks permissions via PermissionManager
 * 2. Looks up skill metadata in the registry
 * 3. Resolves the appropriate sandbox tier and network presets
 * 4. Creates (or reuses) a sandboxed Bash instance
 * 5. Executes the command and returns a structured result
 */
export class SkillAdapter {
	private readonly bashCache: Map<string, Bash> = new Map();
	private readonly baseConfig: Partial<SandboxConfigType>;
	private readonly registry: SkillRegistry;
	private permissionManager: PermissionManager | undefined;

	constructor(
		baseConfig: Partial<SandboxConfigType>,
		registry: SkillRegistry,
		permissionManager?: PermissionManager,
	) {
		this.baseConfig = baseConfig;
		this.registry = registry;
		this.permissionManager = permissionManager;
	}

	/**
	 * Set or replace the permission manager at runtime.
	 */
	setPermissionManager(pm: PermissionManager | undefined): void {
		this.permissionManager = pm;
	}

	/**
	 * Execute a skill request inside an appropriately-configured sandbox.
	 *
	 * If a PermissionManager is configured, the command is checked
	 * before execution. Denied commands return exitCode 126 without
	 * reaching the sandbox.
	 *
	 * @throws Error if the skill is not registered
	 * @throws ZodError if the merged sandbox config is invalid
	 */
	async execute(request: SkillExecRequest): Promise<SkillExecResult> {
		// 1. Look up skill in registry (throws if unknown)
		const skill = this.registry.get(request.skillId);

		// 2. Determine tier: explicit skill override > registry resolution
		const tier: FsType = skill.requiredTier ?? this.registry.getTierForSkill(request.skillId);

		// 3. Determine network presets
		const networkPresets: string[] = skill.requiredNetworkPresets ?? [];

		// 4. Permission check (if manager configured)
		if (this.permissionManager) {
			const fullCommand = request.args?.length
				? `${request.command} ${request.args.join(" ")}`
				: request.command;

			const check = this.permissionManager.checkAll(fullCommand, tier, networkPresets);

			if (!check.allowed) {
				return {
					stdout: "",
					stderr: `Permission denied: ${check.reason}`,
					exitCode: 126,
					duration: 0,
					sandboxTier: tier,
					skillId: request.skillId,
					timestamp: new Date(),
				};
			}
		}

		// 5. Build full SandboxConfig by merging base with skill requirements
		const mergedConfig = SandboxConfig.parse({
			...this.baseConfig,
			fsType: tier,
			networkPresets:
				networkPresets.length > 0 ? networkPresets : (this.baseConfig.networkPresets ?? []),
		});

		// 6. Get or create Bash instance from cache
		const cacheKey = `${tier}:${JSON.stringify(networkPresets)}`;
		let bash = this.bashCache.get(cacheKey);
		if (!bash) {
			bash = createSandbox(mergedConfig);
			this.bashCache.set(cacheKey, bash);
		}

		// 7. Build full command string
		const fullCommand = request.args?.length
			? `${request.command} ${request.args.join(" ")}`
			: request.command;

		// 8. Record start time
		const startTime = Date.now();

		// 9. Execute via sandboxed bash
		const raw = await bash.exec(fullCommand, {
			env: request.env,
			cwd: request.workingDir,
		});

		// 10. Process and return structured result
		return handleResult(raw, request, startTime, tier);
	}

	/**
	 * Clear the internal Bash instance cache.
	 * just-bash instances have no external resources to release,
	 * so clearing the map is sufficient.
	 */
	dispose(): void {
		this.bashCache.clear();
	}
}

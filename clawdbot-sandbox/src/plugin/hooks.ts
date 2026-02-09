import { SkillAdapter } from "../sandbox/skill-adapter/adapter.js";
import { SkillRegistry } from "../sandbox/skill-adapter/skill-registry.js";
import type { SkillExecRequest, SkillExecResult } from "../sandbox/skill-adapter/types.js";
import type { PluginConfig } from "./config.js";
import { loadPluginConfig } from "./config.js";

/**
 * Audit log entry recorded for each sandboxed execution.
 */
export interface AuditEntry {
	timestamp: string;
	skillId: string;
	command: string;
	exitCode: number;
	duration: number;
	tier: string;
}

/**
 * Plugin runtime state — created on enable, disposed on disable.
 */
export interface PluginState {
	config: PluginConfig;
	registry: SkillRegistry;
	adapter: SkillAdapter;
	auditLog: AuditEntry[];
	enabled: boolean;
}

/**
 * Create an initial (disabled) plugin state.
 */
export function createPluginState(): PluginState {
	return {
		config: loadPluginConfig({}),
		registry: new SkillRegistry(),
		adapter: new SkillAdapter({}, new SkillRegistry()),
		auditLog: [],
		enabled: false,
	};
}

/**
 * Called when the plugin is enabled via `openclaw plugins enable`.
 *
 * - Validates and loads config
 * - Creates default skill registry (17 pre-registered Unix tools)
 * - Initializes the SkillAdapter with registry + config
 * - Marks plugin as enabled
 */
export function onPluginEnable(_state: PluginState, rawConfig?: unknown): PluginState {
	const config = loadPluginConfig(rawConfig ?? {});
	const registry = SkillRegistry.createDefault();
	const adapter = new SkillAdapter(
		{
			fsType: config.tier,
			networkPresets: config.networkPresets,
		},
		registry,
	);

	return {
		config,
		registry,
		adapter,
		auditLog: [],
		enabled: true,
	};
}

/**
 * Called when the plugin is disabled.
 *
 * - Disposes cached Bash instances
 * - Flushes audit log
 * - Returns a clean disabled state
 */
export function onPluginDisable(state: PluginState): PluginState {
	if (state.enabled) {
		state.adapter.dispose();
	}

	return {
		...createPluginState(),
		auditLog: state.auditLog, // preserve audit log for inspection
		enabled: false,
	};
}

/**
 * Called when plugin configuration is updated at runtime.
 *
 * - Disposes old adapter
 * - Recreates with new config
 * - Records config change in audit log
 */
export function onConfigChange(state: PluginState, rawConfig: unknown): PluginState {
	if (!state.enabled) {
		return state;
	}

	// Dispose old adapter
	state.adapter.dispose();

	// Rebuild with new config
	const config = loadPluginConfig(rawConfig);
	const adapter = new SkillAdapter(
		{
			fsType: config.tier,
			networkPresets: config.networkPresets,
		},
		state.registry,
	);

	const auditEntry: AuditEntry = {
		timestamp: new Date().toISOString(),
		skillId: "_system",
		command: "config_change",
		exitCode: 0,
		duration: 0,
		tier: config.tier,
	};

	return {
		...state,
		config,
		adapter,
		auditLog: [...state.auditLog, auditEntry],
	};
}

/**
 * Called for every skill execution request.
 *
 * - Routes the request through the SkillAdapter (sandboxed execution)
 * - Records an audit entry if audit logging is enabled
 * - Returns the execution result
 */
export async function onSkillExecute(
	state: PluginState,
	request: SkillExecRequest,
): Promise<{ result: SkillExecResult; state: PluginState }> {
	if (!state.enabled) {
		throw new Error("Plugin is not enabled");
	}

	const result = await state.adapter.execute(request);

	// Record audit entry
	if (state.config.auditLog) {
		const entry: AuditEntry = {
			timestamp: result.timestamp.toISOString(),
			skillId: result.skillId,
			command: request.command,
			exitCode: result.exitCode,
			duration: result.duration,
			tier: result.sandboxTier,
		};

		return {
			result,
			state: {
				...state,
				auditLog: [...state.auditLog, entry],
			},
		};
	}

	return { result, state };
}

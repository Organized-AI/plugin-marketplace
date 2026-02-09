/**
 * @clawdbot-ready/sandbox
 *
 * Secure sandboxed execution for AgentSkills via just-bash.
 * Protects customer hardware from destructive commands while
 * maintaining full agent capability.
 */

import { Bash } from "just-bash";

export type { BashExecResult, BashOptions, NetworkConfig } from "just-bash";
export { Bash, InMemoryFs, OverlayFs, ReadWriteFs } from "just-bash";
export type { AuditEntry, PluginManifest, PluginState } from "./plugin/index.js";
export {
	createPlugin,
	createPluginState,
	disablePlugin,
	enablePlugin,
	executeSkill,
	getDefaultConfig,
	loadPluginConfig,
	onConfigChange,
	onPluginDisable,
	onPluginEnable,
	onSkillExecute,
	PLUGIN_MANIFEST,
	PluginConfig,
} from "./plugin/index.js";
export type {
	BashToolConfig,
	BashToolResult,
	CustomerContext,
} from "./sandbox/ai-tool/index.js";
export {
	BashToolConfigSchema,
	CustomerContextSchema,
	createBashForConfig,
	createCustomerBashTool,
	createTieredBashTool,
	DEFAULT_EXECUTION_LIMITS,
	seedContextFiles,
	seedCustomerFiles,
} from "./sandbox/ai-tool/index.js";
export {
	CommandExecutionError,
	ConfigValidationError,
	NetworkBlockedError,
	PermissionDeniedError,
	PluginLifecycleError,
	SandboxCreationError,
	SandboxError,
} from "./sandbox/errors.js";
export { createSandbox } from "./sandbox/fs-tiers/index.js";
export type { HttpMethod, NetworkManagerConfig, NetworkPreset } from "./sandbox/network/index.js";
export {
	buildNetworkConfig,
	createNetworkConfig,
	getPreset,
	HttpMethodSchema,
	NetworkManagerConfigSchema,
	NetworkPresetSchema,
	PRESETS,
} from "./sandbox/network/index.js";
export type { PermissionCheckResult } from "./sandbox/permissions/index.js";
export {
	CommandPermission,
	checkFsAccess,
	checkNetworkAccess,
	getCommandAllowlist,
	matchCommand,
	PermissionLevel,
	PermissionManager,
	parseCommandSegments,
	TierLevel,
	TierPermissions,
} from "./sandbox/permissions/index.js";
export type {
	SkillDefinition,
	SkillExecRequest,
	SkillExecResult,
	SkillTrustLevel,
} from "./sandbox/skill-adapter/index.js";
export {
	createAdapter,
	detectErrorPattern,
	handleResult,
	SkillAdapter,
	SkillDefinitionSchema,
	SkillExecRequestSchema,
	SkillRegistry,
	SkillTrustLevelSchema,
} from "./sandbox/skill-adapter/index.js";
export type { SandboxConfig as SandboxConfigType } from "./sandbox/types.js";
export { FsType, SandboxConfig } from "./sandbox/types.js";

/**
 * Quick smoke test: create a Bash instance and run a command.
 */
async function main() {
	const bash = new Bash();
	const result = await bash.exec('echo "Clawdbot Sandbox initialized"');
	console.log(result.stdout.trim());
}

// Run when executed directly
main().catch(console.error);

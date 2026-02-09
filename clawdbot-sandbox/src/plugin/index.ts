/**
 * OpenClaw Plugin — packages the sandbox system as an enableable plugin.
 *
 * Usage with OpenClaw:
 * ```
 * openclaw plugins install @clawdbot-ready/sandbox
 * openclaw plugins enable clawdbot-sandbox
 * ```
 *
 * Standalone usage:
 * ```typescript
 * import { createPlugin, enablePlugin, executeSkill } from "@clawdbot-ready/sandbox/plugin";
 *
 * let plugin = createPlugin();
 * plugin = enablePlugin(plugin, { tier: "overlay" });
 * const { result, state } = await executeSkill(plugin, {
 *   skillId: "jq",
 *   command: "jq",
 *   args: [".name", "/data/config.json"],
 * });
 * ```
 */

export { getDefaultConfig, loadPluginConfig, PluginConfig } from "./config.js";
export type { AuditEntry, PluginState } from "./hooks.js";
// ── Convenience aliases ─────────────────────────────────────────
export {
	createPluginState,
	createPluginState as createPlugin,
	onConfigChange,
	onPluginDisable,
	onPluginDisable as disablePlugin,
	onPluginEnable,
	onPluginEnable as enablePlugin,
	onSkillExecute,
	onSkillExecute as executeSkill,
} from "./hooks.js";
export type { PluginManifest } from "./manifest.js";
export { PLUGIN_MANIFEST } from "./manifest.js";

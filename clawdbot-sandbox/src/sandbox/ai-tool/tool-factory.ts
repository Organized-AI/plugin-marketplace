import type { Tool } from "ai";
import { zodSchema } from "ai";
import { Bash } from "just-bash";
import { z } from "zod/v4";
import { buildNetworkConfig } from "../network/config-builder.js";
import type { FsType } from "../types.js";
import { seedContextFiles } from "./context-seeder.js";
import { type BashToolConfig, type BashToolResult, DEFAULT_EXECUTION_LIMITS } from "./types.js";

/**
 * Resolve execution limits by merging tier defaults with optional overrides.
 */
function resolveExecutionLimits(tier: FsType, overrides?: BashToolConfig["executionLimits"]) {
	const defaults = DEFAULT_EXECUTION_LIMITS[tier];
	return {
		maxCommandCount: overrides?.maxCommandCount ?? defaults.maxCommandCount,
		maxLoopIterations: overrides?.maxLoopIterations ?? defaults.maxLoopIterations,
		maxCallDepth: overrides?.maxCallDepth ?? defaults.maxCallDepth,
	};
}

/**
 * Resolve network presets for a given tier and config.
 */
const TIER_DEFAULT_PRESETS: Record<FsType, string[]> = {
	inmemory: ["none"],
	overlay: ["standard"],
	readwrite: ["full"],
};

function resolveNetworkPresets(config: BashToolConfig): string[] {
	return config.networkPresets.length > 0
		? config.networkPresets
		: (TIER_DEFAULT_PRESETS[config.tier] ?? ["none"]);
}

/**
 * Create an AI SDK-compatible bash tool with tiered sandboxing.
 *
 * The returned tool can be passed directly to `generateText()` or `streamText()`.
 *
 * @example
 * ```ts
 * import { generateText } from "ai";
 * import { createTieredBashTool } from "@clawdbot-ready/sandbox/ai";
 *
 * const bashTool = createTieredBashTool({ tier: "overlay" });
 * const result = await generateText({
 *   model: myModel,
 *   tools: { bash: bashTool },
 *   prompt: "List the files in /home/user",
 * });
 * ```
 */
export function createTieredBashTool(
	config: BashToolConfig,
): Tool<{ command: string }, BashToolResult> {
	// Resolve limits and network
	const limits = resolveExecutionLimits(config.tier, config.executionLimits);
	const presets = resolveNetworkPresets(config);
	const networkConfig = buildNetworkConfig(presets, config.customNetworkUrls);

	// Seed filesystem
	const files = seedContextFiles(config);

	// Create the Bash instance with tier-appropriate settings
	const bash = new Bash({
		files,
		executionLimits: limits,
		network: networkConfig ?? undefined,
		cwd: config.cwd ?? "/home/user",
		env: config.env,
	});

	/** Input schema for the bash tool. */
	const inputSchema = z.object({
		command: z.string().describe("The bash command to execute (e.g., 'ls -la /home/user')"),
	});

	type BashToolInput = z.infer<typeof inputSchema>;

	// Return explicitly-typed AI SDK tool
	const bashTool: Tool<BashToolInput, BashToolResult> = {
		description:
			"Execute a bash command in a sandboxed environment. " +
			"The sandbox has a virtual filesystem with pre-seeded files. " +
			"Use standard Unix commands to read files, process data, and produce output.",
		inputSchema: zodSchema(inputSchema),
		execute: async ({ command }): Promise<BashToolResult> => {
			const startTime = Date.now();
			const result = await bash.exec(command);
			const duration = Date.now() - startTime;

			return {
				stdout: result.stdout,
				stderr: result.stderr,
				exitCode: result.exitCode,
				duration,
				tier: config.tier,
			};
		},
	};

	return bashTool;
}

/**
 * Get the underlying Bash instance for a tool config (for testing).
 * @internal
 */
export function createBashForConfig(config: BashToolConfig): Bash {
	const limits = resolveExecutionLimits(config.tier, config.executionLimits);
	const presets = resolveNetworkPresets(config);
	const networkConfig = buildNetworkConfig(presets, config.customNetworkUrls);
	const files = seedContextFiles(config);

	return new Bash({
		files,
		executionLimits: limits,
		network: networkConfig ?? undefined,
		cwd: config.cwd ?? "/home/user",
		env: config.env,
	});
}

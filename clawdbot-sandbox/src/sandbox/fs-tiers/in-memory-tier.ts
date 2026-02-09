import { Bash, type BashOptions, type NetworkConfig } from "just-bash";
import type { SandboxConfig } from "../types.js";

/**
 * Create an InMemory sandbox Bash instance.
 * Everything lives in memory — no disk access at all.
 * This is the Tier 1 (VPS) default.
 */
export function createInMemoryBash(config: SandboxConfig, networkConfig?: NetworkConfig): Bash {
	const options: BashOptions = {
		files: {
			"/home/user/.bashrc": 'export PS1="sandbox$ "\n',
			"/tmp/.keep": "",
		},
		cwd: config.cwd ?? "/home/user",
		env: config.env ?? {},
		executionLimits: {
			maxCallDepth: config.executionLimits.maxCallDepth,
			maxCommandCount: config.executionLimits.maxCommandCount,
			maxLoopIterations: config.executionLimits.maxLoopIterations,
		},
		network: networkConfig,
	};

	return new Bash(options);
}

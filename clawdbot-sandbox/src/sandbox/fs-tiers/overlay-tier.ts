import { Bash, type BashOptions, type NetworkConfig, OverlayFs } from "just-bash";
import type { SandboxConfig } from "../types.js";

/**
 * Create an Overlay sandbox Bash instance.
 * Reads come from disk (rootPath), writes stay in memory.
 * This is the Tier 2 (Mac Mini) default.
 */
export function createOverlayBash(config: SandboxConfig, networkConfig?: NetworkConfig): Bash {
	if (!config.rootPath) {
		throw new Error("OverlayFs requires rootPath in SandboxConfig");
	}

	const overlay = new OverlayFs({ root: config.rootPath });
	const options: BashOptions = {
		fs: overlay,
		cwd: config.cwd ?? overlay.getMountPoint(),
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

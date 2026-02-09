import { Bash, type BashOptions, type NetworkConfig, ReadWriteFs } from "just-bash";
import type { SandboxConfig } from "../types.js";

/**
 * Create a ReadWrite sandbox Bash instance.
 * Direct read-write access to a real directory, scoped to rootPath.
 * This is the Tier 3 (Mac Studio) default.
 */
export function createReadWriteBash(config: SandboxConfig, networkConfig?: NetworkConfig): Bash {
	if (!config.rootPath) {
		throw new Error("ReadWriteFs requires rootPath in SandboxConfig");
	}

	const rwfs = new ReadWriteFs({ root: config.rootPath });
	const options: BashOptions = {
		fs: rwfs,
		cwd: config.cwd ?? config.rootPath,
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

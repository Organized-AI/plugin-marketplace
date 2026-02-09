import type { FsType } from "./types.js";

/**
 * Base error class for all sandbox errors.
 * Provides structured error codes and JSON serialization.
 */
export class SandboxError extends Error {
	readonly code: string;

	constructor(code: string, message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "SandboxError";
		this.code = code;
	}

	toJSON(): Record<string, unknown> {
		return {
			name: this.name,
			code: this.code,
			message: this.message,
			cause: this.cause instanceof Error ? this.cause.message : this.cause,
		};
	}
}

/**
 * Thrown when a command or resource is denied by the permission system.
 */
export class PermissionDeniedError extends SandboxError {
	readonly tier: number;
	readonly command: string;
	readonly reason: string;

	constructor(tier: number, command: string, reason: string) {
		super("SANDBOX_PERMISSION_DENIED", `Permission denied: ${reason}`);
		this.name = "PermissionDeniedError";
		this.tier = tier;
		this.command = command;
		this.reason = reason;
	}
}

/**
 * Thrown when a sandbox instance cannot be created.
 */
export class SandboxCreationError extends SandboxError {
	readonly fsType: FsType;

	constructor(fsType: FsType, cause?: Error) {
		super("SANDBOX_CREATION_FAILED", `Failed to create ${fsType} sandbox`, { cause });
		this.name = "SandboxCreationError";
		this.fsType = fsType;
	}
}

/**
 * Thrown when a command execution fails unexpectedly.
 */
export class CommandExecutionError extends SandboxError {
	readonly command: string;
	readonly exitCode: number;
	readonly stderr: string;

	constructor(command: string, exitCode: number, stderr: string) {
		super("SANDBOX_COMMAND_FAILED", `Command failed (exit ${exitCode}): ${command}`);
		this.name = "CommandExecutionError";
		this.command = command;
		this.exitCode = exitCode;
		this.stderr = stderr;
	}
}

/**
 * Thrown when network access is blocked by the permission system.
 */
export class NetworkBlockedError extends SandboxError {
	readonly tier: number;
	readonly requestedPresets: string[];

	constructor(tier: number, requestedPresets: string[]) {
		super(
			"SANDBOX_NETWORK_BLOCKED",
			`Tier ${tier} does not permit network presets: ${requestedPresets.join(", ")}`,
		);
		this.name = "NetworkBlockedError";
		this.tier = tier;
		this.requestedPresets = requestedPresets;
	}
}

/**
 * Thrown when plugin configuration is invalid.
 */
export class ConfigValidationError extends SandboxError {
	readonly field: string;
	readonly value: unknown;

	constructor(field: string, value: unknown, expected: string) {
		super(
			"SANDBOX_CONFIG_INVALID",
			`Invalid config: ${field} = ${JSON.stringify(value)}, expected ${expected}`,
		);
		this.name = "ConfigValidationError";
		this.field = field;
		this.value = value;
	}
}

/**
 * Thrown when a plugin lifecycle hook fails.
 */
export class PluginLifecycleError extends SandboxError {
	readonly hook: string;

	constructor(hook: string, cause?: Error) {
		super("SANDBOX_PLUGIN_LIFECYCLE", `Plugin hook '${hook}' failed`, { cause });
		this.name = "PluginLifecycleError";
		this.hook = hook;
	}
}

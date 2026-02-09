import type { BashExecResult } from "just-bash";
import type { FsType } from "../types.js";
import type { SkillExecRequest, SkillExecResult } from "./types.js";

/**
 * Maximum stdout/stderr length before truncation (1 MB).
 */
const MAX_OUTPUT_LENGTH = 1_048_576;

/**
 * Regex to strip ANSI escape codes (colors, cursor movement, etc.).
 * Built with RegExp constructor to avoid biome's noControlCharactersInRegex.
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: intentional ANSI escape matching
const ANSI_REGEX = /\x1B\[[0-9;]*[A-Za-z]/g;

/**
 * Known error patterns in stderr mapped to human-readable messages.
 */
const ERROR_PATTERNS: ReadonlyArray<[pattern: RegExp, message: string]> = [
	[/command not found/i, "Command not available in sandbox"],
	[/Permission denied/i, "Insufficient permissions for this operation"],
	[/No such file/i, "File or directory not found"],
];

/**
 * Sanitize a string by stripping ANSI escape codes and truncating
 * to MAX_OUTPUT_LENGTH characters.
 */
function sanitize(raw: string): string {
	const stripped = raw.replace(ANSI_REGEX, "");
	if (stripped.length > MAX_OUTPUT_LENGTH) {
		return `${stripped.slice(0, MAX_OUTPUT_LENGTH)}[output truncated]`;
	}
	return stripped;
}

/**
 * Transform a raw BashExecResult into a structured SkillExecResult
 * with sanitized output, timing metadata, and sandbox context.
 */
export function handleResult(
	raw: BashExecResult,
	request: SkillExecRequest,
	startTime: number,
	tier: FsType,
): SkillExecResult {
	const duration = Date.now() - startTime;

	return {
		stdout: sanitize(raw.stdout),
		stderr: sanitize(raw.stderr),
		exitCode: raw.exitCode,
		duration,
		sandboxTier: tier,
		skillId: request.skillId,
		timestamp: new Date(),
	};
}

/**
 * Detect common error patterns in a SkillExecResult's stderr.
 *
 * Returns a human-readable error message if a known pattern is found,
 * or null if no known pattern matches.
 */
export function detectErrorPattern(result: SkillExecResult): string | null {
	for (const [pattern, message] of ERROR_PATTERNS) {
		if (pattern.test(result.stderr)) {
			return message;
		}
	}
	return null;
}

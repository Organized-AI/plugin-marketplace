#!/usr/bin/env bash
# auto-run-task hook — PostToolUse: Bash
# Detects sequential Bash tool calls and auto-verifies output between runs.
# Warns on non-zero exit codes and suggests reading output after 3+ runs.
#
# Input: JSON on stdin from Claude Code PostToolUse event
# Output: exactly one JSON object with "decision" field

# Defensive — hooks must never crash
if ! command -v jq &>/dev/null; then
  echo '{"decision":"approve"}'
  exit 0
fi

HOOK_INPUT=$(cat 2>/dev/null || echo '{}')

TOOL_NAME=$(echo "$HOOK_INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
EXIT_CODE=$(echo "$HOOK_INPUT" | jq -r '.tool_result.exit_code // 0' 2>/dev/null)
STDOUT=$(echo "$HOOK_INPUT" | jq -r '.tool_result.stdout // empty' 2>/dev/null | tail -5)

# Only act on Bash tool completions
if [ "$TOOL_NAME" != "Bash" ]; then
  echo '{"decision":"approve"}'
  exit 0
fi

# Track sequential bash calls via temp state file
STATE_FILE="/tmp/claude-auto-run-task-state"
CURRENT_COUNT=0

if [ -f "$STATE_FILE" ]; then
  CURRENT_COUNT=$(cat "$STATE_FILE" 2>/dev/null || echo "0")
fi

CURRENT_COUNT=$((CURRENT_COUNT + 1))
echo "$CURRENT_COUNT" > "$STATE_FILE" 2>/dev/null

# Non-zero exit code — warn and reset counter
if [ "$EXIT_CODE" != "0" ] && [ "$EXIT_CODE" != "null" ]; then
  echo "0" > "$STATE_FILE" 2>/dev/null
  echo "{\"decision\":\"warn\",\"message\":\"Bash exited with status $EXIT_CODE. Review output before continuing.\"}"
  exit 0
fi

# After 3+ sequential bash calls with file-like output, suggest reading
if [ "$CURRENT_COUNT" -ge 3 ]; then
  if echo "$STDOUT" | grep -qE '\.(ts|js|json|log|txt|env)' 2>/dev/null; then
    echo '{"decision":"warn","message":"3+ sequential Bash calls detected. Consider reading output files to verify state."}'
    exit 0
  fi
fi

echo '{"decision":"approve"}'
exit 0

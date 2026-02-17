#!/usr/bin/env bash
# auto-task-output hook — PostToolUse: Bash | TaskOutput
# Tracks background tasks and warns if unchecked for >30 seconds.
# Cleans up tracking when TaskOutput is called.
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
TASK_STATE="/tmp/claude-background-tasks"

case "$TOOL_NAME" in
  Bash)
    IS_BACKGROUND=$(echo "$HOOK_INPUT" | jq -r '.tool_input.run_in_background // false' 2>/dev/null)
    TASK_ID=$(echo "$HOOK_INPUT" | jq -r '.tool_result.task_id // empty' 2>/dev/null)

    # Register new background task
    if [ "$IS_BACKGROUND" = "true" ] && [ -n "$TASK_ID" ]; then
      echo "$TASK_ID $(date +%s)" >> "$TASK_STATE" 2>/dev/null
    fi

    # Warn if tasks have been unchecked for >30s
    if [ -f "$TASK_STATE" ]; then
      UNCHECKED=$(wc -l < "$TASK_STATE" 2>/dev/null | tr -d ' ')
      if [ "$UNCHECKED" -gt 0 ]; then
        OLDEST_TS=$(head -1 "$TASK_STATE" 2>/dev/null | awk '{print $2}')
        NOW=$(date +%s)
        if [ -n "$OLDEST_TS" ]; then
          AGE=$((NOW - OLDEST_TS))
          if [ "$AGE" -gt 30 ]; then
            echo "{\"decision\":\"warn\",\"message\":\"${UNCHECKED} background task(s) unchecked for ${AGE}s. Use TaskOutput to check before running more commands.\"}"
            exit 0
          fi
        fi
      fi
    fi
    ;;

  TaskOutput)
    # Remove checked task from tracking
    CHECKED_ID=$(echo "$HOOK_INPUT" | jq -r '.tool_input.task_id // empty' 2>/dev/null)
    if [ -n "$CHECKED_ID" ] && [ -f "$TASK_STATE" ]; then
      grep -v "^$CHECKED_ID " "$TASK_STATE" > "${TASK_STATE}.tmp" 2>/dev/null || true
      mv "${TASK_STATE}.tmp" "$TASK_STATE" 2>/dev/null || true
      [ ! -s "$TASK_STATE" ] && rm -f "$TASK_STATE" 2>/dev/null
    fi
    ;;
esac

echo '{"decision":"approve"}'
exit 0

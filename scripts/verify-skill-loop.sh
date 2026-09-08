#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
python3 shared/iteration-engine/sync.py --check
python3 gtm-ai-plugin/scripts/sync-autoresearch.py --check
node --test plugins/skill-loop/tests/*.test.mjs fix-your-tracking/.claude/skills/gtm-autoresearch-loop/scripts/runtime/test/*.test.mjs

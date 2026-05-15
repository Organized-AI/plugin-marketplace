#!/usr/bin/env bash
set -euo pipefail
PROJECT="${1:-.}"
SAMPLES="${2:-12}"
npx --yes hyperframes lint "$PROJECT"
npx --yes hyperframes inspect "$PROJECT" --samples "$SAMPLES" --json

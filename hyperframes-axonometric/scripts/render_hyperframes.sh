#!/usr/bin/env bash
set -euo pipefail
PROJECT="${1:-.}"
OUTPUT="${2:-renders/axonometric-system-map.mp4}"
QUALITY="${3:-draft}"
mkdir -p "$(dirname "$OUTPUT")"
npx --yes hyperframes render "$PROJECT" --output "$OUTPUT" --quality "$QUALITY" --workers 1
ffprobe -v error -show_entries format=duration,size -of default=noprint_wrappers=1 "$OUTPUT"

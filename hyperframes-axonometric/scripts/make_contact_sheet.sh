#!/usr/bin/env bash
set -euo pipefail
VIDEO="$1"
OUTPUT="${2:-renders/contact-sheet.jpg}"
mkdir -p "$(dirname "$OUTPUT")"
ffmpeg -y -i "$VIDEO" -vf "fps=1,scale=320:-1,tile=4x3" -frames:v 1 "$OUTPUT" >/dev/null 2>&1
file "$OUTPUT"

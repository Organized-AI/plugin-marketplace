#!/usr/bin/env bash
set -euo pipefail
VIDEO="$1"
OUTDIR="${2:-renders/frames}"
mkdir -p "$OUTDIR"
for t in 1 4 8 11; do
  ffmpeg -y -ss "$t" -i "$VIDEO" -frames:v 1 "$OUTDIR/preview-${t}s.png" >/dev/null 2>&1
  echo "$OUTDIR/preview-${t}s.png"
done

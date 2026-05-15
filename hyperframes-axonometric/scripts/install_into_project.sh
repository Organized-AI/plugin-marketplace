#!/usr/bin/env bash
set -euo pipefail
TARGET="${1:-}"
if [ -z "$TARGET" ]; then echo "usage: $0 /path/to/project" >&2; exit 2; fi
mkdir -p "$TARGET/.codex/prompts" "$TARGET/scripts" "$TARGET/templates" "$TARGET/skills"
cp AGENTS.md "$TARGET/AGENTS.md"
cp prompts/*.md "$TARGET/.codex/prompts/"
cp scripts/export_preview_frames.sh scripts/make_contact_sheet.sh scripts/render_hyperframes.sh scripts/inspect_hyperframes.sh "$TARGET/scripts/"
cp -R templates/hyperframes-axonometric-starter "$TARGET/templates/"
cp skills/*.md "$TARGET/skills/" 2>/dev/null || true
echo "Installed Codex HyperFrames axonometric plugin into $TARGET"
echo "Try: cd $TARGET && codex exec --skip-git-repo-check "\$(cat .codex/prompts/build-axonometric-video.md)""

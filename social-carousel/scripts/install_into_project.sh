#!/usr/bin/env bash
set -euo pipefail
TARGET="${1:-}"
if [ -z "$TARGET" ]; then echo "usage: $0 /path/to/project" >&2; exit 2; fi
mkdir -p "$TARGET/.codex/prompts" "$TARGET/skills" "$TARGET/templates" "$TARGET/scripts"
cp AGENTS.md "$TARGET/AGENTS.md"
cp CLAUDE.md "$TARGET/CLAUDE.md"
cp prompts/*.md "$TARGET/.codex/prompts/"
cp skills/*.md "$TARGET/skills/" 2>/dev/null || true
cp -R templates/social-carousel-starter "$TARGET/templates/"
echo "Installed social-carousel plugin scaffold into $TARGET"
echo "Next: fill templates/social-carousel-starter/carousel-brief.json and run codex with .codex/prompts/build-social-carousel.md"

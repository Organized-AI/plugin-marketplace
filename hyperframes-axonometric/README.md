# Codex Plugin: HyperFrames Axonometric Architecture Video

This is a Codex-ready plugin scaffold for producing the specific axonometric architecture video style: HyperFrames HTML compositions, architectural cutaway system maps, readable labels, render QA, preview frames, and contact sheets.

Codex CLI does not need a binary plugin loader for this to work. The practical plugin surface is:

1. `AGENTS.md` - Codex operating instructions for this specialty.
2. `prompts/*.md` - reusable task prompts to paste into `codex exec`.
3. `templates/` - starter HyperFrames composition.
4. `scripts/` - lint/inspect/render/preview helpers.
5. `skills/` - full Hermes production notes copied as reference material.

## Install into a project

```bash
unzip codex-hyperframes-axonometric-plugin.zip
cd codex-hyperframes-axonometric-plugin/codex-plugin
./scripts/install_into_project.sh /path/to/video-project
```

Then run Codex in that project:

```bash
cd /path/to/video-project
codex exec --skip-git-repo-check "$(cat .codex/prompts/build-axonometric-video.md)"
```

If the project is a git repo, omit `--skip-git-repo-check`.

## Style contract

- Architectural cutaway systems, not generic floating boxes.
- Layered slabs, bridges, terraces, glass volumes, blueprint grids, columns/fins.
- Flat readable labels outside the perspective mesh.
- Offset angular plates and chevrons instead of central circles/medallions.
- Validate with lint + inspect before render; return MP4 + preview frames/contact sheet.

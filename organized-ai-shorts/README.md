# Organized AI Shorts

A production-ready workflow for turning permitted YouTube Shorts, Instagram Reels, Facebook Reels, internal footage, and repo demos into original Organized AI Shorts and companion carousels.

## First use

1. Start with `prompts/build-short.md` and provide the source URL, rights/usage note, topic, audience, and desired platform.
2. Load `skills/reel-ingestion-and-variation/SKILL.md`.
3. Use the reference files under `skills/reel-ingestion-and-variation/references/` for channel style, Hermes workflow, originality, and carousel output.
4. Create a manifest from `templates/short-carousel-brief.json` when a carousel is part of the deliverable.
5. Run `python3 scripts/validate_brief.py <manifest.json>` before rendering.

The plugin is intentionally dependency-light: it supplies the production contract and prompts; rendering may use installed `yt-dlp`, FFmpeg, PIL, Remotion, HyperFrames, or Three.js according to the project.

## Outputs

Every production run should leave a manifest, original script, timed shot list, rendered MP4, contact sheet, QA frames, and variance map. For carousel mode, also return every 4:5 slide and an optional preview MP4.

Source creator logos, watermarks, faces, voices, exact scripts, and distinctive marks are not part of this plugin.

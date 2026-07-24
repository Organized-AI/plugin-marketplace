---
name: reel-ingestion-and-variation
description: Ingest YouTube Shorts, Instagram Reels, and Facebook Reels; derive structure, pacing, typography, motion, and topic patterns; then produce materially original Organized AI variants with production QA.
---

# Organized AI Shorts

Use this skill when building the Organized AI Shorts channel from reference channels, individual Shorts/Reels, repo demos, product videos, or internal source footage.

## Reference-channel synthesis

The channel target is the intersection of Prism Labs and Forkcast:

- Prism Labs contributes polished icon/product-first thumbnails, 20–23 second explainers, strong first-second hooks, phone/browser compositions, slow zooms, pans, and gradient/particle support.
- Forkcast contributes repo-first evidence, GitHub/README scrolls, hook-first titles, stats/proof, practical use cases, and concise 22–27 second narration.
- Organized AI owns the thesis: one useful agent, repo, protocol, workflow, or infrastructure primitive for builders every day.

Do not copy either channel’s logo, mark, exact assets, voice, script, or distinctive identity. Reuse high-level communication patterns and replace expression with Organized AI’s own examples, graphics, voice, and brand system.

## Production workflow

1. Record source URL, platform, creator, topic, duration, aspect ratio, rights/usage note, and intended audience.
2. Capture permitted references with `yt-dlp` or the local platform workflow. Save metadata, checksum, local media path, contact sheet, and a manifest. Never bypass access controls.
3. Analyze hook timing, shot boundaries, average shot duration, text density, caption position, palette, transitions, sound/voice pattern, evidence moments, and CTA.
4. Write an original script and shot list. Default structure: hook (0–1.5s), evidence (1.5–5s), mechanism (5–10s), builder value (10–16.5s), payoff (16.5–21s), CTA (21–22.5s).
5. Render with PIL/FFmpeg for deterministic motion graphics, Remotion/HyperFrames for HTML compositions, or Three.js for interactive/3D systems visuals.
6. Export platform-safe 9:16 or 4:5 media, high-contrast captions, and a clean CTA. Generate a contact sheet and QA frames at hook, midpoint, payoff, and final frame.

## Organized AI visual system

- Background: `#050608`, `#0A0D0C`, or near-black dashboard surfaces.
- Text: white and muted gray; accent: Organized lime `#B7FF3C`; optional warning amber `#FFCC4D`.
- Use mono uppercase system labels, thin borders, evidence-first cards, terminal/system language, and one lime action word per frame.
- Default caption: bold white fragment, translucent black pill, maximum six words per chunk, one highlighted keyword, low-center safe area.
- Default duration: 22 seconds; default narration: 75–95 words; use 20–30 seconds when the source format calls for it.

## Output contract

Produce a `manifest.json`, original script, beat-timed shot list, rendered MP4, contact sheet, and QA frame set. Include a `variance_map` listing what is preserved structurally and what is changed for brand identity.

Read [hermes-workflow.md](references/hermes-workflow.md) for local Hermes evidence and [variation-policy.md](references/variation-policy.md) before creating a clone-style deliverable.

Build a HyperFrames axonometric architecture video from this project.

Requirements:
- Use the style guide in AGENTS.md.
- If no composition exists, start from `templates/hyperframes-axonometric-starter/index.html`.
- Make the hero object an architectural cutaway system: slabs, terraces, bridges, glass volumes, grid floor, columns/fins, depth shadows.
- Keep labels flat, readable, outside the perspective mesh, and non-overlapping.
- Use angular chevrons/plates for loop labels; do not put circular medallions over the center.
- Register a paused GSAP timeline in `window.__timelines`.
- Run `npx --yes hyperframes lint .` and `npx --yes hyperframes inspect . --samples 12 --json`.
- Render draft MP4 to `renders/axonometric-system-map.mp4`.
- Export preview frames and a contact sheet using scripts in `scripts/`.
- Report the files produced and any remaining limitations.

---
name: hyperframes-axonometric-system-map
description: Build and render an axonometric system-map video/visual using HyperFrames HTML compositions, including lint/inspect/render workflow and macOS browser-rendering fixes.
version: 1.0.0
tags: [hyperframes, video, axonometric, system-map, gsap, rendering, macos]
---

# HyperFrames Axonometric System Map

Use this when the user asks to make an axonometric/isometric representation of a product, architecture, company brain, workflow system, or conceptual stack using HyperFrames.

## Workflow

1. **Clone/inspect HyperFrames if not already available**
   ```bash
   git clone https://github.com/heygen-com/hyperframes ~/projects/hyperframes 2>/dev/null || true
   npx --yes hyperframes --version
   node -v
   ffmpeg -version | head -1
   ```

2. **Author an HTML-native composition**
   - Create a project folder such as:
     ```txt
     <repo>/hyperframes/<project-name>/index.html
     ```
   - Use a root composition div:
     ```html
     <div id="stage" data-composition-id="project-id" data-start="0" data-duration="12" data-width="1920" data-height="1080">
     ```
   - Avoid selectors like `#stage[data-composition-id="..."]`; HyperFrames lint warns `composition_self_attribute_selector`. Use `#stage` instead.
   - Include GSAP and register a paused timeline:
     ```html
     <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
     <script>
       window.__timelines = window.__timelines || {};
       const tl = gsap.timeline({ paused: true });
       // animation steps...
       window.__timelines["project-id"] = tl;
     </script>
     ```

3. **Axonometric design pattern**
   - Use a dark product-docs visual language if matching Organized AI style:
     - background `#05080c`
     - surface `#090d14`
     - border `#18283a`
     - text `#d8e8f4`
     - yellow/gold accent `#f5d623`
     - cyan `#40c8e0`
     - green `#40c870`
     - purple `#a070f0`
     - orange `#f08040`
   - Build a 3D-looking field with CSS transforms:
     ```css
     .iso-wrap { perspective: 1600px; }
     .iso-world { transform-style: preserve-3d; transform: rotateX(60deg) rotateZ(-42deg); }
     ```
   - Represent layers as extruded blocks with `.top`, `.front`, `.side` faces using `translateZ`, `rotateX`, and `rotateY`.
   - Keep semantic color coordination: central/company brain = gold, runtime/team layers = cyan, roles = purple, skills = green, knowledge/library = orange, fleet/agents = red.

4. **Lint first**
   ```bash
   npx --yes hyperframes lint hyperframes/<project-name>
   ```
   Fix all errors and ideally all warnings before rendering.

5. **Inspect layout**
   ```bash
   npx --yes hyperframes inspect hyperframes/<project-name> --samples 8 --json
   ```
   Target: `ok: true`, `errorCount: 0`, `warningCount: 0`.

## macOS Browser Rendering Pitfalls

HyperFrames may report Chrome as `/opt/homebrew/bin/chromium`, but that Homebrew shim can point to a missing app:

```txt
/Applications/Chromium.app/Contents/MacOS/Chromium: No such file or directory
```

Fix by installing Chrome for Testing and aliasing it where the shim expects Chromium:

```bash
npx --yes @puppeteer/browsers install chrome@stable --path ~/.cache/puppeteer
npx --yes @puppeteer/browsers install chrome-headless-shell@stable --path ~/.cache/puppeteer

python - <<'PY'
from pathlib import Path
src = Path.home()/'.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app'
dst = Path('/Applications/Chromium.app')
if src.exists() and not dst.exists():
    dst.symlink_to(src, target_is_directory=True)
macos = src/'Contents/MacOS'
binary = macos/'Google Chrome for Testing'
alias = macos/'Chromium'
if binary.exists() and not alias.exists():
    alias.symlink_to(binary)
PY
```

Adjust the version path if Puppeteer installs a newer version.

If using the headless shell directly:

```bash
export PRODUCER_HEADLESS_SHELL_PATH="$HOME/.cache/puppeteer/chrome-headless-shell/mac_arm-<version>/chrome-headless-shell-mac-arm64/chrome-headless-shell"
```

## Apple Silicon Docker Pitfall

On Apple Silicon, `npx hyperframes render --docker` can build and then fail under qemu with errors like:

```txt
qemu: unknown option 'type=gpu-process'
Received signal 11 SEGV_MAPERR
Docker render exited with code 1
```

Prefer local rendering with Chrome for Testing/headless shell instead of Docker on macOS/arm64.

## Render

```bash
mkdir -p renders
export PRODUCER_HEADLESS_SHELL_PATH="$HOME/.cache/puppeteer/chrome-headless-shell/mac_arm-<version>/chrome-headless-shell-mac-arm64/chrome-headless-shell"
npx --yes hyperframes render hyperframes/<project-name> \
  --output renders/<project-name>.mp4 \
  --quality draft \
  --workers 1
```

Use `--quality high` only after the draft is approved.

## Export Preview Frame

```bash
ffmpeg -y -ss 00:00:05 -i renders/<project-name>.mp4 -frames:v 1 renders/<project-name>-preview.png
```

## Verification Checklist

- `npx --yes hyperframes --version` works.
- `hyperframes lint` returns 0 errors and 0 warnings.
- `hyperframes inspect` returns `ok: true` with 0 issues.
- MP4 exists and has nonzero size.
- Preview PNG exists and has nonzero size.
- Return both media artifacts to the user:
  ```txt
  MEDIA:/absolute/path/to/render.mp4
  MEDIA:/absolute/path/to/preview.png
  ```

## Reference-Image Matching Workflow

When the user provides a visual reference and asks the HyperFrames composition to move closer to it:

1. Save the reference image into the project as a stable artifact, e.g. `reference-brain-style.jpg`, so the source of truth is not only in chat cache.
2. If vision analysis fails, still use the screenshot/artifact and simple local inspection as a fallback. A quick PIL color/shape proxy is often enough to infer palette dominance and composition:
   ```python
   from PIL import Image
   from collections import Counter
   img = Image.open("reference.jpg").resize((80, 60)).convert("RGB")
   # Bucket colors or print an ASCII/color map to estimate dominant fields.
   ```
   If both `vision_analyze` and browser vision fail due provider/model mismatch, do not stall; use local PIL inspection plus the user's visual direction and clearly mark the result as a first-pass interpretation.
3. If the linked source repo is private or unavailable, try `gh repo view`/browser to confirm access. If inaccessible, proceed from the known workflow/product surface, but include a short limitation note in the final so the user knows the architecture text was inferred rather than repo-derived.
4. For a fast static deliverable, it is acceptable to generate a polished PNG directly with PIL before building a full HyperFrames/MP4 composition. Reuse the same visual grammar: textured dark background, muted vignette/glow, axonometric cuboids with top/front/side faces, semantic colors, connector lines, callout panels, and an explicit loop strip.
5. Translate the reference into concrete CSS/PIL decisions instead of vague similarity:
   - resize/reposition the `.iso-wrap` and central object so the reference's hero element dominates the frame;
   - shift gradients and glows to the reference palette;
   - tone down supporting nodes via opacity/scale when the hero should carry the composition;
   - add multiple pseudo-3D lobes/slices rather than a single flat clipped path for organic forms;
   - animate the object details (pulse/stagger/scale) as well as the whole object rotation.
6. Validate after every style rewrite with `hyperframes lint` and `hyperframes inspect`, then render a draft MP4 plus a preview PNG for conversational review. For PIL-only static outputs, at minimum run the generator, verify `file`/dimensions/nonzero size, and return the PNG as media.

For blue/green/purple “living brain” references specifically, use a deep blue field, cyan/teal/green/purple lobes, soft cyan glow, darker back/mid depth slices, hidden/low-emphasis labels, and lobe pulse animation to make the brain feel alive.

## User-Facing Design Pitfalls

### Readability vs. 3D tilt

When the user asks to "tilt the layers" or make an axonometric stack more dimensional, do not maximize perspective at the expense of readability. A very steep transform such as `rotateX(60deg) rotateZ(-42deg)` can make labels and icons feel crushed or overlap explanatory copy. Prefer a moderate tilt first, then iterate from rendered evidence:

```css
.world {
  transform-style: preserve-3d;
  transform: rotateX(52deg) rotateZ(-28deg) scale(.88);
}
```

Practical fixes from a successful Organized Harness poster iteration:
- shift the tilted stack away from side/body copy before increasing tile size;
- reduce scale slightly when enlarged labels collide with callouts;
- enlarge layer headings and small node labels after reducing the angle;
- add a dark translucent backing/border behind tiny icon labels so they remain readable over colored slabs;
- run OCR or visual inspection on the exported PNG to catch text that looks good in CSS but becomes unreadable under perspective.

Zu's axonometric taste notes for this workflow:
- keep labels quick-glance readable and never overlapping;
- prefer architectural cutaway systems over generic floating boxes;
- use layered slabs, bridges/walkways, terraces, transparent/glass volumes, blueprint/grid underlays, columns/fins, and tasteful depth/shadows;
- preserve clean label cards and spacing even when increasing architectural complexity.
- add a dark translucent backing/border behind tiny icon labels so they remain readable over colored slabs;
- fit-check every label box before returning the render: measure text width and height against its card, and also check vertical panel overflow after wrapped bullets (text can fit line-by-line but still spill below the panel);
- if a user says the image design is weak but labels are approved, preserve the label layout/copy exactly and iterate only the architecture/visual object (e.g. terraced plinths, atrium volumes, bridges, columns, blueprint grids, orbit lines);
- for stronger design exploration, optionally spin up Claude Code/Claude as a design co-agent to propose composition variants, then render/check the final artifact locally;
- run OCR or visual inspection on the exported PNG to catch text that looks good in CSS but becomes unreadable under perspective.
- keep card copy short and scannable (1 title + 2-3 bullets, not dense paragraphs);
- add a dark translucent backing/border behind tiny icon labels so they remain readable over colored slabs;
- programmatically check text bounding boxes against card rectangles where possible; fail/re-render until there are zero overflow issues;
- run OCR or visual inspection on the exported PNG to catch text that looks good in CSS/PIL but becomes unreadable under perspective.

### Angular architectural loop labels pattern

When a circular/central medallion label blocks an axonometric stack, replace it with an **offset angular label system** rather than shrinking the circle. Keep the architectural object unobstructed:
- remove circular center badges/medallions over the hero stack;
- place the loop description below or beside the stack as clipped polygon plates/chevrons (`clip-path: polygon(...)`), using angled edges that match the architectural visual language;
- represent loop steps as a horizontal chevron chain (`Plan → Probe → Score → Refine`) instead of orbiting pills;
- animate angular labels with wipe/slide reveals after the stack has finished building, not during the critical assembly frames;
- add these labels to timeline/layout overlap checks, and keep them in separate vertical bands from cards/footer/title.

Example CSS shape language:
```css
.angular-loop .kicker { clip-path: polygon(0 0,100% 0,82% 100%,0 100%); }
.angular-loop .plate { clip-path: polygon(8% 0,100% 0,92% 100%,0 100%); }
.astep { clip-path: polygon(0 0,88% 0,100% 50%,88% 100%,0 100%,10% 50%); }
```

- If the user asks for an "axonometric" representation, do **not** necessarily put the word "axonometric" in the visible title/copy. Treat it as a visual style direction unless they explicitly ask for that label.
- Preserve approved/product text unless the user asks for copy changes. In one OrganizedBrain iteration, changing the headline from "Company brain you can see" to "Axonometric brain..." was wrong because the user wanted the graphic changed, not the messaging.
- For "brain" concepts, prefer making the central object visually brain-shaped (layered lobes/folds/stem, depth slices, glow/shadow) rather than a cuboid labeled "Brain".
- To communicate 3D, animate the object itself, not only the camera/world:
  ```js
  tl.to(".company .brain-core", {
    rotationY: 360,
    rotationZ: 8,
    duration: 4.8,
    ease: "none"
  }, 5.6)
  ```
- Keep internal composition IDs/file names stable even if they contain words like `axonometric`; the user correction applies to visible text/output, not necessarily internal identifiers.

## Runtime / GSAP Pitfalls

When authoring HyperFrames animations with GSAP:

- Do **not** animate CSS pseudo-elements such as `#stage::after` with GSAP; browser/GSAP targeting can silently fail or behave inconsistently in render. Use a real DOM element such as `.scanline` for animated sweep/scan effects.
- Do **not** assume GSAP plugins are available from the base CDN script. `motionPath` requires MotionPathPlugin; if only `gsap.min.js` is loaded, use `keyframes`/regular transforms for packet-loop motion instead of `motionPath`.
- HyperFrames deterministic font compiler may warn on Apple/system font names such as `SF Pro Display`. Prefer mapped font names (`Inter`, `Roboto`, `Montserrat`, etc.) in CSS for clean renders, or add explicit `@font-face` rules.

## Brand Watermark / Outro Logo Pattern

When the user provides a logo during a HyperFrames iteration and asks for a watermark plus bright closing outro:

1. Copy the uploaded asset into the composition folder so the render is self-contained:
   ```python
   from pathlib import Path
   Path("hyperframes/<project>/brand-logo.jpeg").write_bytes(Path("/path/from/chat.jpeg").read_bytes())
   ```
2. If the source is a flat JPEG with a solid brand-color background, create a transparent watermark PNG with PIL by sampling/removing the border/background color. Crop to the alpha bounding box with padding. Use the original full-color logo for the outro and the transparent PNG for in-video watermark.
3. Place the watermark as a low-opacity, non-interactive overlay with a safe z-index below major text but above the background/architecture:
   ```css
   .logo-watermark{
     position:absolute; right:42px; bottom:92px; width:178px; z-index:19;
     opacity:.18; mix-blend-mode:screen; pointer-events:none;
     filter:drop-shadow(0 0 18px rgba(245,180,0,.34));
   }
   ```
4. For the closing outro, use the bright original logo at large scale with glow/brightness/saturation, then animate it in before or alongside the final title:
   ```css
   .outro-logo{width:560px; opacity:0; filter:brightness(1.35) saturate(1.35) drop-shadow(0 0 34px rgba(245,180,0,.55));}
   ```
   ```js
   tl.fromTo(".outro-logo", {autoAlpha:0, scale:.88}, {autoAlpha:1, scale:1, duration:.75}, 11.65)
   ```
5. Re-run `hyperframes lint`, `hyperframes inspect`, render a draft MP4, then export both an outro preview frame and a contact sheet so the watermark and closing logo are visible in review.

## Text-Safety During Animation

If the user says text is being blocked during animation, do not only inspect the final still. Patch the composition so moving architecture, scanlines, packets, and glows cannot cross over copy:

- raise all major text/card/label containers above animated architecture with explicit z-indexes;
- lower scanlines and decorative beams below text and reduce opacity;
- add dark translucent backing, blur, borders, or text-shadow behind labels and cards;
- keep `pointer-events:none` on purely decorative overlays;
- inspect multiple samples across the timeline (`--samples 12` or more), then export a contact sheet from the rendered MP4 to quickly catch transient obstruction.

## Full-Height Vertical Build Pattern

When the user wants the structure to use “more vertical space” or take up the “entire vertical space” in a 9:16 HyperFrames system-map video, treat the build phase and card phase as separate layouts instead of compromising with one static layout:

1. **Build phase: make the architecture dominate the canvas.** Move the scene high and give it a tall container/perspective field, e.g. `top:150px; height:1120px; perspective:3400px`, then scale the axonometric world up enough to span most of the vertical frame.
2. **Keep labels readable in flat screen-space.** Do not put important labels inside the perspective-transformed mesh when enlarging the structure. Use left/right label columns with dark translucent backing, larger min-heights, generous vertical gaps, text-shadow, and leader lines. Spread labels vertically; do not stack them tightly near the object.
3. **Use `hyperframes inspect --samples 12+ --json` as a hard gate.** Enlarged axonometric objects often push transformed label text off-canvas by a few pixels. Fix by shifting the `.axo` world inward/right, trimming scale slightly, or moving decorative labels like compass text inside the canvas. Keep iterating until `ok: true` with 0 issues.
4. **Transition to cards by changing layout, not by squeezing cards into the build view.** At the card beat, fade out build-only labels (`.specs`, `.levels`, `.rail`, sheet metadata), then slide the `.scene` up and scale it down aggressively before revealing cards:
   ```js
   tl.to([".specs", ".levels", ".rail", ".titleblock"], {autoAlpha:0, y:-16, duration:.48}, 8.22)
     .to(".scene", {y:-285, scale:.58, duration:.9, ease:"power2.inOut"}, 8.22)
     .to(".card", {autoAlpha:1, y:0, stagger:.22, duration:.55}, 8.78)
   ```
5. **Return separate preview frames** for the full-height build phase and the post-transition cards phase, plus a contact sheet. This makes it easy for the user to judge both the architectural scale and the later readability.

## Editing Pitfall

When programmatically editing HTML through helper tools, do not write back line-numbered `read_file` output. If accidental prefixes like `75|` or `   75|` appear, strip them before linting/rendering:

```python
import re
from pathlib import Path
p = Path("hyperframes/<project-name>/index.html")
lines = []
for line in p.read_text().splitlines():
    m = re.match(r"^\s*\d+\|(.*)$", line)
    lines.append(m.group(1) if m else line)
p.write_text("\n".join(lines) + "\n")
```

## Iteration Lessons from GTM Autoresearch Rebuild

When the user says a render is “good, but missing axonometric design context,” treat it as a request to make the spatial construction visibly axonometric, not just to tilt a flat diagram. Concrete fixes that worked:

- Add a visible isometric/axonometric grid floor and axis/context labels.
- Build actual extruded elements with separate `.top`, `.front`, and `.side` faces rather than single flat parallelograms.
- Use terraced slabs/platforms, towers, riser pipes, connector columns, and packet motion that climbs/loops through the stack.
- Keep readable text outside the perspective-transformed mesh in flat callouts/cards; use leader lines back to the 3D object.
- Add blueprint/context annotations such as “30° axonometric design context,” “evidence stack,” or measurement-style labels when the reference direction implies an architectural/system-map style.
- Avoid circular center medallions/orbit widgets in architectural axonometric maps unless explicitly requested. They can feel visually out of place and block the geometry. Prefer offset angular components: clipped polygon plates, chevron step labels (`plan → probe → score → refine`), slanted callout tags, measurement bars, and leader lines placed outside the 3D object. Keep the central architecture unobstructed.

If the user adds example/reference files “to memory,” first inspect recent files in `~/.hermes/image_cache` sorted by modification time. Vision tooling can fail under provider/model mismatch; don’t block on it. Generate a quick PIL contact sheet of recent images and/or use local image dimensions/color inspection as fallback, then proceed.

If using Claude Code as a design co-agent, prefer non-interactive print mode to avoid onboarding/theme/auth prompts even after `claude auth status` succeeds:

```bash
claude -p --dangerously-skip-permissions --add-dir /path/to/project \
  'Inspect the reference images and rewrite index.html ...'
```

If a full Claude file-editing run hangs/times out, or if the goal is design direction more than code edits, pivot to a tool-disabled design brief and implement locally in Hermes/HyperFrames:

```bash
claude -p --model opus --effort high --tools '' -- \
  "Design direction only, no file edits. For a vertical 900x1600 HyperFrames poster/video titled ..., propose a dramatically different premium axonometric architectural composition from a basic stacked-plane diagram. Include layout, palette, labels, and animation beats."
```

Use the brief to force a new silhouette/composition, not just restyling. A successful GTM Autoresearch course-correction turned a simple stacked-plane diagram into a blueprint/cutaway research foundry with registration marks, measured side annotations, extruded slabs, dashed guide columns, pipes, packet travel, and staged cards.

After Claude or another helper writes files, check for extra root HTML files. HyperFrames lint fails with `multiple_root_compositions` if files like `index.before-claude.html` remain in the project root. Move backups into an archive directory outside the root lint surface or rename them with a non-HTML extension before linting/rendering.

If the user challenges whether Claude was used because the result looks like a prior iteration, treat that as both a quality-method correction and an expectation check. Answer honestly; do not imply Claude was used if the pass was implemented directly. For Zu specifically, “use Claude for design” is a standing expectation for new visual-design passes; do not silently substitute local CSS/SVG iteration when Claude/design-agent input was requested or implied. On the next substantive design pass, actually invoke Claude Code/Claude as the design co-agent, or clearly label the work as a quick local corrective patch before rendering.

Do not respond only with an apology. Immediately make a concrete HyperFrames change that materially alters silhouette/motion/readability, then validate with `lint`, `inspect`, and a rendered artifact. If making only a local corrective patch, say so plainly and avoid presenting it as a Claude-designed redesign. If vision/model tooling fails, use local artifacts anyway: generate a contact sheet, inspect dimensions/colors with PIL, and compare the produced render against the reference by eye/browser rather than stalling.

If the user says to keep the current design/functionality and only change background/color scheme to match a reference, do not rebuild the geometry or copy. Use Claude as a **design-direction/palette co-agent** (`claude -p --tools ''`) rather than a file-editing agent, then implement the CSS/SVG color changes locally. If vision analysis is unavailable, sample the reference with PIL (`quantize`, edge/center averages, saturation/hue buckets) to derive concrete tokens. A successful moody reference-match used: near-black charcoal `#040608/#06090a/#070b0c`, green-black surfaces `#0c1112/#161e1d`, muted olive/stone strokes `#21231d/#333839/#828771`, and sparse warm highlights `#c9b48a/#b08f5a`. Preserve layout/labels/motion, run `hyperframes lint`, `hyperframes inspect --samples 18 --json`, render a draft MP4, and return build/cards preview frames plus a contact sheet so the user can judge the color change quickly.

Reusable fix from the GTM Autoresearch “looks exactly like the first one” correction:
- If the reference/approved frame has a clean axonometric SVG/architectural silhouette, avoid handing off to a separate CSS-3D cuboid model just to create motion; it can look like a distorted duplicate or broken first pass.
- Prefer preserving the clean generated SVG structure and adding gentle camera drift (`x/y/scale` with `sine.inOut`) over aggressive perspective rotation when readability/reference fidelity matters.
- Hide/remove the warped 3D layer explicitly (`.model3d { autoAlpha:0 }` or timeline `.set`) instead of leaving both SVG and 3D structures competing.
- Export a preview frame and contact strip after the correction so the user can quickly judge whether the design actually changed.

Reusable fix from the GTM Autoresearch spin correction:
- Extend timeline duration when the user expects a real sequence, not a short loop (`data-duration="30"` for a 30s piece).
- For left-to-right / rotating axonometric motion, animate the architectural object/container itself with `rotationY` over a long span, but keep important labels in flat screen-space outside the rotating object.
- Hide or remove transformed SVG/text annotations before the spin (`.callout`, `.tier`, `.dim-text`, etc.) if HyperFrames inspect reports transient off-canvas overflow during rotation.
- Add persistent side labels/section plates with leader lines as separate DOM layers above the rotating structure; these remain readable while the structure spins underneath.
- Re-run `hyperframes inspect --samples 18 --json` after timeline changes, because transient text overflow may only appear mid-animation.
- Render the MP4 plus a contact sheet/preview frame so the user can verify that motion changed, not just the first frame.

## Notes

For users in walk/voice mode, include a short TTS summary alongside media deliverables.
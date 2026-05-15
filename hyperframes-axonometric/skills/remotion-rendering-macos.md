---
name: remotion-rendering-macos
description: Diagnose and fix local Remotion rendering on macOS when projects depend on a browser executable such as /opt/homebrew/bin/chromium, especially when Homebrew Chromium links are broken.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [remotion, macos, chromium, rendering, troubleshooting, homebrew]
---

# Remotion Rendering on macOS

## When to use

Use this skill when:
- a local Remotion project on macOS fails to render
- the render pipeline depends on `browserExecutable` or `REMOTION_CHROME_EXECUTABLE`
- errors mention Chromium, Chrome, or browser launch failures
- Homebrew-installed Chromium appears present but Remotion still cannot launch it

## Common failure signature

Typical error:

```text
Failed to launch the browser process!
/opt/homebrew/bin/chromium: line 2: /Applications/Chromium.app/Contents/MacOS/Chromium: No such file or directory
```

This usually means the project is fine, but the browser path is broken.

## What we learned

A Remotion project may:
- hardcode `/opt/homebrew/bin/chromium`
- default `REMOTION_CHROME_EXECUTABLE` to that path in project code
- stage media successfully, then fail only at the browser-launch step

On macOS, Homebrew Chromium can end up in a broken state where:
- `/opt/homebrew/bin/chromium` exists as a symlink
- the target wrapper or app bundle no longer exists
- `brew install --cask chromium` may fail because the stale binary link already exists

## Diagnostic sequence

### 1. Confirm the project can otherwise render
Check that the manifest and media files exist before touching browser config.

Useful checks:

```bash
python3 - <<'PY'
import json, os
p='public/clips/hicam/260316/clip-manifest.json'
with open(p) as f: data=json.load(f)
print('count', len(data))
for clip in data[:5]:
    print(clip['id'], clip['title'], clip['filename'], clip['durationSecs'])
PY
```

```bash
python3 - <<'PY'
import json, os
p='public/clips/hicam/260316/clip-manifest.json'
with open(p) as f: data=json.load(f)
missing=[]
for clip in data:
    fp=os.path.join('public/clips/hicam/260316/clips', clip['filename'])
    if not os.path.exists(fp):
        missing.append(fp)
print('missing_media', len(missing))
if missing:
    print('\n'.join(missing[:20]))
PY
```

### 2. Inspect the Remotion browser path
Search the project for browser executable configuration:

```bash
search_files("browser-executable|REMOTION_CHROME_EXECUTABLE|Chromium|Google Chrome", path=".", file_glob="*.ts")
```

Also inspect render helpers such as `src/server/render.ts`.

### 3. Check actual browser binaries on macOS
Test likely paths:

```bash
for p in \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  "/Applications/Chromium.app/Contents/MacOS/Chromium" \
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
  "/opt/homebrew/bin/chromium"; do
  [ -e "$p" ] && echo "$p"
done
```

If `/opt/homebrew/bin/chromium` exists, verify whether it is a live symlink:

```bash
ls -l /opt/homebrew/bin/chromium
python3 - <<'PY'
import os
for p in [
 '/opt/homebrew/Caskroom/chromium/latest/chromium.wrapper.sh',
 '/opt/homebrew/Caskroom/chromium/latest/chrome-mac/Chromium.app/Contents/MacOS/Chromium',
 '/Applications/Chromium.app/Contents/MacOS/Chromium',
]:
    print(p, os.path.exists(p))
PY
```

## Recovery pattern for broken Homebrew Chromium

If the Homebrew Chromium binary symlink exists but targets missing files:

1. remove the stale symlink
2. reinstall Chromium cleanly
3. rerun the render

Typical recovery command:

```bash
rm /opt/homebrew/bin/chromium && brew install --cask chromium
```

Important:
- this touches a root-owned path, so approval may be required
- `brew reinstall --cask chromium` alone may fail if the stale binary path already exists

## Safer fallback options

If Chromium installation is undesirable, point Remotion at another installed browser:

```bash
REMOTION_CHROME_EXECUTABLE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run render-clips -- --manifest ...
```

A better Remotion-specific fallback on macOS is to use the browser binary that Remotion downloads itself:

```bash
npx remotion browser ensure
```

Then use the reported binary path, for example:

```bash
export REMOTION_CHROME_EXECUTABLE="node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell"
npm run render-clips -- --manifest public/clips/hicam/260316/clip-manifest.json --media-dir public/clips/hicam/260316/clips
```

This is often more reliable than Homebrew Chromium on macOS.

Important experiential finding:
- a freshly reinstalled Homebrew Chromium may still be a poor choice even after the broken link is fixed
- the app can exist but hang or fail to connect for headless Remotion rendering
- `npx remotion browser ensure` + the downloaded `chrome-headless-shell` was the path that actually unblocked rendering

Recommendation order on macOS:
1. `REMOTION_CHROME_EXECUTABLE` if already set to a known-good binary
2. Remotion-managed browser from `npx remotion browser ensure`
3. other installed browsers (Chrome / Edge)
4. Homebrew Chromium only as a fallback

Or patch the project default in `src/server/render.ts` to prefer:
1. `process.env.REMOTION_CHROME_EXECUTABLE`
2. a Remotion-managed browser path if present
3. Google Chrome
4. Chromium
5. Edge

## Additional macOS failure signature: staged media 404s from /tmp/remotion-bundle

After fixing browser launch, another failure mode can appear:

```text
Received a status code of 404 while downloading file http://localhost:3000/public/clips/...mp4
The requested path (/tmp/remotion-bundle/public/clips/...mp4) could not be found
```

This can happen when the project's bundle staging logic leaves file-level symlinks in place instead of replacing them with real copied files.

Typical pattern:
- bundle `public/` is populated with symlinks to the real public directory
- a helper tries to "stage" large media into `/tmp/remotion-bundle/public/...`
- parent directories become real directories, but the final media file is still a symlink
- Remotion serves from the bundle path and fails to resolve the staged asset correctly

Fix in the staging helper (for example `src/server/render.ts`):

```ts
if (fs.existsSync(dest) && fs.lstatSync(dest).isSymbolicLink()) {
  fs.unlinkSync(dest);
}
fs.copyFileSync(src, dest);
```

In other words: when staging a media file into the bundle, explicitly replace any file-level symlink with a real local copy.

## Reusable packaged Remotion handoff pattern

When the user wants a renderable archive that supports a direct command flow like:

```bash
tar -xzf gtm-autoresearch-remotion.tar.gz
cd gtm-autoresearch-remotion
npm install
npx remotion render GTMAutoresearch out/gtm-autoresearch.mp4
```

package the project so the archive expands to exactly one directory named as expected, with this minimum structure:

```txt
gtm-autoresearch-remotion/
├── package.json
├── remotion.config.ts
├── tsconfig.json
├── public/
│   ├── design.png
│   └── organized-ai-logo.jpeg
└── src/
    ├── index.tsx
    └── GTMAutoresearch.tsx
```

Use `remotion.config.ts` to set the entry point so the user's render command can omit it:

```ts
import {Config} from '@remotion/cli/config';

Config.setEntryPoint('src/index.tsx');
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
```

Register the composition in `src/index.tsx`:

```tsx
import {registerRoot, Composition} from 'remotion';
import React from 'react';
import {GTMAutoresearch} from './GTMAutoresearch';

const Root: React.FC = () => (
  <Composition
    id="GTMAutoresearch"
    component={GTMAutoresearch}
    durationInFrames={336}
    fps={24}
    width={900}
    height={1600}
  />
);

registerRoot(Root);
```

Important pitfall: if `src/index` contains JSX, name it `index.tsx`, not `index.ts`. Otherwise Remotion/esbuild can fail with:

```text
ERROR: Expected ">" but found "id"
```

For image-to-motion videos, a robust pattern is:
- put the final design image in `public/design.png`;
- reveal fixed regions of that image with clipped `<div>` wrappers and `Img` offsets, preserving exact label/design pixels;
- animate scan lines, sparks, glow, and borders as separate SVG/CSS layers;
- add an outro as a final `<AbsoluteFill>` with logo asset and brand copy;
- keep region boxes deterministic so labels do not reflow or overlap during the animation.

Before delivering, test the exact user-facing command sequence from a fresh temp directory and copy both artifacts out:

```bash
WORK=/tmp/gtm-render-command-test-$(date +%s)
mkdir -p "$WORK"
cp /tmp/gtm-autoresearch-remotion.tar.gz "$WORK/"
cd "$WORK"
tar -xzf gtm-autoresearch-remotion.tar.gz
cd gtm-autoresearch-remotion
npm install
npx remotion render GTMAutoresearch out/gtm-autoresearch.mp4
```

Then verify:

```bash
ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height,r_frame_rate,duration \
  -show_entries format=duration,size \
  -of default=noprint_wrappers=1 out/gtm-autoresearch.mp4
```

## Packaging a self-contained Remotion handoff tarball

When the user wants a portable project that renders with a simple command sequence such as:

```bash
tar -xzf gtm-autoresearch-remotion.tar.gz
cd gtm-autoresearch-remotion
npm install
npx remotion render GTMAutoresearch out/gtm-autoresearch.mp4
```

Use this pattern:

1. Create a clean project directory containing:
   - `package.json` with `@remotion/cli`, `@remotion/bundler`, `remotion`, `react`, `react-dom`, and `typescript`.
   - `remotion.config.ts` with `Config.setEntryPoint('src/index.tsx')`.
   - `src/index.tsx` registering the composition via `registerRoot()`.
   - composition source such as `src/GTMAutoresearch.tsx`.
   - any source images/video/logo assets under `public/` and referenced using `staticFile()`.
2. Package with `tar -czf <name>.tar.gz <project-dir>`.
3. Test the exact user-facing command sequence from a fresh temp directory before delivering the tarball.
4. Copy the rendered MP4 and tarball to stable `/tmp/...` paths and return both.

Important experiential finding: JSX in `src/index.ts` can fail during Remotion bundling with an esbuild error like:

```text
ERROR: Expected ">" but found "id"
```

Fix by naming the entry file `src/index.tsx` and setting `Config.setEntryPoint('src/index.tsx')`.

Remotion can auto-download Chrome Headless Shell during `npx remotion render`; do not force `/opt/homebrew/bin/chromium` for these portable tarballs unless the project/user specifically requires it.

## Packaging a Self-Contained Remotion Project for User-Specified Render Commands

When the user wants a deliverable that can be rendered with an exact command sequence such as:

```bash
tar -xzf gtm-autoresearch-remotion.tar.gz
cd gtm-autoresearch-remotion
npm install
npx remotion render GTMAutoresearch out/gtm-autoresearch.mp4
```

use a self-contained Remotion archive pattern:

1. Create a fresh project directory with:
   ```txt
   package.json
   tsconfig.json
   remotion.config.ts
   src/index.tsx
   src/<Composition>.tsx
   public/<assets>
   ```
2. Set the composition ID to exactly match the render command (`GTMAutoresearch` above).
3. Put source images/logos/video stills under `public/` and reference them with `staticFile(...)` in Remotion.
4. Package the directory with the expected root folder name:
   ```python
   import tarfile
   with tarfile.open('/tmp/gtm-autoresearch-remotion.tar.gz', 'w:gz') as tf:
       tf.add(root, arcname='gtm-autoresearch-remotion')
   ```
5. Test the exact user command in a clean temp directory before delivery:
   ```bash
   WORK=/tmp/gtm-render-command-test-$(date +%s)
   mkdir -p "$WORK"
   cp /tmp/gtm-autoresearch-remotion.tar.gz "$WORK/"
   cd "$WORK"
   tar -xzf gtm-autoresearch-remotion.tar.gz
   cd gtm-autoresearch-remotion
   npm install
   npx remotion render GTMAutoresearch out/gtm-autoresearch.mp4
   ```

Important pitfall learned: if the entrypoint contains JSX, name it `src/index.tsx` and point `Config.setEntryPoint('src/index.tsx')`. Using `src/index.ts` with JSX can fail during bundling with:

```txt
ERROR: Expected ">" but found "id"
```

For readable 9:16 animated diagrams, a robust pattern is:
- `900x1600`, `24fps`;
- start from a final static design image in `public/design.png`;
- reveal labelled regions with slow `clipPath`/`inset` wipes rather than rebuilding every label as live text;
- add a subtle ghosted full design underneath so the user can understand context while the build animation progresses;
- extend duration when readability is a goal (e.g. 30s instead of 14s), with slower label reveals and a longer full-screen hold;
- keep the branded outro as the last fixed block (e.g. 3 seconds) using an uploaded logo asset.

## Verification

After fixing the browser path:

```bash
codex --version
npm run render-clips -- --manifest public/clips/hicam/260316/clip-manifest.json --media-dir public/clips/hicam/260316/clips
```

For a direct single-composition render in a local Remotion app, this pattern is known-good on Apple Silicon when using Remotion's managed browser:

```bash
export REMOTION_CHROME_EXECUTABLE="node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell"
npx remotion render src/index.ts TextReveal out/codex-text-reveal.mp4 \
  --props='{"headline":"Organized AI Local Render","subtext":"Codex CLI + Remotion"}' \
  --browser-executable="$REMOTION_CHROME_EXECUTABLE"
```

Expected behavior:
- staging logs appear
- Remotion launches the browser successfully
- outputs land in `out/clips/`

For large batches, verify incrementally rather than assuming all-or-nothing completion:

```bash
python3 - <<'PY'
import os, glob
files=sorted(glob.glob('out/clips/*.mp4'))
print('count', len(files))
for f in files:
    print(os.path.basename(f), round(os.path.getsize(f)/1024/1024,1), 'MB')
PY
```

If the batch is long-running, prefer a background process and monitor progress rather than rerunning the full render repeatedly.

## Pitfalls

- assuming render failure means the clip pipeline is broken when only the browser path is broken
- trusting `/opt/homebrew/bin/chromium` just because it exists
- using `brew reinstall --cask chromium` before removing the stale binary link
- forgetting that the project may hardcode browser paths in scripts or render helpers
- running Remotion renders inside `codex exec --sandbox workspace-write` can fail even when the project is healthy because Codex's sandbox may block local server sockets (`listen EPERM :::3000`). Let Codex inspect/diagnose, but run the actual `npx remotion render ...` in the normal Hermes terminal when local listening is required.

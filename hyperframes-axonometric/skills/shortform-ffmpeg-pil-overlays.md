---
name: shortform-ffmpeg-pil-overlays
description: Create vertical short-form video from long-form source footage using ffmpeg, Whisper/SRT clip selection, and PIL-rendered caption overlays when ffmpeg lacks drawtext/ass filters.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [shortform, video, ffmpeg, captions, pil, whisper, social]
---

# Short-form video with ffmpeg + PIL overlays

## When to use

Use this when the user asks to create a short-form vertical video from long-form source footage, especially podcast/interview footage, and you need to:
- pick a strong clip from a long recording
- make a 9:16 social cut
- add burned-in captions/title cards
- work around ffmpeg builds that lack `drawtext`, `ass`, or `subtitles` filters

## Workflow

1. **Get source media**
   - If given Google Drive folders, inspect with browser first.
   - For public Drive files, `gdown` can download by folder or file ID.
   - If a full folder download is slow or interrupted, download only the main/ATEM file by ID.

2. **Probe media**

   ```bash
   ffprobe -v error -show_entries format=duration -show_streams -of json SOURCE.mp4
   ```

   Look for duration, video size, fps, and audio stream.

3. **Transcribe a useful section**

   Extract audio from likely parts of the recording:

   ```bash
   ffmpeg -y -ss 0 -t 900 -i SOURCE.mp4 -vn -ac 1 -ar 16000 -b:a 64k /tmp/shortform_work/first15.wav
   whisper /tmp/shortform_work/first15.wav --model small --language en --output_format srt --output_dir /tmp/shortform_work --fp16 False --verbose False
   ```

   Review the SRT for strong standalone moments. Good hooks include concise claims, contrarian takes, and quotable lines.

4. **Select clip timing**

   Pick a 20–45s segment around the strongest quote. Example from experience:
   - Hook: “MVPs are cheap now.”
   - Follow-up: “The code is not where the value’s at anymore.”
   - Payoff: “Every business that wins will have a proprietary AI system.”

5. **Create overlays with PIL, not ffmpeg text filters**

   Some Homebrew ffmpeg builds lack `drawtext` and/or `ass` filters:

   ```text
   No such filter: 'drawtext'
   No such filter: 'ass'
   ```

   If this happens, render transparent PNG overlays using PIL:
   - one full-duration title/brand overlay
   - one transparent caption PNG per caption chunk
   - use system fonts like `/System/Library/Fonts/Supplemental/Arial Bold.ttf` on macOS

   PIL overlay pattern:

   ```python
   from PIL import Image, ImageDraw, ImageFont
   W, H = 1080, 1920
   img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
   d = ImageDraw.Draw(img)
   font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 74)
   d.rounded_rectangle((55, 1375, 1025, 1680), radius=34, fill=(0, 0, 0, 95))
   d.text((120, 1480), 'Caption text', font=font, fill=(255,255,255,255), stroke_width=6, stroke_fill=(12,12,12,255))
   img.save('/tmp/shortform_work/overlays/cap_00.png')
   ```

6. **Compose the 9:16 video in ffmpeg**

   Design pattern:
   - blurred full-frame 9:16 background from source
   - centered scaled source video on top
   - subtle white frame around source video
   - title bar / brand overlay
   - timed caption PNG overlays
   - force `setsar=1` at the end so output is true 9:16

   Example filter structure:

   ```text
   [0:v]split=2[bg][fg];
   [bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=24,eq=brightness=-0.10:saturation=0.85[bg2];
   [fg]scale=1000:-2,setsar=1[fg2];
   [bg2][fg2]overlay=(W-w)/2:420,drawbox=x=40:y=400:w=1000:h=565:color=white@0.18:t=4[v0];
   [v0][1:v]overlay=0:0:format=auto[v1];
   [v1][2:v]overlay=0:0:format=auto:enable='between(t,0.0,3.2)'[v2];
   ...;
   [vN]setsar=1[vout]
   ```

   Encode:

   ```bash
   ffmpeg -y -ss START -t DURATION -i SOURCE.mp4 \
     -loop 1 -t DURATION -i title.png \
     -loop 1 -t DURATION -i cap_00.png \
     ... \
     -filter_complex "$FILTER" \
     -map '[vout]' -map 0:a \
     -c:v libx264 -preset veryfast -b:v 4500k -maxrate 5500k -bufsize 9000k \
     -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart \
     output_vertical.mp4
   ```

7. **Verify before delivery**

   ```bash
   ffprobe -v error -select_streams v:0 \
     -show_entries stream=width,height,sample_aspect_ratio,display_aspect_ratio \
     -show_entries format=size,duration \
     -of default=noprint_wrappers=1 output_vertical.mp4
   ```

   Expected:
   - width `1080`
   - height `1920`
   - sample aspect ratio `1:1`
   - display aspect ratio `9:16`
   - sane duration and file size

## Pitfalls

- Google Drive folder downloads can be huge and slow; prefer downloading only the needed file ID when possible.
- Browser/vision tools may fail due model routing; don’t block on visual analysis if the source composition is straightforward.
- ffmpeg may not include `drawtext`, `ass`, or `subtitles`; use PIL transparent PNG overlays as a robust fallback.
- If output reports odd display aspect ratio, append `setsar=1` at the end of the video filter graph.
- Avoid relying on a private GitHub repo/toolkit if anonymous clone fails; make a direct ffmpeg/PIL pass and note the limitation to the user.
- Large output is unnecessary for Slack/social review. A 36s 1080x1920 H.264 AAC MP4 around 10–20MB is easy to deliver.

---
name: screenshot-to-html-poster-redesign
description: Redesign a user-provided screenshot/poster/architecture diagram into a polished editable HTML/CSS poster, using local OCR and Chromium export when vision tools are unavailable.
version: 1.0.0
tags: [design, poster, html, css, screenshot, ocr, chromium, architecture-diagram]
---

# Screenshot to HTML Poster Redesign

Use this when the user sends an image of a diagram/poster/architecture map and asks to redesign it, make it cleaner, or create an editable version.

## Workflow

1. **Inspect the source image locally**
   ```bash
   python - <<'PY'
   from PIL import Image
   from pathlib import Path
   p = Path('/path/to/source.png')
   img = Image.open(p)
   print(img.format, img.size, img.mode, p.stat().st_size)
   im = img.convert('RGB'); im.thumbnail((200,200))
   colors = sorted(im.getcolors(maxcolors=40000), reverse=True)[:12]
   print(colors)
   PY
   ```
   Capture dimensions, dominant palette, and whether it is poster/portrait/landscape.

2. **Try vision, but have a fallback**
   - If `vision_analyze`/browser vision works, use it for layout/content description.
   - If it fails, use macOS native Vision OCR from Swift to recover visible text and rough positions:
     ```swift
     // /tmp/ocr.swift
     import Foundation
     import Vision
     import AppKit

     let path = CommandLine.arguments[1]
     let url = URL(fileURLWithPath: path)
     guard let img = NSImage(contentsOf: url),
           let tiff = img.tiffRepresentation,
           let bitmap = NSBitmapImageRep(data: tiff),
           let cg = bitmap.cgImage else { print("failed image"); exit(1) }

     let request = VNRecognizeTextRequest { request, error in
       let obs = request.results as? [VNRecognizedTextObservation] ?? []
       for o in obs {
         if let cand = o.topCandidates(1).first {
           let bb = o.boundingBox
           print(String(format:"%.3f %.3f %.3f %.3f %@", bb.origin.x, bb.origin.y, bb.size.width, bb.size.height, cand.string))
         }
       }
     }
     request.recognitionLevel = .accurate
     request.usesLanguageCorrection = true
     let handler = VNImageRequestHandler(cgImage: cg, options: [:])
     try handler.perform([request])
     ```
     Run:
     ```bash
     swift /tmp/ocr.swift /path/to/source.png
     ```

3. **Preserve the user's meaning, redesign the hierarchy**
   - Keep core title/subtitle, layer names, technical terms, and citations unless the user asks for copy changes.
   - Convert cramped labels into larger cards with clear hierarchy.
   - Preserve semantic structure (e.g., 3 layers, trace store, feedback loops) while improving readability.
   - Prefer fewer, clearer labels over a literal copy of every tiny source label.

4. **Build an editable HTML/CSS artifact**
   - Match the source aspect ratio exactly when the output should be a drop-in redesign (e.g. `1360x2160`).
   - Use fixed-size `.poster` canvas for reliable export.
   - Put style in the same HTML for portability.
   - Use CSS variables for palette.
   - Use SVG paths for arrows/feedback loops; HTML cards for readable text.
   - Add subtle grain/grid/glow only if it improves clarity.

5. **Export with Chromium**
   ```bash
   chromium --headless --disable-gpu \
     --screenshot=/absolute/path/redesign.png \
     --window-size=1360,2160 \
     file:///absolute/path/redesign.html
   ```
   If Chromium is unavailable, use any installed Chrome/Chromium headless binary.

6. **Verify readability with OCR**
   Run the OCR script on the exported PNG. If important text is misread due to stylized lowercase, tight tracking, or overly compressed fonts, adjust the design:
   - use uppercase for critical title text;
   - increase font size/weight;
   - reduce extreme negative letter spacing;
   - avoid overly narrow cards for code/function names.

7. **Return both artifacts**
   - Send the PNG as media.
   - Mention the editable HTML path.
   - Briefly explain what was preserved and what was improved.

## Design Pattern That Worked

For technical agent-architecture posters:
- dark premium background;
- amber/mint/violet semantic accents;
- large title and subtitle;
- three horizontal layer bands;
- each layer has a left lane label, two or three cards, and SVG feedback arrows;
- footer contains references/citations;
- use cards and loops to make the system legible at a glance rather than copying the original sketch density.

## Pitfalls

- Do not stop at describing the redesign; create actual artifacts.
- Do not over-rewrite technical copy. The user usually wants visual redesign, not a new thesis.
- Browser vision can fail because of model/account support. Native macOS Vision OCR is a reliable local fallback.
- OCR may misread stylized text like lowercase “harness” as “hamess”; improve typography rather than ignoring it.

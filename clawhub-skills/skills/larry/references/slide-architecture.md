# Slide Architecture Rules

## The Core Insight
Lock scene architecture across all 6 slides. Only change the **style**, not the room/location.

Without this: every slide looks like a different room → the transformation feels fake → nobody engages.

## Rules
1. **Scene lock**: Establish scene in slide 1 (e.g. "modern apartment living room, morning light"). Use exact same scene description in all 6 prompts.
2. **Style variation**: Change only the style modifier per slide. Examples:
   - Slide 1: `...photorealistic`
   - Slide 2: `...watercolor illustration`
   - Slide 3: `...minimalist line art`
3. **Subject consistency**: Same character or object must appear in same position each slide.
4. **Aspect ratio**: Always portrait — 9:16 (1080×1920) for TikTok.
5. **Model**: Always `gpt-image-1.5` — never `gpt-image-1` (quality gap is significant).

## Prompt Template
```
[scene description LOCKED] [subject] [action], [style variation for this slide], 
high quality, professional, [niche-specific aesthetic], portrait 9:16
```

## Example (Habit Tracker App)
```
Prompt 1: Modern minimalist home office, person at clean desk checking habit tracker app on phone, photorealistic, warm morning light, portrait 9:16
Prompt 2: Modern minimalist home office, person at clean desk checking habit tracker app on phone, soft watercolor illustration, warm tones, portrait 9:16
Prompt 3: [same scene] ... flat design vector art ...
```

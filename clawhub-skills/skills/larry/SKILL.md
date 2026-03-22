---
name: larry
description: >
  Automate TikTok slideshow marketing for any app or product. Use when asked to
  generate TikTok content, create slideshow posts, track post-to-revenue funnels,
  optimize content hooks, analyze marketing performance, or set up a TikTok growth
  engine. Covers: competitor research, image generation (gpt-image-1.5), text
  overlays, Postiz posting, RevenueCat conversion tracking, hook iteration, and
  the full feedback loop. Also handles TikTok account warmup guidance.
tags: [marketing, tiktok, content, automation, analytics]
---

# Larry — TikTok App Marketing Engine

## Purpose

Larry automates the entire TikTok slideshow marketing pipeline. Tell it about
your app and it handles everything: competitor research → generate 6 portrait
images → text overlays → post as draft → track funnel → iterate on what works.

**Proven results:** 7M+ views, $670/mo MRR from a fully automated pipeline.
One human touch: open TikTok for 60 seconds to add trending audio, then publish.

## Pipeline

```
RESEARCH ──→ GENERATE ──→ OVERLAY ──→ POST (draft) ──→ TRACK ──→ ITERATE
competitor    6 AI images   text rules  Postiz API      funnel     hook formula
research      gpt-image-1.5 font=6.5%  you add audio   analytics  auto-updates
```

## When to Use

- User says "create TikTok content for my app"
- User asks to "automate my TikTok marketing"  
- User wants to track views → downloads → subscriptions
- User asks why content isn't converting
- User needs to set up account warmup before posting

## Workflow

### Phase 0: Account Warmup Check
Run this FIRST for any new TikTok account. See `references/tiktok-warmup.md`.

```bash
bash larry.sh warmup
```

### Phase 1: Generate Slides
```bash
bash larry.sh generate "habit tracker app for ADHD adults"
```
Calls `scripts/generate.js`. Locks scene architecture across all 6 images —
only style changes between slides. This is the key insight that makes slideshows
feel like real transformations. See `references/slide-architecture.md`.

### Phase 2: Post as Draft
```bash
bash larry.sh post ./output/2026-03-21
```
Posts to TikTok via Postiz API as a draft. You add trending audio (60 sec) then
hit publish. Music can 10x reach. See `references/audio-strategy.md`.

### Phase 3: Daily Report
```bash
bash larry.sh report
```
Cross-references Postiz analytics → App Store downloads → RevenueCat conversions.
Diagnoses: content problem vs app problem vs value problem.

### Phase 4: Optimize
```bash
bash larry.sh optimize
```
Logs failing hooks, extracts winning formulas, auto-updates hook library.
The skill learns from itself — 500+ lines of rules all from failure data.

## Text Overlay Rules (CRITICAL — read before generating)

See `references/font-rules.md` for the complete spec. Summary:
- Font size: exactly **6.5% of image height** (unreadable on phones otherwise)
- Text position: **30% from top** (top 10% hidden by status bar)
- Bottom 20% hidden by TikTok captions/buttons — never place text there
- Line breaks: **every 4–6 words** (canvas renderer squashes horizontal text)

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/generate.js` | Image generation + scene locking |
| `scripts/post.js` | Postiz API draft posting |
| `scripts/report.js` | Funnel analytics cross-reference |
| `scripts/optimize.js` | Hook scoring + formula extraction |
| `scripts/onboarding.js` | First-run config validation |

## References

- `references/slide-architecture.md` — scene locking rules
- `references/font-rules.md` — text overlay spec (500 lines of lessons)
- `references/funnel-tracking.md` — Postiz + RevenueCat cross-reference
- `references/audio-strategy.md` — trending audio guidance
- `references/tiktok-warmup.md` — new account warmup protocol

## Required ENV

```bash
OPENAI_API_KEY=       # gpt-image-1.5 — $0.50/slideshow or $0.25 batch
POSTIZ_API_KEY=       # postiz.pro — posting + analytics backbone
REVENUECAT_API_KEY=   # optional — completes the intelligence loop
```

## Install

```bash
bash larry.sh install
```

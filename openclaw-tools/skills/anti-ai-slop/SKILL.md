---
name: anti-ai-slop
description: >
  Strip AI writing tells and code slop from content. Use when asked to
  "humanize", "de-slop", "remove AI writing", "make this sound human",
  "clean up AI text", or "remove code slop". Handles both prose (24 content
  tells) and code (8 code tells). Do NOT use for general editing or proofreading
  unrelated to AI-generated artifacts.
tags: [writing, quality, editing, code-review]
---

# Anti-AI Slop — Humanizer & Code Cleaner

## Purpose

Detect and remove the telltale signs of AI-generated content. Two modes: content
(prose/marketing/docs) and code (unnecessary comments, overengineering, debug leftovers).

Built from Wikipedia's "Signs of AI Writing" list + real-world code review patterns.

## Workflow

### Content Mode (default)

1. Read the file
2. Scan for the 24 content tells listed below
3. Rewrite flagged sections — preserve meaning, remove tells
4. Show before/after diff

### Code Mode

1. Read the source file
2. Scan for the 8 code tells listed below
3. Remove or simplify flagged patterns
4. Verify the code still compiles/runs

## Content Tells (24)

These are the specific AI writing patterns to detect and eliminate:

1. Em-dash abuse (—)
2. "Delve" (almost never used by humans)
3. Bold text on everything
4. "Additionally" at paragraph start
5. Fake enthusiasm / exclamation marks
6. Rule of three pattern (forced triads)
7. "In conclusion" opener
8. "It's worth noting that"
9. "Let me explain" opener
10. "Certainly!" / "Absolutely!" openers
11. "As an AI" hedging
12. Passive voice overuse
13. Unnaturally formal transitions
14. Repeating the question back
15. Sycophantic lead-ins ("Great question!")
16. Unnecessary capitalization
17. Over-qualifying statements
18. Redundant adverbs (very, really, quite)
19. List-ification of everything
20. Hollow affirmations
21. Future-tense hedging
22. Verbosity (100 words where 10 suffice)
23. Unnecessary preamble
24. Sign-posting every thought

## Code Tells (8)

1. Comments stating the obvious: `# Initializing variable`
2. Defensive error handling for impossible scenarios
3. Overengineered abstractions for one-time operations
4. Unnecessary type casts
5. Lint ignores without explanation
6. Debug leftovers (console.log, print statements)
7. Placeholder comments: `// TODO: implement`
8. Redundant null checks on guaranteed values

## Commands

```bash
# Content mode (default)
bash anti-ai-slop.sh humanize ./blog-post.md

# Code mode
bash anti-ai-slop.sh humanize ./src/auth.ts code

# Scan only (report without fixing)
bash anti-ai-slop.sh scan ./newsletter.md

# List all tells
bash anti-ai-slop.sh tells
```

## Key Rule

When rewriting, preserve the author's actual point. Remove the AI packaging,
not the substance. The goal is human-sounding text, not shorter text.

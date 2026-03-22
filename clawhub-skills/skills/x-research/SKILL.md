---
name: x-research
description: >
  Twitter research assistant with quality filtering via twitterapi.io. Use when
  asked to "search Twitter", "research on X", "trending topics", "what's Twitter
  saying about", "monitor account", or "research brief on". Auto-filters noise
  (10+ likes minimum). Do NOT use for posting tweets or optimizing tweet content
  — use x-impact-checker for that.
tags: [twitter, research, social-media, trends, intelligence]
---

# X Research — Personal Twitter Analyst

## Purpose

Wraps the Twitter API for structured research. Quality filter auto-removes
low-engagement noise (minimum 10 likes by default). Search, trends, account
monitoring, research briefs — all without opening the app.

**Cost transparency**: every query shows exact API cost.

## Commands

| Command | Purpose |
|---------|---------|
| `search <query> [Latest\|Top] [time]` | Search tweets (noise filtered) |
| `trends` | Current trending topics |
| `watch <@handle>` | Latest tweets from an account |
| `brief <topic>` | Full research brief (top + latest combined) |

## Query Operators

```
solana defi          Both words
"solana defi"        Exact phrase
from:elonmusk        From specific user
#bitcoin             Hashtag
solana -scam         Exclude word
solana min_faves:100 Minimum likes
```

## Time Filters

`last_hour` | `last_3h` | `last_day` | `last_week`

```bash
bash x-research.sh search "claude code skills" Top last_day
```

## ENV Vars

| Variable | Default | Purpose |
|----------|---------|---------|
| `TWITTERAPI_KEY` | — | API key from twitterapi.io |
| `MIN_LIKES` | `10` | Quality filter threshold |

## Power Combo

**Morning Intel**: `mission-control brief` + `gog morning` + `x-research brief "AI agents"`

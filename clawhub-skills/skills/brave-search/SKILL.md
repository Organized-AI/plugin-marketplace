---
name: brave-search
description: >
  Free real-time web search for agents via Brave Search API. Use when asked to
  "search the web", "look up", "find online", "what's happening with", "research",
  or "get current info on". Provides web search, AI-grounded answers, and
  autosuggest. Free $5/mo tier. Do NOT use for local file search or codebase queries.
tags: [search, web, research, real-time]
---

# Brave Search — Free Web Access

## Purpose

Give agents real-time web access via Brave Search API. Three endpoints:
web search (ranked results), AI answers (grounded with citations), and
autosuggest (query completion).

**Free tier**: $5/mo credit — enough for agent use. Set $5 cap = never charged.

## Endpoints

### Web Search
```bash
bash brave-search.sh search "OpenClaw skill development 2026"
```
Returns: title, URL, description for top 10 results.

### AI-Grounded Answer
```bash
bash brave-search.sh answer "What is the best way to index documents locally?"
```
Returns: synthesized answer with inline source citations.

### Autosuggest
```bash
bash brave-search.sh suggest "openclaw sk"
```
Returns: query completions as the user types.

## Setup

1. Sign up: https://api-dashboard.search.brave.com
2. Get API key (free $5/mo credit)
3. Set usage cap to $5 in dashboard
4. Add to `.env`:
   ```
   BRAVE_SEARCH_API_KEY=your_key
   BRAVE_ANSWERS_API_KEY=your_key
   ```

Both keys can be the same if your plan covers both endpoints.

## When to Choose This Over Other Search

- **vs WebSearch tool**: Brave is free, WebSearch may have rate limits
- **vs QMD**: QMD is local knowledge; Brave is live internet
- **vs Firecrawl**: Brave for search results; Firecrawl for scraping full pages

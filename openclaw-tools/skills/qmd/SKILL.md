---
name: qmd
description: >
  Local knowledge base indexer using BM25 + vector search for up to 70% token
  reduction. Use when asked to "index documents", "reduce token usage", "search
  local docs", "knowledge base", "token savings", or "index this repo". Conceived
  by Toby (Shopify CEO). Do NOT use for web search or real-time information.
tags: [indexing, tokens, knowledge-base, search, optimization]
---

# QMD — Token Killer

## Purpose

Index your entire knowledge base locally using BM25 + vector search. Instead
of feeding 50-page docs into every message, the agent retrieves only the 3
paragraphs it actually needs. **Up to 70% token reduction.**

Conceived by Toby (CEO, Shopify).

## Workflow

### Index Once
```bash
bash qmd.sh index ./docs
```
Creates a local index at `.qmd-index/`. Re-run when docs change.

### Query Every Time
```bash
bash qmd.sh query "How does the auth middleware work?"
```
Returns only the relevant paragraphs — not the full documents.

## Commands

| Command | Purpose |
|---------|---------|
| `index [dir]` | Index a directory (default: current dir) |
| `query <question>` | Retrieve relevant paragraphs |
| `stats` | Show index size and savings estimate |

## When to Use

- Large codebases with extensive documentation
- Projects where context window is a bottleneck
- Repeated questions about the same knowledge base
- Pair with BiteRover for persistent context + efficient retrieval

## Install

```bash
npm install -g qmd-cli
# or
pip3 install qmd
# or via OpenClaw
npx qmd-install <github-repo-url>
```

## ENV Vars

| Variable | Default | Purpose |
|----------|---------|---------|
| `QMD_INDEX_DIR` | `./.qmd-index` | Where to store the index |

---
name: gtm-autoresearch-loop
description: Run a Karpathy-style autonomous optimization loop on a GTM container for a specific client. Scores across 12 dimensions (structural + ads-driven), mutates via Claude CLI, validates invariants, and saves winning configs.
triggers:
  - "run gtm loop"
  - "autoresearch loop"
  - "optimize GTM container"
  - "run the loop for"
  - "gtm experiment"
---

# GTM Autoresearch Loop Skill

Autonomous GTM container optimization using structural scoring + LLM mutations.

## What It Does

Takes a client's GTM container export JSON and enriched ads snapshot, then runs an iterative improve-or-revert loop:

1. **Score** — Evaluate the container across 12 weighted dimensions
2. **Prompt** — Build a targeted mutation prompt focusing on the lowest-scoring dimension
3. **Mutate** — Call Claude CLI to generate JSON operations (add tags, set consent, etc.)
4. **Validate** — 3-tier gate: JSON parse, GTM schema, invariant constraints
5. **Keep/Revert** — Accept improvements, reject regressions
6. **Repeat** — Until plateau (92%+ for 3 rounds), max rounds, or failure limit

## Prerequisites

### Per-Client Setup

Each client needs a directory under `content/gtm-templates/{CLIENT}/`:

```
content/gtm-templates/{CLIENT}/
  seed/
    {template-name}.json
  winning/
  manifest.json
```

Each client needs an ads snapshot at `data/signals/{client}-ads-snapshot-enriched.json`.

Each client needs a program contract at `content/gtm-templates/{client}-program.md`.

## Execution

### Step 0: Export GTM Container via MCP

If the Stape GTM MCP server is connected:

1. List GTM accounts and containers
2. Pull the live container version by resource type
3. Assemble the export JSON
4. Save to `content/gtm-templates/{CLIENT}/seed/{publicId}-live.json`

Assembly script:

```bash
npx tsx scripts/export-gtm-container.ts <dump.json> <CLIENT>
```

### Step 1: Prepare Client Data

```bash
mkdir -p content/gtm-templates/{CLIENT}/seed content/gtm-templates/{CLIENT}/winning
cp /path/to/export.json content/gtm-templates/{CLIENT}/seed/{template-name}.json
cp /path/to/snapshot.json data/signals/{client}-ads-snapshot-enriched.json
cp content/gtm-templates/program.md content/gtm-templates/{client}-program.md
```

### Step 2: Run the Loop

```bash
npx tsx scripts/run-gtm-loop.ts content/gtm-templates/{client}-program.md
MAX_ROUNDS=30 npx tsx scripts/run-gtm-loop.ts content/gtm-templates/{client}-program.md
```

### Step 3: Validate the Winner

```bash
npx tsx evals/eval_gtm_signal_quality.ts content/gtm-templates/{CLIENT}/winning/best-*.json \
  --enriched-snapshot data/signals/{client}-ads-snapshot-enriched.json
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MUTATION_PROVIDER` | `claude` | `claude` or `codex` |
| `MUTATION_MODEL` | `sonnet` | Model for mutations |
| `CLAUDE_PATH` | `/Users/jordaaan/.local/bin/claude` | Path to Claude CLI |
| `MAX_ROUNDS` | `30` | Maximum optimization rounds |

## Scoring Dimensions (12)

| # | Dimension | Weight | Requires Ads Data |
|---|-----------|--------|-------------------|
| 1 | Tag coverage | 0.14 | No |
| 2 | Parameter completeness | 0.10 | No |
| 3 | Deduplication | 0.07 | No |
| 4 | Consent settings | 0.11 | No |
| 5 | Naming conventions | 0.06 | No |
| 6 | Variable hygiene | 0.06 | No |
| 7 | Trigger quality | 0.08 | No |
| 8 | Folder organization | 0.06 | No |
| 9 | Meta Ads alignment | 0.09 | Yes |
| 10 | CAPI coverage | 0.08 | Yes |
| 11 | Funnel integrity | 0.07 | Yes |
| 12 | Google Ads alignment | 0.08 | Yes |

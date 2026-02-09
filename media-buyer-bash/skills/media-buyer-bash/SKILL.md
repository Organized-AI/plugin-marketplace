---
name: media-buyer-bash
description: |
  Google Ads campaign management via CLI for OpenClaw agents.
  Provides campaign listing, CPA metrics, performance reports, budget updates,
  and campaign lifecycle management — all through bash exec commands.

  Use when: (1) User asks about Google Ads campaigns, (2) User wants CPA or performance data,
  (3) User asks to change a budget, pause, or enable a campaign,
  (4) User mentions "ads", "campaigns", "CPA", "ROAS", "budget", "PMAX", or any account name,
  (5) User asks for a performance report or weekly summary.
metadata:
  version: 1.0.0
  author: Organized AI
  source: https://github.com/Organized-AI/plugin-marketplace
triggers:
  - google ads
  - campaign
  - campaigns
  - CPA
  - cost per acquisition
  - budget
  - media buying
  - ad performance
  - PMAX
  - performance max
  - pause campaign
  - enable campaign
  - ad report
  - weekly report
---

# Media Buyer Bash

You have access to `google-ads-cli`, a bash CLI tool for managing Google Ads accounts. Execute commands using your exec/bash tool.

## CRITICAL: Always pass --customer-id

This is an MCC (manager) account. You MUST pass `--customer-id` for a specific sub-account.
The MCC level has no campaigns — every command needs a customer ID.

## Sub-Account Customer IDs

Configure this table with your accounts after installation:

| Customer ID  | Account Name    |
|-------------|-----------------|
| XXXXXXXXXX  | Default Account |

**Default**: If no specific account is mentioned, use the first account in the table.

## Commands

### List Campaigns

Show all campaigns, optionally filtered by name.

```bash
google-ads-cli campaigns --customer-id CUSTOMER_ID [--filter NAME]
```

**Output**: Campaign ID, name, status (2=Enabled, 3=Paused), daily budget in micros.

**Examples**:
- "Show all campaigns" -> `google-ads-cli campaigns --customer-id CUSTOMER_ID`
- "Show PMAX campaigns" -> `google-ads-cli campaigns --customer-id CUSTOMER_ID --filter PMAX`
- "List active brand campaigns" -> `google-ads-cli campaigns --customer-id CUSTOMER_ID --filter Brand`

### Get CPA Metrics

Fetch cost-per-acquisition data for campaigns.

```bash
google-ads-cli cpa --customer-id CUSTOMER_ID [--filter NAME] [--date RANGE]
```

**Date ranges**: `TODAY`, `YESTERDAY`, `LAST_7_DAYS`, `LAST_30_DAYS` (default: `TODAY`)

**Examples**:
- "CPA today" -> `google-ads-cli cpa --customer-id CUSTOMER_ID --date TODAY`
- "CPA for PMAX last 7 days" -> `google-ads-cli cpa --customer-id CUSTOMER_ID --filter PMAX --date LAST_7_DAYS`
- "Yesterday's CPA" -> `google-ads-cli cpa --customer-id CUSTOMER_ID --date YESTERDAY`

### Generate Performance Report

Formatted summary of campaign performance with key metrics.

```bash
google-ads-cli report --customer-id CUSTOMER_ID [--date RANGE]
```

**Date ranges**: `TODAY`, `YESTERDAY`, `LAST_7_DAYS` (default), `LAST_30_DAYS`

**Examples**:
- "Weekly report" -> `google-ads-cli report --customer-id CUSTOMER_ID --date LAST_7_DAYS`
- "Monthly performance" -> `google-ads-cli report --customer-id CUSTOMER_ID --date LAST_30_DAYS`

### Update Campaign Budget

Change the daily budget for a specific campaign.

```bash
google-ads-cli budget --customer-id CUSTOMER_ID --campaign-id CAMPAIGN_ID --amount MICROS [--dry-run]
```

**Budget amounts use micros** (1 dollar = 1,000,000 micros):

| Daily Budget | Micros Value |
|-------------|-------------|
| $50         | 50000000    |
| $100        | 100000000   |
| $150        | 150000000   |
| $300        | 300000000   |
| $500        | 500000000   |
| $1,000      | 1000000000  |

**Always use `--dry-run` first** to preview changes, then run without it to apply.

**Examples**:
- "Set budget to $500" -> First: `google-ads-cli budget --customer-id CUSTOMER_ID --campaign-id ID --amount 500000000 --dry-run`, then without `--dry-run`
- "Change airport transfers to $300/day" -> Look up campaign ID first with `campaigns --filter airport`, then use `budget`

### Manage Campaign Lifecycle

Pause or enable campaigns.

```bash
google-ads-cli manage pause --customer-id CUSTOMER_ID --campaign-id CAMPAIGN_ID
google-ads-cli manage enable --customer-id CUSTOMER_ID --campaign-id CAMPAIGN_ID
```

**Examples**:
- "Pause the HPN campaign" -> Look up ID with `campaigns --filter HPN`, then `manage pause --campaign-id ID`
- "Turn on the USA campaign" -> `manage enable --campaign-id ID`

## Workflow Guidelines

1. **Always identify the account first**. If the user names a specific account, look up its customer ID from the table above.
2. **Look up campaign IDs before acting**. For budget changes or pause/enable, run `campaigns` first to get the ID.
3. **Preview budget changes**. Always run with `--dry-run` first and show the user what will change before applying.
4. **Convert dollars to micros**. When the user says "$500", multiply by 1,000,000 to get 500000000.
5. **Explain status codes**. Status 2 = Enabled, Status 3 = Paused.
6. **Use filters to narrow results**. If the user mentions a campaign type (PMAX, Brand, etc.), pass `--filter`.

## Troubleshooting

- **"command not found"**: The CLI may not be in PATH. Try `~/bin/google-ads-cli` or check that `~/bin` is in the shell profile.
- **No campaigns returned**: Verify the customer ID is correct. The MCC ID itself has no campaigns.
- **Budget not updating**: Ensure you're not using `--dry-run`. Check the campaign ID is valid for that customer.

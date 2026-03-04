# /gads-setup — Google Ads Conversion Tracking Setup

Create Google Ads conversion actions and wire them into GTM in one command.

## Usage
```
/gads-setup <google_ads_customer_id> <gtm_account_id> <gtm_container_id> [conversion_types...]
```

## Arguments
- `google_ads_customer_id` — Google Ads CID (e.g., `163-170-4656` or `1631704656`)
- `gtm_account_id` — GTM account ID
- `gtm_container_id` — GTM container ID
- `conversion_types` — Optional. Defaults to `purchase begin_checkout add_to_cart`

## What It Does

1. **Audit Existing** — GAQL query to check for existing conversion actions in the account
2. **Create Actions** — Runs `create_conversions.py` locally to create conversion actions via Google Ads API
3. **Extract Labels** — Parses `AW-ID/LABEL` from API response
4. **Wire GTM** — Creates/updates GTM variables (CONST labels), tags (awct type), and Conversion Linker via MCP
5. **Validate** — Reads back all created resources to confirm

## Workflow

```
gads-conversion-flow (SKILL.md) → create conversion actions
gads-to-gtm-programmatic (SKILL.md) → wire into GTM
gtm-ai (SKILL.md) → verify tag configuration
```

## Required MCP
- TrueClicks Google Ads MCP (audit queries)
- Stape GTM MCP (tag/variable creation)

## Required Local
- Python 3.10+ with `google-ads` package
- OAuth credentials (run `oauth_flow.py` first if needed)

## Example
```
/gads-setup 163-170-4656 6073868004 52905187 purchase begin_checkout add_to_cart
```

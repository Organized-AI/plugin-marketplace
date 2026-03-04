# /tracking-check — Full Stack Tracking Validation

Validate the entire conversion tracking stack across GTM, Google Ads, and Meta.

## Usage
```
/tracking-check <gtm_account_id> <gtm_container_id> [--gads <customer_id>] [--meta <ad_account_id>]
```

## What It Does

1. **GTM Health** — Runs `tidy-gtm` audit: naming, duplicates, orphans, sGTM correlation
2. **Google Ads Check** (if `--gads`) — GAQL query for conversion action status, counting method, attribution model
3. **Meta Check** (if `--meta`) — Pipeboard MCP for Pixel health, CAPI event match quality, deduplication
4. **Cross-Platform** — Validates that GTM tags match platform-side conversion actions (labels align, events match)
5. **Report** — Outputs a tracking stack health summary with pass/fail per component

## Workflow

```
tidy-gtm → GTM container audit
gads-to-gtm-programmatic (references/gaql-queries.md) → Google Ads validation
data-audit → Meta/CAPI assessment
```

## Required MCP
- Stape GTM MCP
- TrueClicks Google Ads MCP (optional)
- Pipeboard Meta MCP (optional)

## Example
```
/tracking-check 6073868004 52905187 --gads 163-170-4656 --meta act_123456789
```

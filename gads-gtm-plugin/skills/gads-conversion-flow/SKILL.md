---
name: gads-conversion-flow
description: Create Google Ads conversion actions via the API and retrieve conversion labels for GTM configuration. Use when user needs to set up Google Ads conversions (Purchase, Begin Checkout, Add to Cart, etc.), fetch conversion labels, configure GTM tags with Google Ads send_to values, or mentions "gads conversions", "google ads conversion actions", "conversion labels", "AW- labels for GTM", or "create gads conversions".
---

# Google Ads Conversion Flow

End-to-end workflow: create conversion actions in Google Ads API, retrieve conversion labels, and output values ready for GTM tag configuration.

## Prerequisites

- Python 3.9+ with `google-ads` package (`pip install google-ads`)
- Google Ads API credentials (developer token, OAuth client, refresh token)
- Google Ads customer ID (the account to create conversions in)
- MCC login customer ID (if using manager account)

## Workflow

### 1. Gather credentials

Collect from user or project config:
- `developer_token` — from Google Ads API Center
- `client_id` / `client_secret` — OAuth 2.0 credentials
- `refresh_token` — from OAuth flow
- `login_customer_id` — MCC account ID (no dashes)
- `customer_id` — target ads account ID (no dashes)

Store credentials in a JSON config file (never commit to git):

```json
{
  "developer_token": "...",
  "client_id": "...apps.googleusercontent.com",
  "client_secret": "GOCSPX-...",
  "refresh_token": "1//...",
  "login_customer_id": "1234567890",
  "use_proto_plus": true
}
```

### 2. Define conversions

Default actions created: Purchase, Begin Checkout, Add to Cart.

Override with a JSON file for custom conversions:

```json
[
  {"name": "Purchase", "category": "PURCHASE"},
  {"name": "Begin Checkout", "category": "BEGIN_CHECKOUT"},
  {"name": "Add to Cart", "category": "ADD_TO_CART"},
  {"name": "Lead Form Submit", "category": "LEAD"}
]
```

Valid categories: `PURCHASE`, `BEGIN_CHECKOUT`, `ADD_TO_CART`, `SIGNUP`, `LEAD`, `PAGE_VIEW`, `SUBSCRIBE_PAID`, `ADD_TO_WISHLIST`, `CONTACT`, `DOWNLOAD`.

### 3. Run the script

```bash
# Set up venv if needed
python3 -m venv .venv && source .venv/bin/activate && pip install google-ads

# Create conversions + fetch labels
python3 scripts/create_gads_conversions.py \
  --config path/to/gads-config.json \
  --customer-id 1234567890

# Dry run (no changes)
python3 scripts/create_gads_conversions.py \
  --config path/to/gads-config.json \
  --customer-id 1234567890 \
  --dry-run

# Fetch labels only (skip creation)
python3 scripts/create_gads_conversions.py \
  --config path/to/gads-config.json \
  --customer-id 1234567890 \
  --labels-only

# JSON output for programmatic use
python3 scripts/create_gads_conversions.py \
  --config path/to/gads-config.json \
  --customer-id 1234567890 \
  --labels-only --output json
```

### 4. Use labels in GTM

Script output provides `send_to` values like `AW-17926165004/hWL8CMriqYIcEIyk7uNC`.

For GTM configuration:
- **Conversion ID**: the `AW-` number (e.g., `17926165004`)
- **Conversion Label**: the string after `/` (e.g., `hWL8CMriqYIcEIyk7uNC`)
- **Full send_to**: use in Google Ads conversion tag's `send_to` field

When using Myosin GTM, set these as lookup-table variables keyed by event name.

## Conversion action settings

The script creates each action with:
- Type: `WEBPAGE`
- Counting: `MANY_PER_CLICK`
- Attribution: Data-driven (Google Search)
- Click-through window: 30 days
- View-through window: 1 day
- Value: dynamic from dataLayer (not hardcoded)
- Primary for goal: yes

Duplicates are safely skipped (checks for `DUPLICATE_NAME`).

## Troubleshooting

| Error | Fix |
|-------|-----|
| `DEVELOPER_TOKEN_NOT_APPROVED` | Apply for API access at ads.google.com/aw/apicenter |
| `CUSTOMER_NOT_FOUND` | Verify customer ID, remove dashes |
| `AUTHORIZATION_ERROR` | Refresh token expired — re-run OAuth flow |
| `DUPLICATE_NAME` | Conversion already exists (safe to ignore) |
| `pip: externally-managed-environment` | Use `python3 -m venv .venv` first |

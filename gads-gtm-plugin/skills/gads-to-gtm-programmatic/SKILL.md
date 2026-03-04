---
name: gads-to-gtm-programmatic
description: Programmatically create Google Ads conversion actions via the Google Ads API and wire them into GTM using the Stape GTM MCP server. Use when user says "create Google Ads conversions", "set up purchase tracking", "wire GADS to GTM", "create conversion actions programmatically", "GADS conversion setup", "Google Ads purchase conversion", "add conversion tracking to GTM", or needs to create conversion actions and matching GTM tags/variables/linker for any client account. Combines Google Ads Python API (mutate) with GTM MCP (tag CRUD) for zero-manual-step conversion tracking setup.
---

# Google Ads → GTM Programmatic Conversion Setup

End-to-end workflow: audit existing state → create conversion actions in Google Ads → create GTM tags/variables → wire labels → validate.

## Prerequisites

### Required MCP Servers
```json
{
  "mcpServers": {
    "google-tag-manager-mcp-server": {
      "type": "url",
      "url": "https://gtm-mcp.stape.ai/mcp"
    },
    "google-ads-mcp": {
      "type": "url",
      "url": "https://mcp.gaql.app/sse/google-ads/<AUTH_TOKEN>"
    }
  }
}
```

### Required Credentials
- **Google Ads Developer Token** — from MCC API Center (ads.google.com/aw/apicenter)
- **GCP OAuth 2.0 Client** (Desktop type) — Client ID + Client Secret
- **OAuth Refresh Token** — obtained via auth flow (see Step 2)
- **Customer ID** — the Google Ads account to configure
- **Login Customer ID** — the MCC that manages it (if applicable)

### Python Dependencies
```bash
pip install google-ads google-auth-oauthlib
```

## Workflow

### Step 1: Audit Existing State

#### 1a. GTM Container Audit
Use GTM MCP to inventory the container. Gather account ID, container ID, workspace ID first.

```
gtm_tag → action: list → get all tags with types
gtm_trigger → action: list → get all triggers  
gtm_variable → action: list → get all variables
gtm_folder → action: list → get folder structure
```

Identify:
- Existing conversion tags (type `awct`) vs placeholders (type `html` with console.warn)
- Existing triggers for ecommerce events (purchase, add_to_cart, begin_checkout)
- Existing dataLayer variables (ecommerce.value, ecommerce.transaction_id, ecommerce.currency, ecommerce.items)
- Whether a Conversion Linker tag (type `gclidw`) exists
- Folder for Google Ads tags

#### 1b. Google Ads Account Audit
Use Google Ads MCP (GAQL) to check existing conversion actions:

```sql
SELECT conversion_action.id, conversion_action.name, conversion_action.type, 
       conversion_action.status, conversion_action.category, conversion_action.tag_snippets 
FROM conversion_action
```

Get the Conversion Tracking ID:
```sql
SELECT customer.id, customer.descriptive_name, 
       customer.conversion_tracking_setting.conversion_tracking_id,
       customer.conversion_tracking_setting.conversion_tracking_status 
FROM customer
```

The `conversion_tracking_id` becomes the `AW-XXXXXXXXX` Conversion ID for GTM tags.

### Step 2: OAuth Refresh Token (if not already obtained)

Generate an auth URL for the user to visit:

```python
import urllib.parse
params = {
    'client_id': '<CLIENT_ID>',
    'redirect_uri': 'http://localhost',
    'response_type': 'code',
    'scope': 'https://www.googleapis.com/auth/adwords',
    'access_type': 'offline',
    'prompt': 'consent'
}
url = 'https://accounts.google.com/o/oauth2/auth?' + urllib.parse.urlencode(params)
```

User visits URL, authorizes, gets redirected to `http://localhost/?code=...`. Exchange the code:

```python
import requests
response = requests.post('https://oauth2.googleapis.com/token', data={
    'code': '<AUTH_CODE>',
    'client_id': '<CLIENT_ID>',
    'client_secret': '<CLIENT_SECRET>',
    'redirect_uri': 'http://localhost',
    'grant_type': 'authorization_code'
})
refresh_token = response.json()['refresh_token']
```

**Important:** The OAuth client must be Desktop type with `http://localhost` as a redirect URI. If using a Web Application type, `http://localhost` must be explicitly added in GCP Console → Credentials.

**Important:** The GCP project must match the dev token's project. The dev token is linked to the MCC, not GCP — but the OAuth client must be from a GCP project with Google Ads API enabled.

### Step 3: Create Conversion Actions

Use `scripts/create_conversions.py` with the user's credentials. The script:
1. Creates conversion actions (Purchase, Begin Checkout, Add to Cart) via `ConversionActionService.MutateConversionActions`
2. Queries back `tag_snippets` to extract conversion labels
3. Outputs labels for GTM variable wiring

Configuration for each conversion action:
- **type**: `WEBPAGE`
- **counting_type**: `MANY_PER_CLICK` (count every conversion)
- **value_settings**: `always_use_default_value = False` (dynamic values from dataLayer)
- **attribution_model**: `GOOGLE_SEARCH_ATTRIBUTION_DATA_DRIVEN`
- **primary_for_goal**: `True` (include in "Conversions" column)
- **click_through_lookback_window_days**: `30`
- **view_through_lookback_window_days**: `1`

Category mapping:
| Conversion | Category Enum |
|---|---|
| Purchase | `PURCHASE` |
| Begin Checkout | `BEGIN_CHECKOUT` |
| Add to Cart | `ADD_TO_CART` |
| View Item | `PAGE_VIEW` |
| Lead/Sign Up | `SIGNUP` |

**The Google Ads Python API cannot run in Claude's sandbox** — the `googleads.googleapis.com` endpoint returns 403 from cloud containers. This script MUST be run locally on the user's machine via `mcp-server-commands` or pasted as a local run instruction.

### Step 4: Create GTM Components

Use GTM MCP to build the full tag stack. Order matters.

#### 4a. Create Variables
Constant variables for Conversion ID and each conversion label:

```
gtm_variable → action: create
  name: "CONST - Google Ads Conversion ID"
  type: "c"
  parameter: [{"type": "template", "key": "value", "value": "AW-XXXXXXXXX"}]
```

```
gtm_variable → action: create
  name: "CONST - GADS Purchase Label"
  type: "c"  
  parameter: [{"type": "template", "key": "value", "value": "<LABEL>"}]
```

If labels aren't available yet, create with `"PASTE_LABEL_HERE"` placeholder and update after Step 3.

#### 4b. Create Conversion Linker Tag
Required for all Google Ads conversion tracking. Fires on every page.

```
gtm_tag → action: create
  name: "GADS - Conversion Linker"
  type: "gclidw"
  firingTriggerId: ["2147479553"]  // All Pages built-in trigger
  parentFolderId: "<GADS_FOLDER_ID>"
  tagFiringOption: "oncePerEvent"
```

#### 4c. Create Conversion Tags (type: awct)
For each conversion action, create an `awct` tag:

```
gtm_tag → action: create
  name: "GADS - Conversion - Purchase"
  type: "awct"
  parameter:
    - conversionId: "{{CONST - Google Ads Conversion ID}}"
    - conversionLabel: "{{CONST - GADS Purchase Label}}"
    - conversionValue: "{{DLV - ecommerce.value}}"
    - currencyCode: "{{DLV - ecommerce.currency}}"
    - orderId: "{{DLV - ecommerce.transaction_id}}"
    - enableNewCustomerReporting: false
    - enableEnhancedConversions: true
    - cssProvidedEnhancedConversionValue: "AUTOMATIC"
    - enableProductReporting: false
    - enableShippingData: false
  firingTriggerId: ["<PURCHASE_TRIGGER_ID>"]
  parentFolderId: "<GADS_FOLDER_ID>"
  tagFiringOption: "oncePerEvent"
```

**Key parameter types for awct:**
- `conversionId`, `conversionLabel`, `conversionValue`, `currencyCode`, `orderId` → `type: "template"`
- `enableNewCustomerReporting`, `enableEnhancedConversions`, `enableProductReporting`, `enableShippingData` → `type: "boolean"`
- `cssProvidedEnhancedConversionValue` → `type: "template"`, value `"AUTOMATIC"`

#### 4d. Delete Placeholder Tags
If existing placeholder tags (custom HTML with console.warn) exist, delete them before creating real ones to avoid naming conflicts:

```
gtm_tag → action: remove → tagId: "<PLACEHOLDER_TAG_ID>"
```

### Step 5: Wire Labels to GTM Variables

Once the script returns conversion labels, update the placeholder variables:

```
gtm_variable → action: update
  variableId: "<VAR_ID>"
  fingerprint: "<CURRENT_FINGERPRINT>"
  parameter: [{"type": "template", "key": "value", "value": "<REAL_LABEL>"}]
```

### Step 6: Validate

#### 6a. GTM Workspace Validation
List all tags and confirm:
- All GADS tags are type `awct` (not `html`)
- Conversion Linker (`gclidw`) exists and fires on All Pages
- Purchase tag has `enableEnhancedConversions: true`
- All tags reference the correct triggers and are in the GADS folder
- No remaining placeholder tags

#### 6b. Google Ads Validation
Query conversion actions to confirm they exist and are enabled:
```sql
SELECT conversion_action.id, conversion_action.name, conversion_action.status, 
       conversion_action.category 
FROM conversion_action 
WHERE conversion_action.type = 'WEBPAGE' AND conversion_action.status = 'ENABLED'
```

### Step 7: Do NOT Publish
Never auto-publish. Leave in workspace for QA via GTM Preview mode.

## Naming Conventions

| Component | Pattern | Example |
|---|---|---|
| Tag | `GADS - Conversion - {Event}` | `GADS - Conversion - Purchase` |
| Variable (ID) | `CONST - Google Ads Conversion ID` | — |
| Variable (Label) | `CONST - GADS {Event} Label` | `CONST - GADS Purchase Label` |
| Linker | `GADS - Conversion Linker` | — |
| Folder | `Google Ads` | — |

## Common Issues

| Issue | Cause | Fix |
|---|---|---|
| `redirect_uri_mismatch` | OAuth client missing `http://localhost` redirect | Add in GCP Console → Credentials → OAuth client → Authorized redirect URIs |
| `unauthorized_client` | Dev token from different GCP project than OAuth client | Use OAuth client from the same GCP project linked to the MCC's dev token |
| 403 HTML from `googleads.googleapis.com` | Running in cloud sandbox (Claude container) | Must run Google Ads API scripts locally, not in Claude's sandbox |
| `DUPLICATE_NAME` on mutate | Conversion action already exists | Script skips duplicates automatically |
| Tag snippets empty | Conversion action just created | Wait 1-2 minutes and re-query, or fetch via GAQL |

---
name: linkedin-capi-setup
description: Server-side LinkedIn Conversions API implementation using Stape and Google Tag Manager. Use when setting up LinkedIn CAPI tracking, configuring LinkedIn server-side conversions, implementing LinkedIn conversion tracking, generating LinkedIn access tokens, creating LinkedIn conversion rules, or debugging LinkedIn CAPI events. Triggers on "LinkedIn CAPI", "LinkedIn conversions API", "LinkedIn server-side tracking", "li_fat_id", "LinkedIn conversion rule", "LinkedIn sGTM setup".
---

# LinkedIn Conversions API Setup

Implement server-side LinkedIn conversion tracking using Stape GTM and the LinkedIn Conversions API tag.

## Prerequisites Checklist

Before starting, verify:
- [ ] Stape container configured with custom domain
- [ ] Server GTM container connected to Stape
- [ ] Data flow established (GA4 or Data Tag/Client)
- [ ] LinkedIn Campaign Manager admin access
- [ ] LinkedIn Ad Account ID

## Workflow

### Step 1: Generate LinkedIn Access Token

1. Navigate to **Campaign Manager → Data → Signals Manager**
2. Under **Sources**, click **Google Tag Manager**
3. Click **Generate Token** and authenticate
4. Copy the token (expires after extended period)

Store token in GTM as Constant Variable: `{{LinkedIn - Access Token}}`

### Step 2: Create Conversion Rules

**For Server-Side (CAPI) Conversions:**
1. Campaign Manager → **Analyze → Conversions**
2. Click **Create conversion → Conversions API**
3. Select **Direct API** integration on Sources step
4. Complete conversion setup
5. Get **Conversion Rule ID** from URL (after `/conversions/`)

**For Browser-Side Deduplication:**
1. Create matching conversion rule via Insight Tag
2. Note browser Conversion Rule ID for event_id sync

### Step 3: Install Stape LinkedIn CAPI Tag

In Server GTM:
1. **Templates → Tag Templates → Search Gallery**
2. Search "LinkedIn Conversions API" by Stape
3. Add to workspace

### Step 4: Configure LinkedIn CAPI Tag

**PageView Tag (Required for Cookie Storage):**
```
Event Type: PageView
Access Token: {{LinkedIn - Access Token}}
```
Trigger: All page_view events

**Conversion Tag:**
```
Event Type: Conversion
Access Token: {{LinkedIn - Access Token}}
Conversion Rule ID: {{LinkedIn - Conversion Rule ID}}
Event ID: {{Event ID}}  ← Critical for deduplication
```

Required user data (at least ONE):
- Hashed email (`sha256_email_address`)
- LinkedIn Click ID (`li_fat_id` cookie)
- Acxiom ID
- Moat ID

Optional for better matching:
- First name, last name
- Job title, company
- External ID, country

### Step 5: Implement Event Deduplication

Generate unique event_id for each conversion. See `scripts/generate_event_id.py`.

Pass identical event_id to:
1. Client-side LinkedIn Insight Tag
2. Server-side LinkedIn CAPI Tag

Deduplication rules:
| Scenario | Deduplicated? |
|----------|---------------|
| Same conversion + same campaign | ✅ Yes (except Purchase/Add to Cart) |
| Same conversion + different campaigns | ⚠️ Attribution model decides |
| Different conversions | ❌ Not deduplicated |
| Repeat Purchase/Add to Cart | ❌ All counted |

### Step 6: Test and Validate

1. Open GTM Preview Mode (both web and server containers)
2. Add `?li_fat_id=test123` to URL to simulate ad click
3. Trigger conversion event
4. Check Server GTM Console for:
   - ResponseStatusCode: `201` = Success
   - Payload includes currency, value, user data

Verify in Campaign Manager:
- Conversion status changes to **Active**
- Deduplication message appears for CAPI conversion

## User Data Parameters

| Parameter | GTM Variable Name | Format |
|-----------|-------------------|--------|
| Email | `user_data.sha256_email_address` | SHA256 hash |
| First Name | `user_data.address.first_name` | Plain text |
| Last Name | `user_data.address.last_name` | Plain text |
| Phone | `user_data.phone_number` | E.164 format |
| LinkedIn Click ID | `li_fat_id` | From cookie |
| External ID | `external_id` | Your system ID |

## Common Issues

**Events not registering:**
- Missing required user identifier (email, li_fat_id, Acxiom, or Moat ID)
- Invalid or expired access token
- Incorrect Conversion Rule ID

**Deduplication not working:**
- event_id mismatch between client and server
- Different Conversion Rule IDs used

**Low match rates:**
- Add more user data parameters
- Ensure email is properly SHA256 hashed

## Resources

- `scripts/generate_event_id.py` - Event ID generator for deduplication
- `references/linkedin-capi-api.md` - Complete API field reference
- `references/stape-gtm-config.md` - Stape container setup
- `references/conversion-categories.md` - LinkedIn conversion types

## Integration with Stape MCP

Use Stape MCP tools to configure containers:

```python
# Check existing containers
stape_container_crud(action="get_all")

# Enable required power-ups
stape_container_power_ups(
    identifier="container_id",
    powerUpType="cookie_keeper",
    isActive=True
)
```

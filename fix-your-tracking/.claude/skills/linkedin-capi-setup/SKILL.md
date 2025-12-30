---
name: linkedin-capi-setup
description: Server-side LinkedIn Conversions API implementation through Stape GTM. Use when setting up LinkedIn CAPI, server-side LinkedIn tracking, or implementing LinkedIn conversion deduplication.
---

# LinkedIn CAPI Setup

Complete guide for implementing server-side LinkedIn conversion tracking through Stape GTM and the LinkedIn Conversions API tag.

## Trigger Phrases

- "Set up LinkedIn CAPI"
- "Implement LinkedIn server-side tracking"
- "Configure LinkedIn Conversions API"
- "Add LinkedIn CAPI to sGTM"
- "Set up LinkedIn deduplication"

## Prerequisites

- LinkedIn Campaign Manager access (Admin level)
- Server-side GTM container (Stape recommended)
- LinkedIn Partner ID from Insight Tag
- GA4 data flowing to server container

## Implementation Phases

### Phase 1: Generate Access Token

1. Go to LinkedIn Campaign Manager
2. Navigate to **Analyze** → **Signals Manager**
3. Click **Add signal source** → **Google Tag Manager**
4. Generate and copy the **Access Token**
5. Store securely (valid for 1 year)

**Create GTM Variable:**
```
gtm_variable action=create
  containerId=[SERVER_CONTAINER_ID]
  config={
    "name": "CONST - LinkedIn Access Token",
    "type": "c",
    "parameter": [{"key": "value", "value": "[ACCESS_TOKEN]"}]
  }
```

### Phase 2: Create Conversion Rules

For each conversion type (Lead, Purchase, etc.):

1. LinkedIn Campaign Manager → **Analyze** → **Conversion tracking**
2. Click **Create conversion**
3. Select **Conversions API** as the source
4. Configure conversion settings:
   - Name: `Lead` or `Purchase`
   - Attribution window: 30-day click, 7-day view
5. Copy the **Conversion Rule ID** from URL:
   ```
   https://www.linkedin.com/campaignmanager/accounts/123456/conversions/456789
                                                                      ^^^^^^
                                                         Conversion Rule ID
   ```

**Create GTM Variable:**
```
gtm_variable action=create
  containerId=[SERVER_CONTAINER_ID]
  config={
    "name": "CONST - LinkedIn Conversion Rule ID - Lead",
    "type": "c",
    "parameter": [{"key": "value", "value": "456789"}]
  }
```

### Phase 3: Install LinkedIn CAPI Template

1. In Server GTM, go to **Templates** → **Search Gallery**
2. Search for "LinkedIn Conversions API"
3. Add to workspace

**Or via MCP:**
```
gtm_template action=create
  containerId=[SERVER_CONTAINER_ID]
  createOrUpdateConfig={
    "name": "LinkedIn Conversions API",
    "galleryReference": {
      "host": "tagmanager.google.com",
      "owner": "stape-io",
      "repository": "linkedin-capi-tag",
      "version": "latest"
    }
  }
```

### Phase 4: Create LinkedIn CAPI Tags

#### PageView Tag (Cookie Storage)

Fires on all page views to store `li_fat_id` cookie:

```
gtm_tag action=create
  containerId=[SERVER_CONTAINER_ID]
  config={
    "name": "LinkedIn CAPI - PageView",
    "type": "[TEMPLATE_ID]",
    "parameter": [
      {"key": "eventType", "type": "template", "value": "pageView"},
      {"key": "accessToken", "type": "template", "value": "{{CONST - LinkedIn Access Token}}"},
      {"key": "enableCookieStorage", "type": "boolean", "value": "true"}
    ],
    "firingTriggerId": ["[ALL_PAGES_TRIGGER_ID]"]
  }
```

#### Conversion Tag (Lead/Purchase)

```
gtm_tag action=create
  containerId=[SERVER_CONTAINER_ID]
  config={
    "name": "LinkedIn CAPI - Lead",
    "type": "[TEMPLATE_ID]",
    "parameter": [
      {"key": "eventType", "type": "template", "value": "conversion"},
      {"key": "conversionRuleId", "type": "template", "value": "{{CONST - LinkedIn Conversion Rule ID - Lead}}"},
      {"key": "accessToken", "type": "template", "value": "{{CONST - LinkedIn Access Token}}"},
      {"key": "eventId", "type": "template", "value": "{{ED - event_id}}"},
      {"key": "userEmail", "type": "template", "value": "{{ED - email_sha256}}"},
      {"key": "linkedinClickId", "type": "template", "value": "{{ED - li_fat_id}}"}
    ],
    "firingTriggerId": ["[LEAD_TRIGGER_ID]"]
  }
```

## Required User Identifiers

LinkedIn requires **at least one** user identifier:

| Identifier | Priority | Source |
|------------|----------|--------|
| SHA256 Email | High | Data layer, hashed server-side |
| LinkedIn Click ID (li_fat_id) | High | 1st party cookie |
| Acxiom ID | Medium | From data provider |
| Oracle Moat ID | Medium | From Oracle |

**Additional fields for better matching:**
- First Name (hashed)
- Last Name (hashed)
- Job Title
- Company Name
- Country Code

## Deduplication Strategy

### How It Works

Client-side Insight Tag and server-side CAPI Tag must share the same `event_id`:

```
Web GTM                          Server GTM
────────                         ──────────

LinkedIn - Lead                  LinkedIn CAPI - Lead
├── event_id: {{DL - event_id}}  ├── event_id: {{ED - event_id}}
└── Fires: browser               └── Fires: server

                    │
                    ▼
              LinkedIn API
                    │
                    ▼
            Deduplication
        (same event_id = 1 conversion)
```

### Event-Specific Behavior

| Event Type | Deduplication |
|------------|---------------|
| PageView | Always deduplicated |
| Lead | Deduplicated per campaign |
| Sign Up | Deduplicated per campaign |
| **Purchase** | **NOT deduplicated** (counts all) |
| **Add to Cart** | **NOT deduplicated** (counts all) |

**Important:** Purchase and Add to Cart count all instances, so ensure you're not double-firing.

## Event ID Generator

Create a custom JS variable for consistent event IDs:

```javascript
// JS - Event ID Generator
function() {
  return 'li_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
```

**Web GTM Variable:**
```
gtm_variable action=create
  containerId=[WEB_CONTAINER_ID]
  config={
    "name": "JS - Event ID Generator",
    "type": "jsm",
    "parameter": [{
      "key": "javascript",
      "value": "function() { return 'li_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9); }"
    }]
  }
```

This value should be pushed to the data layer and read by both containers.

## Validation

### Step 1: Preview Mode Testing

1. Enable GTM Preview for server container
2. Trigger a test conversion
3. Verify in Network tab:
   - Request to LinkedIn API
   - HTTP 201 response

### Step 2: LinkedIn Campaign Manager

1. Go to **Signals Manager**
2. Check the GTM source shows "Active"
3. Allow 24-48 hours for first events to appear

### Step 3: Event Verification

Check the conversion appears in:
- **Analyze** → **Conversion tracking**
- Status should change from "Unverified" to "Active"

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid/expired token | Generate new access token |
| 400 Bad Request | Missing required field | Check user identifiers |
| No events appearing | Wrong conversion rule ID | Verify ID from URL |
| Duplicate conversions | Missing/mismatched event_id | Ensure same ID in web+server |
| Low match rate | Insufficient user data | Add more identifiers |

## Web ↔ Server Correlation

```
┌─────────────────────────────────────────────────────────────┐
│                LINKEDIN TRACKING FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Browser                                                    │
│      │                                                       │
│      ▼                                                       │
│   Web GTM                                                    │
│   ├── LinkedIn - Insight Tag - Base ──────────▶ LinkedIn    │
│   │   └── Partner ID: 1234567                   (pixel)     │
│   │                                                          │
│   ├── LinkedIn - Insight Tag - Lead ──────────▶ LinkedIn    │
│   │   └── event_id: {{JS - Event ID Generator}} (pixel)     │
│   │                                                          │
│   └── GA4 - Config ─────────────┐                           │
│       └── transport_url         │                           │
│                                 ▼                           │
│                          Server GTM                         │
│                          ├── GA4 Client                     │
│                          │                                  │
│                          └── LinkedIn CAPI - Lead ─▶ LinkedIn
│                              ├── event_id: {{ED - event_id}} (API)
│                              ├── email: {{ED - email_sha256}}│
│                              └── li_fat_id: {{ED - li_fat_id}}
│                                                              │
│                                        │                     │
│                                        ▼                     │
│                               Deduplication                  │
│                          (same event_id = 1 lead)           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## References

- [LinkedIn CAPI Documentation](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads-reporting/conversions-api)
- [Stape LinkedIn CAPI Tag](https://stape.io/linkedin-conversions-api-tag-for-server-google-tag-manager)
- `references/linkedin-api-reference.md` - Full API documentation
- `references/user-matching-guide.md` - Identifier requirements

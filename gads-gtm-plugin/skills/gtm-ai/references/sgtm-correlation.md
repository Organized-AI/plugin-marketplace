# Server-Side GTM (sGTM) Correlation Guide

How to validate and correlate Web GTM ↔ Server GTM configurations.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     WEB GTM CONTAINER                           │
│                     (GTM-XXXXXXX)                               │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ GA4 Config  │  │ Platform    │  │ Platform Tag            │ │
│  │             │  │ Pixel       │  │ (LinkedIn, Meta, etc.)  │ │
│  │ transport_  │  │             │  │                         │ │
│  │ url: sGTM   │  │ Client-side │  │ event_id: {{Event ID}}  │ │
│  └──────┬──────┘  └─────────────┘  └────────────┬────────────┘ │
│         │                                       │               │
└─────────┼───────────────────────────────────────┼───────────────┘
          │                                       │
          │ (GA4 transport)                       │ (event_id)
          ▼                                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SERVER GTM CONTAINER                          │
│                   (GTM-XXXXXXX / Stape)                        │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ GA4 Client  │  │ GA4 Tag     │  │ Platform CAPI Tag       │ │
│  │             │  │             │  │ (LinkedIn, Meta, etc.)  │ │
│  │ Receives    │──│ Forwards to │  │                         │ │
│  │ GA4 hits    │  │ GA4 servers │  │ event_id: {{Event ID}}  │ │
│  └─────────────┘  └─────────────┘  └────────────┬────────────┘ │
│                                                 │               │
└─────────────────────────────────────────────────┼───────────────┘
                                                  │
                                                  ▼
                                    ┌─────────────────────────┐
                                    │    PLATFORM API         │
                                    │  (LinkedIn, Meta, etc.) │
                                    │                         │
                                    │  Deduplication:         │
                                    │  event_id matches       │
                                    │  = 1 conversion         │
                                    └─────────────────────────┘
```

---

## Correlation Points to Validate

### 1. Transport URL Configuration

**Web GTM (GA4 Config):**
```
GA4 Configuration Tag
├── Measurement ID: G-XXXXXXXXXX
├── Send to: Server Container URL
│   └── transport_url: https://gtm.your-domain.com
└── Transport URL matches sGTM domain
```

**Validation:**
```
gtm_tag action=list (Web Container)
→ Find GA4 Config tag
→ Check transport_url parameter
→ Should match sGTM container domain
```

### 2. GA4 Client Configuration (sGTM)

**Server GTM:**
```
GA4 Client
├── Type: gaaw_client (GA4)
├── Default paths: /g/collect, /j/collect
└── Priority: 100 (default)
```

**Validation:**
```
gtm_client action=list (Server Container)
→ Verify GA4 Client exists
→ Check it's enabled
→ Check path configuration
```

### 3. Event ID Matching

**Critical for Deduplication:**

| Layer | Variable | Value |
|-------|----------|-------|
| Web GTM | `{{CJS - Event ID}}` | `evt_1234567890_abc123` |
| Server GTM | `{{Event ID}}` | Same value from GA4 transport |
| CAPI Tag | `eventId` parameter | Same value |

**Web GTM Custom JS:**
```javascript
function() {
  var eventId = 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  // Store for reuse
  window._eventId = eventId;
  return eventId;
}
```

**Server GTM:**
- Event ID comes through GA4 event data
- Use `{{Event ID}}` variable (from event data)
- Or parse from user properties

### 4. CAPI Tags Use Same Event ID

**Web Tag (Client-Side):**
```
LinkedIn - Lead
├── partnerId: {{Const - LinkedIn Partner ID}}
├── conversionId: {{Const - LinkedIn Conversion ID}}
└── eventId: {{CJS - Event ID}}  ◄── Generated here
```

**Server Tag (CAPI):**
```
LinkedIn CAPI - Lead
├── accessToken: {{LinkedIn - Access Token}}
├── conversionRuleId: {{LinkedIn - Conversion Rule ID}}
└── eventId: {{Event ID}}  ◄── Same value from transport
```

---

## Correlation Checklist

### Pre-Deployment

| Check | Web GTM | Server GTM |
|-------|---------|------------|
| Container exists | ✓ GTM-XXXXXXX | ✓ GTM-XXXXXXX |
| Workspace clean | ✓ No conflicts | ✓ No conflicts |
| Transport URL set | ✓ Points to sGTM | - |
| GA4 Client enabled | - | ✓ Active |
| Event ID variable | ✓ CJS generator | ✓ Event data var |

### Post-Deployment

| Check | Method |
|-------|--------|
| GA4 hits reaching sGTM | Check sGTM logs |
| CAPI tags firing | Check platform dashboard |
| Event IDs matching | Compare client/server logs |
| Deduplication working | Check conversion counts |

---

## MCP Validation Commands

### List Web GTM Tags
```
gtm_tag action=list
  accountId=[ACCOUNT_ID]
  containerId=[WEB_CONTAINER_ID]
  workspaceId=[WORKSPACE_ID]
```

### List Server GTM Clients
```
gtm_client action=list
  accountId=[ACCOUNT_ID]
  containerId=[SERVER_CONTAINER_ID]
  workspaceId=[WORKSPACE_ID]
```

### List Server GTM Tags
```
gtm_tag action=list
  accountId=[ACCOUNT_ID]
  containerId=[SERVER_CONTAINER_ID]
  workspaceId=[WORKSPACE_ID]
```

### Check Web Container Info
```
gtm_container action=get
  accountId=[ACCOUNT_ID]
  containerId=[WEB_CONTAINER_ID]
```

### Check Server Container Info
```
gtm_container action=get
  accountId=[ACCOUNT_ID]
  containerId=[SERVER_CONTAINER_ID]
```

---

## Correlation Matrix Template

Use this template to document your setup:

```
┌────────────────────────────────────────────────────────────────┐
│                    CORRELATION MATRIX                          │
├────────────────────────────────────────────────────────────────┤
│ WEB CONTAINER: GTM-XXXXXXX (Container ID: XXXXXXXX)           │
│ SERVER CONTAINER: GTM-XXXXXXX (Container ID: XXXXXXXX)        │
│ TRANSPORT URL: https://gtm.your-domain.com                    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  CLIENT-SIDE TAGS          SERVER-SIDE TAGS                   │
│  ─────────────────         ─────────────────                   │
│  GA4 Config ──────────────► GA4 Client                        │
│       │                          │                             │
│       └──────────────────────────┼──► GA4 Tag                 │
│                                  │                             │
│  LinkedIn - Lead ────────────────┼──► LinkedIn CAPI - Lead    │
│  (event_id: X)                   │    (event_id: X)           │
│                                  │                             │
│  Meta - Purchase ────────────────┼──► Meta CAPI - Purchase    │
│  (event_id: Y)                   │    (event_id: Y)           │
│                                  │                             │
├────────────────────────────────────────────────────────────────┤
│ EVENT ID FLOW:                                                 │
│                                                                │
│ Web: {{CJS - Event ID}} generates unique ID                   │
│      ↓                                                        │
│ GA4: Sent as event parameter (event_id)                       │
│      ↓                                                        │
│ sGTM: Received via GA4 Client, available as {{Event ID}}     │
│      ↓                                                        │
│ CAPI: Uses same {{Event ID}} for deduplication               │
└────────────────────────────────────────────────────────────────┘
```

---

## Common Correlation Issues

### Issue 1: Events Not Reaching sGTM

**Symptoms:**
- sGTM logs show no requests
- CAPI tags never fire

**Causes:**
- Transport URL incorrect
- Ad blocker blocking requests
- CORS issues

**Fix:**
- Verify transport_url in GA4 Config
- Check domain is correct
- Ensure HTTPS

### Issue 2: Duplicate Conversions

**Symptoms:**
- Platform shows 2x conversions
- Event IDs not matching

**Causes:**
- Different event_id in client vs server
- Event ID variable not configured

**Fix:**
- Ensure same event_id variable used
- Check event_id is passed through GA4

### Issue 3: Missing User Data (Enhanced Matching)

**Symptoms:**
- CAPI events have low match rate
- User data not in server requests

**Causes:**
- User data not collected client-side
- Not passed through GA4 transport

**Fix:**
- Add user properties to GA4 events
- Configure sGTM to read user data

### Issue 4: GA4 Client Not Receiving

**Symptoms:**
- GA4 Client logs empty
- No events in sGTM

**Causes:**
- Client not enabled
- Wrong path configuration

**Fix:**
- Enable GA4 Client
- Check default paths: `/g/collect`, `/j/collect`

---

## Stape-Specific Validation

If using Stape as sGTM host:

### Check Stape Container
```
stape_container_crud action=get
  containerId=[STAPE_CONTAINER_ID]
```

### Check Stape Analytics
```
stape_container_analytics action=get_info
  containerId=[STAPE_CONTAINER_ID]
```

### Verify Stape Domains
```
stape_container_domains action=list
  containerId=[STAPE_CONTAINER_ID]
```

---

## Event ID Best Practices

### Generation Pattern
```javascript
// Generate once per event, reuse across tags
function() {
  // Check if already generated for this event
  if (window._currentEventId) {
    return window._currentEventId;
  }

  // Generate new ID
  var eventId = 'evt_' + Date.now() + '_' +
                Math.random().toString(36).substr(2, 9);

  // Store for reuse
  window._currentEventId = eventId;

  // Clear after short delay (for next event)
  setTimeout(function() {
    window._currentEventId = null;
  }, 100);

  return eventId;
}
```

### Passing Through GA4
```
GA4 Event Tag
├── Event Name: purchase
├── Event Parameters:
│   ├── transaction_id: {{DL - Transaction ID}}
│   └── event_id: {{CJS - Event ID}}  ◄── Include here
└── Fires on: CE - Purchase
```

### Reading in sGTM
```
Event ID Variable (sGTM)
├── Type: Event Data
├── Key Path: event_id
└── Returns: evt_1234567890_abc123
```

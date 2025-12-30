# Server-Side GTM (sGTM) Correlation Guide

Understanding and validating the connection between Web GTM and Server-Side GTM containers.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     GTM + sGTM DUAL CONTAINER ARCHITECTURE                  │
└─────────────────────────────────────────────────────────────────────────────┘

   BROWSER                    SERVER (sGTM)                 VENDORS
   ───────                    ─────────────                 ───────

┌──────────────┐          ┌──────────────────┐
│   Website    │          │  Server Container │
│              │          │  (Stape/GCP/etc)  │
│ ┌──────────┐ │          │                  │
│ │ Web GTM  │─┼──────────┼─▶ ┌────────────┐ │       ┌─────────────┐
│ │Container │ │  HTTP    │   │   CLIENT   │ │       │   Google    │
│ └──────────┘ │ Request  │   │  (GA4/etc) │─┼──────▶│   GA4       │
│              │          │   └────────────┘ │       └─────────────┘
│ dataLayer    │          │         │        │
│ push()       │          │         ▼        │       ┌─────────────┐
│              │          │   ┌────────────┐ │       │    Meta     │
└──────────────┘          │   │    TAGS    │─┼──────▶│    CAPI     │
                          │   │            │ │       └─────────────┘
                          │   │ - GA4 Tag  │ │
                          │   │ - Meta CAPI│ │       ┌─────────────┐
                          │   │ - LI CAPI  │─┼──────▶│  LinkedIn   │
                          │   │ - TT CAPI  │ │       │    CAPI     │
                          │   └────────────┘ │       └─────────────┘
                          │                  │
                          └──────────────────┘
```

---

## Correlation Points

### 1. Server Container URL

The web container must know where to send data.

| Setting | Location | Example |
|---------|----------|---------|
| Transport URL | Web GTM GA4 Config Tag | `https://yyrcifus.usa.stape.io` |
| Server Container URL | Web Tags | `https://your-domain.stape.io` |
| First-party Domain | Custom domain | `https://gtm.yourdomain.com` |

**Validation**:
```
Web GTM GA4 Config Tag → Check "Server Container URL" parameter
Should match: sGTM container domain
```

---

### 2. Client Configuration

Clients in sGTM receive and parse incoming requests.

| Client Type | Purpose | Receives From |
|-------------|---------|---------------|
| GA4 Client | Parse GA4 requests | Web GTM GA4 tags |
| Universal Analytics | Parse UA requests | Legacy web tags |
| Custom Client | Parse custom format | Custom web tags |

**Validation**:
```
For each web tag sending to server:
  → Verify matching client exists in sGTM
  → Check client is enabled
  → Verify path matching
```

---

### 3. Tag-to-Tag Correlation (Web → Server)

| Web Tag Type | Server Tag Type | Data Flow |
|--------------|-----------------|-----------|
| GA4 Config | GA4 Tag (sGTM) | Measurement Protocol |
| Custom HTML (fetch) | Various CAPI tags | HTTP request |
| GA4 Event | GA4 Tag (sGTM) | Via GA4 Client |

**Event Flow**:
```
Web: GA4 - Event - Purchase
  ↓ (via transport_url)
sGTM: GA4 Client receives
  ↓ (parses event data)
sGTM: Meta CAPI - Purchase (fires)
sGTM: LinkedIn CAPI - Purchase (fires)
sGTM: GA4 Tag - Purchase (fires)
```

---

### 4. Event ID Deduplication

Critical for dual tracking (client + server).

| Component | Web GTM | Server GTM |
|-----------|---------|------------|
| Event ID Variable | `{{DL - event_id}}` | `{{Event ID}}` from client |
| Where Used | All conversion tags | All CAPI tags |
| Purpose | Dedupe client-side | Dedupe server-side |

**Validation**:
```
Web Tag: Meta - Lead
  Parameter: event_id = {{DL - event_id}}

Server Tag: Meta CAPI - Lead
  Parameter: event_id = {{Event ID}} (from GA4 client data)

Both must pass the SAME event_id for deduplication
```

---

### 5. User Data Correlation

Enhanced matching requires consistent user data.

| Data Point | Web Source | Server Source |
|------------|------------|---------------|
| Email | `{{DL - email}}` | `{{user_data.email}}` from client |
| Phone | `{{DL - phone}}` | `{{user_data.phone}}` from client |
| First Name | `{{DL - first_name}}` | `{{user_data.first_name}}` |
| Last Name | `{{DL - last_name}}` | `{{user_data.last_name}}` |
| IP Address | Browser (automatic) | `{{ip_override}}` in sGTM |
| User Agent | Browser (automatic) | `{{user_agent}}` in sGTM |

**Validation**:
```
Check web dataLayer pushes include user data
Check server client extracts user data correctly
Check server tags receive user data parameters
```

---

## Correlation Checklist

### Web Container → Server Container

- [ ] **Transport URL configured** in GA4 Config tag
- [ ] **Server URL valid** and accessible
- [ ] **CORS configured** if using custom domain
- [ ] **SSL certificate** valid on server domain

### Server Container Clients

- [ ] **GA4 Client** enabled and configured
- [ ] **Client path** matches incoming requests
- [ ] **Client priority** set correctly (if multiple)

### Tag Pairing

| Web Tag | Server Tag | Event ID | User Data |
|---------|------------|----------|-----------|
| GA4 - Purchase | GA4 - Purchase | Same | Same |
| Meta - Lead | Meta CAPI - Lead | Same | Same |
| LinkedIn - Lead | LinkedIn CAPI - Lead | Same | Same |
| TikTok - Lead | TikTok CAPI - Lead | Same | Same |

### Event ID Flow

- [ ] Event ID generated in web (JS variable or dataLayer)
- [ ] Event ID passed in web tags
- [ ] Event ID extracted by server client
- [ ] Event ID passed in server CAPI tags

### User Data Flow

- [ ] User data collected in web dataLayer
- [ ] User data sent in GA4/tag parameters
- [ ] User data extracted in server client
- [ ] User data passed to CAPI tags (hashed where required)

---

## Common sGTM Issues

### Issue 1: Missing GA4 Client

**Symptom**: Server tags don't fire

**Detection**:
```
gtm_client action=list (in server container)
→ No GA4 client found
```

**Fix**: Add GA4 Client template to server container

---

### Issue 2: Transport URL Not Set

**Symptom**: Data never reaches server

**Detection**:
```
Web GTM GA4 Config tag:
  → server_container_url parameter missing or wrong
```

**Fix**: Add/update server_container_url in GA4 Config tag

---

### Issue 3: Event ID Mismatch

**Symptom**: Duplicate conversions in reporting

**Detection**:
```
Compare:
  Web tag event_id parameter
  Server tag event_id parameter
→ Different sources or missing
```

**Fix**: Ensure both use same event_id source

---

### Issue 4: Missing CAPI Tags

**Symptom**: Server-side conversions not tracked

**Detection**:
```
Web container has: Meta - Lead
Server container missing: Meta CAPI - Lead
```

**Fix**: Add corresponding CAPI tag in server container

---

### Issue 5: Client Not Claiming Requests

**Symptom**: Requests reach server but tags don't fire

**Detection**:
- Check server container logs
- Verify client path configuration
- Check client priority

**Fix**: Update client configuration to match request path

---

## sGTM Inventory Template

### Server Container Info

| Field | Value |
|-------|-------|
| Container ID | |
| Container Name | |
| Public ID | GTM-XXXXXX |
| Hosting | Stape / GCP / AWS |
| Server URL | |
| Custom Domain | |

### Clients Inventory

| Client Name | Type | Path | Priority | Status |
|-------------|------|------|----------|--------|
| | | | | |

### Server Tags Inventory

| Tag Name | Type | Triggers | Paired Web Tag |
|----------|------|----------|----------------|
| | | | |

### Variables Inventory

| Variable Name | Type | Source |
|---------------|------|--------|
| | | |

---

## Dual Container Audit Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DUAL CONTAINER AUDIT WORKFLOW                        │
└─────────────────────────────────────────────────────────────────────────┘

    START
      │
      ▼
┌─────────────┐
│ Audit Web   │◀─────────────────────────────────┐
│ Container   │                                  │
│ (Standard)  │                                  │
└──────┬──────┘                                  │
       │                                         │
       ▼                                         │
┌─────────────┐     ┌─────────────┐              │
│ Identify    │     │ Audit sGTM  │              │
│ Server-Side │────▶│ Container   │              │
│ Tags        │     │             │              │
└─────────────┘     └──────┬──────┘              │
                           │                     │
                           ▼                     │
                   ┌─────────────┐               │
                   │ Check       │               │
                   │ Transport   │               │
                   │ URL Config  │               │
                   └──────┬──────┘               │
                          │                      │
                          ▼                      │
                   ┌─────────────┐               │
                   │ Validate    │               │
                   │ Clients     │               │
                   └──────┬──────┘               │
                          │                      │
                          ▼                      │
                   ┌─────────────┐               │
                   │ Match Web   │               │
                   │ Tags to     │───────────────┘
                   │ Server Tags │   (cross-reference)
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │ Validate    │
                   │ Event ID    │
                   │ Flow        │
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │ Validate    │
                   │ User Data   │
                   │ Flow        │
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │ Generate    │
                   │ Correlation │
                   │ Report      │
                   └─────────────┘
                          │
                          ▼
                        END
```

---

## GTM MCP Commands for sGTM

```
# Get server container info
gtm_container action=get accountId=[ID] containerId=[SERVER_ID]

# List server container clients
gtm_client action=list accountId=[ID] containerId=[SERVER_ID] workspaceId=[ID]

# List server container tags
gtm_tag action=list accountId=[ID] containerId=[SERVER_ID] workspaceId=[ID]

# List server container variables
gtm_variable action=list accountId=[ID] containerId=[SERVER_ID] workspaceId=[ID]

# List server container triggers
gtm_trigger action=list accountId=[ID] containerId=[SERVER_ID] workspaceId=[ID]

# Check workspace status
gtm_workspace action=getStatus accountId=[ID] containerId=[SERVER_ID] workspaceId=[ID]
```

---

## Correlation Report Template

### Web-to-Server Tag Mapping

| Web Tag | Event | Server Tag | Event ID Match | User Data Match | Status |
|---------|-------|------------|----------------|-----------------|--------|
| GA4 - Config | config | GA4 Tag | N/A | N/A | Valid |
| GA4 - Purchase | purchase | GA4 Tag | Yes | Yes | Valid |
| Meta - Lead | lead | Meta CAPI - Lead | Yes | Yes | Valid |
| LinkedIn - Lead | lead | LinkedIn CAPI - Lead | Yes | Yes | Valid |
| TikTok - Lead | lead | TikTok CAPI - Lead | Yes | Yes | Valid |

### Missing Correlations

| Gap Type | Web Component | Missing Server Component |
|----------|---------------|-------------------------|
| | | |

### Configuration Issues

| Issue | Location | Current | Expected |
|-------|----------|---------|----------|
| | | | |

---

## Best Practices

### 1. Consistent Event Naming

```
Web: GA4 - Event - Purchase → event_name: "purchase"
Server: GA4 Tag - Purchase → receives event_name: "purchase"
Server: Meta CAPI - Purchase → maps to: "Purchase"
```

### 2. Event ID Generation

Generate once, use everywhere:

```javascript
// Web GTM - JS Variable
function() {
  return window.crypto.randomUUID ?
    window.crypto.randomUUID() :
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}
```

### 3. User Data Hashing

- Web: Send raw (GTM will hash for Meta)
- Server: Ensure CAPI tags receive hashed or raw based on tag type
- LinkedIn CAPI: Requires SHA256 hashed email

### 4. First-Party Domain

Use custom domain for server container:
- Avoids ad blockers
- Better cookie access
- Improved data quality

Example: `gtm.yourdomain.com` → `xxxxx.stape.io`

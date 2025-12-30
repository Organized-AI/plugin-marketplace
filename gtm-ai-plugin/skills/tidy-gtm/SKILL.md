---
name: tidy-gtm
description: Analyzes and organizes Google Tag Manager containers (web AND server-side) for consistency, removes duplicates, standardizes naming conventions, validates correlations between tags/triggers/variables, verifies GTM-to-sGTM connections, and ensures workspace health. Use when user wants to audit a GTM container, clean up tags, standardize naming, find duplicates, verify tag correlations, check sGTM setup, or mentions "tidy gtm", "clean up gtm", "audit container", "gtm analysis", "standardize tags", "organize gtm", "check sgtm", or "server-side correlation".
---

# Tidy GTM

Analyzes and organizes Google Tag Manager containers (both **web** and **server-side**) for consistency, cleanliness, and best practices. **Default behavior**: audit all components, identify issues, standardize naming, verify correlations, and validate GTM↔sGTM connections.

> **Container-Aware**: This skill adapts to whatever GTM container it's applied to. Always analyze the current container state first before making changes. The standards below are guides that can be customized per client.

## Skill Resources

| Resource | Location | Purpose |
|----------|----------|---------|
| **References** | `references/` | Standards and templates |
| `naming-conventions.md` | `references/` | Naming standards by component type |
| `audit-checklist.md` | `references/` | Comprehensive audit checklist |
| `common-issues.md` | `references/` | Issue detection & resolution |
| `correlation-guide.md` | `references/` | Tag-Trigger-Variable relationships |
| `sgtm-correlation.md` | `references/` | **Web GTM ↔ Server GTM correlations** |
| **Assets** | `assets/` | Visual diagrams and examples |
| `workflow-diagram.md` | `assets/` | Audit workflow and decision trees |
| `example-audit-report.md` | `assets/` | Sample audit output format |

## Quick Reference: Before & After

### BEFORE (Messy Container)

```
GTM Container (87 tags, 36 triggers, 59 variables)
├── Tags
│   ├── "Facebook Pixel"              ← VAGUE NAME
│   ├── "FB Pixel - Copy"             ← DUPLICATE
│   ├── "test tag"                    ← LEFTOVER TEST
│   ├── "UA - Pageview"               ← LEGACY (should be GA4)
│   ├── "LinkedIn"                    ← NO CONTEXT
│   └── "asdf"                        ← MEANINGLESS NAME
│
├── Triggers
│   ├── "All Pages"                   ← OK
│   ├── "click"                       ← TOO GENERIC
│   ├── "Trigger 1"                   ← NO MEANING
│   └── "test trigger DELETE ME"      ← LEFTOVER
│
├── Variables
│   ├── "dlv - email"                 ← INCONSISTENT PREFIX
│   ├── "DL_email"                    ← INCONSISTENT FORMAT
│   ├── "dataLayer.email"             ← ANOTHER FORMAT
│   └── "{{unused_var}}"              ← ORPHANED
│
└── Folders
    └── (none)                        ← NO ORGANIZATION
```

### AFTER (Tidy Container)

```
GTM Container (72 tags, 28 triggers, 45 variables)
├── Tags (organized in folders)
│   ├── [Meta]
│   │   ├── "Meta - Base Pixel"
│   │   ├── "Meta - PageView"
│   │   └── "Meta - Lead"
│   ├── [Google]
│   │   ├── "GA4 - Config"
│   │   ├── "GA4 - PageView"
│   │   └── "GADS - Conversion - Lead"
│   ├── [LinkedIn]
│   │   ├── "LinkedIn - Insight Tag - Base"
│   │   └── "LinkedIn - Insight Tag - Lead"
│   └── [Microsoft]
│       └── "MSFT - UET Tag"
│
├── Triggers (consistent naming)
│   ├── "All Pages"
│   ├── "CE - signed_up"
│   ├── "CE - purchase"
│   └── "Click - CTA Button"
│
├── Variables (standardized prefixes)
│   ├── "CONST - LinkedIn Partner ID"
│   ├── "DL - email"
│   ├── "DL - event_id"
│   ├── "JS - Generate UUID"
│   └── "DOM - Form Email"
│
└── Folders
    ├── Meta
    ├── Google
    ├── LinkedIn
    └── Microsoft
```

---

## Workflow Overview

| Phase | Purpose | Key Actions |
|-------|---------|-------------|
| 1. Discovery | Inventory container | List all tags, triggers, variables, templates |
| 2. Analysis | Identify issues | Duplicates, orphans, naming violations |
| 3. Correlation Check | Verify relationships | Tag→Trigger, Tag→Variable references |
| 4. Naming Audit | Check conventions | Apply naming standards per type |
| 5. **sGTM Audit** | **Server-side check** | **Clients, CAPI tags, GTM↔sGTM correlation** |
| 6. Cleanup Plan | Prioritize fixes | Create ranked action list |
| 7. Execute | Apply changes | Rename, delete, reorganize |
| 8. Validate | Verify health | Workspace status, no conflicts |
| 9. Document | Create report | Audit summary, changes made |

---

## Phase 1: Discovery (Container Inventory)

Use GTM MCP to inventory all components:

```
# Get container info
gtm_container action=get accountId=[ID] containerId=[ID]

# List all tags (paginate through all pages)
gtm_tag action=list accountId=[ID] containerId=[ID] workspaceId=[ID] page=1 itemsPerPage=20

# List all triggers
gtm_trigger action=list accountId=[ID] containerId=[ID] workspaceId=[ID] page=1 itemsPerPage=20

# List all variables
gtm_variable action=list accountId=[ID] containerId=[ID] workspaceId=[ID] page=1 itemsPerPage=20

# List all templates
gtm_template action=list accountId=[ID] containerId=[ID] workspaceId=[ID] page=1 itemsPerPage=20

# List all folders
gtm_folder action=list accountId=[ID] containerId=[ID] workspaceId=[ID] page=1 itemsPerPage=50
```

### Inventory Template

| Component | Count | Notes |
|-----------|-------|-------|
| Tags | XX | |
| Triggers | XX | |
| Variables | XX | |
| Templates | XX | |
| Folders | XX | |
| Built-in Variables | XX | Enabled |

---

## Phase 2: Analysis (Issue Detection)

### Issues to Detect

| Issue Type | Detection Method | Severity |
|------------|-----------------|----------|
| **Duplicate Tags** | Same name or same config | HIGH |
| **Orphaned Triggers** | No tags reference them | MEDIUM |
| **Orphaned Variables** | No tags/triggers use them | MEDIUM |
| **Vague Names** | Generic like "test", "copy", "1" | MEDIUM |
| **Legacy Tags** | UA instead of GA4 | HIGH |
| **Missing Folders** | Tags not organized | LOW |
| **Broken References** | Variable {{X}} doesn't exist | CRITICAL |
| **Paused Tags** | Tags in paused state | INFO |
| **Test Artifacts** | Contains "test", "DELETE" | MEDIUM |

### Detection Queries

```
# Find duplicates (compare names)
# Find tags with "copy", "test", "asdf", etc.
# Find triggers with no referencing tags
# Find variables not referenced in any tag parameter
```

---

## Phase 3: Correlation Check

### Tag → Trigger Validation

For each tag, verify:
- `firingTriggerId` references valid trigger IDs
- `blockingTriggerId` references valid trigger IDs (if present)
- Trigger logic matches tag purpose

### Tag → Variable Validation

For each tag parameter:
- If value contains `{{variable_name}}`, verify variable exists
- Check variable type matches expected input

### Correlation Matrix

| Tag Name | Firing Triggers | Blocking | Variables Used |
|----------|-----------------|----------|----------------|
| GA4 - Config | All Pages (ID) | None | {{GA4 ID}} |
| Meta - Lead | signed_up (ID) | None | {{DL - email}}, {{DL - event_id}} |

---

## Phase 4: Naming Audit

### Standard Naming Conventions

#### Tags

| Platform | Format | Example |
|----------|--------|---------|
| Google Analytics 4 | `GA4 - [Event Type]` | `GA4 - PageView`, `GA4 - Purchase` |
| Google Ads | `GADS - [Type] - [Action]` | `GADS - Conversion - Lead` |
| Meta/Facebook | `Meta - [Event]` | `Meta - Base Pixel`, `Meta - Lead` |
| LinkedIn | `LinkedIn - [Type] - [Event]` | `LinkedIn - Insight Tag - Base` |
| Microsoft | `MSFT - [Type]` | `MSFT - UET Tag` |
| TikTok | `TikTok - [Event]` | `TikTok - PageView` |
| Custom HTML | `HTML - [Purpose]` | `HTML - Chat Widget` |

#### Triggers

| Type | Format | Example |
|------|--------|---------|
| Page View | `PV - [Description]` | `PV - Thank You Page` |
| Custom Event | `CE - [event_name]` | `CE - signed_up`, `CE - purchase` |
| Click | `Click - [Element]` | `Click - CTA Button` |
| Form | `Form - [Description]` | `Form - Contact Submit` |
| Timer | `Timer - [Interval]` | `Timer - 30 Seconds` |
| Scroll | `Scroll - [Depth]` | `Scroll - 50 Percent` |

#### Variables

| Type | Prefix | Example |
|------|--------|---------|
| Constant | `CONST - ` | `CONST - LinkedIn Partner ID` |
| Data Layer | `DL - ` | `DL - email`, `DL - event_id` |
| JavaScript | `JS - ` | `JS - Generate UUID` |
| DOM Element | `DOM - ` | `DOM - Form Email` |
| URL | `URL - ` | `URL - Page Path` |
| 1st Party Cookie | `Cookie - ` | `Cookie - _fbp` |
| Lookup Table | `LUT - ` | `LUT - Event Name Map` |
| RegEx Table | `REX - ` | `REX - Page Category` |

---

## Phase 5: sGTM Audit (Server-Side GTM)

If the account has a server-side container, audit the GTM↔sGTM connection.

### sGTM Discovery

```
# Get server container info
gtm_container action=get accountId=[ID] containerId=[SERVER_CONTAINER_ID]

# List server clients (GA4 Client, etc.)
gtm_client action=list accountId=[ID] containerId=[SERVER_CONTAINER_ID] workspaceId=[ID]

# List server tags (CAPI tags)
gtm_tag action=list accountId=[ID] containerId=[SERVER_CONTAINER_ID] workspaceId=[ID]

# List server variables
gtm_variable action=list accountId=[ID] containerId=[SERVER_CONTAINER_ID] workspaceId=[ID]

# List server triggers
gtm_trigger action=list accountId=[ID] containerId=[SERVER_CONTAINER_ID] workspaceId=[ID]
```

### GTM → sGTM Connection Points

| Check Point | Location | What to Verify |
|-------------|----------|----------------|
| Transport URL | Web GA4 Config Tag | Points to server container URL |
| GA4 Client | Server Container | Enabled and configured |
| CAPI Tags | Server Container | Match web conversion tags |
| Event ID | Both Containers | Same variable/value flows through |
| User Data | Both Containers | Consistent data mapping |

### Web-to-Server Tag Pairing

| Web Container Tag | Expected Server Tag | Event ID | User Data |
|-------------------|---------------------|----------|-----------|
| GA4 - Config | GA4 Tag | N/A | N/A |
| GA4 - Purchase | GA4 Tag (server) | Required | Required |
| Meta - Lead | Meta CAPI - Lead | Required | Required |
| LinkedIn - Lead | LinkedIn CAPI - Lead | Required | Required |
| TikTok - Lead | TikTok CAPI - Lead | Required | Optional |

### sGTM Issues to Detect

| Issue | Detection | Impact |
|-------|-----------|--------|
| Missing GA4 Client | No client in server container | Tags won't fire |
| Wrong Transport URL | GA4 Config points elsewhere | Data won't reach server |
| Missing CAPI Tag | Web has conversion, server doesn't | Lost server-side tracking |
| Event ID Mismatch | Different IDs web vs server | Duplicate conversions |
| User Data Missing | CAPI tag missing user params | Poor match rates |

### sGTM Naming Conventions

#### Server Tags

| Platform | Format | Example |
|----------|--------|---------|
| GA4 | `GA4 - [Event]` | `GA4 - All Events` |
| Meta CAPI | `Meta CAPI - [Event]` | `Meta CAPI - Lead` |
| LinkedIn CAPI | `LinkedIn CAPI - [Event]` | `LinkedIn CAPI - Lead` |
| TikTok CAPI | `TikTok CAPI - [Event]` | `TikTok CAPI - Purchase` |
| Google Ads | `GADS - [Type]` | `GADS - Conversion` |

#### Server Clients

| Type | Format | Example |
|------|--------|---------|
| GA4 | `GA4 Client` | `GA4 Client` |
| Custom | `Client - [Name]` | `Client - Webhook` |

#### Server Variables

| Type | Prefix | Example |
|------|--------|---------|
| Event Data | `ED - ` | `ED - email` |
| Client | `Client - ` | `Client - Event Name` |
| Constant | `CONST - ` | `CONST - API Key` |

### sGTM Correlation Matrix

```
┌──────────────────────────────────────────────────────────────────┐
│                    GTM ↔ sGTM CORRELATION                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   WEB GTM                          SERVER GTM                    │
│   ───────                          ──────────                    │
│                                                                  │
│   GA4 - Config ─────────────────▶  GA4 Client                    │
│        │                               │                         │
│        │ (transport_url)               │ (claims request)        │
│        ▼                               ▼                         │
│   GA4 - Purchase ──────────────▶  GA4 Tag ────────▶ GA4          │
│        │                               │                         │
│        │ (event_id, user_data)         │ (forwards data)         │
│        │                               │                         │
│   Meta - Lead ─ ─ ─ ─ ─ ─ ─ ─ ─▶  Meta CAPI - Lead ──▶ Meta      │
│        │                               │                         │
│        │ (event_id, user_data)         │ (hashes, sends)         │
│        │                               │                         │
│   LinkedIn - Lead ─ ─ ─ ─ ─ ─ ─▶  LinkedIn CAPI ─────▶ LinkedIn  │
│                                                                  │
│   Legend:                                                        │
│   ────▶ = Direct data flow                                       │
│   ─ ─ ▶ = Event triggers server tag (same event)                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Stape Integration Check (if applicable)

If using Stape for server-side hosting:

```
# Check Stape container status via Stape MCP (if available)
stape_container_crud action=get identifier=[CONTAINER_ID]

# Check Stape domains
stape_container_domains action=list container=[CONTAINER_ID]

# Check analytics
stape_container_analytics action=get_info identifier=[CONTAINER_ID]
```

---

## Phase 6: Cleanup Plan

### Priority Matrix

| Priority | Action | Risk | Impact |
|----------|--------|------|--------|
| P1 | Fix broken references | LOW | HIGH |
| P2 | Remove duplicates | LOW | MEDIUM |
| P3 | Rename non-compliant | LOW | LOW |
| P4 | Delete orphaned components | MEDIUM | MEDIUM |
| P5 | Organize into folders | LOW | LOW |
| P6 | Archive legacy (UA) tags | MEDIUM | HIGH |

### Cleanup Order

1. **Fix Critical** - Broken references first
2. **Deduplicate** - Remove exact duplicates
3. **Rename** - Apply naming conventions
4. **Organize** - Create folders, move tags
5. **Prune** - Remove orphaned components
6. **Archive** - Pause/remove legacy tags

---

## Phase 6: Execute Changes

### Safe Execution Protocol

```
1. Check workspace status first
   gtm_workspace action=getStatus

2. If conflicts exist, sync workspace
   gtm_workspace action=sync

3. Make changes in batches (5-10 at a time)

4. After each batch, verify workspace status

5. Create version before publishing
   gtm_workspace action=createVersion

6. Use Quick Preview to test
   gtm_workspace action=quickPreview

7. Only publish after validation
   gtm_version action=publish
```

### Rollback Protocol

```
1. Get version headers
   gtm_version_header action=list

2. Find previous stable version

3. Set as latest if needed
   gtm_version action=setLatest
```

---

## Phase 7: Validate

### Health Checks

| Check | Expected | Action if Failed |
|-------|----------|------------------|
| Workspace conflicts | 0 | Sync workspace |
| Merge conflicts | 0 | Resolve conflicts |
| Broken references | 0 | Fix or remove |
| Compiler errors | 0 | Fix tag configs |

### Validation Commands

```
# Check workspace health
gtm_workspace action=getStatus accountId=[ID] containerId=[ID] workspaceId=[ID]

# Get live version to compare
gtm_version action=live accountId=[ID] containerId=[ID]
```

---

## Phase 8: Document (Audit Report)

### Report Template

```markdown
# GTM Container Audit Report

**Container**: [Container Name] (GTM-XXXXX)
**Date**: YYYY-MM-DD
**Audited By**: Claude (Tidy GTM Skill)

## Summary

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Tags | XX | XX | -X removed |
| Triggers | XX | XX | -X removed |
| Variables | XX | XX | -X removed |
| Folders | X | X | +X created |

## Issues Found

| Issue | Count | Resolved |
|-------|-------|----------|
| Duplicates | X | Yes |
| Orphaned | X | Yes |
| Naming violations | X | Yes |
| Broken references | X | Yes |

## Changes Made

### Tags
- Renamed: "Facebook Pixel" → "Meta - Base Pixel"
- Removed: "FB Pixel - Copy" (duplicate)
- ...

### Triggers
- Renamed: "click" → "Click - CTA Button"
- Removed: "test trigger DELETE ME"
- ...

### Variables
- Standardized: "dlv - email" → "DL - email"
- Removed: "unused_var" (orphaned)
- ...

## Recommendations

1. ...
2. ...

## Version Published

- Version: XX
- Name: "Tidy GTM Cleanup - YYYY-MM-DD"
- Published: Yes/No
```

---

## Execution Checklist

```markdown
## Tidy GTM Audit

- [ ] **Phase 1**: Discovery (Web Container)
  - [ ] Listed all tags (all pages)
  - [ ] Listed all triggers
  - [ ] Listed all variables
  - [ ] Listed all templates
  - [ ] Listed all folders
  - [ ] Created inventory table

- [ ] **Phase 2**: Analysis
  - [ ] Identified duplicates
  - [ ] Found orphaned components
  - [ ] Detected naming violations
  - [ ] Checked for legacy tags
  - [ ] Found test artifacts

- [ ] **Phase 3**: Correlation Check
  - [ ] Verified tag→trigger references
  - [ ] Verified tag→variable references
  - [ ] No broken references

- [ ] **Phase 4**: Naming Audit
  - [ ] Tags follow conventions
  - [ ] Triggers follow conventions
  - [ ] Variables follow conventions

- [ ] **Phase 5**: sGTM Audit (if server container exists)
  - [ ] Server container identified
  - [ ] Listed all clients (GA4 Client, etc.)
  - [ ] Listed all server tags (CAPI tags)
  - [ ] Listed all server variables
  - [ ] Verified transport URL in web GA4 Config
  - [ ] Verified GA4 Client is enabled
  - [ ] Matched web conversion tags to server CAPI tags
  - [ ] Verified event_id flows through both containers
  - [ ] Verified user data mapping
  - [ ] Checked Stape configuration (if applicable)

- [ ] **Phase 6**: Cleanup Plan
  - [ ] Prioritized actions
  - [ ] Risk assessed

- [ ] **Phase 7**: Execute
  - [ ] Workspace synced (both containers)
  - [ ] Changes applied
  - [ ] No conflicts

- [ ] **Phase 8**: Validate
  - [ ] Workspace healthy
  - [ ] Quick preview tested
  - [ ] Version created

- [ ] **Phase 9**: Document
  - [ ] Audit report created (web + server)
  - [ ] GTM↔sGTM correlation documented
  - [ ] Version published (if approved)
```

---

## Quick Commands

### Web Container Commands

```
# Full web container inventory
gtm_tag action=list accountId=[ID] containerId=[WEB_ID] workspaceId=[ID] page=1 itemsPerPage=20
gtm_trigger action=list accountId=[ID] containerId=[WEB_ID] workspaceId=[ID] page=1 itemsPerPage=20
gtm_variable action=list accountId=[ID] containerId=[WEB_ID] workspaceId=[ID] page=1 itemsPerPage=20

# Check workspace status before changes
gtm_workspace action=getStatus accountId=[ID] containerId=[WEB_ID] workspaceId=[ID]

# Sync if needed
gtm_workspace action=sync accountId=[ID] containerId=[WEB_ID] workspaceId=[ID]

# Create version after cleanup
gtm_workspace action=createVersion accountId=[ID] containerId=[WEB_ID] workspaceId=[ID]

# Quick preview
gtm_workspace action=quickPreview accountId=[ID] containerId=[WEB_ID] workspaceId=[ID]

# Publish version
gtm_version action=publish accountId=[ID] containerId=[WEB_ID] containerVersionId=[VERSION_ID]
```

### Server Container Commands (sGTM)

```
# Get server container info
gtm_container action=get accountId=[ID] containerId=[SERVER_ID]

# List server clients (GA4 Client, etc.)
gtm_client action=list accountId=[ID] containerId=[SERVER_ID] workspaceId=[ID] page=1 itemsPerPage=50

# List server tags (CAPI tags)
gtm_tag action=list accountId=[ID] containerId=[SERVER_ID] workspaceId=[ID] page=1 itemsPerPage=20

# List server variables
gtm_variable action=list accountId=[ID] containerId=[SERVER_ID] workspaceId=[ID] page=1 itemsPerPage=20

# List server triggers
gtm_trigger action=list accountId=[ID] containerId=[SERVER_ID] workspaceId=[ID] page=1 itemsPerPage=20

# Check server workspace status
gtm_workspace action=getStatus accountId=[ID] containerId=[SERVER_ID] workspaceId=[ID]

# Create server version
gtm_workspace action=createVersion accountId=[ID] containerId=[SERVER_ID] workspaceId=[ID]

# Publish server version
gtm_version action=publish accountId=[ID] containerId=[SERVER_ID] containerVersionId=[VERSION_ID]
```

### Stape Commands (if using Stape MCP)

```
# Get Stape container info
stape_container_crud action=get identifier=[STAPE_CONTAINER_ID]

# List Stape domains
stape_container_domains action=list container=[STAPE_CONTAINER_ID]

# Check Stape analytics
stape_container_analytics action=get_info identifier=[STAPE_CONTAINER_ID]

# Check Stape statistics
stape_container_statistics action=get_statistics identifier=[STAPE_CONTAINER_ID]
```

---

## Trigger Phrases

Say any of these to activate Tidy GTM:

**Web Container Audit:**
- `"Audit this GTM container"`
- `"Clean up GTM"`
- `"Tidy up the container"`
- `"Check GTM health"`
- `"Find duplicate tags"`
- `"Standardize naming"`
- `"Organize GTM container"`

**Server-Side (sGTM) Audit:**
- `"Check sGTM setup"`
- `"Audit server container"`
- `"Verify GTM to sGTM connection"`
- `"Check CAPI correlation"`
- `"Validate server-side tracking"`
- `"Audit dual container setup"`

**Full Audit (Web + Server):**
- `"Full GTM audit"`
- `"Audit both containers"`
- `"Check web and server GTM"`

---

## ASCII Diagram Generator Hook

After completing an audit, this skill automatically triggers the `ascii-diagram-generator` hook to create visual before/after documentation.

### Automatic Output

After audit completion, the following files are generated:

| File | Purpose | Trigger |
|------|---------|---------|
| `AUDIT-SUMMARY-{{timestamp}}.md` | Before/after container structure | After Phase 8 Document |
| `CORRELATION-MAP-{{timestamp}}.md` | Web ↔ sGTM tag correlation | After Phase 5 sGTM Audit |

### AUDIT-SUMMARY Example

```
┌─────────────────────────────────────────────────────────────┐
│                    BEFORE (Issues Found)                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  GTM-W9S77T7/                                               │
│  ├── Tags (87)                                              │
│  │   ├── [DUPLICATE] GA4 - PageView        ← Duplicate #42  │
│  │   ├── [ORPHAN] Old FB Pixel             ← No trigger     │
│  │   ├── [NAMING] facebook conversion      ← Non-standard   │
│  │   └── ... (84 more)                                      │
│  │                                                          │
│  ├── Triggers (36)                                          │
│  │   ├── [UNUSED] Legacy Form Submit       ← Not referenced │
│  │   └── ... (35 more)                                      │
│  │                                                          │
│  └── Variables (59)                                         │
│      ├── [ORPHAN] Old Tracking ID          ← Not used       │
│      └── ... (58 more)                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    AFTER (Cleaned Up)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  GTM-W9S77T7/                                               │
│  ├── Tags (72)                              # -15 removed   │
│  │   ├── [Meta]                                             │
│  │   │   ├── Meta - Base Pixel             ✓ Renamed        │
│  │   │   └── Meta - Purchase               ✓ Renamed        │
│  │   ├── [Google]                                           │
│  │   │   ├── GA4 - Config                  ✓ Deduplicated   │
│  │   │   └── GA4 - PageView                ✓ Kept           │
│  │   └── ... (organized in folders)                         │
│  │                                                          │
│  ├── Triggers (28)                          # -8 removed    │
│  │   └── ... (all referenced)                               │
│  │                                                          │
│  └── Variables (45)                         # -14 removed   │
│      └── ... (all used)                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### CORRELATION-MAP Example

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        GTM ↔ sGTM CORRELATION                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  WEB CONTAINER (GTM-W9S77T7)          SERVER CONTAINER (GTM-KJHX6KJ7)   │
│                                                                          │
│  ┌─────────────────────────┐           ┌─────────────────────────┐      │
│  │ LI - Base Pageview      │ ════════► │ LI CAPI - PageView     │ ✓    │
│  │ event_id: {{Event ID}}  │           │ event_id: {{ED - id}}  │      │
│  └─────────────────────────┘           └─────────────────────────┘      │
│                                                                          │
│  ┌─────────────────────────┐           ┌─────────────────────────┐      │
│  │ LI - Lead Conversion    │ ════════► │ LI CAPI - Lead         │ ✓    │
│  │ event_id: {{Event ID}}  │           │ event_id: {{ED - id}}  │      │
│  └─────────────────────────┘           └─────────────────────────┘      │
│                                                                          │
│  ┌─────────────────────────┐           ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐      │
│  │ Meta - Purchase         │ ────X───► │ [MISSING CAPI TAG]     │ ⚠️   │
│  │ event_id: {{Event ID}}  │           │ Create sGTM tag        │      │
│  └─────────────────────────┘           └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘      │
│                                                                          │
│  Legend:  ════► Correlated    ───X─► Missing    ✓ OK    ⚠️ Action      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Integration

The hook is configured in `hooks/hooks.json`:

```json
{
  "ascii-diagram-generator": {
    "trigger": "After tidy-gtm audit, GTM AI deployments, or sGTM correlation checks",
    "outputs": {
      "audit": "AUDIT-SUMMARY-{{timestamp}}.md",
      "correlation": "CORRELATION-MAP-{{timestamp}}.md"
    }
  }
}
```

### Manual Trigger

To generate diagrams manually:

```
"Generate audit summary for GTM container"
"Create correlation map for web and server containers"
"Show before/after diagram for recent changes"
```

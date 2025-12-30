# ASCII Diagram Generator Hook

Automatically generates visual before/after documentation when GTM containers are audited or modified.

## Trigger Points

| Trigger | Output File | Purpose |
|---------|-------------|---------|
| Tidy GTM audit completes | `AUDIT-SUMMARY-{{timestamp}}.md` | Before/after container structure |
| GTM AI creates/modifies components | `DATA-FLOW-WORKSPACE-{{workspaceId}}.md` | Data flow visualization |
| Major changes (5+ components) | `CHANGE-SUMMARY-{{timestamp}}.md` | Change impact visualization |
| sGTM correlation check | `CORRELATION-MAP-{{timestamp}}.md` | Web ↔ Server mapping |

---

## Output Templates

### 1. Audit Summary (Tidy GTM)

Generated after `/gtm-audit` or tidy-gtm skill execution.

**File:** `AUDIT-SUMMARY-{{YYYYMMDD-HHMM}}.md`

```markdown
# GTM Container Audit Summary

**Generated:** {{timestamp}}
**Container:** {{containerPublicId}} ({{containerId}})
**Workspace:** {{workspaceName}} (ID: {{workspaceId}})

## Before & After Structure

### BEFORE (Issues Found)

```
{{containerPublicId}}/
├── Tags ({{tagCount}})
│   ├── [DUPLICATE] GA4 - PageView           ← Duplicate of #42
│   ├── [DUPLICATE] GA4 - Pageview           ← Naming inconsistency
│   ├── [ORPHAN] Old FB Pixel                ← No trigger attached
│   ├── [NAMING] facebook conversion         ← Should be "Meta - Purchase"
│   └── ... ({{remainingTags}} more)
│
├── Triggers ({{triggerCount}})
│   ├── [UNUSED] Legacy Form Submit          ← Not referenced
│   └── ... ({{remainingTriggers}} more)
│
├── Variables ({{variableCount}})
│   ├── [ORPHAN] Old Tracking ID             ← Not used by any tag
│   ├── [NAMING] fb_pixel_id                 ← Should be "Const - Meta Pixel ID"
│   └── ... ({{remainingVariables}} more)
│
└── Templates ({{templateCount}})
    └── [OUTDATED] LinkedIn v1.0             ← v2.0 available
```

**Issues Summary:**
| Category | Count |
|----------|-------|
| Duplicates | {{duplicateCount}} |
| Orphans | {{orphanCount}} |
| Naming Violations | {{namingCount}} |
| Unused | {{unusedCount}} |

---

### AFTER (Recommended)

```
{{containerPublicId}}/
├── Tags ({{newTagCount}})                    # -{{removedTags}} duplicates
│   ├── GA4 - PageView - All Pages           ✓ Renamed, deduplicated
│   ├── Meta - Purchase - Thank You          ✓ Renamed
│   └── ... ({{remainingNewTags}} more)
│
├── Triggers ({{newTriggerCount}})            # -{{removedTriggers}} unused
│   └── ... (all referenced)
│
├── Variables ({{newVariableCount}})          # -{{removedVariables}} orphans
│   ├── Const - Meta Pixel ID                ✓ Renamed
│   └── ... (all referenced)
│
└── Templates ({{newTemplateCount}})
    └── LinkedIn InsightTag 2.0              ✓ Updated
```

---

## Changes Applied

| Action | Component | Before | After |
|--------|-----------|--------|-------|
| **Removed** | Tag | GA4 - Pageview (duplicate) | - |
| **Renamed** | Tag | facebook conversion | Meta - Purchase - Thank You |
| **Removed** | Trigger | Legacy Form Submit | - |
| **Renamed** | Variable | fb_pixel_id | Const - Meta Pixel ID |
| **Updated** | Template | LinkedIn v1.0 | LinkedIn InsightTag 2.0 |

---

## Metrics Comparison

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Total Tags | {{beforeTags}} | {{afterTags}} | {{tagDelta}} |
| Total Triggers | {{beforeTriggers}} | {{afterTriggers}} | {{triggerDelta}} |
| Total Variables | {{beforeVariables}} | {{afterVariables}} | {{variableDelta}} |
| Duplicates | {{beforeDuplicates}} | 0 | -{{beforeDuplicates}} |
| Orphans | {{beforeOrphans}} | 0 | -{{beforeOrphans}} |
| Naming Issues | {{beforeNaming}} | 0 | -{{beforeNaming}} |
```

---

### 2. Data Flow Visualization (GTM AI)

Generated when GTM AI creates or modifies tracking components.

**File:** `DATA-FLOW-WORKSPACE-{{workspaceId}}.md`

```markdown
# Data Flow - Workspace {{workspaceId}}

**Generated:** {{timestamp}}
**Platform:** {{platform}}
**Container:** {{containerPublicId}}

## Before Changes

```
┌─────────────────────────────────────────────────────────────┐
│                     USER BROWSER                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    GTM WEB CONTAINER                         │
│                    {{containerPublicId}}                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [No {{platform}} tracking configured]                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                         (No data)
```

---

## After Changes

```
┌─────────────────────────────────────────────────────────────┐
│                     USER BROWSER                             │
│                                                              │
│  dataLayer.push({                                           │
│    'event': 'purchase',                                     │
│    'ecommerce': { 'value': 99.99, 'currency': 'USD' }      │
│  });                                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Page Load / Event
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    GTM WEB CONTAINER                         │
│                    {{containerPublicId}}                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  VARIABLES                                            │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  {{partnerIdVar}}     → "{{partnerId}}"              │   │
│  │  {{eventIdVar}}       → "evt_1234567890_abc123"      │   │
│  │  {{clickIdVar}}       → (from cookie)                │   │
│  │  {{transactionValue}} → {{ecommerce.value}}          │   │
│  └──────────────────────────────────────────────────────┘   │
│                              │                               │
│                              ▼                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  TRIGGERS                                             │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  All Pages ({{allPagesTrigger}})                     │   │
│  │  Purchase Event ({{purchaseTrigger}})                │   │
│  │  Lead Form Submit ({{leadTrigger}})                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                              │                               │
│                              ▼                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  TAGS                                                 │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │                                                       │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │ {{platform}} - Base Pageview                    │ │   │
│  │  │ Template: {{templateId}}                        │ │   │
│  │  │ Trigger: All Pages                              │ │   │
│  │  │ Fires: Once per page                            │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  │                         │                             │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │ {{platform}} - Purchase Conversion              │ │   │
│  │  │ Template: {{templateId}}                        │ │   │
│  │  │ Trigger: Purchase Event                         │ │   │
│  │  │ event_id: {{eventIdVar}}                        │ │   │
│  │  │ value: {{transactionValue}}                     │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  │                                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          │                                       │
          ▼                                       ▼
┌─────────────────────┐             ┌─────────────────────────┐
│  {{platform}}       │             │  GTM SERVER CONTAINER   │
│  (Client-Side)      │             │  {{serverContainerId}}  │
│                     │             │                         │
│  • Pageview pixel   │             │  ┌───────────────────┐  │
│  • Conversion pixel │             │  │ {{platform}} CAPI │  │
│  • Audience build   │             │  │ Tag               │  │
│                     │             │  │                   │  │
└─────────────────────┘             │  │ event_id: X       │  │
          │                         │  │ (same as client)  │  │
          │                         │  └───────────────────┘  │
          │                         │           │             │
          │                         └───────────┼─────────────┘
          │                                     │
          │                                     ▼
          │                         ┌─────────────────────────┐
          │                         │  {{platform}} API       │
          │                         │  (Server-Side)          │
          │                         │                         │
          │                         │  • High-fidelity data   │
          │                         │  • Ad-blocker bypass    │
          │                         │  • Enhanced matching    │
          │                         └─────────────────────────┘
          │                                     │
          └─────────────────┬───────────────────┘
                            │
                            ▼
              ┌─────────────────────────────┐
              │   {{platform}} DASHBOARD    │
              │                             │
              │   Events deduplicated via   │
              │   matching event_id         │
              │                             │
              │   ✓ Pageviews              │
              │   ✓ Conversions            │
              │   ✓ Revenue attributed     │
              └─────────────────────────────┘
```

---

## Components Created

| Type | Name | ID | Purpose |
|------|------|----|---------|
| Template | {{templateName}} | {{templateId}} | {{platform}} tracking |
| Variable | {{partnerIdVar}} | {{partnerIdVarId}} | Partner/Pixel ID |
| Variable | {{eventIdVar}} | {{eventIdVarId}} | Deduplication |
| Variable | {{clickIdVar}} | {{clickIdVarId}} | Attribution cookie |
| Tag | {{baseTagName}} | {{baseTagId}} | Pageview tracking |
| Tag | {{conversionTagName}} | {{conversionTagId}} | Conversion tracking |

---

## Event Flow

```
Event: purchase
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. User completes purchase
   │
   ▼
2. dataLayer.push({ event: 'purchase', ... })
   │
   ▼
3. GTM Trigger: Purchase Event fires
   │
   ├──► 4a. Client Tag: {{platform}} - Purchase
   │        │
   │        └──► Sends to {{platform}} (client-side)
   │             event_id: evt_abc123
   │
   └──► 4b. GA4 Transport to sGTM
            │
            ▼
        5. sGTM Tag: {{platform}} CAPI
           │
           └──► Sends to {{platform}} API (server-side)
                event_id: evt_abc123 (SAME)

6. {{platform}} receives both events
   │
   ▼
7. Deduplication: Same event_id = 1 conversion counted
```
```

---

### 3. Correlation Map (sGTM)

Generated when checking web ↔ server GTM correlation.

**File:** `CORRELATION-MAP-{{timestamp}}.md`

```markdown
# Web ↔ Server GTM Correlation Map

**Generated:** {{timestamp}}
**Web Container:** {{webContainerId}}
**Server Container:** {{serverContainerId}}

## Correlation Status

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CORRELATION MATRIX                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  WEB CONTAINER                          SERVER CONTAINER                 │
│  {{webContainerPublicId}}              {{serverContainerPublicId}}      │
│                                                                          │
│  ┌─────────────────────────┐           ┌─────────────────────────┐      │
│  │ LI - Base Pageview      │ ════════► │ LI CAPI - PageView     │ ✓    │
│  │ event_id: {{eventId}}   │           │ event_id: {{eventId}}  │      │
│  └─────────────────────────┘           └─────────────────────────┘      │
│                                                                          │
│  ┌─────────────────────────┐           ┌─────────────────────────┐      │
│  │ LI - Lead Conversion    │ ════════► │ LI CAPI - Lead         │ ✓    │
│  │ event_id: {{eventId}}   │           │ event_id: {{eventId}}  │      │
│  └─────────────────────────┘           └─────────────────────────┘      │
│                                                                          │
│  ┌─────────────────────────┐           ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐      │
│  │ Meta - Purchase         │ ────X───► │ [MISSING]              │ ✗    │
│  │ event_id: {{eventId}}   │           │ No matching sGTM tag   │      │
│  └─────────────────────────┘           └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘      │
│                                                                          │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐           ┌─────────────────────────┐      │
│  │ [NO CLIENT TAG]          │ ◄───X─── │ TikTok CAPI - Purchase │ ✗    │
│  │ Missing client-side      │           │ event_id: {{eventId}}  │      │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘           └─────────────────────────┘      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Correlation Summary

| Platform | Web Tag | Server Tag | event_id Match | Status |
|----------|---------|------------|----------------|--------|
| LinkedIn | LI - Base Pageview | LI CAPI - PageView | ✓ Yes | ✅ Correlated |
| LinkedIn | LI - Lead Conversion | LI CAPI - Lead | ✓ Yes | ✅ Correlated |
| Meta | Meta - Purchase | [MISSING] | N/A | ⚠️ Missing sGTM |
| TikTok | [MISSING] | TikTok CAPI - Purchase | N/A | ⚠️ Missing Client |

## Issues Found

### Missing Server Tags

| Web Tag | Expected Server Tag | Action |
|---------|---------------------|--------|
| Meta - Purchase | Meta CAPI - Purchase | Create sGTM tag |

### Missing Client Tags

| Server Tag | Expected Client Tag | Action |
|------------|---------------------|--------|
| TikTok CAPI - Purchase | TikTok - Purchase | Create web tag or remove sGTM |

### event_id Recommendations

```
REQUIRED for deduplication:

Web Tag:
  parameter: [
    { "key": "eventId", "value": "{{CJS - Event ID Generator}}" }
  ]

Server Tag:
  parameter: [
    { "key": "eventId", "value": "{{Event Data - event_id}}" }
  ]
```
```

---

## Integration

### With Tidy GTM Skill

Add to `tidy-gtm/SKILL.md`:

```markdown
## Post-Audit Hook

After completing audit, trigger `ascii-diagram-generator`:

1. Collect before/after metrics
2. Generate `AUDIT-SUMMARY-{{timestamp}}.md`
3. Include in audit report
```

### With GTM AI Skill

Add to `gtm-AI/SKILL.md`:

```markdown
## Post-Deployment Hook

After Phase 2 (Tag Creation), trigger `ascii-diagram-generator`:

1. Capture new component structure
2. Generate `DATA-FLOW-WORKSPACE-{{workspaceId}}.md`
3. Visualize data flow path
```

---

## Hook Configuration

Add to `hooks/hooks.json`:

```json
{
  "ascii-diagram-generator": {
    "description": "Generates visual before/after documentation",
    "trigger": "After tidy-gtm audit, GTM AI deployments, or sGTM correlation checks",
    "file": "ascii-diagram-generator.md",
    "outputs": {
      "audit": "AUDIT-SUMMARY-{{timestamp}}.md",
      "dataFlow": "DATA-FLOW-WORKSPACE-{{workspaceId}}.md",
      "correlation": "CORRELATION-MAP-{{timestamp}}.md",
      "changes": "CHANGE-SUMMARY-{{timestamp}}.md"
    }
  }
}
```

---

## Usage Examples

### After Audit

```bash
# Run audit
/gtm-audit --container both

# Hook automatically generates:
# → AUDIT-SUMMARY-20250129-1430.md
```

### After Deployment

```bash
# Deploy LinkedIn tracking
/gtm-deploy linkedin --partner-id 1234567

# Hook automatically generates:
# → DATA-FLOW-WORKSPACE-86.md
```

### Manual Generation

```bash
# Generate correlation map only
"Generate correlation map for web container 42412215 and server container 175099610"

# Hook generates:
# → CORRELATION-MAP-20250129-1430.md
```

---

## Template Variables

| Variable | Source | Example |
|----------|--------|---------|
| `{{timestamp}}` | System | 2025-01-29T14:30:00Z |
| `{{containerPublicId}}` | GTM API | GTM-W9S77T7 |
| `{{containerId}}` | GTM API | 42412215 |
| `{{workspaceId}}` | Config | 86 |
| `{{workspaceName}}` | GTM API | Default Workspace |
| `{{platform}}` | User input | LinkedIn |
| `{{partnerId}}` | Config | 1234567 |
| `{{templateId}}` | Phase 0 artifact | cvt_42412215_123 |
| `{{tagCount}}` | GTM API list | 25 |
| `{{triggerCount}}` | GTM API list | 18 |
| `{{variableCount}}` | GTM API list | 32 |

---

## Best Practices

1. **Always generate diagrams** for significant changes
2. **Keep diagrams in project root** for visibility
3. **Version control diagrams** to track evolution
4. **Reference diagrams** in handoff documentation
5. **Update diagrams** when containers change

# ASCII Diagram Generator Hook

Generates visual documentation for GTM audits and deployments.

## Trigger Points

1. **Post Audit** - After tidy-gtm audit completes
2. **Post Deployment** - After gtm-AI deployment (Phase 2+)
3. **Major Changes** - After 5+ component modifications
4. **sGTM Correlation** - After web ↔ server correlation check

## Diagram Types

### 1. Audit Summary Diagram

Generated after container audits:

```
┌──────────────────────────────────────────────────────────────────┐
│                    GTM CONTAINER AUDIT                           │
│                    {{containerPublicId}}                         │
│                    {{timestamp}}                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   BEFORE                           AFTER                         │
│   ──────                           ─────                         │
│                                                                  │
│   Tags: 87                         Tags: 72                      │
│   ├── Duplicates: 5                ├── Duplicates: 0             │
│   ├── Legacy: 3                    ├── Legacy: 0                 │
│   └── Test: 2                      └── Test: 0                   │
│                                                                  │
│   Triggers: 36                     Triggers: 28                  │
│   └── Orphaned: 8                  └── Orphaned: 0               │
│                                                                  │
│   Variables: 59                    Variables: 45                 │
│   └── Orphaned: 14                 └── Orphaned: 0               │
│                                                                  │
│   Folders: 0                       Folders: 4                    │
│                                    ├── Meta                      │
│                                    ├── Google                    │
│                                    ├── LinkedIn                  │
│                                    └── Microsoft                 │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│   ISSUES RESOLVED                                                │
│                                                                  │
│   ✓ Removed 5 duplicate tags                                     │
│   ✓ Renamed 12 tags to match conventions                         │
│   ✓ Deleted 8 orphaned triggers                                  │
│   ✓ Deleted 14 orphaned variables                                │
│   ✓ Created 4 folders for organization                           │
│   ✓ Archived 3 legacy UA tags                                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 2. Data Flow Diagram

Generated after deployments:

```
┌──────────────────────────────────────────────────────────────────┐
│                    {{platform}} TRACKING FLOW                    │
│                    Partner ID: {{partnerId}}                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   User Browser                                                   │
│       │                                                          │
│       ▼                                                          │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              GTM Web Container                           │   │
│   │              {{webContainerPublicId}}                    │   │
│   │                                                          │   │
│   │   Variables:                                             │   │
│   │   ├── CONST - Partner ID: {{partnerId}}                  │   │
│   │   ├── DL - email                                         │   │
│   │   ├── DL - event_id                                      │   │
│   │   └── JS - Event ID Generator                            │   │
│   │                                                          │   │
│   │   Triggers:                                              │   │
│   │   ├── All Pages (2147479553)                             │   │
│   │   ├── CE - signed_up                                     │   │
│   │   └── CE - purchase                                      │   │
│   │                                                          │   │
│   │   Tags:                                                  │   │
│   │   ├── {{platform}} - Base ─────────────────────────────────► Platform
│   │   ├── {{platform}} - Lead ─────────────────────────────────► Platform
│   │   └── GA4 - Config ───────┐                              │   │
│   │                           │ (transport_url)              │   │
│   └───────────────────────────│──────────────────────────────┘   │
│                               │                                  │
│                               ▼                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              GTM Server Container                        │   │
│   │              {{serverContainerPublicId}}                 │   │
│   │                                                          │   │
│   │   Client: GA4 Client                                     │   │
│   │                                                          │   │
│   │   Tags:                                                  │   │
│   │   ├── GA4 - All Events ────────────────────────────────────► Google
│   │   └── {{platform}} CAPI - Lead ────────────────────────────► Platform API
│   │                                                          │   │
│   │   Deduplication:                                         │   │
│   │   └── event_id: {{DL - event_id}}                        │   │
│   │                                                          │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 3. Web ↔ Server Correlation Matrix

Generated during sGTM correlation checks:

```
┌──────────────────────────────────────────────────────────────────┐
│                    GTM ↔ sGTM CORRELATION                        │
│                    {{timestamp}}                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   WEB TAG                    SERVER TAG               STATUS     │
│   ───────                    ──────────               ──────     │
│                                                                  │
│   GA4 - Config ─────────────▶ GA4 Client              ✓ OK       │
│                                                                  │
│   GA4 - Purchase ───────────▶ GA4 - All Events        ✓ OK       │
│   └── event_id: ✓                                                │
│                                                                  │
│   Meta - Base Pixel ────────▶ (client-only)           ⓘ INFO     │
│                                                                  │
│   Meta - Lead ──────────────▶ Meta CAPI - Lead        ✓ OK       │
│   └── event_id: ✓                                                │
│   └── user_data: ✓                                               │
│                                                                  │
│   LinkedIn - Insight ───────▶ (client-only)           ⓘ INFO     │
│                                                                  │
│   LinkedIn - Lead ──────────▶ LinkedIn CAPI - Lead    ✓ OK       │
│   └── event_id: ✓                                                │
│   └── user_data: ✓                                               │
│                                                                  │
│   TikTok - Pixel ───────────▶ TikTok CAPI             ✗ MISSING  │
│   └── RECOMMENDATION: Add TikTok Events API tag                  │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│   LEGEND                                                         │
│   ✓ = Properly correlated                                        │
│   ⓘ = Client-only (acceptable for base tags)                     │
│   ✗ = Missing server-side (action required)                      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Output Files

Diagrams are saved to:

```
DOCUMENTATION/
├── audit-diagram-{{timestamp}}.md
├── deployment-flow-{{platform}}-{{timestamp}}.md
└── correlation-matrix-{{timestamp}}.md
```

## Template Variables

| Variable | Source | Example |
|----------|--------|---------|
| `{{timestamp}}` | Current time | 2025-01-15 10:45:00 |
| `{{containerPublicId}}` | GTM container | GTM-XXXXXXX |
| `{{platform}}` | Deployment target | LinkedIn |
| `{{partnerId}}` | Config or argument | 1234567 |
| `{{webContainerPublicId}}` | Config | GTM-XXXXXXX |
| `{{serverContainerPublicId}}` | Config | GTM-XXXXXXX |

## Integration

### With tidy-gtm Skill

After audit completion, automatically generate:
- Audit summary diagram (before/after)
- Issue resolution summary

### With gtm-AI Skill

After deployment phases:
- Phase 2+: Generate data flow diagram
- Phase 4: Generate final deployment diagram

### Manual Trigger

```
Generate ASCII diagram for GTM container GTM-XXXXXXX
showing data flow for LinkedIn tracking
```

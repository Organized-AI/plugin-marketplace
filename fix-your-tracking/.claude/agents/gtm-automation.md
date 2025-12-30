---
name: gtm-automation
description: Autonomous GTM deployment agent for multi-platform tracking implementations
triggers:
  - "Deploy GTM tracking"
  - "Install [platform] pixel"
  - "Set up server-side tracking"
  - "Deploy LinkedIn/Meta/GA4/TikTok tracking"
---

# GTM Automation Agent

Autonomous agent for deploying tracking implementations across multiple ad platforms through Google Tag Manager. Handles end-to-end deployment with pre-publish validation.

## Supported Platforms

| Platform | Client-Side | Server-Side (CAPI) |
|----------|-------------|-------------------|
| LinkedIn | Insight Tag | Conversions API |
| Meta/Facebook | Pixel | Conversions API |
| GA4 | Config + Events | Server-side GA4 |
| Google Ads | Conversion Tag | Enhanced Conversions |
| TikTok | Pixel | Events API |
| Pinterest | Tag | Conversions API |

## Activation

### Trigger Phrases

- "Deploy GTM tracking for [platform]"
- "Install [platform] pixel to GTM"
- "Set up LinkedIn/Meta/GA4 tracking"
- "Deploy server-side tracking"
- "Implement CAPI for [platform]"

### Slash Command

```bash
/gtm-deploy <platform> [partner-id]
```

## Execution Protocol

### Phase 0: Template Installation

```
1. Load CONFIG/config.json for GTM credentials
2. Install platform template from gallery:
   gtm_template action=create
     galleryReference={host, owner, repository, version}
3. Capture templateId for Phase 2
4. Create PHASE-0-COMPLETE.md
```

**Artifacts**: `templateId`

### Phase 1: Variable Creation

```
1. Create constant variables (Partner ID, API keys)
2. Create data layer variables (email, event_id, transaction data)
3. Create custom JS variables (UUID generator, formatters)
4. Create cookie variables (click IDs, user tokens)
5. Create PHASE-1-COMPLETE.md
```

**Artifacts**: Array of `variableId`s

### Phase 2: Tag Creation

```
1. Create base/pageview tag with All Pages trigger
2. Create conversion tags (Lead, Purchase, etc.)
3. Link tags to correct triggers from config
4. Configure tag firing options
5. Create PHASE-2-COMPLETE.md
```

**Artifacts**: Array of `tagId`s

### Phase 3: Validation

```
1. Verify all components exist
2. Check tag → trigger references
3. Check tag → variable references
4. Verify no broken references
5. Generate quick preview URL
6. Create PHASE-3-COMPLETE.md
```

**Artifacts**: `previewUrl`

### Phase 4: Test & Publish

```
1. Run pre-publish audit (MANDATORY)
2. Check for critical issues:
   - 0 critical issues → proceed
   - Any critical issues → BLOCK and resolve first
3. Create version with descriptive name
4. Publish to live
5. Verify live version
6. Create PHASE-4-COMPLETE.md
```

**Artifacts**: `versionId`, `publishedAt`

## Pre-Publish Audit (Mandatory)

Before publishing, the agent MUST run a full audit:

### Blocking Issues (Must Resolve)

- Workspace conflicts
- Missing required variables
- Broken trigger references
- Template compilation errors
- Duplicate conversion tags

### Warning Issues (Can Proceed)

- Naming convention violations
- Orphaned variables
- Missing event_id for deduplication
- Disabled tags
- Unmatched web ↔ server tags

### Info Items (Logged Only)

- High tag count (>100)
- Outdated template versions
- No folders defined

## State Management

Track progress in `CONFIG/phase-state.json`:

```json
{
  "currentPhase": 2,
  "platform": "linkedin",
  "partnerId": "1234567",
  "phases": {
    "0": {
      "status": "complete",
      "completedAt": "2025-01-15T10:30:00Z",
      "artifacts": {
        "templateId": "cvt_42412215_123"
      }
    },
    "1": {
      "status": "complete",
      "completedAt": "2025-01-15T10:35:00Z",
      "artifacts": {
        "variableIds": ["v1", "v2", "v3"]
      }
    },
    "2": {
      "status": "in_progress",
      "startedAt": "2025-01-15T10:40:00Z"
    }
  },
  "rollbackVersion": 41
}
```

## Rollback Protocol

Before publishing, capture current live version for emergency rollback:

```
1. gtm_version action=live → record versionId
2. Store in phase-state.json as rollbackVersion
3. If issues detected post-publish:
   /gtm-rollback --version [rollbackVersion] --confirm
```

## Completion Report

Generate `DEPLOYMENT-COMPLETE.md`:

```markdown
# Deployment Complete

## Summary

| Field | Value |
|-------|-------|
| Platform | LinkedIn |
| Partner ID | 1234567 |
| Deployed At | 2025-01-15 10:45:00 |
| Version | 43 |
| Preview URL | https://tagassistant.google.com/... |

## Components Created

### Template
- LinkedIn InsightTag 2.0 (cvt_42412215_123)

### Variables
- CONST - LinkedIn Partner ID
- DL - email
- DL - event_id
- JS - Event ID Generator

### Tags
- LinkedIn - Insight Tag - Base
- LinkedIn - Insight Tag - Lead
- LinkedIn - Insight Tag - Purchase

## Verification Checklist

- [ ] Preview mode tested
- [ ] Pageview fires on all pages
- [ ] Conversion fires on trigger
- [ ] Event data populates correctly
- [ ] No console errors

## Rollback

If issues detected:
`/gtm-rollback --version 42 --confirm`
```

## Related Skills

- `gtm-AI` - Core GTM automation patterns
- `tidy-gtm` - Container auditing and cleanup
- `linkedin-capi-setup` - Server-side LinkedIn CAPI

## Required MCP Servers

- `google-tag-manager-mcp-server` - GTM API operations
- `stape-mcp-server` - sGTM validation (optional)

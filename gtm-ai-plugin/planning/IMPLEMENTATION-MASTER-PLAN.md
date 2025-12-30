# GTM-AI Implementation Master Plan

## Overview

This document provides the complete implementation roadmap for deploying platform tracking via Google Tag Manager using the GTM-AI plugin.

## Phases

| Phase | Name | Duration | Deliverables |
|-------|------|----------|--------------|
| 0 | Template Installation | ~5 min | Template from gallery |
| 1 | Variable Creation | ~10 min | Partner ID, Event ID, Cookies |
| 2 | Tag Creation | ~10 min | Pageview, Conversion tags |
| 3 | Validation | ~5 min | Workspace check, Preview |
| 4 | Test & Publish | ~5 min | Version, Publication |

**Total: ~35 minutes for complete deployment**

---

## Prerequisites

### Required

- [ ] Google Tag Manager account access
- [ ] GTM Account ID
- [ ] GTM Web Container ID
- [ ] GTM Workspace ID (or use Default)
- [ ] Platform Partner/Pixel ID

### Optional (for sGTM)

- [ ] Server GTM Container ID
- [ ] Stape container URL
- [ ] Platform access token (for CAPI)

---

## Phase Details

### Phase 0: Template Installation

**Objective:** Install platform template from Community Gallery

**Tasks:**
1. Verify MCP authentication
2. List gallery templates for platform
3. Install template to workspace
4. Capture template ID

**MCP Tools:**
- `gtm_template action=listGallery`
- `gtm_template action=createFromGallery`

**Artifacts:**
- Template ID (e.g., `cvt_42412215_XXX`)

---

### Phase 1: Variable Creation

**Objective:** Create all required variables

**Variables:**
| Name | Type | Purpose |
|------|------|---------|
| Const - Partner ID | `c` | Platform identifier |
| CJS - Event ID | `jsm` | Deduplication |
| Cookie - Click ID | `k` | Attribution cookie |
| DL - Transaction Value | `v` | Conversion value |
| DL - Currency | `v` | Currency code |

**MCP Tools:**
- `gtm_variable action=create`
- `gtm_variable action=list`

**Artifacts:**
- All variable IDs

---

### Phase 2: Tag Creation

**Objective:** Create tracking tags

**Tags:**
| Name | Trigger | Purpose |
|------|---------|---------|
| Base Pageview | All Pages | Load script, pageviews |
| Lead Conversion | Form Submit | Lead tracking |
| Purchase Conversion | Purchase Event | Transaction tracking |

**MCP Tools:**
- `gtm_tag action=create`
- `gtm_trigger action=list`

**Artifacts:**
- All tag IDs

---

### Phase 3: Validation

**Objective:** Validate workspace and generate preview

**Checks:**
- [ ] No merge conflicts
- [ ] No compilation errors
- [ ] All items exist
- [ ] References resolve

**MCP Tools:**
- `gtm_workspace action=getStatus`
- `gtm_workspace action=quickPreview`

**Artifacts:**
- Preview URL
- Validation status

---

### Phase 4: Test & Publish

**Objective:** Create version and publish

**Tasks:**
1. Generate preview URL
2. Create version with notes
3. Capture previous live version
4. Publish new version
5. Verify publication

**MCP Tools:**
- `gtm_workspace action=createVersion`
- `gtm_version action=live`
- `gtm_version action=publish`

**Artifacts:**
- Version ID
- Previous version ID (for rollback)
- Publication timestamp

---

## Execution Modes

### Autonomous Agent

```bash
./scripts/start-agent.sh linkedin
```

Agent executes all phases automatically with:
- Pre-phase validation
- Error handling
- State management
- Completion files

### Step-by-Step

```bash
./scripts/execute-phase.sh 0
./scripts/execute-phase.sh 1
./scripts/execute-phase.sh 2
./scripts/execute-phase.sh 3
./scripts/execute-phase.sh 4
```

### Natural Language

In Claude Code:
```
Deploy LinkedIn tracking with Partner ID 1234567
```

---

## State Management

Progress tracked in `CONFIG/phase-state.json`:

```json
{
  "currentPhase": 2,
  "status": "in_progress",
  "phases": {
    "0": { "status": "completed", "artifacts": {...} },
    "1": { "status": "completed", "artifacts": {...} },
    "2": { "status": "in_progress", "artifacts": {} }
  }
}
```

---

## Rollback Procedure

If issues discovered after publish:

```
gtm_version action=publish containerVersionId={{previousVersionId}}
```

Or use command:
```
/gtm-rollback
```

---

## Multi-Platform Deployment

For multiple platforms in single session:

1. Complete all phases for Platform 1
2. Complete all phases for Platform 2
3. Create single version with all changes
4. Publish once

---

## sGTM Integration

For server-side CAPI:

1. Deploy client-side first
2. Configure transport URL
3. Install sGTM template
4. Create sGTM tags
5. Validate event_id correlation

See `skills/linkedin-capi-setup/SKILL.md` for CAPI details.

---

## Success Criteria

- [ ] All phases completed without errors
- [ ] Version published to live
- [ ] Tags firing in preview
- [ ] Events appearing in platform dashboard
- [ ] No console errors on website

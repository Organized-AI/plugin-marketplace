# Phase 2: Tag Creation

## Objective
Create platform tags using the installed template.

---

## Prerequisites

- [ ] Phase 0 complete (template ID)
- [ ] Phase 1 complete (variable IDs)
- [ ] Trigger IDs from config.json

---

## Context Files (Read First)

1. `CONFIG/config.json` - Trigger IDs
2. `PHASE-0-COMPLETE.md` - Template ID
3. `PHASE-1-COMPLETE.md` - Variable IDs
4. `.claude/skills/gtm-AI/references/tool-patterns.md` - Tag patterns

---

## Tags to Create

### Base/Pageview Tag
- Fires on: All Pages
- Purpose: Load tracking script, capture pageviews

### Conversion Tags
- Lead: Form submissions
- Purchase: Transactions
- Add to Cart: Cart additions (optional)

---

## Tasks

### Task 2.1: Create Base Pageview Tag

```
gtm_tag action=create
  accountId={{config.gtm.accountId}}
  containerId={{config.gtm.webContainer.id}}
  workspaceId={{config.gtm.workspace.id}}
  config={
    "name": "{{Platform}} - Base Pageview",
    "type": "{{templateId}}",
    "parameter": [
      {"key": "partnerId", "type": "template", "value": "{{Const - Partner ID}}"},
      {"key": "trackPageview", "type": "boolean", "value": "true"}
    ],
    "firingTriggerId": ["{{config.triggers.allPages}}"],
    "tagFiringOption": "oncePerLoad"
  }
```

**Capture:** tagId

---

### Task 2.2: Create Lead Conversion Tag

```
gtm_tag action=create
  accountId={{config.gtm.accountId}}
  containerId={{config.gtm.webContainer.id}}
  workspaceId={{config.gtm.workspace.id}}
  config={
    "name": "{{Platform}} - Lead",
    "type": "{{templateId}}",
    "parameter": [
      {"key": "partnerId", "type": "template", "value": "{{Const - Partner ID}}"},
      {"key": "conversionId", "type": "template", "value": "{{config.platforms.[platform].conversionIds.lead}}"},
      {"key": "eventId", "type": "template", "value": "{{CJS - Event ID Generator}}"}
    ],
    "firingTriggerId": ["{{config.triggers.lead}}"],
    "tagFiringOption": "oncePerEvent"
  }
```

**Capture:** tagId

---

### Task 2.3: Create Purchase Conversion Tag

```
gtm_tag action=create
  accountId={{config.gtm.accountId}}
  containerId={{config.gtm.webContainer.id}}
  workspaceId={{config.gtm.workspace.id}}
  config={
    "name": "{{Platform}} - Purchase",
    "type": "{{templateId}}",
    "parameter": [
      {"key": "partnerId", "type": "template", "value": "{{Const - Partner ID}}"},
      {"key": "conversionId", "type": "template", "value": "{{config.platforms.[platform].conversionIds.purchase}}"},
      {"key": "eventId", "type": "template", "value": "{{CJS - Event ID Generator}}"},
      {"key": "conversionValue", "type": "template", "value": "{{DL - Transaction Value}}"},
      {"key": "currency", "type": "template", "value": "{{DL - Currency}}"}
    ],
    "firingTriggerId": ["{{config.triggers.purchase}}"],
    "tagFiringOption": "oncePerEvent"
  }
```

**Capture:** tagId

---

## Success Criteria

- [ ] Base pageview tag created
- [ ] Conversion tags created
- [ ] All tags reference correct template
- [ ] All tags have correct triggers
- [ ] No errors

---

## Artifacts

```json
{
  "tags": {
    "basePageview": "TAG_ID",
    "lead": "TAG_ID",
    "purchase": "TAG_ID"
  }
}
```

---

## Next Phase

Proceed to **Phase 3: Validation**

---

## Completion

Create `PHASE-2-COMPLETE.md`:

```markdown
# Phase 2 Complete

## Timestamp
{{ISO_TIMESTAMP}}

## Tags Created
| Name | ID | Trigger |
|------|-----|---------|
| Base Pageview | {{id}} | All Pages |
| Lead | {{id}} | CE - Lead |
| Purchase | {{id}} | CE - Purchase |

## Status
✅ All tags created successfully

## Next
Phase 3: Validation
```

# Phase 1: Variable Creation

## Objective
Create all required variables for platform tracking.

---

## Prerequisites

- [ ] Phase 0 complete (template installed)
- [ ] Template ID from Phase 0
- [ ] Platform Partner/Pixel ID from user

---

## Context Files (Read First)

1. `CONFIG/config.json` - Platform configuration
2. `PHASE-0-COMPLETE.md` - Template artifacts
3. `.claude/skills/gtm-AI/references/variable-types.md` - Variable patterns

---

## Variables to Create

### Common Variables (All Platforms)

| Variable | Type | Purpose |
|----------|------|---------|
| Event ID Generator | Custom JS | Deduplication |

### Platform-Specific Variables

Configure based on `config.platforms.[platform]`:

| Variable | Type | Value Source |
|----------|------|--------------|
| Partner/Pixel ID | Constant | config.json |
| Conversion Value | Data Layer | ecommerce.value |
| Currency | Data Layer | ecommerce.currency |
| Transaction ID | Data Layer | ecommerce.transaction_id |

---

## Tasks

### Task 1.1: Create Partner/Pixel ID Constant

```
gtm_variable action=create
  accountId={{config.gtm.accountId}}
  containerId={{config.gtm.webContainer.id}}
  workspaceId={{config.gtm.workspace.id}}
  config={
    "name": "Const - {{Platform}} Partner ID",
    "type": "c",
    "parameter": [
      {"key": "value", "type": "template", "value": "{{PARTNER_ID}}"}
    ]
  }
```

**Capture:** variableId

---

### Task 1.2: Create Event ID Generator

```
gtm_variable action=create
  accountId={{config.gtm.accountId}}
  containerId={{config.gtm.webContainer.id}}
  workspaceId={{config.gtm.workspace.id}}
  config={
    "name": "CJS - Event ID Generator",
    "type": "jsm",
    "parameter": [
      {
        "key": "javascript",
        "type": "template",
        "value": "function() {\n  return 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);\n}"
      }
    ]
  }
```

**Capture:** variableId

---

### Task 1.3: Create Cookie Variable (if needed)

For platforms with click ID cookies (LinkedIn: li_fat_id, Meta: _fbc/_fbp):

```
gtm_variable action=create
  accountId={{config.gtm.accountId}}
  containerId={{config.gtm.webContainer.id}}
  workspaceId={{config.gtm.workspace.id}}
  config={
    "name": "Cookie - {{cookie_name}}",
    "type": "k",
    "parameter": [
      {"key": "cookieName", "type": "template", "value": "{{cookie_name}}"}
    ]
  }
```

---

### Task 1.4: Create Data Layer Variables (if needed)

For conversion events:

```
gtm_variable action=create
  config={
    "name": "DL - Transaction ID",
    "type": "v",
    "parameter": [
      {"key": "name", "type": "template", "value": "ecommerce.transaction_id"},
      {"key": "dataLayerVersion", "type": "integer", "value": "2"}
    ]
  }
```

Repeat for: Transaction Value, Currency, Items, User Email, etc.

---

## Success Criteria

- [ ] All required variables created
- [ ] Variable IDs captured
- [ ] No errors

---

## Artifacts

```json
{
  "variables": {
    "partnerId": "VAR_ID",
    "eventId": "VAR_ID",
    "clickIdCookie": "VAR_ID",
    "transactionId": "VAR_ID",
    "transactionValue": "VAR_ID",
    "currency": "VAR_ID"
  }
}
```

---

## Next Phase

Proceed to **Phase 2: Tag Creation**

---

## Completion

Create `PHASE-1-COMPLETE.md`:

```markdown
# Phase 1 Complete

## Timestamp
{{ISO_TIMESTAMP}}

## Variables Created
| Name | ID | Type |
|------|-----|------|
| Const - Partner ID | {{id}} | c |
| CJS - Event ID | {{id}} | jsm |
| Cookie - li_fat_id | {{id}} | k |

## Status
✅ All variables created successfully

## Next
Phase 2: Tag Creation
```

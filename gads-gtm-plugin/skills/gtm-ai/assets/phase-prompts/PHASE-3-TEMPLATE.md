# Phase 3: Validation

## Objective
Validate workspace health and verify all items are correctly configured.

---

## Prerequisites

- [ ] Phase 2 complete (tags created)
- [ ] All artifact IDs captured

---

## Context Files (Read First)

1. `PHASE-0-COMPLETE.md` - Template artifacts
2. `PHASE-1-COMPLETE.md` - Variable artifacts
3. `PHASE-2-COMPLETE.md` - Tag artifacts
4. `.claude/skills/gtm-AI/references/audit-checklist.md`

---

## Tasks

### Task 3.1: Check Workspace Status

```
gtm_workspace action=getStatus
  accountId={{config.gtm.accountId}}
  containerId={{config.gtm.webContainer.id}}
  workspaceId={{config.gtm.workspace.id}}
```

**Expected:**
- `workspaceChange`: List of changes (should include our items)
- `mergeConflict`: Empty (no conflicts)

**If conflicts exist:**
```
gtm_workspace action=sync
```

---

### Task 3.2: Verify Template

```
gtm_template action=get
  accountId={{config.gtm.accountId}}
  containerId={{config.gtm.webContainer.id}}
  workspaceId={{config.gtm.workspace.id}}
  templateId={{templateId}}
```

**Verify:**
- [ ] Template exists
- [ ] Name is correct

---

### Task 3.3: Verify Variables

```
gtm_variable action=get
  variableId={{variableId}}
```

For each variable created in Phase 1:
- [ ] Variable exists
- [ ] Type is correct
- [ ] Value/parameters are correct

---

### Task 3.4: Verify Tags

```
gtm_tag action=get
  tagId={{tagId}}
```

For each tag created in Phase 2:
- [ ] Tag exists
- [ ] Uses correct template type
- [ ] References correct variables
- [ ] Has correct firing triggers
- [ ] tagFiringOption is set

---

### Task 3.5: Check for Compilation Errors

```
gtm_workspace action=quickPreview
  accountId={{config.gtm.accountId}}
  containerId={{config.gtm.webContainer.id}}
  workspaceId={{config.gtm.workspace.id}}
```

**Check:**
- [ ] No `compilerError` in response
- [ ] `quickPreviewUrl` is generated

---

## Validation Checklist

### Template
- [ ] Installed from correct gallery source
- [ ] Version matches expected

### Variables
- [ ] Partner/Pixel ID is correct value
- [ ] Event ID generator function is valid JS
- [ ] Cookie variables reference correct cookies
- [ ] Data Layer paths are correct

### Tags
- [ ] Base tag fires on All Pages
- [ ] Conversion tags fire on correct events
- [ ] All variable references resolve
- [ ] Event ID is included for deduplication

### Workspace
- [ ] No merge conflicts
- [ ] No compilation errors
- [ ] Changes are staged

---

## Success Criteria

- [ ] All items verified
- [ ] No errors or conflicts
- [ ] Preview URL generated
- [ ] Ready for publish

---

## Artifacts

```json
{
  "validation": {
    "templateVerified": true,
    "variablesVerified": true,
    "tagsVerified": true,
    "noConflicts": true,
    "noCompilerErrors": true,
    "previewUrl": "https://tagassistant.google.com/..."
  }
}
```

---

## Next Phase

Proceed to **Phase 4: Test & Publish**

---

## Completion

Create `PHASE-3-COMPLETE.md`:

```markdown
# Phase 3 Complete

## Timestamp
{{ISO_TIMESTAMP}}

## Validation Results
| Check | Status |
|-------|--------|
| Template | ✅ |
| Variables | ✅ |
| Tags | ✅ |
| No Conflicts | ✅ |
| No Errors | ✅ |

## Preview URL
{{previewUrl}}

## Status
✅ All validations passed

## Next
Phase 4: Test & Publish
```

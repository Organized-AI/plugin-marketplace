# Phase 0: Template Installation

## Objective
Install the required platform template from the GTM Community Gallery.

---

## Prerequisites

- [ ] CONFIG/config.json populated with GTM IDs
- [ ] MCP authentication working
- [ ] Workspace has no merge conflicts

---

## Context Files (Read First)

1. `CONFIG/config.json` - GTM and platform configuration
2. `.claude/skills/gtm-AI/references/template-gallery.md` - Gallery references

---

## Tasks

### Task 0.1: Verify MCP Authentication

```
gtm_workspace action=getStatus
  accountId={{config.gtm.accountId}}
  containerId={{config.gtm.webContainer.id}}
  workspaceId={{config.gtm.workspace.id}}
```

**Expected:** Status response, no errors

**If error:** See troubleshooting.md for auth issues

---

### Task 0.2: Check Existing Templates

```
gtm_template action=list
  accountId={{config.gtm.accountId}}
  containerId={{config.gtm.webContainer.id}}
  workspaceId={{config.gtm.workspace.id}}
```

**Check:** Does template already exist?
- If yes: Note templateId, skip to Phase 1
- If no: Continue to Task 0.3

---

### Task 0.3: Install Template from Gallery

```
gtm_template action=create
  accountId={{config.gtm.accountId}}
  containerId={{config.gtm.webContainer.id}}
  workspaceId={{config.gtm.workspace.id}}
  createOrUpdateConfig={
    "name": "{{config.platforms.[platform].template.name}}",
    "galleryReference": {
      "host": "github.com",
      "owner": "{{config.platforms.[platform].template.owner}}",
      "repository": "{{config.platforms.[platform].template.repository}}",
      "version": "{{config.platforms.[platform].template.version}}"
    }
  }
```

**Expected Response:**
```json
{
  "templateId": "cvt_CONTAINER_ID_XXX",
  "name": "Template Name",
  ...
}
```

**Capture:** `templateId` for Phase 2

---

## Success Criteria

- [ ] Template installed successfully
- [ ] Template ID captured
- [ ] No workspace errors

---

## Artifacts

```json
{
  "templateId": "cvt_XXXXX_XXX",
  "templateName": "Platform Template Name"
}
```

---

## Next Phase

Proceed to **Phase 1: Variable Creation**

---

## Completion

Create `PHASE-0-COMPLETE.md`:

```markdown
# Phase 0 Complete

## Timestamp
{{ISO_TIMESTAMP}}

## Artifacts
- Template ID: {{templateId}}
- Template Name: {{templateName}}

## Status
✅ Template installed successfully

## Next
Phase 1: Variable Creation
```

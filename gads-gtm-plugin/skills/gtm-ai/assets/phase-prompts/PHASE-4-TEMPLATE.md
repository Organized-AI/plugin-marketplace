# Phase 4: Test & Publish

## Objective
Test changes in preview mode, create version, and publish to live.

---

## Prerequisites

- [ ] Phase 3 complete (validation passed)
- [ ] Preview URL from Phase 3
- [ ] No workspace conflicts

---

## Context Files (Read First)

1. `PHASE-3-COMPLETE.md` - Validation results, preview URL
2. `CONFIG/config.json` - Container configuration
3. `.claude/skills/gtm-AI/references/tool-patterns.md`

---

## Tasks

### Task 4.1: Generate Fresh Preview

```
gtm_workspace action=quickPreview
  accountId={{config.gtm.accountId}}
  containerId={{config.gtm.webContainer.id}}
  workspaceId={{config.gtm.workspace.id}}
```

**Response includes:**
- `quickPreviewUrl` - Open in browser to test

**Manual Testing (if needed):**
1. Open preview URL in browser
2. Navigate to target website
3. Verify tags fire correctly in Tag Assistant
4. Check platform dashboards for events

---

### Task 4.2: Create Version

```
gtm_workspace action=createVersion
  accountId={{config.gtm.accountId}}
  containerId={{config.gtm.webContainer.id}}
  workspaceId={{config.gtm.workspace.id}}
  name="{{Platform}} Tracking v1.0"
  notes="Added {{Platform}} tracking:\n- Base pageview tag\n- Lead conversion\n- Purchase conversion\n\nImplemented via GTM-AI Skill"
```

**Response includes:**
- `containerVersionId` - Version ID for publishing
- `containerVersion.name` - Version name
- `containerVersion.description` - Version notes

**Capture:** containerVersionId

---

### Task 4.3: Get Current Live Version (Backup)

```
gtm_version action=live
  accountId={{config.gtm.accountId}}
  containerId={{config.gtm.webContainer.id}}
```

**Capture:** Current live version ID for rollback if needed

---

### Task 4.4: Publish Version

```
gtm_version action=publish
  accountId={{config.gtm.accountId}}
  containerId={{config.gtm.webContainer.id}}
  containerVersionId={{containerVersionId}}
```

**Expected:**
- Version becomes live
- Changes are now in production

---

### Task 4.5: Verify Publication

```
gtm_version action=live
  accountId={{config.gtm.accountId}}
  containerId={{config.gtm.webContainer.id}}
```

**Verify:**
- [ ] Live version ID matches published version
- [ ] Version name is correct

---

## Rollback Procedure (If Needed)

If issues are discovered after publish:

```
gtm_version action=publish
  accountId={{config.gtm.accountId}}
  containerId={{config.gtm.webContainer.id}}
  containerVersionId={{previousVersionId}}
```

---

## Success Criteria

- [ ] Preview tested (no errors)
- [ ] Version created
- [ ] Version published
- [ ] Live version confirmed
- [ ] Previous version noted for rollback

---

## Artifacts

```json
{
  "version": {
    "id": "VERSION_ID",
    "name": "Platform Tracking v1.0",
    "previousVersionId": "PREVIOUS_VERSION_ID",
    "publishedAt": "ISO_TIMESTAMP"
  }
}
```

---

## Post-Publish Verification

1. **GTM:**
   - Confirm live version in GTM UI
   - Check version history

2. **Website:**
   - Open target website
   - Check Network tab for tracking calls
   - Use platform's debug tools

3. **Platform Dashboard:**
   - LinkedIn: Campaign Manager → Conversions
   - Meta: Events Manager → Test Events
   - GA4: DebugView

---

## Completion

Create `PHASE-4-COMPLETE.md`:

```markdown
# Phase 4 Complete

## Timestamp
{{ISO_TIMESTAMP}}

## Version Details
- Version ID: {{versionId}}
- Version Name: {{versionName}}
- Previous Version: {{previousVersionId}}

## Publication Status
✅ Published to live

## Verification
- [ ] GTM shows correct live version
- [ ] Tags firing on website
- [ ] Events appearing in platform dashboard

## Rollback Command (if needed)
gtm_version action=publish containerVersionId={{previousVersionId}}

## Implementation Complete
All phases finished. {{Platform}} tracking is now live.
```

---

## Final Summary

Create `IMPLEMENTATION-COMPLETE.md`:

```markdown
# Implementation Complete

## Project
{{config.project.name}}

## Platform
{{Platform}}

## Components Deployed

### Template
- ID: {{templateId}}
- Name: {{templateName}}
- Source: Community Gallery

### Variables
| Name | ID |
|------|-----|
{{variable_table}}

### Tags
| Name | ID | Trigger |
|------|-----|---------|
{{tag_table}}

### Version
- ID: {{versionId}}
- Published: {{timestamp}}

## Tracking Verification
- Base Pageview: ✅ Firing on all pages
- Conversions: ✅ Configured with event_id

## Next Steps
1. Monitor platform dashboard for incoming events
2. Verify conversion attribution in campaigns
3. Consider adding sGTM CAPI for enhanced tracking
```

# Post-Phase Hook

Confirms completion and updates state after each GTM deployment phase.

## Trigger

Activates after each phase (0-4) completes successfully.

## Validation by Phase

### Phase 0: Template Installation

**Success Criteria:**
- [ ] Template ID captured
- [ ] Template exists in workspace

**Verification:**
```
gtm_template action=get
  templateId={{artifacts.templateId}}
```

### Phase 1: Variable Creation

**Success Criteria:**
- [ ] All variable IDs captured
- [ ] Variables exist in workspace

**Verification:**
```
# For each variableId
gtm_variable action=get variableId={{id}}
```

### Phase 2: Tag Creation

**Success Criteria:**
- [ ] All tag IDs captured
- [ ] Tags reference correct triggers
- [ ] Tags reference correct variables

**Verification:**
```
# For each tagId
gtm_tag action=get tagId={{id}}
```

### Phase 3: Validation

**Success Criteria:**
- [ ] No broken references
- [ ] Preview URL generated

**Verification:**
```
gtm_workspace action=quickPreview
```

### Phase 4: Test & Publish

**Success Criteria:**
- [ ] Version published
- [ ] Live version confirmed

**Verification:**
```
gtm_version action=live
```

## State Update

On success, update `CONFIG/phase-state.json`:

```json
{
  "currentPhase": 2,
  "phases": {
    "1": {
      "status": "complete",
      "completedAt": "2025-01-15T10:35:00Z",
      "artifacts": {
        "variableIds": ["v1", "v2", "v3", "v4"]
      }
    },
    "2": {
      "status": "pending"
    }
  }
}
```

## Completion File

Generate `PHASE-X-COMPLETE.md`:

```markdown
# Phase 1 Complete

**Completed**: 2025-01-15 10:35:00
**Platform**: LinkedIn

## Artifacts

| Type | Name | ID |
|------|------|----|
| Variable | CONST - LinkedIn Partner ID | 12345 |
| Variable | DL - email | 12346 |
| Variable | DL - event_id | 12347 |
| Variable | JS - Event ID Generator | 12348 |

## Next Phase

Phase 2: Tag Creation
- Create base pageview tag
- Create conversion tags
- Link to triggers
```

## Failure Handling

On validation failure:
1. List failed checks
2. Suggest remediation
3. Keep phase in `in_progress` status
4. Allow retry

Example failure:
```
PHASE 1 VALIDATION FAILED

Failed checks:
- Variable "DL - email" not found in workspace

Remediation:
1. Check GTM workspace for errors
2. Retry variable creation
3. Run: gtm_variable action=create config={...}
```

## Git Integration (Optional)

If git auto-commit enabled:
```bash
git add CONFIG/phase-state.json PHASE-1-COMPLETE.md
git commit -m "Complete Phase 1: Variable Creation"
```

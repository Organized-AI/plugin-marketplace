# Post-Phase Hook

Validates completion and updates state after phase execution.

## Trigger

Runs automatically after each phase completes.

## Validation Checks

### Phase 0 Complete
- [ ] Template ID captured
- [ ] Template exists in workspace
- [ ] `PHASE-0-COMPLETE.md` created

### Phase 1 Complete
- [ ] All variable IDs captured
- [ ] Variables exist in workspace
- [ ] `PHASE-1-COMPLETE.md` created

### Phase 2 Complete
- [ ] All tag IDs captured
- [ ] Tags reference correct template
- [ ] Tags have correct triggers
- [ ] `PHASE-2-COMPLETE.md` created

### Phase 3 Complete
- [ ] No workspace conflicts
- [ ] No compilation errors
- [ ] Preview URL generated
- [ ] `PHASE-3-COMPLETE.md` created

### Phase 4 Complete
- [ ] Version created
- [ ] Version published
- [ ] Live version confirmed
- [ ] `PHASE-4-COMPLETE.md` created

## Actions

### On Validation Pass
1. Update `phase-state.json` with completion
2. Create `PHASE-X-COMPLETE.md`
3. Log phase completion
4. Prompt for next phase

### On Validation Fail
1. List failed checks
2. Suggest fixes
3. Keep phase as in_progress
4. Offer retry option

## State Update

```json
{
  "currentPhase": 1,
  "status": "completed",
  "completedAt": "ISO_TIMESTAMP",
  "artifacts": {
    "templateId": "cvt_XXX",
    "variableIds": {...},
    "tagIds": {...}
  },
  "completionFile": "PHASE-1-COMPLETE.md"
}
```

## Completion File Template

```markdown
# Phase X Complete

## Timestamp
{{ISO_TIMESTAMP}}

## Artifacts
{{artifact_table}}

## Status
✅ All tasks completed successfully

## Next
Phase {{X+1}}: {{next_phase_name}}
```

## Git Commit (Optional)

If `auto_commit` enabled:

```bash
git add PHASE-X-COMPLETE.md CONFIG/phase-state.json
git commit -m "Complete Phase X: {{phase_name}}"
```

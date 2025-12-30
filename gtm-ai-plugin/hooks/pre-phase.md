# Pre-Phase Hook

Validates prerequisites before executing a phase.

## Trigger

Runs automatically before each phase starts.

## Validation Checks

### Phase 0 (Template Installation)
- [ ] `CONFIG/config.json` exists
- [ ] GTM Account ID configured
- [ ] GTM Container ID configured
- [ ] GTM Workspace ID configured
- [ ] MCP server authenticated

### Phase 1 (Variable Creation)
- [ ] Phase 0 complete (`PHASE-0-COMPLETE.md` exists)
- [ ] Template ID captured in state
- [ ] Partner/Pixel ID available

### Phase 2 (Tag Creation)
- [ ] Phase 1 complete (`PHASE-1-COMPLETE.md` exists)
- [ ] All variable IDs captured
- [ ] Trigger IDs available in config

### Phase 3 (Validation)
- [ ] Phase 2 complete (`PHASE-2-COMPLETE.md` exists)
- [ ] All tag IDs captured

### Phase 4 (Test & Publish)
- [ ] Phase 3 complete (`PHASE-3-COMPLETE.md` exists)
- [ ] Preview URL generated
- [ ] No workspace conflicts

## Actions

### On Validation Pass
1. Update `phase-state.json` with start timestamp
2. Log phase start
3. Proceed with phase execution

### On Validation Fail
1. List missing prerequisites
2. Suggest remediation steps
3. Block phase execution
4. Prompt user for action

## State Update

```json
{
  "currentPhase": 1,
  "status": "in_progress",
  "startedAt": "ISO_TIMESTAMP",
  "prerequisites": {
    "validated": true,
    "timestamp": "ISO_TIMESTAMP"
  }
}
```

## MCP Validation

Verify MCP server connection:

```
gtm_workspace action=get
  accountId={{config.gtm.accountId}}
  containerId={{config.gtm.webContainer.id}}
  workspaceId={{config.gtm.workspace.id}}
```

If fails with 401: Prompt for re-authentication.

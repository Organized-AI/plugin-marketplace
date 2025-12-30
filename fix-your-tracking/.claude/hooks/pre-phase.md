# Pre-Phase Hook

Validates prerequisites before each GTM deployment phase executes.

## Trigger

Activates before each phase (0-4) of the GTM deployment workflow.

## Validation by Phase

### Phase 0: Template Installation

**Prerequisites:**
- [ ] `CONFIG/config.json` exists
- [ ] GTM credentials present:
  - `gtm.accountId`
  - `gtm.webContainer.id`
  - `gtm.workspace.id`
- [ ] MCP server authenticated

**Validation:**
```
gtm_container action=get
  accountId={{config.gtm.accountId}}
  containerId={{config.gtm.webContainer.id}}
```

If authentication fails, prompt: "Run MCP authentication flow"

### Phase 1: Variable Creation

**Prerequisites:**
- [ ] Phase 0 complete
- [ ] `templateId` captured in phase-state.json
- [ ] Partner/Pixel ID available

**Validation:**
```json
{
  "phases": {
    "0": {
      "status": "complete",
      "artifacts": {
        "templateId": "cvt_xxx"
      }
    }
  }
}
```

### Phase 2: Tag Creation

**Prerequisites:**
- [ ] Phase 1 complete
- [ ] Variable IDs captured
- [ ] Trigger IDs available in config

**Validation:**
- All variable IDs exist
- Trigger IDs reference valid triggers

### Phase 3: Validation

**Prerequisites:**
- [ ] Phase 2 complete
- [ ] Tag IDs captured
- [ ] All components created

### Phase 4: Test & Publish

**Prerequisites:**
- [ ] Phase 3 complete
- [ ] Preview URL generated
- [ ] No workspace conflicts

**Validation:**
```
gtm_workspace action=getStatus
```

If conflicts exist: BLOCK until resolved

## State File Structure

```json
// CONFIG/phase-state.json
{
  "currentPhase": 1,
  "platform": "linkedin",
  "startedAt": "2025-01-15T10:30:00Z",
  "phases": {
    "0": {
      "status": "complete",
      "completedAt": "2025-01-15T10:32:00Z",
      "artifacts": {
        "templateId": "cvt_42412215_123"
      }
    },
    "1": {
      "status": "pending",
      "prerequisites": {
        "templateId": true,
        "partnerId": true
      }
    }
  }
}
```

## Failure Handling

On validation failure:
1. List missing prerequisites
2. Suggest remediation steps
3. Block phase execution
4. Allow retry after fixes

Example failure message:
```
PHASE 1 BLOCKED

Missing prerequisites:
- templateId not found in phase-state.json

Remediation:
1. Re-run Phase 0: /gtm-deploy linkedin --phase 0
2. Verify template installation completed
3. Check CONFIG/phase-state.json for artifacts
```

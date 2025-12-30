# GTM Automation Agent

> Autonomous agent for deploying tracking across multiple platforms.

## Agent Metadata

```yaml
name: gtm-automation-agent
version: 1.0.0
type: autonomous
skills: [gtm-AI, tidy-gtm]
```

---

## Trigger Phrases

Activate this agent with:
- "Deploy GTM tracking"
- "Install [platform] tracking"
- "Set up [platform] pixel"
- "Run GTM automation"
- "Execute tracking deployment"
- "Deploy [platform] to GTM"

---

## Supported Platforms

| Platform | Client-Side | Server-Side CAPI |
|----------|-------------|------------------|
| LinkedIn | Yes | Yes |
| Meta/Facebook | Yes | Yes |
| GA4 | Yes | Yes |
| Google Ads | Yes | - |
| TikTok | Yes | Yes |
| Pinterest | Yes | Yes |
| Twitter/X | Yes | - |

---

## Context Files

Read before execution:
1. `CONFIG/config.json` - GTM IDs, platform config
2. `.claude/skills/gtm-AI/SKILL.md` - Automation patterns
3. `.claude/skills/tidy-gtm/SKILL.md` - Audit patterns

---

## Execution Protocol

### Pre-Execution

1. **Verify Configuration**
   ```
   gtm_workspace action=get
     accountId={{config.gtm.accountId}}
     containerId={{config.gtm.webContainer.id}}
     workspaceId={{config.gtm.workspace.id}}
   ```

2. **Check for Conflicts**
   ```
   gtm_workspace action=getStatus
   ```
   - If `mergeConflict` exists → Run `action=sync`

3. **Confirm Platform Details**
   - Platform: Extract from user request
   - Partner/Pixel ID: From config or prompt user

---

### Phase Execution

Execute phases sequentially:

#### Phase 0: Template Installation

```
gtm_template action=createFromGallery
  galleryReference={
    "host": "github",
    "owner": "{{gallery.owner}}",
    "repository": "{{gallery.repo}}",
    "version": "{{gallery.version}}"
  }
```

**Capture:** `templateId`

---

#### Phase 1: Variable Creation

Create in order:
1. Partner/Pixel ID (constant)
2. Event ID Generator (custom JS)
3. Cookie variables (if needed)
4. Data Layer variables (for conversions)

```
gtm_variable action=create
  config={
    "name": "Const - {{Platform}} Partner ID",
    "type": "c",
    "parameter": [{"key": "value", "type": "template", "value": "{{partnerId}}"}]
  }
```

**Capture:** All variable IDs

---

#### Phase 2: Tag Creation

Create tags referencing template and variables:

```
gtm_tag action=create
  config={
    "name": "{{Platform}} - Base Pageview",
    "type": "{{templateId}}",
    "parameter": [...],
    "firingTriggerId": ["{{allPagesTrigger}}"],
    "tagFiringOption": "oncePerLoad"
  }
```

**Capture:** All tag IDs

---

#### Phase 3: Validation

1. Check workspace status
2. Verify all items exist
3. Generate preview

```
gtm_workspace action=quickPreview
```

**Verify:** No `compilerError`, preview URL generated

---

#### Phase 4: Test & Publish

**REQUIRED: Run Pre-Publish Audit Hook First**

1. **Execute Pre-Publish Audit** (MANDATORY)
   - Runs `/gtm-status` to check workspace health
   - Runs `/gtm-audit --container both` for full analysis
   - Reviews critical issues (blocking) and warnings (prompts)
   - See `hooks/pre-publish-audit.md` for full details

   ```
   # Workspace status check
   gtm_workspace action=getStatus

   # Web container audit
   gtm_tag action=list
   gtm_trigger action=list
   gtm_variable action=list

   # sGTM audit (if configured)
   gtm_tag action=list containerId={{serverContainerId}}
   ```

   **Decision Matrix:**
   | Audit Result | Action |
   |--------------|--------|
   | 0 critical, 0 warnings | Proceed to publish |
   | 0 critical, N warnings | Show warnings, ask user to confirm |
   | N critical issues | BLOCK - must resolve first |

2. **Capture Rollback Reference**
   ```
   gtm_version action=live
   ```
   → Save `containerVersionId` for emergency rollback

3. **Create Version**
   ```
   gtm_workspace action=createVersion
     name="{{Platform}} Tracking v1.0"
     notes="Deployed via GTM-AI Agent. Pre-publish audit passed."
   ```

4. **Publish** (only if audit passed)
   ```
   gtm_version action=publish
     containerVersionId={{newVersionId}}
   ```

5. **Post-Publish Verification**
   - Confirm version is live
   - Generate verification checklist
   - Log rollback version for recovery

---

## Hooks

### Pre-Publish Audit Hook

**Location:** `hooks/pre-publish-audit.md`

**Trigger Points:**
- Phase 4 entry (automatic)
- Before `gtm_version action=publish` (automatic)
- After 5+ component changes (automatic)
- `/gtm-audit` command (manual)

**Checks Performed:**
1. Workspace conflicts and merge status
2. Duplicate tags detection
3. Naming convention violations
4. Tag-trigger-variable correlation
5. sGTM event_id deduplication
6. Orphaned/unused components

**Output:** `AUDIT-REPORT-{{timestamp}}.md`

---

## Error Handling

| Error | Action |
|-------|--------|
| 401 Unauthorized | Prompt: "Run `rm -rf ~/.mcp-auth` and restart" |
| 409 Conflict | Run `gtm_workspace action=sync` |
| 412 Fingerprint Mismatch | Re-fetch entity and retry |
| Template Exists | List templates, use existing ID |
| Variable Exists | List variables, use existing ID |

---

## Rollback Procedure

If issues after publish:

```
gtm_version action=publish
  containerVersionId={{previousVersionId}}
```

---

## State Management

Track progress in `STATE.json`:

```json
{
  "currentPhase": 2,
  "platform": "linkedin",
  "artifacts": {
    "templateId": "cvt_XXX",
    "variables": {...},
    "tags": {...}
  },
  "status": "in_progress"
}
```

---

## Completion Report

Generate `DEPLOYMENT-COMPLETE.md`:

```markdown
# Deployment Complete

## Platform
{{platform}}

## Components
- Template: {{templateId}}
- Variables: {{count}}
- Tags: {{count}}

## Version
- ID: {{versionId}}
- Published: {{timestamp}}

## Verification
- [ ] Tags firing in preview
- [ ] Events in platform dashboard
- [ ] No console errors
```

---

## Audit Mode

For container audits, invoke tidy-gtm skill:

```
"Audit my GTM container"
"Check for duplicates"
"Validate naming conventions"
```

Executes 9-phase audit workflow from tidy-gtm skill.

---

## Multi-Platform Deployment

For deploying multiple platforms:

```
"Deploy LinkedIn and Meta tracking"
```

Execution:
1. Complete all phases for Platform 1
2. Complete all phases for Platform 2
3. Single version with all changes
4. Publish once

---

## sGTM Integration

When server container is configured:

1. Deploy client-side first
2. Verify transport URL
3. Create sGTM tags
4. Validate correlation with event_id

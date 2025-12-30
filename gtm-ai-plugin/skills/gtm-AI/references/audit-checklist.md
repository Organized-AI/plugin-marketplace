# GTM Audit Checklist

Comprehensive 9-phase audit workflow for GTM/sGTM containers.

---

## Quick Audit Commands

```
gtm_tag action=list
gtm_trigger action=list
gtm_variable action=list
gtm_template action=list
gtm_folder action=list
gtm_workspace action=getStatus
```

---

## Phase 1: Discovery

- [ ] Container ID confirmed
- [ ] Account ID confirmed
- [ ] Workspace ID confirmed
- [ ] MCP authentication working
- [ ] No merge conflicts

---

## Phase 2: Inventory

| Type | Command | Count |
|------|---------|-------|
| Tags | `gtm_tag action=list` | ___ |
| Triggers | `gtm_trigger action=list` | ___ |
| Variables | `gtm_variable action=list` | ___ |
| Templates | `gtm_template action=list` | ___ |
| Folders | `gtm_folder action=list` | ___ |

---

## Phase 3: Analysis

### Issue Categories

| Priority | Issue | Action |
|----------|-------|--------|
| P1 | Broken references | Fix immediately |
| P1 | Missing required vars | Create |
| P2 | Duplicates | Remove extras |
| P2 | Orphaned triggers | Remove |
| P2 | Orphaned variables | Remove |
| P3 | Naming violations | Rename |
| P3 | Unused templates | Remove |

### Detection Patterns

**Duplicates:** Same type + same triggers
**Orphans:** Not referenced by any tag
**Broken:** References non-existent ID

---

## Phase 4: Correlation

```
TAG → TRIGGER → VARIABLE
 │       │         │
 └───────┴─────────┴── All must exist
```

- [ ] All tags have firing triggers
- [ ] All trigger IDs exist
- [ ] All variable references resolve

---

## Phase 5: Naming Audit

| Type | Pattern | Example |
|------|---------|---------|
| Tag | `[Platform] - [Action]` | `GA4 - Purchase` |
| Variable | `[Type] - [Name]` | `DL - Transaction ID` |
| Trigger | `[Type] - [Desc]` | `CE - Purchase` |

### Violations to Flag
- No prefix
- "Copy of" prefix
- Generic names (New Tag, trigger1)
- Wrong separators (_ instead of -)

---

## Phase 6: sGTM Correlation

- [ ] Server container accessible
- [ ] GA4 Client enabled
- [ ] Transport URL matches sGTM domain
- [ ] CAPI tags present
- [ ] Event IDs match client ↔ server

---

## Phase 7: Cleanup Plan

Order of operations:
1. Create missing items
2. Fix broken references
3. Remove duplicates
4. Remove orphans
5. Rename items
6. Organize folders

---

## Phase 8: Execute

```
gtm_workspace action=getStatus    # Pre-check
[make changes in batches of 5-10]
gtm_workspace action=sync         # After each batch
gtm_workspace action=quickPreview # Test
gtm_workspace action=createVersion name="Audit Cleanup"
```

---

## Phase 9: Report

Document:
- Issues found
- Issues fixed
- Version created
- Recommendations

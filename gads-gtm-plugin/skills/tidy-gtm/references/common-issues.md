# Common GTM Issues & Solutions

Quick reference for identifying and resolving common GTM container issues.

---

## Issue Categories

| Category | Severity | Impact |
|----------|----------|--------|
| Broken References | CRITICAL | Tags won't fire correctly |
| Duplicates | HIGH | Data inflation, wasted requests |
| Orphaned Components | MEDIUM | Clutter, confusion |
| Naming Violations | LOW | Maintenance difficulty |
| Legacy Tags | MEDIUM | Deprecated, may stop working |
| Test Artifacts | LOW | Clutter |

---

## CRITICAL Issues

### 1. Broken Variable References

**Symptom**: Tag parameter contains `{{Variable Name}}` but variable doesn't exist

**Detection**:
```
1. List all tags
2. Extract variable references from parameters
3. Compare against variable list
4. Find mismatches
```

**Solution**:
- Create missing variable, OR
- Update tag to use correct variable name, OR
- Remove the broken reference

**Example**:
```
Tag: "GA4 - Event"
Parameter: "{{DL_email}}"  ← Variable doesn't exist
Variable exists: "{{DL - email}}"  ← Correct name

Fix: Update tag parameter to "{{DL - email}}"
```

---

### 2. Invalid Trigger References

**Symptom**: Tag's `firingTriggerId` points to non-existent trigger

**Detection**:
```
1. List all tags with their firingTriggerId
2. List all trigger IDs
3. Find tags referencing missing triggers
```

**Solution**:
- Create the missing trigger, OR
- Update tag to use valid trigger, OR
- Remove the tag if no longer needed

---

### 3. Circular/Conflicting Triggers

**Symptom**: Tag fires unexpectedly or creates infinite loops

**Detection**:
- Tag fires on events it creates
- Multiple tags triggering each other

**Solution**:
- Add trigger exceptions
- Use blocking triggers
- Separate event handling

---

## HIGH Issues

### 4. Duplicate Tags

**Symptom**: Multiple tags with same/similar names or identical configurations

**Detection Patterns**:
```
Names containing:
- "copy"
- "v2", "v3"
- "(1)", "(2)"
- "NEW", "OLD"
- Same name different case
```

**Solution**:
1. Compare tag configurations
2. Identify which is canonical/correct
3. Delete duplicates
4. Verify remaining tag works

**Example**:
```
Found:
- "Meta - Base Pixel"
- "Meta - Base Pixel - Copy"
- "Facebook Pixel (1)"

Action: Keep "Meta - Base Pixel", delete others
```

---

### 5. Legacy Universal Analytics Tags

**Symptom**: Tags using `ua` (Universal Analytics) type

**Detection**:
```
Tag type: "ua" or "gaawe" (old GA4)
```

**Solution**:
- Migrate to GA4 (`gaawc` config, `gaawe` event)
- Update to latest GA4 configuration tag
- Remove UA tags after migration

**Timeline**: UA stopped processing July 2024

---

### 6. Hardcoded Sensitive Data

**Symptom**: API keys, passwords, or PII hardcoded in tag parameters

**Detection**:
```
Look for parameters containing:
- API keys
- Access tokens
- Email addresses
- Phone numbers
- Credit card patterns
```

**Solution**:
- Move to variables (preferably constants)
- Use server-side for sensitive operations
- Hash PII before sending

---

## MEDIUM Issues

### 7. Orphaned Triggers

**Symptom**: Triggers that no tag references

**Detection**:
```
1. List all triggers
2. List all tags and their firingTriggerId/blockingTriggerId
3. Find triggers not in any tag
```

**Solution**:
- Delete if truly unused
- Or document why kept (future use)

**Exceptions**: Some triggers may be used by:
- Consent mode
- Tag sequencing
- Future implementation

---

### 8. Orphaned Variables

**Symptom**: Variables not referenced by any tag, trigger, or other variable

**Detection**:
```
1. List all variables
2. Search all tags/triggers for {{variable_name}}
3. Find unreferenced variables
```

**Solution**:
- Delete if truly unused
- Or document why kept

---

### 9. Missing Base/Config Tags

**Symptom**: Platform has conversion tags but no base tag

**Common Patterns**:
```
Missing Base Tags:
- Meta conversion tags without Base Pixel
- LinkedIn conversion without Insight Tag Base
- Google Ads without Config tag
```

**Solution**:
- Add base/config tag
- Ensure base fires before conversion tags
- Use All Pages trigger for base

---

### 10. Overly Broad Triggers

**Symptom**: Trigger fires on too many pages/events

**Examples**:
```
"All Clicks" trigger firing all tags
Custom event trigger without filters
```

**Solution**:
- Add conditions to narrow scope
- Use more specific triggers
- Add blocking triggers

---

## LOW Issues

### 11. Naming Convention Violations

**Symptom**: Inconsistent or unclear names

**Detection Patterns**:
```
Bad Names:
- Single words: "click", "facebook", "test"
- Numbers: "Tag 1", "Trigger 2"
- Mixed conventions: "DL_email", "dlv - email", "dataLayer.email"
```

**Solution**:
- Apply naming conventions
- Batch rename in phases
- Document the standard

---

### 12. Test/Development Artifacts

**Symptom**: Leftover test tags, triggers, variables

**Detection Patterns**:
```
Names containing:
- "test"
- "DELETE"
- "REMOVE"
- "temp"
- "xxx"
- "asdf"
```

**Solution**:
- Delete after confirming not in use
- Check if paused first

---

### 13. Missing Folders

**Symptom**: Tags not organized into folders

**Impact**:
- Hard to navigate large containers
- Difficult to audit by platform
- Maintenance overhead

**Solution**:
- Create folders by platform
- Move tags to folders
- Document structure

---

### 14. Paused Tags Accumulation

**Symptom**: Many tags in paused state

**Detection**:
```
Tag property: "paused": true
```

**Solution**:
- Review why paused
- Delete if no longer needed
- Activate if should be running
- Document if keeping paused

---

## Workspace Issues

### 15. Merge Conflicts

**Symptom**: Can't publish due to conflicts

**Detection**:
```
gtm_workspace action=getStatus
→ Shows merge conflicts
```

**Solution**:
```
1. gtm_workspace action=sync
2. Resolve conflicts manually if needed
3. Re-verify changes
4. Retry publish
```

---

### 16. Multiple Workspaces

**Symptom**: Changes in wrong workspace

**Detection**:
```
gtm_workspace action=list
→ Multiple workspaces
```

**Solution**:
- Always verify workspace ID before changes
- Use Default Workspace when possible
- Clean up stale workspaces

---

## Quick Fix Reference

| Issue | Quick Fix |
|-------|-----------|
| Broken variable | Update tag or create variable |
| Duplicate tag | Delete duplicate |
| Orphaned trigger | Delete or document |
| Orphaned variable | Delete or document |
| Bad naming | Batch rename |
| Test artifact | Delete |
| Merge conflict | Sync workspace |
| Missing base tag | Create with All Pages |
| Legacy UA | Migrate to GA4 |

---

## Prevention Best Practices

1. **Before Creating**: Check if similar exists
2. **Naming**: Follow conventions from start
3. **Testing**: Use Preview Mode, not live tags
4. **Cleanup**: Remove test tags after testing
5. **Documentation**: Add notes to complex tags
6. **Versioning**: Meaningful version names
7. **Regular Audits**: Monthly container reviews

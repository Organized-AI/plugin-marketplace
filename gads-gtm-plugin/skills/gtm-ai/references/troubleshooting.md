# GTM Troubleshooting Guide

Common issues and solutions when using GTM MCP tools.

---

## Authentication Issues

### Issue: MCP Authentication Failed

**Symptoms:**
```
Error: Authentication required
Error: Token expired
Error: 401 Unauthorized
```

**Solutions:**

1. **Clear cached tokens:**
```bash
rm -rf ~/.mcp-auth
```

2. **Restart Claude Desktop/Code**

3. **Re-authenticate:**
- Run any GTM MCP command
- Browser opens for Google OAuth
- Complete authentication flow

4. **Check Google account permissions:**
- Must have GTM access
- Account must be added to GTM container

---

### Issue: No Access to Container

**Symptoms:**
```
Error: 403 Forbidden
Error: User does not have access
```

**Solutions:**

1. Verify account has GTM access:
   - Go to tagmanager.google.com
   - Check container permissions

2. Request access from container admin

3. Verify correct Account ID and Container ID

---

## Workspace Issues

### Issue: Merge Conflict

**Symptoms:**
```
Error: Workspace has merge conflicts
Error: Cannot create version with conflicts
```

**Solutions:**

1. **Sync workspace:**
```
gtm_workspace action=sync
  accountId=[ACCOUNT_ID]
  containerId=[CONTAINER_ID]
  workspaceId=[WORKSPACE_ID]
```

2. **Check status after sync:**
```
gtm_workspace action=getStatus
```

3. **If still conflicts:**
- Manual resolution may be needed in GTM UI
- Or create new workspace

---

### Issue: Fingerprint Mismatch

**Symptoms:**
```
Error: Fingerprint mismatch
Error: Resource has been modified
```

**Cause:** Resource was modified between read and update.

**Solutions:**

1. **Re-fetch the resource:**
```
gtm_tag action=get tagId=[TAG_ID]
```

2. **Use updated fingerprint in next request**

3. **Retry the operation**

---

## Template Issues

### Issue: Template Already Exists

**Symptoms:**
```
Error: Template with this name already exists
```

**Solutions:**

1. **List existing templates:**
```
gtm_template action=list
```

2. **Use existing template ID** in tag creation

3. **Or use different name:**
```
createOrUpdateConfig={
  "name": "LinkedIn InsightTag 2.0 (v2)",
  ...
}
```

---

### Issue: Gallery Reference Not Found

**Symptoms:**
```
Error: Could not fetch template from gallery
Error: Repository not found
```

**Solutions:**

1. **Verify repository exists** on GitHub

2. **Check version SHA is correct:**
   - Go to GitHub repo
   - Get full commit SHA (40 chars)

3. **Use "main" branch as fallback:**
```json
{
  "galleryReference": {
    "host": "github.com",
    "owner": "linkedin",
    "repository": "linkedin-gtm-community-template",
    "version": "main"
  }
}
```

4. **Fallback to templateData method:**
   - Download .tpl file
   - Pass raw content

---

## Tag/Variable/Trigger Issues

### Issue: Invalid Type

**Symptoms:**
```
Error: Invalid tag type
Error: Unknown variable type
```

**Solutions:**

1. **For custom templates:** Use `cvt_[CONTAINER_ID]_[INDEX]`

2. **For built-in types:**

| Platform | Tag Type |
|----------|----------|
| GA4 Config | `gaaw` |
| GA4 Event | `gaawe` |
| Google Ads Conversion | `awct` |
| Google Ads Remarketing | `sp` |
| Custom HTML | `html` |
| Custom Image | `img` |

3. **List templates to get correct type:**
```
gtm_template action=list
```

---

### Issue: Invalid Trigger ID

**Symptoms:**
```
Error: Trigger not found
Error: Invalid firingTriggerId
```

**Solutions:**

1. **List triggers:**
```
gtm_trigger action=list
```

2. **Use string format for IDs:**
```json
{
  "firingTriggerId": ["2147479553"]
}
```
Note: IDs must be strings in arrays, not integers.

3. **Built-in trigger IDs:**
   - All Pages: `2147479553`
   - (Others vary by container)

---

### Issue: Variable Reference Not Resolved

**Symptoms:**
```
Tag parameter shows {{Variable Name}} literally
Variable value not populated
```

**Solutions:**

1. **Check variable exists:**
```
gtm_variable action=list
```

2. **Use exact variable name:**
```json
{
  "value": "{{DL - Transaction ID}}"
}
```

3. **Check variable type is correct**

---

## Version/Publish Issues

### Issue: Cannot Create Version

**Symptoms:**
```
Error: Cannot create version
Error: Workspace has errors
```

**Solutions:**

1. **Check for compilation errors:**
```
gtm_workspace action=quickPreview
```

2. **Check workspace status:**
```
gtm_workspace action=getStatus
```

3. **Fix any reported errors before versioning**

---

### Issue: Cannot Publish

**Symptoms:**
```
Error: Cannot publish version
Error: Version not found
```

**Solutions:**

1. **Verify version exists:**
```
gtm_version_header action=list
```

2. **Get correct version ID:**
```
gtm_version action=get containerVersionId=[ID]
```

3. **Ensure version is not already live:**
```
gtm_version action=live
```

---

## sGTM Issues

### Issue: Events Not Reaching Server

**Symptoms:**
- sGTM logs show no requests
- CAPI tags not firing

**Solutions:**

1. **Check transport_url in GA4 Config:**
   - Should point to sGTM domain
   - Must be HTTPS

2. **Verify sGTM domain is active:**
```
stape_container_domains action=list
```

3. **Check GA4 Client is enabled:**
```
gtm_client action=list
```

4. **Check for ad blocker interference**

---

### Issue: Duplicate Conversions

**Symptoms:**
- Platform shows 2x conversions
- Same event counted twice

**Solutions:**

1. **Verify event_id matching:**
   - Client-side tag uses `{{CJS - Event ID}}`
   - Server-side tag uses same ID from event data

2. **Check event_id is passed through GA4:**
```
GA4 Event Parameters:
- event_id: {{CJS - Event ID}}
```

3. **Verify sGTM reads event_id correctly**

---

## Quick Diagnostic Commands

### Health Check
```
gtm_container action=get
gtm_workspace action=getStatus
gtm_version action=live
```

### Full Inventory
```
gtm_tag action=list
gtm_trigger action=list
gtm_variable action=list
gtm_template action=list
```

### Test Before Publish
```
gtm_workspace action=quickPreview
```

---

## Error Code Reference

| Code | Meaning | Solution |
|------|---------|----------|
| 401 | Not authenticated | Re-auth |
| 403 | No permission | Check access |
| 404 | Not found | Verify IDs |
| 409 | Conflict | Sync workspace |
| 412 | Precondition failed | Re-fetch, retry |
| 500 | Server error | Retry later |

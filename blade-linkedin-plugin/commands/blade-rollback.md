---
description: Rollback BLADE GTM container to previous version if issues detected
---

# Rollback LinkedIn Deployment

Revert to previous GTM container version if issues are discovered after publish.

## When to Use

- LinkedIn tags not firing correctly
- Unexpected behavior on site
- Conversion tracking issues
- Need to undo recent changes

## Rollback Process

### Step 1: List Previous Versions
```
gtm_version_header action=list
  accountId=1234567890
  containerId=12345678
```

### Step 2: Identify Safe Version
Look for version before LinkedIn changes were made.

### Step 3: Republish Previous Version
```
gtm_version action=publish
  accountId=1234567890
  containerId=12345678
  containerVersionId=[PREVIOUS_VERSION_ID]
  fingerprint=[PREVIOUS_FINGERPRINT]
```

### Step 4: Verify Rollback
```
gtm_version action=live
  accountId=1234567890
  containerId=12345678
```

## Post-Rollback

After rollback:
1. Investigate what went wrong
2. Fix configuration issues
3. Re-deploy when ready with `/blade-deploy`

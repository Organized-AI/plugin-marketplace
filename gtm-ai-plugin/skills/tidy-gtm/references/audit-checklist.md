# GTM Container Audit Checklist

Comprehensive checklist for auditing Google Tag Manager containers.

## Pre-Audit Setup

- [ ] Get GTM account credentials/access
- [ ] Identify account ID, container ID, workspace ID
- [ ] Check if GTM MCP server is authenticated
- [ ] Note the current live version number
- [ ] Confirm backup/rollback capability

---

## Phase 1: Container Discovery

### Basic Information

- [ ] Container name and public ID (GTM-XXXXX)
- [ ] Container type (web, server, iOS, Android, AMP)
- [ ] Associated website/app
- [ ] Workspace being audited

### Component Counts

| Component | Count | Notes |
|-----------|-------|-------|
| Tags | | |
| Triggers | | |
| Variables | | |
| Built-in Variables | | Enabled |
| Custom Templates | | |
| Folders | | |

### Version Information

- [ ] Current live version number
- [ ] Last published date
- [ ] Who published it
- [ ] Total versions in history

---

## Phase 2: Tag Audit

### Tag Inventory

- [ ] List all tags (paginate if >20)
- [ ] Group by platform/type
- [ ] Note tag firing options
- [ ] Check for paused tags
- [ ] Identify templates used

### Tag Quality Checks

| Check | Status | Count |
|-------|--------|-------|
| Duplicate tags | | |
| Vague/unclear names | | |
| Test/temporary tags | | |
| Legacy tags (UA) | | |
| Tags without triggers | | |
| Tags with invalid triggers | | |
| Naming convention violations | | |

### Platform Coverage

| Platform | Tags | Base | Conversions |
|----------|------|------|-------------|
| GA4 | | Yes/No | |
| Google Ads | | N/A | |
| Meta/Facebook | | Yes/No | |
| LinkedIn | | Yes/No | |
| Microsoft/Bing | | Yes/No | |
| TikTok | | Yes/No | |
| Pinterest | | Yes/No | |
| Other | | | |

---

## Phase 3: Trigger Audit

### Trigger Inventory

- [ ] List all triggers
- [ ] Identify built-in vs custom
- [ ] Check trigger types
- [ ] Note custom event names

### Trigger Quality Checks

| Check | Status | Count |
|-------|--------|-------|
| Orphaned triggers (no tags) | | |
| Duplicate triggers | | |
| Vague/unclear names | | |
| Test/temporary triggers | | |
| Naming convention violations | | |
| Overly broad triggers | | |

### Trigger Usage Matrix

| Trigger | Tags Using It | Purpose |
|---------|---------------|---------|
| All Pages | | |
| | | |

---

## Phase 4: Variable Audit

### Variable Inventory

- [ ] List all custom variables
- [ ] Note built-in variables enabled
- [ ] Check variable types
- [ ] Identify lookup tables

### Variable Quality Checks

| Check | Status | Count |
|-------|--------|-------|
| Orphaned variables (unused) | | |
| Duplicate variables | | |
| Vague/unclear names | | |
| Inconsistent naming | | |
| Missing required variables | | |
| Broken variable references | | |

### Variable Usage Matrix

| Variable | Used By (Tags) | Purpose |
|----------|----------------|---------|
| | | |

### Data Layer Variables

| DL Variable | Path | Used For |
|-------------|------|----------|
| | | |

---

## Phase 5: Template Audit

### Custom Templates

- [ ] List all custom templates
- [ ] Identify source (Community Gallery, custom)
- [ ] Check for updates available
- [ ] Verify template permissions

| Template | Type | Version | Notes |
|----------|------|---------|-------|
| | | | |

---

## Phase 6: Folder Organization

### Current Structure

- [ ] List existing folders
- [ ] Note unfoldered tags
- [ ] Identify logical groupings

### Recommended Structure

- [ ] Create platform-based folders
- [ ] Move tags to appropriate folders
- [ ] Document folder structure

---

## Phase 7: Correlation Validation

### Tag → Trigger Validation

- [ ] Every tag has at least one firing trigger
- [ ] Trigger IDs reference valid triggers
- [ ] Blocking triggers reference valid triggers
- [ ] No circular references

### Tag → Variable Validation

- [ ] All `{{variable}}` references are valid
- [ ] Variable types match expected inputs
- [ ] Required variables exist

### Broken References

| Component | Reference | Issue |
|-----------|-----------|-------|
| | | |

---

## Phase 8: Workspace Health

### Workspace Status

- [ ] Check for merge conflicts
- [ ] Check for unsaved changes
- [ ] Verify workspace is synced
- [ ] No pending changes from others

### Pre-Publish Checks

- [ ] All changes reviewed
- [ ] No compiler errors
- [ ] Quick preview tested
- [ ] Version name prepared

---

## Phase 9: Security & Compliance

### Security Checks

- [ ] No exposed API keys in tags
- [ ] No PII in hardcoded values
- [ ] Custom HTML tags reviewed
- [ ] Third-party scripts validated

### Consent Mode

- [ ] Consent mode implemented (if required)
- [ ] Tags respect consent settings
- [ ] Fallback behavior defined

### Data Privacy

- [ ] Check for sensitive data collection
- [ ] User ID variables secured
- [ ] Email hashing implemented (if used)

---

## Phase 10: Documentation

### Audit Report

- [ ] Executive summary
- [ ] Issues found
- [ ] Changes made
- [ ] Recommendations
- [ ] Before/after metrics

### Change Log

| Change | Component | Before | After |
|--------|-----------|--------|-------|
| | | | |

---

## Post-Audit Actions

### Immediate Actions (P1)

- [ ] Fix broken references
- [ ] Remove dangerous/test tags
- [ ] Address security issues

### Short-term Actions (P2)

- [ ] Remove duplicates
- [ ] Rename non-compliant components
- [ ] Create missing folders

### Long-term Actions (P3)

- [ ] Migrate legacy tags (UA → GA4)
- [ ] Implement consent mode
- [ ] Optimize tag loading

---

## Sign-Off

| Item | Status | Signed By | Date |
|------|--------|-----------|------|
| Audit Complete | | | |
| Changes Approved | | | |
| Version Published | | | |
| Verification Complete | | | |

---
description: Deploy tracking to GTM containers (LinkedIn, Meta, GA4, TikTok, Pinterest)
---

# /gtm-deploy <platform> [partner-id]

Deploys tracking configuration to Google Tag Manager containers.

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `platform` | Yes | Platform to deploy: `linkedin`, `meta`, `ga4`, `tiktok`, `pinterest` |
| `partner-id` | No | Platform-specific ID (falls back to CONFIG/config.json) |

## Process

1. **Load Configuration**
   - Read `CONFIG/config.json` for GTM identifiers
   - Validate GTM account, container, and workspace IDs
   - Get partner/pixel ID from argument or config

2. **Execute Deployment Phases**
   - Phase 0: Install templates from gallery
   - Phase 1: Create variables (constants, data layer, custom JS)
   - Phase 2: Create tags with proper triggers
   - Phase 3: Validate all components
   - Phase 4: Pre-publish audit, test & publish

3. **Generate Completion Report**
   - Create `DEPLOYMENT-COMPLETE.md` with results
   - Include version ID and preview URL
   - Document all created components

## Prerequisites

- Valid GTM configuration in `CONFIG/config.json`
- Authenticated with `google-tag-manager-mcp-server`
- Partner/pixel ID for the platform

## Success Criteria

- [ ] Template installed from gallery
- [ ] All variables created
- [ ] All tags created with correct triggers
- [ ] Pre-publish audit passed (0 critical issues)
- [ ] Version created and published
- [ ] Completion report generated

## Usage Examples

```bash
# Deploy LinkedIn tracking with Partner ID
/gtm-deploy linkedin 1234567

# Deploy Meta pixel (uses config.json)
/gtm-deploy meta

# Deploy GA4 tracking
/gtm-deploy ga4 G-XXXXXXXXXX
```

## Output Files

- `PHASE-0-COMPLETE.md` - Template installation results
- `PHASE-1-COMPLETE.md` - Variable creation results
- `PHASE-2-COMPLETE.md` - Tag creation results
- `PHASE-3-COMPLETE.md` - Validation results
- `PHASE-4-COMPLETE.md` - Test & publish results
- `DEPLOYMENT-COMPLETE.md` - Final summary

## Related Commands

- `/gtm-audit` - Audit container before/after deployment
- `/gtm-status` - Check workspace status
- `/gtm-rollback` - Rollback if issues detected

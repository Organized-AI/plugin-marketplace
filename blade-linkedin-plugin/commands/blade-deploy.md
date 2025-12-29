---
description: Deploy LinkedIn Insight Tag to BLADE's GTM container automatically
---

# Deploy LinkedIn Tracking

Execute the complete LinkedIn Insight Tag deployment for BLADE's Westchester campaign.

## What This Command Does

1. **Phase 0**: Install LinkedIn InsightTag 2.0 template from Community Gallery
2. **Phase 1**: Create 3 variables (Partner ID, Event ID, Cookie)
3. **Phase 2**: Create 2 tags (Base pageview, Lead conversion)
4. **Phase 3**: Validate workspace (check for conflicts)
5. **Phase 4**: Generate preview, create version, publish to live

## Prerequisites

- GTM MCP server authenticated
- LinkedIn Partner ID (will prompt if not provided)

## Usage

Before running, have your LinkedIn Partner ID ready:
> Campaign Manager → Account Assets → Insight Tag

The command will:
- Request Partner ID if needed
- Execute all phases automatically
- Report progress after each phase
- Provide rollback instructions if issues occur

## GTM Configuration

| Setting | Value |
|---------|-------|
| Account | 4702245012 |
| Container | 42412215 (GTM-W9S77T7) |
| Workspace | 86 |

## Success Criteria

- Template installed with ID format `cvt_42412215_XXX`
- 3 variables created
- 2 tags with correct triggers
- Version published to live

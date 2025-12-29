---
name: gtm-linkedin
description: LinkedIn Insight Tag implementation via GTM API with dual-tracking (client + server-side CAPI)
triggers:
  - "linkedin tracking"
  - "insight tag"
  - "linkedin capi"
  - "gtm linkedin"
---

# GTM LinkedIn Tracking Skill

Deploy LinkedIn Insight Tag programmatically via GTM MCP tools.

## Capabilities

- Install templates from Community Gallery via `galleryReference`
- Create tracking variables (constants, custom JS, cookies)
- Create pageview and conversion tags
- Generate preview URLs for testing
- Publish container versions

## GTM Configuration

```json
{
  "accountId": "4702245012",
  "webContainerId": "42412215",
  "serverContainerId": "175099610",
  "workspaceId": "86"
}
```

## Template Installation

Use `galleryReference` method:
```
gtm_template action=create
  createOrUpdateConfig={
    "name": "LinkedIn InsightTag 2.0",
    "galleryReference": {
      "host": "github.com",
      "owner": "linkedin",
      "repository": "linkedin-gtm-community-template"
    }
  }
```

## Deduplication Strategy

```
User Action → event_id generated → Client Insight Tag ┐
                                                      ├→ LinkedIn (deduped)
                   Same event_id → Server CAPI       ┘
```

## Required Input

- LinkedIn Partner ID from Campaign Manager → Account Assets → Insight Tag

## Files Reference

- `CONFIG/config.json` - GTM and LinkedIn configuration
- `PLANNING/implementation-phases/` - Phase-by-phase execution prompts
- `CONFIG/phase-state.json` - Execution state tracking

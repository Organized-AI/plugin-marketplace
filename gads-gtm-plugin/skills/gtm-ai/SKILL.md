# GTM-AI Skill

> Precision Google Tag Manager automation using MCP tools. Deploy, audit, and manage GTM/sGTM containers without touching the UI.

## Trigger Phrases

- "Deploy GTM tracking"
- "Install GTM template"
- "Create GTM tags"
- "Audit GTM container"
- "Publish GTM changes"
- "Set up [platform] tracking" (LinkedIn, Meta, GA4, etc.)
- "Tidy up GTM"
- "Check GTM workspace"

## Capabilities

### 1. Template Management
- Install templates from Community Gallery (no manual download)
- List, create, update, remove custom templates
- Support for official templates (GA4, LinkedIn, Meta, etc.)

### 2. Tag/Variable/Trigger CRUD
- Create tags with proper template references
- Create variables (constants, custom JS, cookies, data layer)
- Reference existing triggers by ID
- Batch operations with workspace sync

### 3. Workspace Management
- Check workspace status (conflicts, changes)
- Sync workspaces to resolve merge conflicts
- Generate quick preview URLs
- Create versions with descriptions
- Publish to live

### 4. Container Auditing
- Inventory all tags, triggers, variables
- Detect duplicates and orphans
- Validate naming conventions
- Check tag-trigger-variable correlations
- Web ↔ Server GTM correlation audit

### 5. Multi-Platform Support
- LinkedIn Insight Tag + CAPI
- Meta Pixel + CAPI
- GA4 (web + server)
- Google Ads conversions
- TikTok, Pinterest, Twitter/X

---

## Required MCP Servers

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "google-tag-manager-mcp-server": {
      "type": "url",
      "url": "https://gtm-mcp.stape.ai/mcp"
    },
    "stape-mcp-server": {
      "type": "sse",
      "url": "https://mcp.stape.ai/sse",
      "headers": {
        "x-api-key": "${STAPE_API_KEY}"
      }
    }
  }
}
```

**Authentication**: On first use, the GTM MCP will open a browser for Google OAuth. Tokens are cached in `~/.mcp-auth/`.

---

## MCP Tool Reference

### Core GTM Tools

| Tool | Actions | Purpose |
|------|---------|---------|
| `gtm_template` | create, list, get, update, remove | Manage tag templates |
| `gtm_variable` | create, list, get, update, remove | Manage variables |
| `gtm_tag` | create, list, get, update, remove | Manage tags |
| `gtm_trigger` | create, list, get, update, remove | Manage triggers |
| `gtm_folder` | create, list, get, update, remove | Organize items |

### Workspace Tools

| Tool | Actions | Purpose |
|------|---------|---------|
| `gtm_workspace` | getStatus, sync, quickPreview, createVersion | Workspace ops |
| `gtm_version` | get, live, publish | Version management |
| `gtm_version_header` | list | List all versions |
| `gtm_container` | get, list | Container info |
| `gtm_client` | list, get, create | sGTM clients |

### Stape Tools (Server-Side)

| Tool | Actions | Purpose |
|------|---------|---------|
| `stape_container_crud` | get, list, update | Manage Stape containers |
| `stape_container_analytics` | get_info | Container stats |
| `stape_container_domains` | list | Domain configuration |

---

## Quick Start Patterns

### Pattern 1: Install Template from Community Gallery

```
gtm_template action=create
  accountId=[ACCOUNT_ID]
  containerId=[CONTAINER_ID]
  workspaceId=[WORKSPACE_ID]
  createOrUpdateConfig={
    "name": "LinkedIn InsightTag 2.0",
    "galleryReference": {
      "host": "github.com",
      "owner": "linkedin",
      "repository": "linkedin-gtm-community-template",
      "version": "c07099c0e0cf0ade2057ee4016d3da9f32959169"
    }
  }
```

**Output**: `templateId` (e.g., `cvt_42412215_123`)

### Pattern 2: Create Variable

**Constant:**
```
gtm_variable action=create
  config={
    "name": "LinkedIn Partner ID",
    "type": "c",
    "parameter": [{"key": "value", "value": "1234567"}]
  }
```

**Custom JavaScript:**
```
gtm_variable action=create
  config={
    "name": "Event ID Generator",
    "type": "jsm",
    "parameter": [{
      "key": "javascript",
      "value": "function() { return 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9); }"
    }]
  }
```

**1st Party Cookie:**
```
gtm_variable action=create
  config={
    "name": "LinkedIn Click ID",
    "type": "k",
    "parameter": [{"key": "cookieName", "value": "li_fat_id"}]
  }
```

**Data Layer Variable:**
```
gtm_variable action=create
  config={
    "name": "DL - Transaction ID",
    "type": "v",
    "parameter": [{"key": "dataLayerVersion", "value": "2"}, {"key": "name", "value": "ecommerce.transaction_id"}]
  }
```

### Pattern 3: Create Tag with Template

```
gtm_tag action=create
  config={
    "name": "LinkedIn - Base Pageview",
    "type": "cvt_42412215_123",
    "parameter": [
      {"key": "partnerId", "type": "template", "value": "{{LinkedIn Partner ID}}"},
      {"key": "trackPageview", "type": "boolean", "value": "true"}
    ],
    "firingTriggerId": ["2147479553"],
    "tagFiringOption": "oncePerLoad"
  }
```

### Pattern 4: Workspace Sync + Publish

```
# Step 1: Check status
gtm_workspace action=getStatus

# Step 2: Sync if conflicts
gtm_workspace action=sync  (if conflicts exist)

# Step 3: Create version
gtm_workspace action=createVersion
  name="LinkedIn Tracking v1.0"
  notes="Added LinkedIn Insight Tag + Lead conversion"

# Step 4: Generate preview
gtm_workspace action=quickPreview

# Step 5: Publish
gtm_version action=publish
  containerVersionId=[VERSION_ID]
```

---

## Phased Execution Model

For complex deployments, use phased execution:

```
PLANNING/
├── IMPLEMENTATION-MASTER-PLAN.md
└── implementation-phases/
    ├── PHASE-0-PROMPT.md  → Template installation
    ├── PHASE-1-PROMPT.md  → Variable creation
    ├── PHASE-2-PROMPT.md  → Tag creation
    ├── PHASE-3-PROMPT.md  → Validation
    └── PHASE-4-PROMPT.md  → Test & Publish
```

**State Management:**
```json
// CONFIG/phase-state.json
{
  "currentPhase": 0,
  "phases": {
    "0": {"status": "complete", "artifacts": {"templateId": "cvt_123"}},
    "1": {"status": "complete", "artifacts": {"varIds": ["v1", "v2"]}},
    "2": {"status": "pending"}
  }
}
```

---

## Dual-Tracking Architecture (Client + Server)

```
User Browser
    │
    ▼
┌─────────────────────────────────────┐
│     GTM Web Container               │
│                                     │
│  ┌─────────────────┐               │
│  │ Platform Tag    │──────────────────► Platform (client-side)
│  │ (Insight Tag)   │               │
│  │                 │               │
│  │ event_id: X     │               │
│  └─────────────────┘               │
│           │                        │
│           │ (GA4 transport)        │
│           ▼                        │
└─────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│     GTM Server Container (Stape)    │
│                                     │
│  ┌─────────────────┐               │
│  │ Platform CAPI   │──────────────────► Platform API (server-side)
│  │ Tag             │               │      │
│  │                 │               │      │
│  │ event_id: X     │               │      ▼
│  └─────────────────┘               │   Deduplication
└─────────────────────────────────────┘   (same event_id)
```

**Key**: Same `event_id` in both client and server tags → Platform deduplicates.

---

## Configuration Template

```json
// CONFIG/config.json
{
  "project": "Project Name",
  "gtm": {
    "accountId": "4702245012",
    "webContainer": {
      "id": "42412215",
      "publicId": "GTM-XXXXXXX"
    },
    "serverContainer": {
      "id": "175099610",
      "publicId": "GTM-XXXXXXX"
    },
    "workspace": {
      "id": "86",
      "name": "Default"
    }
  },
  "platform": {
    "name": "linkedin",
    "partnerId": "[USER_PROVIDED]",
    "gallery": {
      "owner": "linkedin",
      "repository": "linkedin-gtm-community-template",
      "version": "c07099c0e0cf0ade2057ee4016d3da9f32959169"
    }
  },
  "triggers": {
    "allPages": "2147479553",
    "purchase": "10",
    "completeRegistration": "305"
  }
}
```

---

## References

See `references/` folder for:
- [tool-patterns.md](references/tool-patterns.md) - Complete MCP tool call patterns
- [naming-conventions.md](references/naming-conventions.md) - GTM naming standards
- [variable-types.md](references/variable-types.md) - All GTM variable types
- [template-gallery.md](references/template-gallery.md) - Popular template gallery refs
- [sgtm-correlation.md](references/sgtm-correlation.md) - Web ↔ Server correlation
- [audit-checklist.md](references/audit-checklist.md) - Container audit workflow
- [troubleshooting.md](references/troubleshooting.md) - Common issues & fixes

---

## Usage Examples

### Deploy LinkedIn Tracking
```
Read .claude/skills/gtm-AI/SKILL.md then deploy LinkedIn Insight Tag
with Partner ID 1234567 to GTM container 42412215
```

### Audit GTM Container
```
Use gtm-AI skill to audit GTM container 42412215 for duplicates,
orphaned triggers, and naming convention violations
```

### Publish Changes
```
Use gtm-AI skill to create version and publish GTM container 42412215
with description "Q1 2025 tracking updates"
```

---

## Skill Metadata

| Property | Value |
|----------|-------|
| Version | 1.0.0 |
| Author | GTM Automation |
| Category | Marketing Technology |
| MCP Required | google-tag-manager-mcp-server, stape-mcp-server |
| Platforms | LinkedIn, Meta, GA4, Google Ads, TikTok, Pinterest |

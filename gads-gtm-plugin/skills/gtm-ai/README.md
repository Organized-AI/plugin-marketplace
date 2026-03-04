# GTM-AI Skill

Precision Google Tag Manager automation using MCP tools.

```
┌─────────────────────────────────────────────────────────────────┐
│                         GTM-AI SKILL                            │
│                                                                 │
│   Deploy ─── Audit ─── Manage ─── Publish                       │
│                                                                 │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐          │
│   │   MCP       │   │   Skills    │   │   Phases    │          │
│   │   Servers   │──▶│   Knowledge │──▶│   Execution │          │
│   └─────────────┘   └─────────────┘   └─────────────┘          │
│         │                 │                 │                   │
│         ▼                 ▼                 ▼                   │
│   GTM API Access    Best Practices    Automated Deploy         │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Install MCP Servers

Copy `assets/templates/mcp.template.json` to your project root as `.mcp.json`:

```json
{
  "mcpServers": {
    "google-tag-manager-mcp-server": {
      "type": "url",
      "url": "https://gtm-mcp.stape.ai/mcp"
    }
  }
}
```

### 2. Copy Skill to Project

```bash
cp -r .claude/skills/gtm-AI ~/your-project/.claude/skills/
```

### 3. Create Configuration

Copy `assets/templates/config.template.json` to `CONFIG/config.json` and populate:

```json
{
  "gtm": {
    "accountId": "YOUR_ACCOUNT_ID",
    "webContainer": { "id": "YOUR_CONTAINER_ID" },
    "workspace": { "id": "YOUR_WORKSPACE_ID" }
  },
  "platforms": {
    "linkedin": {
      "partnerId": "YOUR_PARTNER_ID"
    }
  }
}
```

### 4. Use the Skill

```
Read .claude/skills/gtm-AI/SKILL.md then deploy LinkedIn tracking
```

---

## Directory Structure

```
gtm-AI/
├── SKILL.md                          # Entry point
├── README.md                         # This file
│
├── references/                       # Knowledge base
│   ├── tool-patterns.md              # MCP tool call patterns
│   ├── naming-conventions.md         # GTM naming standards
│   ├── variable-types.md             # Variable type reference
│   ├── template-gallery.md           # Community templates
│   ├── sgtm-correlation.md           # Web↔Server correlation
│   ├── audit-checklist.md            # Container audit workflow
│   └── troubleshooting.md            # Common issues & fixes
│
└── assets/
    ├── templates/
    │   ├── config.template.json      # Project config template
    │   └── mcp.template.json         # MCP server config
    │
    └── phase-prompts/
        ├── PHASE-0-TEMPLATE.md       # Template installation
        ├── PHASE-1-TEMPLATE.md       # Variable creation
        ├── PHASE-2-TEMPLATE.md       # Tag creation
        ├── PHASE-3-TEMPLATE.md       # Validation
        └── PHASE-4-TEMPLATE.md       # Test & publish
```

---

## Capabilities

| Capability | Description |
|------------|-------------|
| **Template Install** | Install from Community Gallery programmatically |
| **Variable CRUD** | Create constants, custom JS, data layer, cookies |
| **Tag CRUD** | Create tags with template references |
| **Workspace Ops** | Sync, preview, version, publish |
| **Container Audit** | Find duplicates, orphans, naming issues |
| **sGTM Correlation** | Validate web↔server tracking |

---

## Supported Platforms

| Platform | Client-Side | Server-Side (CAPI) |
|----------|-------------|-------------------|
| LinkedIn | ✅ | ✅ |
| Meta | ✅ | ✅ |
| GA4 | ✅ | ✅ |
| Google Ads | ✅ | - |
| TikTok | ✅ | ✅ |
| Pinterest | ✅ | ✅ |

---

## Usage Examples

### Deploy Platform Tracking
```
Use gtm-AI skill to deploy LinkedIn tracking with Partner ID 1234567
to GTM container 42412215
```

### Audit Container
```
Use gtm-AI skill to audit GTM container 42412215 for issues
```

### Publish Changes
```
Use gtm-AI skill to create version and publish container 42412215
```

### Rollback
```
Use gtm-AI skill to rollback container 42412215 to previous version
```

---

## Phase Workflow

```
PHASE 0          PHASE 1          PHASE 2          PHASE 3          PHASE 4
────────         ────────         ────────         ────────         ────────
Template    ──▶  Variables   ──▶  Tags       ──▶  Validate   ──▶  Publish
Install          Create           Create           Check            Deploy

Output:          Output:          Output:          Output:          Output:
templateId       variableIds      tagIds           previewUrl       versionId
```

---

## References Quick Access

| Need | Reference |
|------|-----------|
| MCP tool syntax | [tool-patterns.md](references/tool-patterns.md) |
| Naming standards | [naming-conventions.md](references/naming-conventions.md) |
| Variable configs | [variable-types.md](references/variable-types.md) |
| Template repos | [template-gallery.md](references/template-gallery.md) |
| sGTM setup | [sgtm-correlation.md](references/sgtm-correlation.md) |
| Audit workflow | [audit-checklist.md](references/audit-checklist.md) |
| Fix errors | [troubleshooting.md](references/troubleshooting.md) |

---

## License

MIT - Use freely in your projects.

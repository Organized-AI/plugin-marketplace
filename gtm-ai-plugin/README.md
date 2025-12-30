# GTM-AI Plugin

Complete Google Tag Manager automation toolkit for Claude Code.

## Overview

This plugin provides autonomous GTM/sGTM container management:

- **Deploy tracking** for LinkedIn, Meta, GA4, TikTok, Pinterest, and more
- **Audit containers** for duplicates, naming issues, and sGTM correlation
- **Publish versions** with automated validation
- **Rollback** if issues are detected

## Quick Start

### Installation

```bash
cd your-project
./.claude/plugins/gtm-ai-plugin/install.sh
```

### Configuration

Edit `CONFIG/config.json`:

```json
{
  "gtm": {
    "accountId": "4702245012",
    "webContainer": { "id": "42412215" },
    "workspace": { "id": "86" }
  },
  "platforms": {
    "linkedin": { "partnerId": "1234567" }
  }
}
```

### Deploy Tracking

```
/gtm-deploy linkedin --partner-id 1234567
```

Or natural language:
```
Deploy LinkedIn tracking to my GTM container
```

## Components

### Skills

| Skill | Purpose |
|-------|---------|
| **gtm-AI** | Core automation - templates, variables, tags, versions |
| **tidy-gtm** | Container auditing - duplicates, naming, correlation |
| **linkedin-capi-setup** | Server-side LinkedIn CAPI implementation |

### Agent

**gtm-automation-agent** - Autonomous execution of multi-phase deployments

### Commands

| Command | Description |
|---------|-------------|
| `/gtm-deploy [platform]` | Deploy tracking for platform |
| `/gtm-audit` | Audit container health |
| `/gtm-status` | Check workspace status |
| `/gtm-rollback` | Rollback to previous version |

### Hooks

| Hook | Purpose |
|------|---------|
| **pre-phase** | Validate prerequisites before phase execution |
| **post-phase** | Validate completion and update state |
| **pre-publish-audit** | Strategic container audit before publishing (runs GTM Status + GTM Audit) |
| **ascii-diagram-generator** | Generate visual before/after diagrams for audits and data flow changes |

#### Pre-Publish Audit Hook

The `pre-publish-audit` hook is a critical gate before publishing. It:

1. **Runs automatically** at Phase 4 entry, before any publish operation
2. **Executes GTM Status** to check workspace health and conflicts
3. **Executes GTM Audit** to analyze containers for issues
4. **Categorizes issues** as Critical (blocks), Warning (prompts), or Info (logs)
5. **Blocks publishing** if critical issues found
6. **Captures rollback reference** for emergency recovery

```
Trigger Points:
├── Phase 4 entry (automatic)
├── Before gtm_version publish (automatic)
├── After 5+ component changes (automatic)
└── /gtm-audit command (manual)
```

#### ASCII Diagram Generator Hook

The `ascii-diagram-generator` hook creates visual documentation:

1. **AUDIT-SUMMARY**: Before/after container structure (like REORGANIZATION-SUMMARY.md)
2. **DATA-FLOW-WORKSPACE**: Visual data flow diagrams showing GTM/sGTM paths
3. **CORRELATION-MAP**: Web ↔ Server GTM tag correlation visualization
4. **CHANGE-SUMMARY**: Impact visualization for major changes

```
Trigger Points:
├── After tidy-gtm audit completes (automatic)
├── After Phase 2 Tag Creation (automatic)
├── After sGTM correlation check (automatic)
├── After 5+ component changes (automatic)
└── Manual request (e.g., "Generate data flow diagram")
```

**Output Files:**
- `AUDIT-SUMMARY-{{timestamp}}.md` - Container audit before/after
- `DATA-FLOW-WORKSPACE-{{workspaceId}}.md` - Data flow visualization
- `CORRELATION-MAP-{{timestamp}}.md` - Web/sGTM correlation map

### Scripts

| Script | Purpose |
|--------|---------|
| `execute-phase.sh` | Execute specific phase with validation |
| `start-agent.sh` | Launch autonomous agent |

## Supported Platforms

| Platform | Client-Side | Server-Side CAPI |
|----------|-------------|------------------|
| LinkedIn | Yes | Yes |
| Meta/Facebook | Yes | Yes |
| GA4 | Yes | Yes |
| Google Ads | Yes | - |
| TikTok | Yes | Yes |
| Pinterest | Yes | Yes |
| Twitter/X | Yes | - |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    USER                              │
│                      │                               │
│      ┌───────────────┼───────────────┐              │
│      ▼               ▼               ▼              │
│  /gtm-deploy    /gtm-audit    /gtm-status           │
│      │               │               │              │
│      └───────────────┼───────────────┘              │
│                      ▼                               │
│  ┌─────────────────────────────────────────────┐    │
│  │         gtm-automation-agent                │    │
│  │                                             │    │
│  │   Phase 0 → Phase 1 → Phase 2 → Phase 3 → 4│    │
│  └─────────────────────────────────────────────┘    │
│                      │                               │
│         ┌────────────┴────────────┐                 │
│         ▼                         ▼                 │
│  ┌─────────────┐          ┌─────────────┐          │
│  │   gtm-AI    │          │  tidy-gtm   │          │
│  │             │          │             │          │
│  │ • Deploy    │          │ • Audit     │          │
│  │ • Create    │          │ • Validate  │          │
│  │ • Publish   │          │ • Cleanup   │          │
│  └──────┬──────┘          └──────┬──────┘          │
│         │                        │                  │
│         └────────────┬───────────┘                  │
│                      ▼                               │
│  ┌─────────────────────────────────────────────┐    │
│  │              MCP SERVERS                    │    │
│  │                                             │    │
│  │  google-tag-manager-mcp ─────▶ GTM API     │    │
│  │  stape-mcp-server ───────────▶ Stape API   │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

## Phased Execution

Deployments follow a 5-phase process:

| Phase | Name | Output |
|-------|------|--------|
| 0 | Template Installation | Template ID from gallery |
| 1 | Variable Creation | Partner ID, Event ID, Cookies |
| 2 | Tag Creation | Pageview, Conversion tags |
| 3 | Validation | Workspace check, Preview URL |
| 4 | Publish | Version creation, Go live |

## MCP Server Setup

### Required

**google-tag-manager-mcp-server**
- URL: `https://gtm-mcp.stape.ai/mcp`
- Provides: GTM CRUD operations
- Auth: OAuth via browser

### Optional

**stape-mcp-server**
- URL: `https://mcp.stape.ai/sse`
- Provides: sGTM container management

## Reference Documentation

### gtm-AI Skill

| Reference | Purpose |
|-----------|---------|
| tool-patterns.md | MCP tool call syntax |
| naming-conventions.md | GTM naming standards |
| variable-types.md | Variable configurations |
| template-gallery.md | Community templates |
| sgtm-correlation.md | Web ↔ Server validation |
| audit-checklist.md | Audit workflow |
| troubleshooting.md | Error fixes |

### tidy-gtm Skill

| Reference | Purpose |
|-----------|---------|
| naming-conventions.md | Standards by component |
| audit-checklist.md | 9-phase audit workflow |
| common-issues.md | Issue detection |
| correlation-guide.md | Tag-Trigger-Variable |
| sgtm-correlation.md | Web-Server pairing |

## Troubleshooting

### Authentication Expired

```bash
rm -rf ~/.mcp-auth
# Restart Claude Code
```

### Workspace Conflicts

```
gtm_workspace action=sync
```

### Template Already Exists

List existing templates and use the ID:
```
gtm_template action=list
```

## File Structure

```
gtm-ai-plugin/
├── PLUGIN.md                    # Plugin manifest
├── README.md                    # This file
├── install.sh                   # Installer script (v2.0)
├── mcp-servers.json             # MCP configuration
│
├── agents/
│   └── gtm-automation-agent.md  # Autonomous deployment
│
├── commands/
│   ├── gtm-deploy.md
│   ├── gtm-audit.md
│   ├── gtm-status.md
│   └── gtm-rollback.md
│
├── hooks/
│   ├── hooks.json               # Hook configuration
│   ├── pre-phase.md             # Pre-phase validation
│   ├── post-phase.md            # Post-phase completion
│   ├── pre-publish-audit.md     # Strategic audit before publishing
│   └── ascii-diagram-generator.md # Visual before/after diagrams
│
├── scripts/
│   ├── execute-phase.sh         # Phase executor
│   └── start-agent.sh           # Agent launcher
│
├── planning/
│   └── IMPLEMENTATION-MASTER-PLAN.md
│
├── templates/
│   ├── config.template.json     # Project config template
│   └── phase-state.template.json # State tracking template
│
└── skills/
    ├── gtm-AI/                  # Core automation
    │   ├── SKILL.md
    │   ├── references/          # 7 reference files
    │   └── assets/
    │       ├── templates/       # Config templates
    │       └── phase-prompts/   # Phase 0-4 prompts
    │
    ├── tidy-gtm/                # Container auditing
    │   ├── SKILL.md
    │   ├── references/          # 5 reference files
    │   └── assets/
    │
    └── linkedin-capi-setup/     # Server-side CAPI
        ├── SKILL.md
        └── references/
```

## What Gets Installed

After running `install.sh`, your project will have:

```
your-project/
├── .claude/
│   ├── skills/
│   │   ├── gtm-AI/
│   │   ├── tidy-gtm/
│   │   └── linkedin-capi-setup/
│   ├── agents/
│   │   └── gtm-automation-agent.md
│   ├── commands/
│   │   ├── gtm-deploy.md
│   │   ├── gtm-audit.md
│   │   ├── gtm-status.md
│   │   └── gtm-rollback.md
│   └── hooks/
│       ├── hooks.json
│       ├── pre-phase.md
│       ├── post-phase.md
│       ├── pre-publish-audit.md
│       └── ascii-diagram-generator.md
│
├── scripts/
│   ├── execute-phase.sh
│   └── start-agent.sh
│
├── PLANNING/
│   ├── IMPLEMENTATION-MASTER-PLAN.md
│   └── implementation-phases/
│       ├── PHASE-0-PROMPT.md
│       ├── PHASE-1-PROMPT.md
│       ├── PHASE-2-PROMPT.md
│       ├── PHASE-3-PROMPT.md
│       └── PHASE-4-PROMPT.md
│
├── CONFIG/
│   ├── config.json
│   └── phase-state.json
│
└── .mcp.json
```

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.2.0 | 2025-01 | Added ascii-diagram-generator hook for visual before/after documentation |
| 2.1.0 | 2025-01 | Added pre-publish-audit hook for strategic container validation |
| 2.0.0 | 2024-01 | Added hooks, scripts, planning, state management, linkedin-capi-setup |
| 1.0.0 | 2024-01 | Initial release |

## License

MIT

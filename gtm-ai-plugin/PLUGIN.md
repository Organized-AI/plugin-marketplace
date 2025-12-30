# GTM-AI Plugin

> Complete Google Tag Manager automation toolkit for Claude Code.

## Plugin Metadata

```yaml
name: gtm-ai-plugin
version: 2.2.0
description: Precision GTM/sGTM automation - deploy, audit, manage, publish with pre-publish validation
author: GTM Automation
category: Marketing Technology
license: MIT
repository: https://github.com/Organized-AI/plugin-marketplace
```

---

## What's Included

```
gtm-ai-plugin/
│
├── PLUGIN.md                    # This file (manifest)
├── README.md                    # Documentation
├── install.sh                   # Installation script
│
├── mcp-servers.json             # Required MCP server configurations
│
├── skills/
│   ├── gtm-AI/                  # Core GTM automation skill
│   │   ├── SKILL.md
│   │   ├── references/          # 7 knowledge files
│   │   └── assets/              # Templates & phase prompts
│   │
│   ├── tidy-gtm/                # Container auditing skill
│   │   ├── SKILL.md
│   │   ├── references/          # Audit standards
│   │   └── assets/              # Workflow diagrams
│   │
│   └── linkedin-capi-setup/     # Server-side LinkedIn CAPI
│       ├── SKILL.md
│       └── references/          # CAPI config guides
│
├── agents/
│   └── gtm-automation-agent.md  # Autonomous deployment agent
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
└── commands/
    ├── gtm-deploy.md            # Deploy tracking
    ├── gtm-audit.md             # Audit container
    ├── gtm-status.md            # Check status
    └── gtm-rollback.md          # Rollback version
```

---

## Capabilities

| Capability | Skill | Description |
|------------|-------|-------------|
| **Deploy Tracking** | gtm-AI | Install templates, create tags, publish |
| **Audit Containers** | tidy-gtm | Find issues, validate correlations |
| **sGTM Correlation** | Both | Web ↔ Server validation |
| **LinkedIn CAPI** | linkedin-capi-setup | Server-side conversion tracking |
| **Pre-Publish Audit** | Hook | Strategic validation before publishing |
| **Visual Diagrams** | Hook | Before/after ASCII documentation |
| **Autonomous Execution** | Agent | Full deployment without prompts |
| **Quick Commands** | Commands | One-line operations |

---

## Hooks

| Hook | Purpose |
|------|---------|
| **pre-phase** | Validate prerequisites before phase execution |
| **post-phase** | Validate completion and update state |
| **pre-publish-audit** | Strategic container audit before publishing (runs GTM Status + GTM Audit) |
| **ascii-diagram-generator** | Generate visual before/after diagrams for audits and data flow changes |

### Pre-Publish Audit Hook

Automatically runs before Phase 4 publish operations:
- Executes GTM Status to check workspace health
- Runs GTM Audit for comprehensive container analysis
- Categorizes issues as Critical (blocks), Warning (prompts), or Info (logs)
- Blocks publishing if critical issues found
- Captures rollback reference for emergency recovery

### ASCII Diagram Generator Hook

Creates visual documentation:
- `AUDIT-SUMMARY-{{timestamp}}.md` - Before/after container structure
- `DATA-FLOW-WORKSPACE-{{workspaceId}}.md` - GTM/sGTM data flow visualization
- `CORRELATION-MAP-{{timestamp}}.md` - Web ↔ Server tag correlation

---

## Required MCP Servers

This plugin requires:

| Server | URL | Purpose |
|--------|-----|---------|
| `google-tag-manager-mcp-server` | `https://gtm-mcp.stape.ai/mcp` | GTM API operations |
| `stape-mcp-server` | `https://mcp.stape.ai/sse` | sGTM validation (optional) |

---

## Supported Platforms

| Platform | Client-Side | Server-Side CAPI |
|----------|-------------|------------------|
| LinkedIn | ✅ | ✅ |
| Meta/Facebook | ✅ | ✅ |
| GA4 | ✅ | ✅ |
| Google Ads | ✅ | - |
| TikTok | ✅ | ✅ |
| Pinterest | ✅ | ✅ |
| Twitter/X | ✅ | - |

---

## Installation

### From Plugin Marketplace

```
/plugin install gtm-ai-plugin@organized-ai-marketplace
```

### Manual Install

```bash
# 1. Copy plugin to your project
cp -r gtm-ai-plugin ~/your-project/.claude/plugins/

# 2. Run install script
cd ~/your-project
.claude/plugins/gtm-ai-plugin/install.sh

# 3. Restart Claude
```

The install script:
1. Copies skills to `.claude/skills/`
2. Copies agents to `.claude/agents/`
3. Copies commands to `.claude/commands/`
4. Copies hooks to `.claude/hooks/`
5. Merges MCP servers into `.mcp.json`
6. Creates `CONFIG/` directory with templates
7. Creates `PLANNING/` directory with phase prompts

---

## Usage

### Deploy Platform Tracking

```
/gtm-deploy linkedin --partner-id 1234567
```

Or natural language:
```
Deploy LinkedIn tracking with Partner ID 1234567 to GTM container 42412215
```

### Audit Container

```
/gtm-audit
```

Or natural language:
```
Audit my GTM container for duplicates and naming issues
```

### Check Status

```
/gtm-status
```

### Rollback

```
/gtm-rollback
```

---

## Trigger Phrases

### Deployment
- "Deploy GTM tracking"
- "Install [platform] tracking"
- "Set up [platform] pixel"
- "Create GTM tags for [platform]"

### Auditing
- "Audit GTM container"
- "Tidy up GTM"
- "Check for duplicates"
- "Validate naming conventions"

### sGTM
- "Check sGTM correlation"
- "Validate server-side tracking"
- "Audit both containers"

### Diagrams
- "Generate data flow diagram"
- "Create audit summary"
- "Show correlation map"

---

## Configuration

After installation, edit `CONFIG/config.json`:

```json
{
  "gtm": {
    "accountId": "YOUR_ACCOUNT_ID",
    "webContainer": {
      "id": "YOUR_CONTAINER_ID",
      "publicId": "GTM-XXXXXXX"
    },
    "serverContainer": {
      "id": "YOUR_SERVER_CONTAINER_ID",
      "publicId": "GTM-XXXXXXX"
    },
    "workspace": { "id": "YOUR_WORKSPACE_ID" }
  },
  "platforms": {
    "linkedin": {
      "partnerId": "YOUR_PARTNER_ID"
    }
  }
}
```

---

## Skills Reference

### gtm-AI

Core automation skill for GTM operations:

| Reference | Purpose |
|-----------|---------|
| `tool-patterns.md` | MCP tool call syntax |
| `naming-conventions.md` | GTM naming standards |
| `variable-types.md` | Variable configurations |
| `template-gallery.md` | Community templates |
| `sgtm-correlation.md` | Web ↔ Server validation |
| `audit-checklist.md` | Audit workflow |
| `troubleshooting.md` | Error fixes |

### tidy-gtm

Container auditing skill:

| Reference | Purpose |
|-----------|---------|
| `naming-conventions.md` | Standards by component |
| `audit-checklist.md` | 9-phase audit workflow |
| `common-issues.md` | Issue detection |
| `correlation-guide.md` | Tag-Trigger-Variable |
| `sgtm-correlation.md` | Web-Server pairing |

### linkedin-capi-setup

Server-side LinkedIn CAPI implementation:

| Reference | Purpose |
|-----------|---------|
| `linkedin-capi-api.md` | CAPI endpoint specs |
| `conversion-categories.md` | LinkedIn conversion types |
| `stape-gtm-config.md` | Stape sGTM setup |

---

## Agent

The `gtm-automation-agent.md` provides autonomous execution:

1. Reads configuration
2. Executes phases sequentially (0-4)
3. Runs pre-publish audit before Phase 4
4. Handles errors and retries
5. Updates state files
6. Generates visual diagrams
7. Reports completion

Activate with:
- "Deploy LinkedIn tracking"
- "Run GTM automation"
- "Execute full deployment"

---

## Commands

| Command | Description |
|---------|-------------|
| `/gtm-deploy [platform]` | Deploy tracking for platform |
| `/gtm-audit` | Run container audit |
| `/gtm-status` | Check workspace status |
| `/gtm-rollback` | Rollback to previous version |

---

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        GTM-AI PLUGIN v2.2.0                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   USER                                                           │
│     │                                                            │
│     ▼                                                            │
│   ┌─────────────────┐                                           │
│   │ /gtm-deploy     │──┐                                        │
│   │ /gtm-audit      │  │                                        │
│   │ /gtm-status     │  │                                        │
│   │ /gtm-rollback   │  │                                        │
│   └─────────────────┘  │                                        │
│                        │                                         │
│                        ▼                                         │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │                    AGENT                                  │  │
│   │            gtm-automation-agent.md                        │  │
│   │                                                           │  │
│   │   Reads: CONFIG/config.json                               │  │
│   │   Uses:  Skills (gtm-AI, tidy-gtm, linkedin-capi-setup)  │  │
│   │   Calls: MCP Tools + Hooks                                │  │
│   └────────────────────────┬──────────────────────────────────┘  │
│                            │                                     │
│              ┌─────────────┴─────────────┐                      │
│              ▼                           ▼                      │
│   ┌─────────────────────┐   ┌─────────────────────┐            │
│   │      gtm-AI         │   │     tidy-gtm        │            │
│   │                     │   │                     │            │
│   │ • Deploy tracking   │   │ • Audit containers  │            │
│   │ • Create tags       │   │ • Find duplicates   │            │
│   │ • Install templates │   │ • Check naming      │            │
│   │ • Publish versions  │   │ • Validate sGTM     │            │
│   └──────────┬──────────┘   └──────────┬──────────┘            │
│              │                         │                        │
│              └────────────┬────────────┘                        │
│                           │                                     │
│                           ▼                                     │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │                      HOOKS                               │  │
│   │                                                          │  │
│   │  pre-publish-audit ───▶ Validates before publish        │  │
│   │  ascii-diagram-generator ───▶ Creates visual docs       │  │
│   └────────────────────────┬─────────────────────────────────┘  │
│                            │                                     │
│                            ▼                                     │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │                   MCP SERVERS                            │  │
│   │                                                          │  │
│   │   google-tag-manager-mcp ──▶ GTM API                    │  │
│   │   stape-mcp-server ────────▶ Stape API                  │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.2.0 | 2025-01 | Added ascii-diagram-generator hook for visual before/after documentation |
| 2.1.0 | 2025-01 | Added pre-publish-audit hook for strategic container validation |
| 2.0.0 | 2025-01 | Added hooks, scripts, planning, state management, linkedin-capi-setup skill |
| 1.0.0 | 2024-01 | Initial release |

---

## Support

- Issues: GitHub Issues
- Documentation: README.md
- Troubleshooting: `skills/gtm-AI/references/troubleshooting.md`

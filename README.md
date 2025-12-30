# Organized AI Plugin Marketplace

Official Claude Code plugin marketplace for Organized AI.

## Installation

Add this marketplace to Claude Code:

```
/plugin marketplace add Organized-AI/plugin-marketplace
```

## Available Plugins

### gtm-ai-plugin ⭐ NEW

Complete Google Tag Manager automation toolkit - deploy, audit, manage, and publish GTM/sGTM containers.

```
/plugin install gtm-ai-plugin@organized-ai-marketplace
```

**Features:**
- Multi-platform tracking deployment (LinkedIn, Meta, GA4, TikTok, Pinterest, Google Ads)
- Client-side + Server-side CAPI support
- Container auditing with duplicate/naming detection
- Web ↔ sGTM correlation validation
- Pre-publish audit with critical issue blocking
- Visual before/after ASCII diagram generation
- 5-phase autonomous deployment workflow

**Skills:**
| Skill | Description |
|-------|-------------|
| `gtm-AI` | Core automation - templates, variables, tags, versions |
| `tidy-gtm` | Container auditing - duplicates, naming, correlation |
| `linkedin-capi-setup` | Server-side LinkedIn CAPI implementation |

**Commands:**
| Command | Description |
|---------|-------------|
| `/gtm-deploy [platform]` | Deploy tracking for platform |
| `/gtm-audit` | Run container audit |
| `/gtm-status` | Check workspace status |
| `/gtm-rollback` | Rollback to previous version |

**Hooks:**
| Hook | Description |
|------|-------------|
| `pre-publish-audit` | Strategic container audit before publishing |
| `ascii-diagram-generator` | Generate visual before/after diagrams |

**MCP Servers Required:**
- `google-tag-manager-mcp-server` - GTM API operations
- `stape-mcp-server` (optional) - sGTM validation

---

### organized-codebase-applicator

Apply Organized Codebase template structure to existing projects and create Claude Code Plugins.

```
/plugin install organized-codebase-applicator@organized-ai-marketplace
```

**Features:**
- Apply standardized project structure (PLANNING, DOCUMENTATION, CONFIG, etc.)
- Create distributable Claude Code Plugins
- Clean up unused/redundant directories
- Plugin manifest and template generation
- Local vs Plugin structure guidance

---

### blade-linkedin-plugin

Autonomous GTM implementation for LinkedIn Insight Tag with dual-tracking (client + server-side CAPI).

```
/plugin install blade-linkedin-plugin@organized-ai-marketplace
```

**Features:**
- Zero-click GTM deployment via MCP
- LinkedIn InsightTag 2.0 from Community Gallery
- Event ID deduplication (client + server CAPI)
- Automated preview, version, publish workflow

**Commands:**
| Command | Description |
|---------|-------------|
| `/blade-deploy` | Execute full LinkedIn tracking deployment |
| `/blade-status` | Check implementation phase progress |
| `/blade-rollback` | Revert to previous GTM version |

---

### gtm-implementation

Google Tag Manager implementation toolkit for Meta CAPI, GA4, Google Ads, and CRM webhook integrations.

```
/plugin install gtm-implementation@organized-ai-marketplace
```

**Features:**
- Meta Conversions API setup
- GA4 configuration
- Google Ads conversion tracking
- GoHighLevel CRM webhooks
- Stape server-side GTM integration

---

## Plugin Structure

Each plugin follows the Claude Code plugin specification:

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json      # Plugin manifest
├── commands/            # Slash commands
├── agents/              # Agents
├── skills/              # Skills
└── hooks/               # Hooks
```

## Contributing

1. Fork this repository
2. Create your plugin directory
3. Add plugin to `.claude-plugin/marketplace.json`
4. Submit a pull request

## License

MIT

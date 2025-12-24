# Organized AI Plugin Marketplace

Official plugin marketplace for Claude Code, featuring GTM, analytics, and marketing automation tools.

## Installation

Add this marketplace to Claude Code:

```bash
/plugin marketplace add organized-ai/plugin-marketplace
```

## Available Plugins

### gtm-implementation

Google Tag Manager implementation toolkit for Meta CAPI, GA4, Google Ads, and CRM webhook integrations.

**Install:**
```bash
/plugin install gtm-implementation@organized-ai
```

**Commands:**
| Command | Description |
|---------|-------------|
| `/gtm-setup` | Initialize GTM tracking architecture |
| `/gtm-test` | Run 7-phase testing checklist |
| `/gtm-capi` | Configure Meta Conversions API with Stape CAPIG |
| `/gtm-audit` | Audit existing GTM implementation |
| `/gtm-webhook` | Configure CRM webhooks for offline conversions |

**Agents:**
| Agent | Model | Description |
|-------|-------|-------------|
| `gtm-architect` | Opus | Design tracking solutions and conversion funnels |
| `gtm-debugger` | Sonnet | Troubleshoot tracking issues and fix implementations |

**Source:** [organized-ai/teleios-health-setup](https://github.com/organized-ai/teleios-health-setup)

---

## Adding a New Plugin

1. Create your plugin repository with the standard structure:
   ```
   your-plugin/
   ├── .claude-plugin/
   │   └── plugin.json
   ├── commands/
   ├── agents/
   ├── skills/
   └── README.md
   ```

2. Submit a PR to add your plugin to `.claude-plugin/marketplace.json`

## License

MIT License - Organized AI

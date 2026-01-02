# Organized AI Plugin Marketplace

Official Claude Code plugin marketplace for Organized AI. Includes curated plugins from Anthropic's official collection plus custom tracking and automation tools.

## Installation

Add this marketplace to Claude Code:

```
/plugin marketplace add Organized-AI/plugin-marketplace
```

## Available Plugins

---

## 🎨 Development & Design

### frontend-design ⭐ ANTHROPIC OFFICIAL

Create distinctive, production-grade frontend interfaces with high design quality that avoids generic AI aesthetics.

```
/plugin install frontend-design@organized-ai-marketplace
```

**Features:**
- Bold aesthetic choices and distinctive typography
- High-impact animations and visual details
- Context-aware implementation
- Production-ready code generation
- Avoids cookie-cutter AI design patterns

**Authors:** Prithvi Rajasekaran, Alexander Bricken (Anthropic)

---

### agent-sdk-dev ⭐ ANTHROPIC OFFICIAL

Comprehensive plugin for creating and verifying Claude Agent SDK applications in Python and TypeScript.

```
/plugin install agent-sdk-dev@organized-ai-marketplace
```

**Features:**
- Interactive project scaffolding with `/new-sdk-app`
- Latest SDK version checking and installation
- TypeScript and Python support
- Automatic verification against best practices
- Environment and security setup

**Commands:**
| Command | Description |
|---------|-------------|
| `/new-sdk-app [name]` | Create new Agent SDK application |

**Agents:**
| Agent | Description |
|-------|-------------|
| `agent-sdk-verifier-ts` | Verify TypeScript SDK applications |
| `agent-sdk-verifier-py` | Verify Python SDK applications |

**Author:** Ashwin Bhat (Anthropic)

---

### hookify ⭐ ANTHROPIC OFFICIAL

Easily create custom hooks to prevent unwanted behaviors by analyzing conversation patterns or from explicit instructions.

```
/plugin install hookify@organized-ai-marketplace
```

**Features:**
- Analyze conversations to find unwanted behaviors automatically
- Simple markdown configuration with YAML frontmatter
- Regex pattern matching for powerful rules
- No coding required - just describe the behavior
- Instant activation without restart

**Commands:**
| Command | Description |
|---------|-------------|
| `/hookify [behavior]` | Create hook from instructions or analyze conversation |
| `/hookify:list` | List all configured rules |
| `/hookify:configure` | Enable/disable rules interactively |
| `/hookify:help` | Get help with hookify |

**Event Types:**
- `bash` - Match Bash commands
- `file` - Match Edit/Write/MultiEdit operations
- `stop` - Match completion checks
- `prompt` - Match user prompt submission
- `all` - Match all events

**Author:** Anthropic

---

## 🔌 Integrations (MCP Servers)

### stripe ⭐ ANTHROPIC OFFICIAL

Stripe development integration with best practices for payment processing, checkout flows, and subscriptions.

```
/plugin install stripe@organized-ai-marketplace
```

**Features:**
- Payment integration best practices
- Error code explanations and solutions
- Test card reference
- Checkout Sessions and Payment Intents guidance
- Connect platform recommendations

**Commands:**
| Command | Description |
|---------|-------------|
| `/stripe-error [code]` | Explain Stripe error codes |
| `/stripe-test-cards [scenario]` | Display test card numbers |

**Skills:**
| Skill | Description |
|-------|-------------|
| `stripe-best-practices` | Best practices for Stripe integrations |

**MCP Server:** `https://mcp.stripe.com`

**Author:** Stripe

---

### supabase ⭐ ANTHROPIC OFFICIAL

Supabase MCP integration for database operations, authentication, storage, and real-time subscriptions.

```
/plugin install supabase@organized-ai-marketplace
```

**Features:**
- Database operations and SQL queries
- Authentication management
- Storage operations
- Real-time subscriptions
- Project management

**MCP Server:** `https://mcp.supabase.com/mcp`

**Author:** Supabase

---

### github ⭐ ANTHROPIC OFFICIAL

Official GitHub MCP server for repository management and GitHub API interactions.

```
/plugin install github@organized-ai-marketplace
```

**Features:**
- Create and manage issues
- Pull request management
- Code review workflows
- Repository search
- Full GitHub API access

**MCP Server:** `https://api.githubcopilot.com/mcp/`

**Requires:** `GITHUB_PERSONAL_ACCESS_TOKEN` environment variable

**Author:** GitHub

---

### slack ⭐ ANTHROPIC OFFICIAL

Slack workspace integration for searching messages, accessing channels, and reading threads.

```
/plugin install slack@organized-ai-marketplace
```

**Features:**
- Search messages
- Access channels
- Read threads
- Team communications integration

**MCP Server:** `https://mcp.slack.com/sse`

**Author:** Slack

---

### asana ⭐ ANTHROPIC OFFICIAL

Asana project management integration for task and project management.

```
/plugin install asana@organized-ai-marketplace
```

**Features:**
- Create and manage tasks
- Search projects
- Update assignments
- Track progress
- Workflow integration

**MCP Server:** `https://mcp.asana.com/sse`

**Author:** Asana

---

### context7 ⭐ ANTHROPIC OFFICIAL

Upstash Context7 MCP server for up-to-date documentation lookup.

```
/plugin install context7@organized-ai-marketplace
```

**Features:**
- Version-specific documentation lookup
- Code examples from source repositories
- Direct LLM context integration

**MCP Server:** `npx -y @upstash/context7-mcp`

**Author:** Upstash

---

### serena ⭐ ANTHROPIC OFFICIAL

Semantic code analysis MCP server for intelligent code understanding and refactoring.

```
/plugin install serena@organized-ai-marketplace
```

**Features:**
- Semantic code analysis
- Refactoring suggestions
- Codebase navigation
- Language server protocol integration

**MCP Server:** `uvx --from git+https://github.com/oraios/serena serena start-mcp-server`

**Author:** Oraios

---

## 📊 Tracking & Analytics

### gtm-ai-plugin

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

**MCP Servers Required:**
- `google-tag-manager-mcp-server` - GTM API operations
- `stape-mcp-server` (optional) - sGTM validation

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

### fix-your-tracking

Advertising and tracking audit toolkit for comprehensive platform analysis.

```
/plugin install fix-your-tracking@organized-ai-marketplace
```

---

## 🛠️ Utilities

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

## Plugin Structure

Each plugin follows the Claude Code plugin specification:

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json      # Plugin manifest
├── commands/            # Slash commands
├── agents/              # Agents
├── skills/              # Skills
├── hooks/               # Hooks
└── mcp-servers.json     # MCP server configs (optional)
```

## Quick Reference

| Plugin | Type | Source |
|--------|------|--------|
| frontend-design | Skills | Anthropic Official |
| agent-sdk-dev | Commands, Agents | Anthropic Official |
| hookify | Commands, Agents, Skills, Hooks | Anthropic Official |
| stripe | Commands, Skills, MCP | Anthropic Official |
| supabase | MCP | Anthropic Official |
| github | MCP | Anthropic Official |
| slack | MCP | Anthropic Official |
| asana | MCP | Anthropic Official |
| context7 | MCP | Anthropic Official |
| serena | MCP | Anthropic Official |
| gtm-ai-plugin | Commands, Skills, Hooks | Organized AI |
| blade-linkedin-plugin | Commands | Organized AI |
| fix-your-tracking | Tools | Organized AI |
| organized-codebase-applicator | Skills | Organized AI |

## Contributing

1. Fork this repository
2. Create your plugin directory
3. Add plugin to `.claude-plugin/marketplace.json`
4. Submit a pull request

## License

MIT

---

*Anthropic Official plugins are sourced from [claude-plugins-official](https://github.com/anthropics/claude-plugins-official)*

# Fix Your Tracking - Claude Code Plugin

A comprehensive Claude Code plugin for marketing tracking infrastructure, ad platform management, and cross-platform data synchronization.

## Plugin Information

| Field | Value |
|-------|-------|
| **Name** | fix-your-tracking |
| **Version** | 1.0.0 |
| **Author** | Organized AI |
| **License** | Apache-2.0 |
| **Category** | Marketing & Analytics |

## Overview

This plugin provides a complete toolkit for:
- **Google Tag Manager (GTM)** automation and auditing (web + server-side)
- **Meta Ads** campaign analysis and optimization
- **Google Ads** performance monitoring and GAQL queries
- **LinkedIn CAPI** server-side tracking implementation
- **GoHighLevel** CRM data synchronization
- **Triple Whale** attribution and revenue tracking
- **Cross-platform data reconciliation**

## Components

### MCP Servers (6 total)

| Server | Purpose | Transport |
|--------|---------|-----------|
| `google-tag-manager-mcp-server` | GTM API operations (tags, triggers, variables, versions) | URL (OAuth) |
| `stape-mcp-server` | Server-side GTM container management | SSE |
| `meta-ads-mcp` | Meta Ads API (campaigns, creatives, insights) | stdio |
| `google-ads-mcp` | Google Ads API (GAQL queries, performance) | stdio |
| `gateway-mcp` | Meta CAPI Gateway infrastructure | stdio |
| `ghl-mcp` | GoHighLevel CRM API | stdio |

### Agents (6 specialized agents)

| Agent | Description | Invocation |
|-------|-------------|------------|
| `audit-coordinator` | Master orchestrator for comprehensive audits | `@audit-coordinator` |
| `gtm-automation` | Autonomous GTM deployment agent | `@gtm-automation` |
| `meta-ads` | Meta advertising specialist | `@meta-ads` |
| `google-ads` | Google Ads optimization specialist | `@google-ads` |
| `tracking-infra` | Server-side tracking & CAPI specialist | `@tracking-infra` |
| `data-sync` | Cross-platform data integration | `@data-sync` |

### Commands (8 slash commands)

| Command | Description |
|---------|-------------|
| `/gtm-deploy` | Deploy tracking to GTM containers (LinkedIn, Meta, GA4, TikTok, Pinterest) |
| `/gtm-audit` | Comprehensive container audit with issue detection |
| `/gtm-status` | Quick health check for GTM workspace |
| `/gtm-rollback` | Version rollback with audit trail |
| `/analyze-performance` | Cross-platform performance insights |
| `/full-audit` | Comprehensive tracking and advertising audit |
| `/setup-tracking` | Initialize tracking infrastructure for new domains |
| `/sync-data` | Synchronize data between GHL, TripleWhale, and ad platforms |

### Skills (8 specialized skills)

| Skill | Purpose |
|-------|---------|
| `tidy-gtm` | GTM container auditing and cleanup (web + server-side) |
| `gtm-AI` | GTM automation patterns and phase-based deployment |
| `linkedin-capi-setup` | Server-side LinkedIn Conversions API implementation |
| `triple-whale-bridge` | GHL to Triple Whale data transformation |
| `organized-codebase-applicator` | Project structure template application |
| `phased-planning` | Implementation roadmap generation |
| `phase-0-template` | Project initialization prompts |
| `ghl-contact-processor` | GoHighLevel contact data extraction |

### Hooks (4 lifecycle hooks)

| Hook | Trigger | Purpose |
|------|---------|---------|
| `pre-phase` | Before GTM deployment | Validates prerequisites |
| `post-phase` | After GTM deployment | Updates state, creates completion docs |
| `pre-publish-audit` | Before container publish | Mandatory audit before publishing |
| `ascii-diagram-generator` | After audits | Generates visual documentation |

## Installation

### Quick Install

```bash
# Clone or download the plugin
git clone https://github.com/your-org/fix-your-tracking-plugin.git

# Copy to your project
cp -r fix-your-tracking-plugin/.claude your-project/
cp fix-your-tracking-plugin/.mcp.json your-project/
cp fix-your-tracking-plugin/CLAUDE.md your-project/
```

### Manual Installation

1. Copy the `.claude/` directory to your project root
2. Copy `.mcp.json` to your project root
3. Merge `CLAUDE.md` with your existing instructions
4. Set up required environment variables

## Configuration

### Required Environment Variables

```bash
# Google Tag Manager (via Stape)
STAPE_API_KEY=your_stape_api_key

# Meta Ads
META_APP_ID=your_meta_app_id
PIPEBOARD_API_TOKEN=your_pipeboard_token

# Google Ads
GOOGLE_ADS_CREDENTIALS_PATH=/path/to/credentials.json
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token
GOOGLE_ADS_LOGIN_CUSTOMER_ID=1234567890

# GoHighLevel
GHL_API_KEY=your_ghl_api_key
GHL_LOCATION_ID=your_location_id

# Triple Whale
TW_API_KEY=your_triplewhale_api_key
TW_SHOP_ID=your-shop.myshopify.com
```

### GTM Configuration

Create `CONFIG/config.json` with your GTM credentials:

```json
{
  "gtm": {
    "accountId": "123456789",
    "webContainerId": "GTM-XXXXXXX",
    "serverContainerId": "GTM-YYYYYYY"
  },
  "platforms": {
    "linkedin": {
      "partnerId": "123456"
    },
    "meta": {
      "pixelId": "1234567890123456"
    },
    "ga4": {
      "measurementId": "G-XXXXXXXXXX"
    }
  }
}
```

## Usage

### Running Audits

```
# Full cross-platform audit
/full-audit

# GTM-specific audit
/gtm-audit --container both

# Quick status check
/gtm-status
```

### Deploying Tracking

```
# Deploy LinkedIn tracking
/gtm-deploy linkedin

# Deploy all platforms
/gtm-deploy all
```

### Agent Invocation

```
# Invoke specific agents
@meta-ads analyze campaign performance for last 30 days
@google-ads run GAQL query for keyword analysis
@tracking-infra check Meta CAPI setup
@data-sync reconcile GHL contacts with Triple Whale
```

## Requirements

- Node.js >= 18.0.0
- Python >= 3.10 (for Google Ads MCP)
- Claude Code CLI or Claude Code Web

## Support

- Documentation: See individual skill/agent markdown files
- Issues: https://github.com/your-org/fix-your-tracking-plugin/issues

## License

Apache-2.0

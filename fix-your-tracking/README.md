# Fix Your Tracking - Claude Code Plugin

A comprehensive Claude Code plugin for marketing tracking infrastructure, ad platform management, and cross-platform data synchronization.

## Features

- **6 Autonomous Agents**: Meta Ads, Google Ads, GTM Automation, Tracking Infrastructure, Data Sync, Audit Coordinator
- **8 Slash Commands**: GTM deploy/audit/status/rollback, full-audit, analyze-performance, setup-tracking, sync-data
- **6 MCP Servers**: GTM, Stape, Meta Ads, Google Ads, Gateway, GoHighLevel
- **8 Specialized Skills**: tidy-gtm, gtm-AI, linkedin-capi-setup, triple-whale-bridge, and more
- **8 Lifecycle Hooks**: Pre/post phase validation, pre-publish audit, diagram generation

## Installation

### Option 1: Clone from Marketplace

```bash
git clone https://github.com/Organized-AI/plugin-marketplace.git
cp -r plugin-marketplace/fix-your-tracking/.claude your-project/
cp plugin-marketplace/fix-your-tracking/.mcp.json your-project/
cp plugin-marketplace/fix-your-tracking/CLAUDE.md your-project/
```

### Option 2: Manual Copy

Copy the following to your project root:
- `.claude/` directory (agents, commands, skills, hooks)
- `.mcp.json` (MCP server configuration)
- `CLAUDE.md` (plugin instructions)

## Configuration

### Required Environment Variables

```bash
# Create .env file with your credentials
STAPE_API_KEY=your_stape_api_key
META_APP_ID=your_meta_app_id
PIPEBOARD_API_TOKEN=your_pipeboard_token
GOOGLE_ADS_CREDENTIALS_PATH=/path/to/credentials.json
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token
GHL_API_KEY=your_ghl_api_key
TW_API_KEY=your_triplewhale_api_key
```

### GTM Configuration

Create `CONFIG/config.json`:

```json
{
  "gtm": {
    "accountId": "123456789",
    "webContainerId": "GTM-XXXXXXX",
    "serverContainerId": "GTM-YYYYYYY"
  }
}
```

## Usage

### Run a Full Audit

```
/full-audit
```

### Deploy Tracking

```
/gtm-deploy linkedin
/gtm-deploy meta
/gtm-deploy ga4
```

### Invoke Agents

```
@meta-ads analyze campaign performance
@google-ads run GAQL query
@tracking-infra validate CAPI setup
@data-sync reconcile GHL contacts
```

## Supported Platforms

| Platform | Client-Side | Server-Side (CAPI) |
|----------|-------------|-------------------|
| Meta/Facebook | Pixel | Conversions API |
| Google Ads | Conversion Tag | Enhanced Conversions |
| LinkedIn | Insight Tag | Conversions API |
| GA4 | Config + Events | Server-side GA4 |
| TikTok | Pixel | Events API |
| Pinterest | Tag | Conversions API |

## Requirements

- Node.js >= 18.0.0
- Python >= 3.10 (for Google Ads MCP)
- Claude Code CLI or Claude Code extension

## License

Apache-2.0

## Support

- Issues: https://github.com/Organized-AI/plugin-marketplace/issues
- Documentation: See PLUGIN.md

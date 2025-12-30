# Fix Your Tracking - Claude Code Plugin

Complete marketing tracking infrastructure toolkit with autonomous agents for Meta, Google Ads, LinkedIn, GTM, and cross-platform data synchronization.

## Quick Start

```bash
# Invoke agents directly
@audit-coordinator run full tracking audit
@meta-ads analyze campaign performance last 30 days
@google-ads get campaign metrics
@gtm-automation deploy LinkedIn tracking
@tracking-infra check CAPI setup
@data-sync reconcile GHL with Triple Whale
```

## Available Commands

| Command | Description |
|---------|-------------|
| `/gtm-deploy <platform>` | Deploy tracking (linkedin, meta, ga4, tiktok, pinterest) |
| `/gtm-audit` | Audit GTM containers |
| `/gtm-status` | Check GTM workspace health |
| `/gtm-rollback` | Rollback to previous version |
| `/full-audit` | Comprehensive cross-platform audit |
| `/analyze-performance` | Performance insights (last_7d, last_30d, last_90d) |
| `/setup-tracking <domain>` | Initialize tracking for new domain |
| `/sync-data <location-id>` | Sync GHL, TripleWhale, ad platforms |

## MCP Servers

This plugin uses the following MCP servers:
- `google-tag-manager-mcp-server` - GTM API operations
- `stape-mcp-server` - Server-side GTM management
- `meta-ads-mcp` - Meta Ads API
- `google-ads-mcp` - Google Ads API
- `gateway-mcp` - Meta CAPI Gateway
- `ghl-mcp` - GoHighLevel CRM

## Environment Variables

```bash
# GTM/Stape
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

## Skills

- `tidy-gtm` - GTM container auditing and cleanup
- `gtm-AI` - GTM automation patterns
- `linkedin-capi-setup` - LinkedIn Conversions API setup
- `triple-whale-bridge` - GHL to Triple Whale transformation
- `phased-planning` - Implementation planning
- `phase-0-template` - Project initialization

## License

Apache-2.0

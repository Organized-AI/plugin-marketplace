# Media Buyer Bash

Google Ads campaign management for OpenClaw agents via bash CLI.

## Features

- **List campaigns** with optional name filtering
- **CPA metrics** with configurable date ranges (today, yesterday, 7d, 30d)
- **Performance reports** with formatted summaries
- **Budget management** with dry-run preview
- **Campaign lifecycle** — pause and enable campaigns

## Architecture

This is a pure skill plugin — no MCP servers, no Node dependencies. It teaches your AI agent how to use the `google-ads-cli` bash tool through a comprehensive SKILL.md.

Designed specifically for **OpenClaw agents** that execute commands via the exec/bash tool, but works with any Claude Code setup that has shell access.

## Installation

```bash
claude plugin add Organized-AI/plugin-marketplace media-buyer-bash
```

Then edit `skills/media-buyer-bash/SKILL.md` to add your sub-account customer IDs.

## Requirements

- `google-ads-cli` installed and configured on the target machine
- Google Ads API credentials (developer token, OAuth client, refresh token)
- MCC account with sub-account access

## License

MIT

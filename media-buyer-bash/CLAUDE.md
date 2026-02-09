# Media Buyer Bash — Google Ads CLI Plugin

Manage Google Ads campaigns through natural language via your AI agent. Built for OpenClaw agents that use bash/exec tools.

## Prerequisites

- [google-ads-cli](https://github.com/Organized-AI/google-ads-cli) installed and configured with API credentials
- Node.js 18+
- Google Ads API developer token and OAuth credentials

## Setup

After installing the plugin, edit `skills/media-buyer-bash/SKILL.md` and fill in your sub-account customer IDs in the account table.

## What You Can Do

| Action | Ask your agent |
|--------|---------------|
| List campaigns | "Show me all campaigns" |
| Filter by type | "Show PMAX campaigns" |
| Get CPA | "What's the CPA today?" |
| Weekly report | "Generate a weekly performance report" |
| Change budget | "Set the USA campaign budget to $500" |
| Pause campaign | "Pause the HPN campaign" |
| Enable campaign | "Turn on the airport transfers campaign" |

## How It Works

This plugin contains a single skill that teaches your AI agent how to use the `google-ads-cli` command-line tool. No MCP servers or additional dependencies — just bash commands.

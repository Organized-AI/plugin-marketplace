---
name: gog
description: >
  Google Workspace CLI covering Gmail, Calendar, Drive, Contacts, Sheets, and Docs.
  Use when asked to "check email", "morning rollup", "search Gmail", "calendar events",
  "search Drive", "read spreadsheet", "read Google Doc", or "send email". Built by
  @steipete. Do NOT use for non-Google services or Google Ads operations.
tags: [google, email, calendar, drive, sheets, docs, productivity]
---

# GOG — Google Workspace CLI

## Purpose

Single CLI for 6 Google Workspace products: Gmail, Calendar, Drive, Contacts,
Sheets, Docs. Built by @steipete. Install via Homebrew.

## Commands

| Command | Purpose |
|---------|---------|
| `morning` | Morning rollup: unread inbox + today's calendar |
| `email <query>` | Search Gmail (default: last 7 days) |
| `send <to> <sub> <body>` | Send email (confirms before sending) |
| `calendar [from] [to]` | Upcoming events |
| `drive <query>` | Search Google Drive |
| `sheets <id> [range]` | Get spreadsheet data as JSON |
| `docs <id>` | Read a Google Doc |

## Setup (one-time, ~5 min)

1. Create OAuth 2.0 Desktop App credentials at https://console.cloud.google.com
2. Download `client_secret.json`
3. Run:
   ```bash
   gog auth credentials /path/to/client_secret.json
   gog auth add you@gmail.com --services gmail,calendar,drive,contacts,sheets,docs
   ```
4. Set `GOG_ACCOUNT=you@gmail.com` in `.env` to skip `--account` flag

## Power Combo

**Morning Intel**: `mission-control brief` + `gog morning` + `x-research brief`
gives a fully automated morning briefing covering tasks, calendar, inbox, and
Twitter trends.

## Install

```bash
brew install steipete/tap/gogcli
```

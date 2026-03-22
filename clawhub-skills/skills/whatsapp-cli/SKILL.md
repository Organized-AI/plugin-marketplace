---
name: whatsapp-cli
description: >
  WhatsApp bridge for sending/receiving messages, auto-reply agents, and message
  search. Use when asked to "send WhatsApp", "WhatsApp message", "message on
  WhatsApp", "note to self via WhatsApp", or "search WhatsApp history". 16,400+
  downloads (#2 on ClawHub). Do NOT use for SMS, iMessage, Telegram, or Slack.
tags: [messaging, whatsapp, communication, automation]
---

# WhatsApp CLI — OpenClaw WhatsApp Bridge

## Purpose

Full WhatsApp bridge: send messages, auto-reply with AI, search history,
sync contacts. Connects your OpenClaw agent to WhatsApp.

**16,400+ downloads** — #2 most downloaded on ClawHub.

## Safety

**Safe mode tip**: Most users only enable send-to-self (notes, reminders,
summaries). Enable outbound messaging only when confident in the automation.

The `send` command always confirms before sending.

## Workflow

### First Time Setup
```bash
bash whatsapp-cli.sh install    # Install binary
bash whatsapp-cli.sh pair       # Scan QR code with WhatsApp → Linked Devices
```

### Daily Use
```bash
# Send a note to yourself
bash whatsapp-cli.sh note "Remember to review tracking tomorrow"

# Send to a contact (confirms first)
bash whatsapp-cli.sh send 15121234567 "Meeting notes attached"

# Search message history
bash whatsapp-cli.sh search "invoice"
```

## Commands

| Command | Purpose |
|---------|---------|
| `pair` | Connect WhatsApp via QR code (one-time) |
| `status` | Check bridge connection |
| `send <number> <msg>` | Send message (confirms first) |
| `note <message>` | Send note to yourself |
| `search <query>` | Search message history |
| `start` | Start bridge as background service |
| `logs` | Tail bridge logs |

## Number Format

Country code + number, no `+` prefix: `15551234567`

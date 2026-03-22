---
name: mission-control
description: >
  Daily intelligence dashboard aggregating tasks, calendar, inbox, and action
  items. Use when asked for "morning brief", "daily rundown", "what needs attention",
  "dashboard", "task management", or "chief of staff mode". Provides both CLI
  briefs and a web dashboard. Do NOT use for individual tool queries — use gog
  or x-research directly for those.
tags: [dashboard, productivity, tasks, intelligence, morning]
---

# Mission Control — Daily Intel Dashboard

## Purpose

Aggregates everything your agent needs to brief you: tasks, calendar events,
inbox, action items, pending messages. Agent acts as chief of staff.

Features: real-time web dashboard, agent-to-agent messaging, SLO tracking, alerts.

## Workflow

### Quick CLI Brief (no browser needed)
```bash
bash mission-control.sh brief
```
Outputs: pending tasks, today's calendar, unread inbox, action items.

### Full Web Dashboard
```bash
bash mission-control.sh start
```
Launches on port 3000 with live metrics, A2A messaging, task execution,
document management, and Tailscale remote access.

## Commands

| Command | Purpose |
|---------|---------|
| `brief` | CLI morning brief (tasks + calendar + inbox) |
| `start` | Launch web dashboard on port 3000 |
| `task <title> [priority]` | Add task (low/medium/high) |
| `status` | Check dashboard + gateway health |

## Power Trio

For a fully automated morning briefing, install all three:

```
Mission Control (tasks + aggregation)
  + GOG (Gmail + Calendar)
  + X Research (Twitter trends)
  = Complete morning intelligence
```

## ENV Vars

| Variable | Default | Purpose |
|----------|---------|---------|
| `MISSION_CONTROL_DIR` | `~/.openclaw/workspace-mission-control` | Install path |
| `MISSION_CONTROL_PORT` | `3000` | Dashboard port |
| `OPENCLAW_GATEWAY_URL` | `http://localhost:3001` | Gateway connection |

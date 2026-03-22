---
name: bite-rover
description: >
  Persistent memory across agent sessions using ByteRover context trees.
  Use when asked to "remember this", "save context", "persistent memory",
  "context across sessions", "what did we do last time", or "load project context".
  16,000+ downloads (#3 on ClawHub). Do NOT use for in-session note-taking or
  general file storage.
tags: [memory, context, persistence, sessions]
---

# BiteRover — Persistent Memory Across Sessions

## Purpose

Creates a structured context tree (`.brv/context-tree/`) so your agent never
re-reads the same files across sessions. Query retrieves relevant context;
curate saves new patterns and decisions.

No authentication needed for local ops. Cloud sync requires login.

## Workflow

Follow this pattern every session:

### Before Work
```bash
brv query "How is auth implemented?"
brv query "What decisions were made about the database schema?"
```

### After Implementing
```bash
brv curate "JWT tokens stored in httpOnly cookies, 24h expiry"
brv curate "Auth details" -f src/middleware/auth.ts -f src/routes/auth.ts
```

## Commands

| Command | Purpose |
|---------|---------|
| `query <question>` | Retrieve relevant context from knowledge tree |
| `curate <observation> [files]` | Save observation (max 5 files) |
| `push` | Sync to cloud (requires login) |
| `pull` | Fetch from cloud (requires login) |
| `status` | Show tree size and recent entries |

## Integration Pattern

Add to CLAUDE.md or project instructions:
```
Before starting work, query BiteRover for relevant context.
After completing significant changes, curate the key decisions.
```

This creates a flywheel: the more you curate, the better queries become.

## Install

```bash
npm install -g byterover-cli
```

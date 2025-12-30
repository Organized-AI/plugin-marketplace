---
description: Initialize tracking infrastructure for a new client or domain
argument-hint: <domain-name>
allowed-tools: Bash(bash:*), stape-mcp-server:*, google-tag-manager-mcp-server:*
---

# Setup Tracking Command

Initialize complete tracking infrastructure for domain: $ARGUMENTS

## Workflow

1. **Invoke @tracking-infra** for implementation
2. Create Stape sGTM container
3. Configure domain with SSL
4. Set up Cookie Keeper
5. Configure GTM tags and triggers
6. Validate setup

## Steps

### Step 1: Create Container
```
stape_container_crud(action="create", name="$ARGUMENTS", zone={type: "us"})
```

### Step 2: Add Domain
```
stape_container_domains(action="create", name="$ARGUMENTS", container=<id>)
```

### Step 3: Configure Power-Ups
- Enable Cookie Keeper (GA, Meta, Google Ads)
- Enable Geo Headers
- Configure anonymizer if needed

### Step 4: GTM Setup
- Create GA4 tag
- Create Meta Pixel tag  
- Create Google Ads conversion tag
- Set up common triggers

## Claude Code Execution
```bash
claude --dangerously-skip-permissions "Set up tracking infrastructure for $ARGUMENTS using @tracking-infra"
```

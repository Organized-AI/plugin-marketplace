---
description: Synchronize data between GoHighLevel, TripleWhale, and ad platforms
argument-hint: <location-id>
allowed-tools: Bash(bash:*), Pipeboard Meta:*
---

# Sync Data Command

Synchronize CRM and attribution data for location: $ARGUMENTS

## Workflow

1. **Invoke @data-sync** for orchestration
2. Export GHL contacts and opportunities
3. Match to ad platform conversions
4. Identify attribution gaps
5. Push offline conversions if needed
6. Generate reconciliation report

## Steps

### Step 1: Export GHL Data
```bash
cd ghl-cli
npm run dev contacts list --location-id $ARGUMENTS --export contacts.json
npm run dev opportunities list --location-id $ARGUMENTS --status won --export won_deals.json
```

### Step 2: Pull Ad Data
```
bulk_get_insights(level="campaign", time_range="last_30d")
```

### Step 3: Match Records
- Match by email hash
- Match by phone hash
- Calculate match rate

### Step 4: Generate Report
- Total CRM conversions
- Matched to Meta
- Matched to Google
- Unmatched (attribution gap)

## Claude Code Execution
```bash
claude --dangerously-skip-permissions "Sync CRM data for location $ARGUMENTS using @data-sync"
```

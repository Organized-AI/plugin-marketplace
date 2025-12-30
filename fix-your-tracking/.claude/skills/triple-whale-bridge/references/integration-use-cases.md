# Integration Use Cases: CLI vs Webhook

Choose the right tool for your GHL to Triple Whale integration needs.

## Decision Matrix

| Your Situation | Recommended | Reason |
|----------------|-------------|--------|
| Historical data import | CLI (ghl-tw-sync) | Batch processing, date filters |
| Real-time attribution | Webhook (triple_whale_bridge) | Instant events on stage changes |
| Initial TW setup | CLI | Backfill existing customers |
| Multi-stage funnel tracking | Webhook | Pipeline stage mappings |
| Daily/weekly sync | CLI | Cron-based scheduling |
| Event-driven workflows | Webhook | Automatic on GHL triggers |
| Testing/development | CLI | Dry-run mode, easy testing |
| High event volume | Webhook | Async processing |
| Limited infrastructure | CLI | No server needed |
| Low-code preference | Webhook | YAML configuration |

## Architecture Comparison

### CLI (Pull-Based)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ GHL CSV      │     │ ghl-tw-sync  │     │ TripleWhale  │
│ Export       │────►│ CLI Tool     │────►│ /orders API  │
│              │     │              │────►│ /event API   │
└──────────────┘     └──────────────┘     └──────────────┘
                           │
                    Manual / Cron / CSV
```

**Characteristics:**
- On-demand execution
- Batch processing
- Full control over timing
- Supports historical data
- No infrastructure needed

### Webhook (Push-Based)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ GoHighLevel  │     │ TW Bridge    │     │ TripleWhale  │
│ Workflow     │────►│ Server       │────►│ /event API   │
│ (Webhooks)   │     │ (FastAPI)    │────►│ /orders API  │
└──────────────┘     └──────────────┘     └──────────────┘
                     Always-on Server
```

**Characteristics:**
- Automatic, event-driven
- Real-time processing
- Requires server infrastructure
- Only captures new events
- Continuous operation

## Use Case Deep Dives

### 1. Historical Data Migration

**Scenario:** Backfill Triple Whale with 12 months of customer data

**Tool:** CLI with CSV Import

```bash
# Export from GHL → CSV file
# Then import to Triple Whale

ghl-tw-sync import-csv "export.csv" "shop.com" \
  --filter-tags "_customer (rtt any)" "_customer (rtc any)" \
  --send-events \
  --auto-currency \
  --batch-size 50 \
  --delay 3000
```

**Why CLI:**
- Can process thousands of records
- Tag-based filtering
- Revenue extraction from tags
- Dry-run mode for testing

### 2. Real-time Pipeline Tracking

**Scenario:** Track leads through MQL → SQL → Demo → Won

**Tool:** Webhook Service

```yaml
# pipeline_mappings.yaml
pipelines:
  "Main Sales Pipeline":
    stages:
      "Qualified":
        event_type: "mql"
        value_multiplier: 0.10
      "Demo Scheduled":
        event_type: "book_demo"
        value_multiplier: 0.20
      "Proposal Sent":
        event_type: "opportunity"
        value_multiplier: 0.50
      "Closed Won":
        event_type: "custom"
        value_multiplier: 1.0
        send_order: true
```

**Why Webhook:**
- Real-time stage change detection
- Automatic event routing
- No manual intervention
- Configurable via YAML

### 3. Daily Customer Sync

**Scenario:** Sync new customers every night at 2 AM

**Tool:** CLI with Cron

```bash
# Cron entry
0 2 * * * cd /path/to/ghl-tw-sync && \
  npm start -- sync <location> <shop> \
    --tags "_customer" \
    --days 1 \
    >> /var/log/ghl-sync.log 2>&1
```

**Why CLI:**
- Scheduled execution
- Catches any missed webhooks
- Low infrastructure cost
- Easy to monitor via logs

### 4. Initial Triple Whale Setup

**Scenario:** First-time TW integration, need all historical data

**Tool:** CLI (two-phase approach)

```bash
# Phase 1: Import all historical customers
ghl-tw-sync import-csv "all_contacts.csv" "shop.com" \
  --filter-tags "_customer (rtt any)" "_customer (rtc any)" \
  --auto-currency

# Phase 2: Set up webhook for real-time going forward
# Deploy triple_whale_bridge service
docker-compose up -d
```

### 5. Hybrid Approach (Recommended for Production)

**Scenario:** Need both historical accuracy and real-time tracking

**Setup:**

```bash
# 1. Initial historical import (CLI)
ghl-tw-sync import-csv "contacts.csv" "shop.com" \
  --filter-tags "_customer" \
  --send-events \
  --auto-currency

# 2. Deploy webhook service for real-time
docker-compose up -d

# 3. Weekly backup sync (catches any missed events)
0 2 * * 0 ghl-tw-sync sync <location> <shop> --tags "_customer" --days 7
```

**Why Hybrid:**
- Historical data is complete
- Real-time events are immediate
- Weekly sync catches edge cases
- Best of both worlds

## Performance Comparison

| Metric | CLI | Webhook |
|--------|-----|---------|
| Latency | Minutes (batch) | Seconds (real-time) |
| Throughput | 1000+ per run | 1000/min (TW limit) |
| Processing | 5-10s per 100 | <1s per event |
| Attribution delay | ~5-20min (TW) | ~5min (TW) |

## Cost Comparison

| Component | CLI | Webhook |
|-----------|-----|---------|
| Server | $0 (local/cron) | $5-50/month |
| Storage | $0 (stateless) | Logs only |
| Bandwidth | Burst during sync | Continuous low |
| **Total** | **$0-5/month** | **$5-85/month** |

## API Endpoints Used

### CLI Tools

| Command | Endpoint | Rate Limit |
|---------|----------|------------|
| `import-csv` | `/data-in/orders` | 25,000/min |
| `import-csv --send-events` | `/data-in/event` | 1,000/min |
| `sync` | `/data-in/orders` | 25,000/min |

### Webhook Service

| Event Type | Endpoint | Rate Limit |
|------------|----------|------------|
| Pipeline stage change | `/data-in/event` | 1,000/min |
| Closed Won | `/data-in/orders` | 25,000/min |

## Error Handling

### CLI

- `--dry-run` for testing
- Clear console errors
- Manual re-run on failure
- No persistent error logging

### Webhook

- Automatic retry with backoff
- Health check endpoint
- Server logs
- Optional dead-letter queue

## Choosing Your Approach

### Start with CLI if:
- You're new to Triple Whale
- You have historical data to import
- You want minimal infrastructure
- You prefer scheduled syncs
- You need easy testing (dry-run)

### Add Webhook when:
- You need real-time attribution
- You track pipeline stages
- You have server infrastructure
- You need automatic workflows
- You process high event volumes

### Use Both when:
- You need historical + real-time
- You want redundancy
- You're running production e-commerce
- You need audit trail (weekly resync)

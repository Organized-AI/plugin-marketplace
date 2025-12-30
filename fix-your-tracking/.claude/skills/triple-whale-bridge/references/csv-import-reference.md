# CSV Import Reference

Import historical GHL contact data from CSV exports into Triple Whale.

## Overview

When you need to backfill Triple Whale with historical CRM data, use the CSV import command rather than real-time webhooks. This is useful for:

- Initial Triple Whale setup with existing customer base
- Recovering from data gaps
- Batch importing closed deals for attribution

## CSV Format

GHL CSV exports use this structure:

| Column | Description |
|--------|-------------|
| Contact Id | Unique GHL contact identifier |
| First Name | Contact first name |
| Last Name | Contact last name |
| Name | Full name |
| Phone | Phone number (various formats) |
| Email | Email address |
| Created | ISO 8601 creation timestamp |
| Last Activity | Last activity timestamp |
| Tags | Comma-separated tags string |

**Example row:**
```csv
Contact Id,First Name,Last Name,Name,Phone,Email,Created,Last Activity,Tags
DPSJbZBmUDYq50sF7fwE,Emma,Dallimore,Emma Dallimore,+447966097999,emma@example.com,2025-11-14T14:30:58.000Z,2025-11-20T10:00:00.000Z,"_customer (rtt integrated), 70. product purchase: foundation £49, transformation webinar"
```

## CLI Usage

### Basic Import

```bash
ghl-tw-sync import-csv <csv-file> <shop>
```

### Full Options

```bash
ghl-tw-sync import-csv "contacts.csv" "yourshop.com" \
  --platform gohighlevel \
  --currency USD \
  --revenue 0 \
  --batch-size 100 \
  --delay 1000 \
  --limit 10 \
  --filter-tags "_customer (rtt any)" "_customer (rtc any)" \
  --send-events \
  --auto-currency \
  --dry-run
```

### Options Reference

| Option | Default | Description |
|--------|---------|-------------|
| `--platform <platform>` | `gohighlevel` | Platform identifier |
| `--currency <currency>` | `USD` | Default currency |
| `--revenue <amount>` | `0` | Default revenue if not in tags |
| `--batch-size <size>` | `100` | Records per batch |
| `--delay <ms>` | `1000` | Delay between batches |
| `--limit <number>` | None | Limit records (for testing) |
| `--filter-tags <tags...>` | None | Only sync matching tags |
| `--send-events` | `false` | Also send to /data-in/event |
| `--auto-currency` | `false` | Detect currency from tags |
| `--dry-run` | `false` | Preview without pushing |

## Endpoints Used

### /data-in/orders (25,000/min)

Used for all customers. Creates order records for revenue attribution.

```json
{
  "customer": {
    "id": "DPSJbZBmUDYq50sF7fwE",
    "email": "emma@example.com",
    "phone": "+447966097999",
    "first_name": "Emma",
    "last_name": "Dallimore"
  },
  "shop": "yourshop.com",
  "order_id": "ghl_DPSJbZBmUDYq50sF7fwE",
  "platform": "gohighlevel",
  "created_at": "2025-11-14T14:30:58.000Z",
  "currency": "GBP",
  "order_revenue": 49
}
```

### /data-in/event (1,000/min)

Used when `--send-events` flag is set. Creates funnel attribution events.

```json
{
  "type": "custom",
  "email": "emma@example.com",
  "phone": "+447966097999",
  "timestamp": "2025-11-14T14:30:58.000Z",
  "properties": {
    "event_name": "closed_won",
    "value": 49,
    "currency": "GBP",
    "pipeline_stage": "custom",
    "source": "transformation_webinar",
    "ghl_contact_id": "DPSJbZBmUDYq50sF7fwE"
  }
}
```

## Transformation Flow

```
CSV Row
    ↓
Parse Tags → ParsedTagData
    ↓
    ├─→ isCustomer? → contactToOrderEnhanced() → /data-in/orders
    │
    └─→ --send-events? → contactToEvent() → /data-in/event
```

## Tag-Based Data Extraction

The importer extracts rich data from GHL tags:

### Customer Detection
```
_customer (rtt any) → isCustomer: true, customerType: 'rtt any'
```

### Revenue Extraction
```
70. product purchase: foundation £49 → totalRevenue: 49, currency: 'GBP'
```

### Funnel Stage Detection
```
profile: completed application form - qualified → funnelStage: 'mql'
agreement signed → agreementSigned: true, funnelStage: 'custom'
```

### Source Attribution
```
transformation webinar → source: 'transformation_webinar'
```

## Example Workflow

### 1. Test with dry-run and limit

```bash
ghl-tw-sync import-csv "Export_Contacts.csv" "myshop.com" \
  --filter-tags "_customer (rtt any)" "_customer (rtc any)" \
  --send-events \
  --auto-currency \
  --dry-run \
  --limit 5
```

**Output:**
```
✔ Found 18568 contacts in CSV
✔ Filtered 18568 → 18566 contacts by tags
Limiting to 5 contacts for testing
✔ Converted 5 contacts with tag data
  Customers: 5 | With Revenue: 2 | Total Revenue: 196.00

💰 Revenue Extracted:
  USD: $196.00

⚠️  DRY RUN - No data was pushed to TripleWhale
```

### 2. Run full import

```bash
ghl-tw-sync import-csv "Export_Contacts.csv" "myshop.com" \
  --filter-tags "_customer (rtt any)" "_customer (rtc any)" \
  --send-events \
  --auto-currency \
  --batch-size 50 \
  --delay 3000
```

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| `CSV file not found` | Invalid path | Use absolute path |
| `GHL_API_KEY not found` | Missing env var | Set in `.env` |
| `TW_API_KEY not found` | Missing env var | Set in `.env` |
| `Rate limited (429)` | Too many requests | Increase `--delay` |

## Environment Variables

```bash
# Required
TW_API_KEY=your_triple_whale_api_key
GHL_API_KEY=your_ghl_api_key

# Optional
TW_API_BASE_URL=https://api.triplewhale.com
GHL_API_BASE_URL=https://rest.gohighlevel.com
```

## Best Practices

1. **Always test with `--dry-run` first** - Preview transformations before pushing
2. **Use `--limit` for initial testing** - Start with 5-10 records
3. **Filter by customer tags** - Don't import non-customers as orders
4. **Use `--auto-currency`** - Let tags determine currency automatically
5. **Batch appropriately** - Stay under rate limits (1k/min for events, 25k/min for orders)

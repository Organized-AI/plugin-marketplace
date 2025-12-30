# Triple Whale Bridge

> Transform GoHighLevel CRM webhook data into Triple Whale attribution events for full-funnel marketing analytics.

## Quick Start

```
"Transform this GHL webhook for Triple Whale: [paste payload]"
```

## What It Does

- **Transforms GHL Webhooks** — Converts GoHighLevel pipeline/opportunity webhooks to Triple Whale event format
- **Maps Pipeline Stages** — Automatically maps CRM stages to attribution events (lead → mql → sql → opportunity)
- **Normalizes Data** — Handles phone (E.164), email, and monetary value formatting
- **Calculates Attribution** — Weighted value attribution based on pipeline stage progression

## Features

### Payload Transformation

| GHL Event | Triple Whale Event | Use Case |
|-----------|-------------------|----------|
| New Lead | `lead` | Initial capture |
| Qualified | `mql` | Marketing qualified |
| Sales Qualified | `sql` | Sales qualified |
| Demo Scheduled | `book_demo` | Meeting booked |
| Proposal Sent | `opportunity` | Active deal |
| Closed Won | `custom` | Revenue event |

### Supported Endpoints

| Endpoint | Rate Limit | Use Case |
|----------|------------|----------|
| `/data-in/event` | 1,000/min | CRM attribution events |
| `/data-in/orders` | 25,000/min | Closed-won as orders |

### Data Normalization

- Phone numbers → E.164 format (`+15551234567`)
- Emails → lowercase, trimmed
- Monetary values → parsed from strings (`"$10,000"` → `10000`)

## Example

**Input (GHL Webhook):**
```json
{
  "email": "john@example.com",
  "phone": "(555) 123-4567",
  "pipelineName": "Main Sales Pipeline",
  "pipelineStage": "Qualified",
  "leadValue": 10000,
  "opportunityName": "Enterprise Deal"
}
```

**Output (Triple Whale Event):**
```json
{
  "type": "mql",
  "email": "john@example.com",
  "phone": "+15551234567",
  "properties": {
    "pipeline_name": "Main Sales Pipeline",
    "pipeline_stage": "Qualified",
    "lead_value": 10000,
    "value": 1000,
    "opportunity_name": "Enterprise Deal"
  }
}
```

## Integration

This skill works with the `triple_whale_bridge` service in this repository:

```
GHL Webhook → triple_whale_bridge → Triple Whale API
```

### Related Components

- **`triple_whale_bridge/`** — FastAPI webhook server
- **`docs/triple_whale/`** — API documentation
- **`config/pipeline_mappings.yaml`** — Stage mapping configuration

## Documentation

Full implementation details in [SKILL.md](./SKILL.md)

### References

- `references/ghl-webhook-fields.md` — Complete GHL field reference
- `references/triple-whale-api-reference.md` — Triple Whale API docs
- `references/pipeline-stage-mappings.md` — Stage mapping guide
- `references/transformation-code.md` — Python/JS code examples

### Assets

- `assets/ghl-webhook-template.md` — GHL payload templates
- `assets/triple-whale-payload-templates.md` — Triple Whale payload templates

---

**Maintainer:** Organized-AI | **License:** Apache 2.0

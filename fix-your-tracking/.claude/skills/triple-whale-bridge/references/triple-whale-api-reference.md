# Triple Whale API Reference

Complete API reference for Triple Whale Data-In endpoints.

## Base URL

```
https://api.triplewhale.com/api/v2
```

## Authentication

All requests require the `x-api-key` header:

```http
x-api-key: YOUR_TRIPLE_WHALE_API_KEY
Content-Type: application/json
```

### API Key Scopes

| Scope | Required For |
|-------|--------------|
| `Orders: Write` | `/data-in/orders`, `/data-in/event` |
| `Products: Write` | `/data-in/products` |
| `Subscriptions: Write` | `/data-in/subscriptions` |
| `Ads: Write` | `/data-in/ads` |
| `PPS: Write` | `/data-in/pps` (Post-Purchase Surveys) |

### Validate API Key

```http
GET /users/api-keys/me
```

Response:
```json
{
  "valid": true,
  "scopes": ["orders:write"],
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

## Events Endpoint

### POST /data-in/event

Send offline attribution events (leads, MQLs, SQLs, opportunities, custom conversions).

**Rate Limit:** 1,000 events/minute
**Max Payload:** 3 KB

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Event type (see below) |
| `email` | string | Conditional | Customer email (required if no phone) |
| `phone` | string | Conditional | Customer phone E.164 (required if no email) |
| `timestamp` | string | No | ISO 8601 timestamp (defaults to now) |
| `properties` | object | No | Custom event properties |

#### Event Types

| Type | Use Case |
|------|----------|
| `lead` | Initial lead capture, form submission |
| `mql` | Marketing Qualified Lead |
| `sql` | Sales Qualified Lead |
| `book_demo` | Demo or meeting scheduled |
| `opportunity` | Active deal/proposal stage |
| `custom` | Any custom conversion event |

#### Properties Object

| Property | Type | Description |
|----------|------|-------------|
| `event_name` | string | Custom event name (for type=custom) |
| `value` | number | Conversion value |
| `currency` | string | Currency code (default: USD) |
| `pipeline_name` | string | CRM pipeline name |
| `pipeline_stage` | string | Current stage |
| `opportunity_name` | string | Deal/opportunity name |
| `opportunity_id` | string | Deal identifier |
| `lead_value` | number | Lead/deal value |
| `source` | string | Attribution source |
| `campaign` | string | Campaign name |
| `medium` | string | Marketing medium |
| `company_name` | string | Company name |
| `assigned_to` | string | Sales rep ID |
| `days_in_pipeline` | number | Days since opportunity created |
| `ghl_contact_id` | string | GoHighLevel contact ID |
| `ghl_opportunity_id` | string | GoHighLevel opportunity ID |

#### Example Request

```bash
curl -X POST https://api.triplewhale.com/api/v2/data-in/event \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "mql",
    "email": "customer@example.com",
    "phone": "+15551234567",
    "timestamp": "2024-01-15T14:30:00Z",
    "properties": {
      "pipeline_name": "Main Sales Pipeline",
      "pipeline_stage": "Qualified",
      "lead_value": 10000,
      "source": "google_ads"
    }
  }'
```

#### Success Response

```json
{
  "status": "success",
  "message": "Event received"
}
```

---

## Orders Endpoint

### POST /data-in/orders

Send order/transaction data for custom sales platforms.

**Rate Limit:** 25,000 requests/minute

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `shop` | string | Yes | Store domain |
| `order_id` | string | Yes | Unique order identifier |
| `created_at` | string | Yes | Order creation timestamp (ISO 8601) |
| `updated_at` | string | No | Last update timestamp |
| `platform` | string | Yes | Platform identifier (use "CUSTOM") |
| `platform_account_id` | string | No | Account identifier |
| `customer` | object | Yes | Customer information |
| `line_items` | array | Yes | Array of line items |
| `total_price` | number | Yes | Total order amount |
| `subtotal_price` | number | No | Subtotal before tax/discounts |
| `total_tax` | number | No | Tax amount |
| `total_discounts` | number | No | Discount amount |
| `currency` | string | No | Currency code (default: USD) |
| `tags` | array | No | Order tags |
| `source_name` | string | No | Order source |
| `note` | string | No | Order notes |

#### Customer Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Conditional | Customer email |
| `phone` | string | Conditional | Customer phone |
| `first_name` | string | No | First name |
| `last_name` | string | No | Last name |

#### Line Item Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `product_id` | string | Yes | Product identifier |
| `variant_id` | string | No | Variant identifier |
| `title` | string | No | Product title |
| `quantity` | number | Yes | Quantity |
| `price` | number | Yes | Unit price |

#### Example Request

```bash
curl -X POST https://api.triplewhale.com/api/v2/data-in/orders \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "shop": "yourcompany.com",
    "order_id": "GHL-123456",
    "created_at": "2024-01-15T09:00:00Z",
    "platform": "CUSTOM",
    "customer": {
      "email": "customer@example.com",
      "phone": "+15551234567",
      "first_name": "John",
      "last_name": "Doe"
    },
    "line_items": [
      {
        "product_id": "enterprise_plan",
        "title": "Enterprise Annual License",
        "quantity": 1,
        "price": 25000
      }
    ],
    "total_price": 25000,
    "currency": "USD",
    "source_name": "gohighlevel"
  }'
```

---

## Error Responses

| HTTP Code | Meaning | Resolution |
|-----------|---------|------------|
| 200 | Success | Event/order accepted |
| 400 | Bad Request | Check payload format |
| 401 | Unauthorized | Invalid API key |
| 403 | Forbidden | API key lacks required scope |
| 422 | Validation Error | Missing required fields |
| 429 | Rate Limited | Wait and retry with backoff |
| 500 | Server Error | Retry with exponential backoff |
| 502 | Bad Gateway | Retry with exponential backoff |
| 503 | Service Unavailable | Retry with exponential backoff |

### Error Response Format

```json
{
  "error": "Validation error",
  "message": "email or phone is required",
  "code": "MISSING_IDENTIFIER"
}
```

---

## Rate Limiting

### Limits

| Endpoint | Limit |
|----------|-------|
| `/data-in/event` | 1,000 events/minute |
| `/data-in/orders` | 25,000 requests/minute |
| `/data-in/products` | 25,000 requests/minute |
| `/data-in/subscriptions` | 25,000 requests/minute |

### Retry Strategy

Use exponential backoff on 429 or 5xx errors:

```
Attempt 1: Wait 2 seconds
Attempt 2: Wait 4 seconds
Attempt 3: Wait 8 seconds
Attempt 4: Wait 16 seconds (max)
```

---

## Processing Times

| Data Age | Processing Time |
|----------|-----------------|
| Past 2 days | ~5 minutes |
| Older data | Up to 20 minutes |

---

## Data Querying

Query your data via Triple Whale SQL Editor:

### Events Table
```sql
SELECT * FROM custom_pixel_events_table
WHERE event_date >= today() - 7
ORDER BY event_timestamp DESC
LIMIT 100;
```

### Orders Table
```sql
SELECT * FROM orders_table
WHERE created_at >= now() - interval 7 day
ORDER BY created_at DESC
LIMIT 100;
```

# Triple Whale API Payload Templates

Ready-to-use payload templates for Triple Whale Data-In API endpoints.

## Event Endpoint Templates

### Lead Event
```json
{
  "type": "lead",
  "email": "customer@example.com",
  "phone": "+15551234567",
  "timestamp": "2024-01-15T09:00:00Z",
  "properties": {
    "source": "google_ads",
    "campaign": "q1_acquisition",
    "medium": "paid_search",
    "ghl_contact_id": "contact_xyz789",
    "company_name": "Acme Corp"
  }
}
```

### MQL Event (Marketing Qualified Lead)
```json
{
  "type": "mql",
  "email": "customer@example.com",
  "phone": "+15551234567",
  "timestamp": "2024-01-18T14:30:00Z",
  "properties": {
    "pipeline_name": "Main Sales Pipeline",
    "pipeline_stage": "Qualified",
    "opportunity_name": "Enterprise Deal",
    "opportunity_id": "opp_123456",
    "lead_value": 25000,
    "value": 2500,
    "currency": "USD",
    "source": "google_ads",
    "ghl_contact_id": "contact_xyz789",
    "ghl_opportunity_id": "opp_123456",
    "company_name": "Acme Corp",
    "days_in_pipeline": 3
  }
}
```

### SQL Event (Sales Qualified Lead)
```json
{
  "type": "sql",
  "email": "customer@example.com",
  "phone": "+15551234567",
  "timestamp": "2024-01-22T11:00:00Z",
  "properties": {
    "pipeline_name": "Main Sales Pipeline",
    "pipeline_stage": "Sales Qualified",
    "opportunity_name": "Enterprise Deal",
    "opportunity_id": "opp_123456",
    "lead_value": 25000,
    "value": 6250,
    "currency": "USD",
    "source": "google_ads",
    "ghl_contact_id": "contact_xyz789",
    "assigned_to": "sales_rep_001",
    "company_name": "Acme Corp",
    "days_in_pipeline": 7
  }
}
```

### Book Demo Event
```json
{
  "type": "book_demo",
  "email": "customer@example.com",
  "phone": "+15551234567",
  "timestamp": "2024-01-20T10:00:00Z",
  "properties": {
    "pipeline_name": "Main Sales Pipeline",
    "pipeline_stage": "Demo Scheduled",
    "opportunity_name": "Enterprise Deal",
    "opportunity_id": "opp_123456",
    "lead_value": 25000,
    "value": 5000,
    "currency": "USD",
    "source": "google_ads",
    "ghl_contact_id": "contact_xyz789",
    "company_name": "Acme Corp",
    "days_in_pipeline": 5
  }
}
```

### Opportunity Event
```json
{
  "type": "opportunity",
  "email": "customer@example.com",
  "phone": "+15551234567",
  "timestamp": "2024-01-25T15:00:00Z",
  "properties": {
    "pipeline_name": "Main Sales Pipeline",
    "pipeline_stage": "Proposal Sent",
    "opportunity_name": "Enterprise Deal",
    "opportunity_id": "opp_123456",
    "lead_value": 25000,
    "value": 12500,
    "currency": "USD",
    "source": "google_ads",
    "ghl_contact_id": "contact_xyz789",
    "assigned_to": "sales_rep_001",
    "company_name": "Acme Corp",
    "days_in_pipeline": 10
  }
}
```

### Custom Event - Closed Won
```json
{
  "type": "custom",
  "email": "customer@example.com",
  "phone": "+15551234567",
  "timestamp": "2024-02-01T16:00:00Z",
  "properties": {
    "event_name": "closed_won",
    "pipeline_name": "Main Sales Pipeline",
    "pipeline_stage": "Closed Won",
    "opportunity_name": "Enterprise Deal",
    "opportunity_id": "opp_123456",
    "lead_value": 25000,
    "value": 25000,
    "currency": "USD",
    "source": "google_ads",
    "ghl_contact_id": "contact_xyz789",
    "ghl_opportunity_id": "opp_123456",
    "assigned_to": "sales_rep_001",
    "company_name": "Acme Corp",
    "days_in_pipeline": 17
  }
}
```

### Custom Event - Closed Lost
```json
{
  "type": "custom",
  "email": "customer@example.com",
  "timestamp": "2024-02-01T16:00:00Z",
  "properties": {
    "event_name": "closed_lost",
    "pipeline_name": "Main Sales Pipeline",
    "pipeline_stage": "Closed Lost",
    "opportunity_name": "Lost Deal",
    "opportunity_id": "opp_789012",
    "lead_value": 15000,
    "value": 0,
    "currency": "USD",
    "lost_reason": "budget",
    "days_in_pipeline": 21
  }
}
```

---

## Orders Endpoint Template

Use for closed-won deals to track as revenue/orders:

```json
{
  "shop": "yourcompany.com",
  "order_id": "GHL-opp_123456",
  "created_at": "2024-01-15T09:00:00Z",
  "updated_at": "2024-02-01T16:00:00Z",
  "platform": "CUSTOM",
  "platform_account_id": "loc_abc123",
  "customer": {
    "email": "customer@example.com",
    "phone": "+15551234567",
    "first_name": "John",
    "last_name": "Doe"
  },
  "line_items": [
    {
      "product_id": "pipe_main",
      "variant_id": "enterprise_annual",
      "title": "Enterprise Annual License",
      "quantity": 1,
      "price": 25000
    }
  ],
  "total_price": 25000,
  "subtotal_price": 25000,
  "total_tax": 0,
  "total_discounts": 0,
  "currency": "USD",
  "tags": ["enterprise", "annual", "inbound"],
  "source_name": "gohighlevel",
  "note": "Closed via Main Sales Pipeline"
}
```

---

## cURL Examples

### Send Lead Event
```bash
curl -X POST https://api.triplewhale.com/api/v2/data-in/event \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "lead",
    "email": "customer@example.com",
    "properties": {
      "source": "facebook_ads"
    }
  }'
```

### Send MQL Event
```bash
curl -X POST https://api.triplewhale.com/api/v2/data-in/event \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "mql",
    "email": "customer@example.com",
    "properties": {
      "pipeline_stage": "Qualified",
      "lead_value": 10000
    }
  }'
```

### Send Order
```bash
curl -X POST https://api.triplewhale.com/api/v2/data-in/orders \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "shop": "yourcompany.com",
    "order_id": "GHL-123",
    "created_at": "2024-01-15T09:00:00Z",
    "platform": "CUSTOM",
    "customer": {"email": "customer@example.com"},
    "line_items": [{"product_id": "service", "quantity": 1, "price": 5000}],
    "total_price": 5000,
    "currency": "USD"
  }'
```

### Validate API Key
```bash
curl https://api.triplewhale.com/api/v2/users/api-keys/me \
  -H "x-api-key: YOUR_API_KEY"
```

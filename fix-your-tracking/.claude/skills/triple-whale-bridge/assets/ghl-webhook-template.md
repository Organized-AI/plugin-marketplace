# GoHighLevel Webhook Payload Template

Use this template when configuring GoHighLevel workflow webhooks or simulating webhook data.

## Complete GHL Opportunity Webhook Payload

```json
{
  "type": "OpportunityStageUpdate",
  "locationId": "{{location_id}}",
  "workflowId": "{{workflow_id}}",
  "workflowName": "Triple Whale Attribution Sync",

  "contactId": "{{contact_id}}",
  "email": "{{contact_email}}",
  "phone": "{{contact_phone}}",
  "firstName": "{{first_name}}",
  "lastName": "{{last_name}}",
  "fullName": "{{full_name}}",
  "companyName": "{{company_name}}",
  "tags": ["{{tag_1}}", "{{tag_2}}"],
  "source": "{{lead_source}}",
  "attributionSource": "{{attribution_source}}",

  "opportunityId": "{{opportunity_id}}",
  "opportunityName": "{{opportunity_name}}",
  "pipelineId": "{{pipeline_id}}",
  "pipelineName": "{{pipeline_name}}",
  "pipelineStage": "{{pipeline_stage}}",
  "pipelineStageId": "{{stage_id}}",
  "status": "open",
  "leadValue": {{lead_value}},
  "monetaryValue": {{monetary_value}},
  "assignedTo": "{{assigned_user_id}}",

  "dateAdded": "{{date_added_iso}}",
  "dateUpdated": "{{date_updated_iso}}",

  "customFields": [
    {"key": "utm_source", "value": "{{utm_source}}"},
    {"key": "utm_medium", "value": "{{utm_medium}}"},
    {"key": "utm_campaign", "value": "{{utm_campaign}}"}
  ]
}
```

## GHL Contact Webhook Payload

```json
{
  "type": "ContactCreate",
  "locationId": "{{location_id}}",

  "contactId": "{{contact_id}}",
  "email": "{{contact_email}}",
  "phone": "{{contact_phone}}",
  "firstName": "{{first_name}}",
  "lastName": "{{last_name}}",
  "companyName": "{{company_name}}",
  "tags": ["{{tag_1}}"],
  "source": "{{lead_source}}",
  "attributionSource": "{{attribution_source}}",

  "dateAdded": "{{date_added_iso}}"
}
```

## Sample Test Payloads

### New Lead

```json
{
  "type": "OpportunityStageUpdate",
  "locationId": "loc_abc123",
  "contactId": "contact_xyz789",
  "email": "john.doe@example.com",
  "phone": "+15551234567",
  "firstName": "John",
  "lastName": "Doe",
  "companyName": "Acme Corporation",
  "tags": ["inbound", "enterprise"],
  "source": "website",
  "attributionSource": "google_ads",
  "opportunityId": "opp_123456",
  "opportunityName": "Acme - Enterprise License",
  "pipelineId": "pipe_main",
  "pipelineName": "Main Sales Pipeline",
  "pipelineStage": "New Lead",
  "status": "open",
  "leadValue": 25000,
  "monetaryValue": 25000,
  "assignedTo": "user_sales01",
  "dateAdded": "2024-01-15T09:00:00Z",
  "dateUpdated": "2024-01-15T09:00:00Z"
}
```

### Qualified Lead (MQL)

```json
{
  "type": "OpportunityStageUpdate",
  "locationId": "loc_abc123",
  "contactId": "contact_xyz789",
  "email": "john.doe@example.com",
  "phone": "+15551234567",
  "firstName": "John",
  "lastName": "Doe",
  "companyName": "Acme Corporation",
  "opportunityId": "opp_123456",
  "opportunityName": "Acme - Enterprise License",
  "pipelineName": "Main Sales Pipeline",
  "pipelineStage": "Qualified",
  "status": "open",
  "leadValue": 25000,
  "monetaryValue": 25000,
  "dateAdded": "2024-01-15T09:00:00Z",
  "dateUpdated": "2024-01-18T14:30:00Z"
}
```

### Demo Scheduled

```json
{
  "type": "OpportunityStageUpdate",
  "contactId": "contact_xyz789",
  "email": "john.doe@example.com",
  "phone": "+15551234567",
  "companyName": "Acme Corporation",
  "opportunityId": "opp_123456",
  "opportunityName": "Acme - Enterprise License",
  "pipelineName": "Main Sales Pipeline",
  "pipelineStage": "Demo Scheduled",
  "leadValue": 25000,
  "dateAdded": "2024-01-15T09:00:00Z",
  "dateUpdated": "2024-01-20T10:00:00Z"
}
```

### Closed Won

```json
{
  "type": "OpportunityStageUpdate",
  "contactId": "contact_xyz789",
  "email": "john.doe@example.com",
  "phone": "+15551234567",
  "firstName": "John",
  "lastName": "Doe",
  "companyName": "Acme Corporation",
  "opportunityId": "opp_123456",
  "opportunityName": "Acme - Enterprise License",
  "pipelineName": "Main Sales Pipeline",
  "pipelineStage": "Closed Won",
  "status": "won",
  "leadValue": 25000,
  "monetaryValue": 25000,
  "dateAdded": "2024-01-15T09:00:00Z",
  "dateUpdated": "2024-02-01T16:00:00Z"
}
```

## GHL Workflow Configuration

### Recommended Trigger
- **Trigger Type:** Pipeline Stage Changed
- **Pipeline:** Select your sales pipeline
- **Stages:** All stages (or specific stages to track)

### Webhook Action Settings
```
Method: POST
URL: https://your-domain.com/webhook/ghl
Headers:
  Content-Type: application/json
  X-Webhook-Secret: {{your_secret}}
```

### Available GHL Variables
| Variable | Description |
|----------|-------------|
| `{{contact.id}}` | Contact ID |
| `{{contact.email}}` | Contact email |
| `{{contact.phone}}` | Contact phone |
| `{{contact.first_name}}` | First name |
| `{{contact.last_name}}` | Last name |
| `{{contact.company_name}}` | Company name |
| `{{opportunity.id}}` | Opportunity ID |
| `{{opportunity.name}}` | Opportunity name |
| `{{opportunity.pipeline_stage}}` | Current stage |
| `{{opportunity.monetary_value}}` | Deal value |
| `{{opportunity.source}}` | Lead source |

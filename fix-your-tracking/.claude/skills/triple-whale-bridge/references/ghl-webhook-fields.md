# GoHighLevel Webhook Field Reference

Complete reference for all fields available in GoHighLevel webhook payloads.

## Contact Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `contactId` | string | Unique contact identifier | `"contact_xyz789"` |
| `email` | string | Contact email address | `"john@example.com"` |
| `phone` | string | Contact phone number | `"+15551234567"` |
| `firstName` | string | First name | `"John"` |
| `lastName` | string | Last name | `"Doe"` |
| `fullName` | string | Full name (combined) | `"John Doe"` |
| `name` | string | Name (alternative field) | `"John Doe"` |
| `companyName` | string | Company/organization name | `"Acme Corp"` |
| `website` | string | Contact website | `"https://acme.com"` |
| `tags` | array | Array of tag strings | `["enterprise", "inbound"]` |
| `source` | string | Lead source | `"website"` |
| `attributionSource` | string | Marketing attribution source | `"google_ads"` |
| `country` | string | Country | `"United States"` |
| `city` | string | City | `"San Francisco"` |
| `state` | string | State/province | `"California"` |
| `address1` | string | Street address | `"123 Main St"` |
| `postalCode` | string | ZIP/postal code | `"94102"` |
| `dateAdded` | string | Contact creation timestamp (ISO 8601) | `"2024-01-15T09:00:00Z"` |
| `dateUpdated` | string | Last update timestamp (ISO 8601) | `"2024-01-18T14:30:00Z"` |

## Opportunity Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `opportunityId` | string | Unique opportunity identifier | `"opp_123456"` |
| `id` | string | Alternative opportunity ID field | `"opp_123456"` |
| `opportunityName` | string | Opportunity/deal name | `"Enterprise Deal"` |
| `name` | string | Alternative name field | `"Enterprise Deal"` |
| `status` | string | Opportunity status | `"open"`, `"won"`, `"lost"` |
| `pipelineId` | string | Pipeline identifier | `"pipe_main"` |
| `pipelineName` | string | Pipeline name | `"Main Sales Pipeline"` |
| `pipelineStage` | string | Current stage name | `"Qualified"` |
| `pipelineStageId` | string | Stage identifier | `"stage_qual"` |
| `leadValue` | number | Lead/deal value | `25000` |
| `monetaryValue` | number | Monetary value (preferred) | `25000` |
| `opportunitySource` | string | Opportunity-level source | `"inbound"` |
| `assignedTo` | string | Assigned user/rep ID | `"user_sales01"` |

## Event Metadata Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `type` | string | Event type identifier | `"OpportunityStageUpdate"` |
| `locationId` | string | GHL location/account ID | `"loc_abc123"` |
| `workflowId` | string | Triggering workflow ID | `"wf_xyz"` |
| `workflowName` | string | Triggering workflow name | `"Pipeline Sync"` |
| `timestamp` | string | Event timestamp | `"2024-01-15T09:00:00Z"` |

## Custom Fields

Custom fields are passed as an array:

```json
{
  "customFields": [
    {
      "id": "field_utm_source",
      "key": "utm_source",
      "value": "facebook",
      "fieldValue": "facebook"
    },
    {
      "id": "field_utm_campaign",
      "key": "utm_campaign",
      "value": "q1_promo",
      "fieldValue": "q1_promo"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Custom field ID |
| `key` | string | Custom field key/name |
| `value` | any | Field value |
| `fieldValue` | any | Alternative value field |

## Common Event Types

| Type Value | Trigger |
|------------|---------|
| `ContactCreate` | New contact created |
| `ContactUpdate` | Contact updated |
| `ContactDelete` | Contact deleted |
| `ContactTagAdd` | Tag added to contact |
| `ContactTagRemove` | Tag removed from contact |
| `OpportunityCreate` | New opportunity created |
| `OpportunityUpdate` | Opportunity updated |
| `OpportunityStageUpdate` | Pipeline stage changed |
| `OpportunityStatusChange` | Status changed (won/lost) |
| `AppointmentCreate` | Appointment scheduled |
| `TaskCreate` | Task created |
| `TaskComplete` | Task completed |

## Pipeline Stage Best Practices

### Stage Naming Conventions

For consistent mapping, use these stage name patterns:

| Stage Type | Recommended Names |
|------------|-------------------|
| Initial | `New Lead`, `New`, `Inbound` |
| Contacted | `Contacted`, `Reached Out` |
| Marketing Qualified | `Qualified`, `MQL`, `Marketing Qualified` |
| Sales Qualified | `Sales Qualified`, `SQL`, `Discovery Complete` |
| Demo/Meeting | `Demo Scheduled`, `Discovery Call`, `Meeting Set` |
| Proposal | `Proposal Sent`, `Proposal`, `Quote Sent` |
| Negotiation | `Negotiation`, `Contract Review` |
| Closed Won | `Closed Won`, `Won`, `Customer` |
| Closed Lost | `Closed Lost`, `Lost` |

## Data Type Notes

### Monetary Values
- May come as string or number
- May include currency symbols: `"$10,000"`
- May include commas: `"10,000"`
- Always parse/normalize before use

### Phone Numbers
- Various formats possible
- US: `(555) 123-4567`, `555-123-4567`, `+15551234567`
- Always normalize to E.164 format for Triple Whale

### Timestamps
- ISO 8601 format expected
- May or may not include timezone
- Examples: `"2024-01-15T09:00:00Z"`, `"2024-01-15T09:00:00.000Z"`

### Boolean Values
- May come as `true`/`false` or `"true"`/`"false"`
- Always check type before comparison

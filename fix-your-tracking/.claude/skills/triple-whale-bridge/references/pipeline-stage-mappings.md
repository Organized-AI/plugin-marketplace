# Pipeline Stage Mapping Reference

Comprehensive mapping guide for GoHighLevel pipeline stages to Triple Whale event types.

## Event Type Overview

| Triple Whale Event | Description | Typical Value Attribution |
|-------------------|-------------|---------------------------|
| `lead` | Initial lead capture | 0-5% of deal value |
| `mql` | Marketing Qualified Lead | 5-15% of deal value |
| `sql` | Sales Qualified Lead | 15-30% of deal value |
| `book_demo` | Demo/meeting scheduled | 20-35% of deal value |
| `opportunity` | Active deal/proposal | 40-75% of deal value |
| `custom` | Custom conversion (closed) | 100% of deal value |

---

## Standard B2B Sales Pipeline

| Stage Name | Event Type | Value Multiplier | Notes |
|------------|-----------|------------------|-------|
| New Lead | `lead` | 0.00 | Initial capture |
| Contacted | `lead` | 0.05 | First contact made |
| Qualified | `mql` | 0.10 | Fits ICP, engaged |
| Discovery Call | `book_demo` | 0.15 | Meeting scheduled |
| Discovery Complete | `sql` | 0.25 | BANT confirmed |
| Demo Scheduled | `book_demo` | 0.30 | Product demo set |
| Demo Complete | `sql` | 0.40 | Demo delivered |
| Proposal Sent | `opportunity` | 0.50 | Quote delivered |
| Negotiation | `opportunity` | 0.70 | Active negotiation |
| Contract Sent | `opportunity` | 0.85 | Awaiting signature |
| Closed Won | `custom` | 1.00 | Revenue recognized |
| Closed Lost | `custom` | 0.00 | Deal lost |

---

## Marketing Nurture Pipeline

| Stage Name | Event Type | Value Multiplier | Notes |
|------------|-----------|------------------|-------|
| Cold Lead | `lead` | 0.00 | Unengaged |
| Engaged | `lead` | 0.02 | Opened emails, visited site |
| Warm Lead | `mql` | 0.05 | Multiple engagements |
| Hot Lead | `mql` | 0.10 | High intent signals |
| Sent to Sales | `sql` | 0.15 | Handoff to sales |

---

## Enterprise Sales Pipeline

| Stage Name | Event Type | Value Multiplier | Notes |
|------------|-----------|------------------|-------|
| Inbound Interest | `lead` | 0.00 | Initial inquiry |
| Stakeholder ID'd | `mql` | 0.05 | Key contact found |
| Champion Engaged | `mql` | 0.10 | Internal advocate |
| Discovery Meeting | `book_demo` | 0.15 | First meeting |
| Technical Eval | `sql` | 0.25 | Tech review |
| POC/Trial | `sql` | 0.35 | Proof of concept |
| Business Case | `opportunity` | 0.45 | Building ROI case |
| Procurement | `opportunity` | 0.60 | In purchasing |
| Legal Review | `opportunity` | 0.75 | Contract review |
| Final Approval | `opportunity` | 0.90 | Awaiting sign-off |
| Closed Won | `custom` | 1.00 | Deal closed |
| Closed Lost | `custom` | 0.00 | Deal lost |

---

## Services/Consulting Pipeline

| Stage Name | Event Type | Value Multiplier | Notes |
|------------|-----------|------------------|-------|
| Inquiry | `lead` | 0.00 | Initial contact |
| Consultation Booked | `book_demo` | 0.25 | Meeting set |
| Consultation Complete | `sql` | 0.50 | Needs assessed |
| Proposal Accepted | `opportunity` | 0.75 | Terms agreed |
| Service Scheduled | `custom` | 0.90 | Work scheduled |
| Completed | `custom` | 1.00 | Service delivered |

---

## E-commerce/Product Pipeline

| Stage Name | Event Type | Value Multiplier | Notes |
|------------|-----------|------------------|-------|
| Lead | `lead` | 0.00 | Interest shown |
| Product Demo | `book_demo` | 0.30 | Demo requested |
| Quote Requested | `sql` | 0.50 | Pricing inquiry |
| Quote Sent | `opportunity` | 0.70 | Quote delivered |
| Order Placed | `custom` | 1.00 | Purchase complete |

---

## Real Estate Pipeline

| Stage Name | Event Type | Value Multiplier | Notes |
|------------|-----------|------------------|-------|
| New Inquiry | `lead` | 0.00 | Initial contact |
| Qualified Buyer | `mql` | 0.10 | Budget/timeline confirmed |
| Showing Scheduled | `book_demo` | 0.20 | Property viewing |
| Showing Complete | `sql` | 0.35 | Viewed property |
| Offer Made | `opportunity` | 0.60 | Offer submitted |
| Under Contract | `opportunity` | 0.85 | Contract signed |
| Closed | `custom` | 1.00 | Transaction complete |

---

## Stage Name Patterns

For automatic mapping, these patterns are recognized (case-insensitive):

### Lead Events
- `new lead`, `new`, `inbound`, `inquiry`, `cold lead`
- `contacted`, `reached out`, `first touch`

### MQL Events
- `qualified`, `mql`, `marketing qualified`
- `engaged`, `warm lead`, `hot lead`
- `stakeholder`, `champion`

### SQL Events
- `sales qualified`, `sql`, `discovery complete`
- `demo complete`, `needs assessed`
- `technical eval`, `poc`, `trial`

### Book Demo Events
- `demo scheduled`, `demo booked`, `meeting set`
- `discovery call`, `consultation booked`
- `showing scheduled`, `call scheduled`

### Opportunity Events
- `proposal`, `proposal sent`, `quote sent`
- `negotiation`, `contract`, `legal review`
- `procurement`, `approval`, `under contract`

### Custom Events (Closed)
- `closed won`, `won`, `customer`, `completed`
- `closed lost`, `lost`, `disqualified`

---

## Value Calculation Methods

### 1. Weighted Attribution
Multiply deal value by stage multiplier:

```python
attributed_value = deal_value * stage_multiplier
# Example: $10,000 deal at Proposal (0.50) = $5,000 attributed
```

### 2. Fixed Value Attribution
Assign fixed values per stage:

| Event Type | Fixed Value |
|------------|-------------|
| lead | $0 |
| mql | $50 |
| sql | $200 |
| book_demo | $100 |
| opportunity | $500 |
| custom (won) | Actual deal value |

### 3. Actual Value
Always use full deal value (for reporting only):

```python
attributed_value = deal_value  # Always full amount
```

---

## Custom Event Names

For `type: "custom"` events, use `properties.event_name`:

| Scenario | event_name |
|----------|------------|
| Deal won | `closed_won` |
| Deal lost | `closed_lost` |
| Trial started | `trial_started` |
| Trial converted | `trial_converted` |
| Upsell | `upsell` |
| Renewal | `renewal` |
| Churn | `churned` |

---

## Configuration Example

```yaml
pipelines:
  "Main Sales Pipeline":
    stages:
      "New Lead":
        event_type: "lead"
        value_multiplier: 0.0

      "Qualified":
        event_type: "mql"
        value_multiplier: 0.10

      "Demo Scheduled":
        event_type: "book_demo"
        value_multiplier: 0.25

      "Proposal Sent":
        event_type: "opportunity"
        value_multiplier: 0.50

      "Closed Won":
        event_type: "custom"
        custom_event_name: "closed_won"
        value_multiplier: 1.0
        include_revenue: true
```

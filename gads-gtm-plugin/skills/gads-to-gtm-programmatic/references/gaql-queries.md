# GAQL Query Reference for Google Ads Conversion Tracking

Common queries used during audit and setup via the Google Ads MCP (TrueClicks).

## Account Info

### Get Conversion Tracking ID
```sql
SELECT
  customer.id,
  customer.descriptive_name,
  customer.conversion_tracking_setting.conversion_tracking_id,
  customer.conversion_tracking_setting.conversion_tracking_status
FROM customer
```
The `conversion_tracking_id` is the number after `AW-` in GTM tags.

### Get Account Name
```sql
SELECT customer.id, customer.descriptive_name FROM customer
```

## Conversion Actions

### List All Conversion Actions
```sql
SELECT
  conversion_action.id,
  conversion_action.name,
  conversion_action.type,
  conversion_action.status,
  conversion_action.category,
  conversion_action.counting_type,
  conversion_action.attribution_model_settings.attribution_model,
  conversion_action.primary_for_goal
FROM conversion_action
ORDER BY conversion_action.name
```

### List Only WEBPAGE Conversions (GTM-managed)
```sql
SELECT
  conversion_action.id,
  conversion_action.name,
  conversion_action.category,
  conversion_action.status,
  conversion_action.tag_snippets
FROM conversion_action
WHERE conversion_action.type = 'WEBPAGE'
  AND conversion_action.status = 'ENABLED'
```

### Get Conversion Labels from Tag Snippets
```sql
SELECT
  conversion_action.id,
  conversion_action.name,
  conversion_action.tag_snippets
FROM conversion_action
WHERE conversion_action.type = 'WEBPAGE'
  AND conversion_action.status = 'ENABLED'
```
Parse `tag_snippets[].event_snippet` for the pattern `AW-XXXXXXXXX/LABEL_STRING`.

### Check for Duplicate Conversion Actions
```sql
SELECT
  conversion_action.name,
  conversion_action.id,
  conversion_action.status,
  conversion_action.type
FROM conversion_action
WHERE conversion_action.name = 'Purchase'
```

## Campaign & Conversion Performance

### Conversion Performance by Campaign (Last 30 Days)
```sql
SELECT
  campaign.name,
  campaign.id,
  metrics.conversions,
  metrics.conversions_value,
  metrics.cost_micros,
  metrics.all_conversions,
  metrics.all_conversions_value
FROM campaign
WHERE segments.date DURING LAST_30_DAYS
  AND metrics.conversions > 0
ORDER BY metrics.conversions_value DESC
```

### Conversion Performance by Action Name
```sql
SELECT
  conversion_action.name,
  conversion_action.category,
  metrics.conversions,
  metrics.conversions_value,
  metrics.all_conversions
FROM conversion_action
WHERE segments.date DURING LAST_30_DAYS
ORDER BY metrics.conversions DESC
```

### Zero-Value Conversion Check
Useful for debugging $0 revenue issues (e.g. BiOptimizers pattern):
```sql
SELECT
  campaign.name,
  segments.conversion_action_name,
  metrics.conversions,
  metrics.conversions_value
FROM campaign
WHERE segments.date DURING LAST_7_DAYS
  AND metrics.conversions > 0
  AND metrics.conversions_value = 0
```

## Tips

- **MCC vs Client**: When using TrueClicks MCP, the `customerId` is the client account (no dashes), `loginCustomerId` is the MCC (no dashes).
- **Date ranges**: `LAST_7_DAYS`, `LAST_30_DAYS`, `THIS_MONTH`, `LAST_MONTH`, or explicit `segments.date BETWEEN '2026-01-01' AND '2026-01-31'`.
- **Tag snippets**: Only available on WEBPAGE type conversion actions. Import conversions (from GA4, Firebase) don't have tag snippets.

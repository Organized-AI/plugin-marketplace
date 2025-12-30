# LinkedIn User Matching Guide

## Required Identifiers

LinkedIn requires **at least one** identifier to match conversions to users.

## Identifier Priority

| Priority | Identifier | Match Rate | Source |
|----------|------------|------------|--------|
| 1 | SHA256 Email | 60-80% | Form submission, CRM |
| 2 | LinkedIn Click ID | 40-60% | li_fat_id cookie |
| 3 | Email + li_fat_id | 80-95% | Combined |
| 4 | Acxiom/Oracle ID | Varies | Data provider |

## SHA256 Email Hashing

**Requirements:**
- Lowercase before hashing
- Trim whitespace
- UTF-8 encoding

**JavaScript Example:**
```javascript
async function hashEmail(email) {
  const normalized = email.toLowerCase().trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

**GTM Custom JS Variable:**
```javascript
function() {
  var email = {{DL - email}};
  if (!email) return null;

  // Use pre-hashed value if available
  if ({{DL - email_sha256}}) return {{DL - email_sha256}};

  // Note: Hashing should be done server-side for security
  return null;
}
```

## LinkedIn Click ID (li_fat_id)

**What it is:**
- First-party cookie set by LinkedIn ads
- Created when user clicks LinkedIn ad
- Valid for 90 days

**Cookie Name:** `li_fat_id`

**GTM Variable:**
```
gtm_variable action=create
  config={
    "name": "Cookie - li_fat_id",
    "type": "k",
    "parameter": [{"key": "cookieName", "value": "li_fat_id"}]
  }
```

**Server-side Access:**
```
gtm_variable action=create
  containerId=[SERVER_CONTAINER_ID]
  config={
    "name": "ED - li_fat_id",
    "type": "v",
    "parameter": [
      {"key": "dataLayerVersion", "value": "2"},
      {"key": "name", "value": "x-li-fat-id"}
    ]
  }
```

## Additional User Data

Improves match rate when primary identifiers unavailable:

| Field | Example | Hashing |
|-------|---------|---------|
| firstName | John | Optional (SHA256) |
| lastName | Doe | Optional (SHA256) |
| companyName | Acme Inc | Not required |
| title | Marketing Manager | Not required |
| countryCode | US | Not required (ISO 3166-1) |

## Best Practices

1. **Always send email if available** - Highest match rate
2. **Capture li_fat_id on landing pages** - Store in data layer
3. **Hash on server-side** - Never expose raw PII in client
4. **Send multiple identifiers** - Improves match probability
5. **Validate before sending** - Reduce API errors

## Data Layer Structure

```javascript
dataLayer.push({
  event: 'lead_submitted',
  user_data: {
    email_sha256: 'a1b2c3d4e5f6...',
    li_fat_id: 'AQE...',
    first_name: 'John',
    last_name: 'Doe'
  },
  event_id: 'li_1705334400_abc123'
});
```

## Matching Flow

```
User submits form
       │
       ▼
┌─────────────────┐
│ Collect Data    │
│ - Email         │
│ - li_fat_id     │
│ - Name (opt)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Hash Email      │
│ (server-side)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Send to CAPI    │
│ + event_id      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ LinkedIn Match  │
│ - Email → 70%   │
│ - li_fat_id→30% │
└─────────────────┘
```

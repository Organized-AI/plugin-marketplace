# LinkedIn Conversions API Reference

## API Endpoint

```
POST https://api.linkedin.com/rest/conversionEvents
```

## Authentication

**Header:**
```
Authorization: Bearer {access_token}
LinkedIn-Version: 202401
Content-Type: application/json
```

## Request Payload

```json
{
  "conversion": "urn:lla:llaPartnerConversion:{conversionRuleId}",
  "conversionHappenedAt": 1705334400000,
  "conversionValue": {
    "currencyCode": "USD",
    "amount": "99.99"
  },
  "eventId": "li_1705334400_abc123xyz",
  "user": {
    "userIds": [
      {
        "idType": "SHA256_EMAIL",
        "idValue": "a1b2c3d4e5f6..."
      },
      {
        "idType": "LINKEDIN_FIRST_PARTY_ADS_TRACKING_UUID",
        "idValue": "li_fat_id_value"
      }
    ],
    "userInfo": {
      "firstName": "John",
      "lastName": "Doe",
      "companyName": "Acme Inc",
      "title": "Marketing Manager",
      "countryCode": "US"
    }
  }
}
```

## User ID Types

| Type | Description | Hashing |
|------|-------------|---------|
| `SHA256_EMAIL` | Email address | SHA256 hash required |
| `LINKEDIN_FIRST_PARTY_ADS_TRACKING_UUID` | li_fat_id cookie | No hashing |
| `ACXIOM_ID` | Acxiom identifier | No hashing |
| `ORACLE_MOAT_ID` | Oracle Moat ID | No hashing |

## Event Types

| Event | Conversion Type | Deduplication |
|-------|-----------------|---------------|
| `pageView` | Page View | Yes |
| `conversion` | Custom conversion | Depends on type |

## Response Codes

| Code | Meaning |
|------|---------|
| 201 | Success |
| 400 | Bad request (missing fields) |
| 401 | Unauthorized (invalid token) |
| 403 | Forbidden (no access) |
| 429 | Rate limited |

## Rate Limits

- 100,000 requests per day per access token
- 100 requests per second

## Event ID Requirements

- Must be unique per event
- Recommended format: `{prefix}_{timestamp}_{random}`
- Example: `li_1705334400000_x7k9m2`
- Used for deduplication with client-side events

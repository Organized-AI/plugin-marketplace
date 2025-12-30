# LinkedIn Conversions API Reference

## API Endpoint

```
POST https://api.linkedin.com/rest/conversionEvents
```

## Authentication

| Header | Value |
|--------|-------|
| Authorization | Bearer {access_token} |
| Content-Type | application/json |
| LinkedIn-Version | 202411 |

## Required Parameters

At minimum ONE user identifier required:

| Parameter | Description | Format |
|-----------|-------------|--------|
| sha256_email_address | SHA256 hashed email | Lowercase, trimmed before hash |
| li_fat_id | LinkedIn Click ID | From URL param or cookie |
| acxiom_id | Acxiom partner ID | As provided |
| moat_id | Moat partner ID | As provided |

## User Data Parameters

### Core User Data
```json
{
  "user_data": {
    "sha256_email_address": "hashed_email",
    "sha256_phone_number": "hashed_phone_e164",
    "address": {
      "first_name": "John",
      "last_name": "Doe",
      "city": "San Francisco",
      "state": "CA",
      "postal_code": "94102",
      "country_code": "US"
    }
  }
}
```

## Response Codes

| Code | Meaning | Action |
|------|---------|--------|
| 201 | Success | Event accepted |
| 400 | Bad Request | Check payload format |
| 401 | Unauthorized | Refresh access token |
| 422 | Unprocessable | Missing required user ID |

## GTM Common Event Schema Mapping

| LinkedIn Field | GTM Data Layer Path |
|----------------|---------------------|
| Email (hashed) | user_data.sha256_email_address |
| First Name | user_data.address.first_name |
| Last Name | user_data.address.last_name |
| Phone | user_data.phone_number |

## Hashing Requirements

**Email:**
- Lowercase before hashing
- Trim whitespace
- SHA256 hex digest (64 chars)

```python
import hashlib
email_hash = hashlib.sha256(email.lower().strip().encode()).hexdigest()
```

---
name: gcp-oauth
description: |
  GCP OAuth testing and configuration skill for VisionBridge Attribution.
  Handles Google Cloud Platform OAuth 2.0 setup, Google Ads API credential management,
  token exchange flows, and end-to-end OAuth testing against live GCP projects.
  Use when: (1) Setting up or debugging Google Ads OAuth, (2) Configuring GCP Console credentials,
  (3) Testing OAuth callback flows, (4) Refreshing or rotating tokens, (5) Troubleshooting
  Google Ads API auth errors, (6) User mentions "GCP", "Google OAuth", "Google Ads auth",
  "OAuth callback", or "developer token".
metadata:
  version: 1.0.0
  author: VisionBridge
  project: VisionBridge Attribution Tracking
  integrates_with:
    - server/google-ads.ts (OAuth implementation)
    - server/routes.ts (OAuth endpoints)
    - server/capi-dispatchers.ts (Google CAPI)
triggers:
  - "gcp oauth"
  - "google ads auth"
  - "google oauth"
  - "oauth callback"
  - "developer token"
  - "google ads setup"
  - "refresh token"
  - "token exchange"
  - "gcp credentials"
---

# GCP OAuth Skill — VisionBridge Attribution

## Architecture

### OAuth Flow (server/google-ads.ts)
```
User clicks Connect → getGoogleAdsAuthUrl() → Google Consent Screen
  → User approves → /api/auth/google-ads/callback
  → exchangeGoogleCode() → access_token + refresh_token
  → Store in adPlatformConnections table
  → Fetch customer accounts → Ready
```

### Key Files
| File | Purpose |
|------|---------|
| `server/google-ads.ts` | Core OAuth + API client (auth URL, token exchange, refresh, API calls) |
| `server/routes.ts:2034-2135` | Express routes: `/api/auth/google-ads`, `/api/auth/google-ads/callback`, `/api/google-ads/status`, `/api/google-ads/sync`, `/api/google-ads/disconnect` |
| `server/capi-dispatchers.ts` | Google Enhanced Conversions (offline CAPI) |
| `server/storage.ts` | `adPlatformConnections` CRUD for token persistence |
| `shared/schema.ts` | `adPlatformConnections` table schema |

### Environment Variables
```
GOOGLE_ADS_CLIENT_ID=       # GCP Console → APIs & Services → Credentials → OAuth 2.0 Client ID
GOOGLE_ADS_CLIENT_SECRET=   # Same credential's secret
GOOGLE_ADS_DEVELOPER_TOKEN= # Google Ads → Admin → API Center → Developer Token
```

## GCP Console Setup Checklist

### 1. Create OAuth Credentials
- Go to GCP Console → APIs & Services → Credentials
- Create OAuth 2.0 Client ID (Web Application)
- Add authorized redirect URIs:
  - Local: `http://localhost:5000/api/auth/google-ads/callback`
  - Production: `https://<your-domain>/api/auth/google-ads/callback`
  - Replit: `https://<replit-url>/api/auth/google-ads/callback`

### 2. Enable APIs
- Google Ads API (`googleads.googleapis.com`)
- Ensure OAuth consent screen is configured (Internal or External)

### 3. Developer Token
- Google Ads Account → Admin → API Center
- Apply for Basic Access (test accounts work with Test token)
- Levels: Test → Basic → Standard

### 4. Set Environment Variables
```bash
# .env
GOOGLE_ADS_CLIENT_ID=123456789.apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_ADS_DEVELOPER_TOKEN=xxxxx
```

## Testing Procedures

### Test 1: Verify Configuration
```bash
# Check env vars are set
curl http://localhost:5000/api/google-ads/status
# Expected: { "configured": true, "connected": false }
```

### Test 2: OAuth Flow
```bash
# Initiate OAuth (requires auth session)
curl http://localhost:5000/api/auth/google-ads?clientId=test
# Expected: Redirect to Google consent screen
```

### Test 3: Token Exchange
After consent, Google redirects to callback with `?code=XXX&state=XXX`.
The callback handler:
1. Validates state (CSRF protection via `pendingOAuthStates` map)
2. Exchanges code for tokens (`exchangeGoogleCode`)
3. Fetches accessible customer accounts
4. Stores connection in `adPlatformConnections`

### Test 4: Token Refresh
```bash
# Tokens expire after 1 hour. Refresh flow:
# refreshGoogleToken(refreshToken) → new accessToken
# Called automatically before API requests
```

### Test 5: API Calls
```bash
# Sync ad spend data
curl -X POST http://localhost:5000/api/google-ads/sync \
  -H "Content-Type: application/json" \
  -d '{"clientId":"test","startDate":"2026-01-01","endDate":"2026-02-01"}'
```

## Common Issues & Fixes

### "Google Ads is not configured"
- Missing `GOOGLE_ADS_CLIENT_ID` or `GOOGLE_ADS_CLIENT_SECRET` in env
- Fix: Set all 3 env vars and restart server

### "Failed to exchange code for token"
- Redirect URI mismatch between GCP Console and server
- Fix: `getRedirectUri()` in google-ads.ts must match GCP Console exactly
- Check: localhost vs deployed URL, http vs https

### "Access Not Configured" / 403
- Google Ads API not enabled in GCP project
- Developer token not approved or wrong level
- Fix: Enable API in GCP Console, verify developer token

### "invalid_grant" on refresh
- Refresh token revoked or expired (6 months for test apps)
- Fix: User must re-authorize via OAuth flow

### State validation fails
- `pendingOAuthStates` is in-memory, lost on server restart
- Fix: Complete OAuth flow without restarting. For production, persist state to DB.

## API Reference (google-ads.ts exports)

| Function | Purpose |
|----------|---------|
| `isGoogleAdsConfigured()` | Check if env vars are set |
| `getGoogleAdsAuthUrl(host?, clientId?)` | Generate OAuth consent URL with CSRF state |
| `validateGoogleOAuthState(state)` | Verify callback state matches pending |
| `exchangeGoogleCode(code, host?)` | Exchange auth code for access + refresh tokens |
| `refreshGoogleToken(refreshToken)` | Get new access token from refresh token |
| `getGoogleAdsCustomers(accessToken)` | List accessible Google Ads accounts |
| `fetchGoogleAdSpend(token, customerId, start, end)` | Pull campaign spend data |
| `searchGoogleAds(token, customerId, query)` | Execute GAQL queries |
| `updateGoogleAdsCampaign(token, customerId, campaignId, ops)` | Mutate campaign settings |
| `getGoogleAdsConversionActions(token, customerId)` | List conversion actions |
| `uploadGoogleOfflineConversions(token, customerId, action, conversions)` | Upload Enhanced Conversions |

## Workflow: Full OAuth Integration Test

```
1. Ensure .env has all 3 Google vars set
2. Start server: npm run dev
3. Navigate to Settings → Integrations → Google Ads → Connect
4. Complete Google consent screen
5. Verify callback stores tokens (check server logs)
6. Test /api/google-ads/status returns connected: true
7. Run sync: POST /api/google-ads/sync
8. Verify ad spend data appears in dashboard
```

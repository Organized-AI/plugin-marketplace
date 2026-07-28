# Meta API catalogue

Generated from `mcp/meta-catalogue.json`. The MCP tools read that file directly; this is the offline copy.

## Versions

- Graph API: `v25.0` (introduced 2026-02-18)
- Marketing API: `v25.0`, next `v26.0 (dated 2026-07-29)`
- Graph policy: Each version lives at least 2 years. Unversioned calls fall back to the version set in App Dashboard > Settings > Advanced.
- Marketing policy: Only ~90 days of overlap after a new version ships, and releases land about every four months. Marketing API does NOT support unversioned calls — omit the version and the call fails.

## Tokens

| Token | Obtain | Lifetime | Refresh |
|---|---|---|---|
| `system_user_non_expiring` | `POST /{system-user-id}/access_tokens` | Never expires | Not required |
| `system_user_60_day` | `POST /{system-user-id}/access_tokens with set_token_expires_in_60_days=true` | 60 days from generation or last refresh | GET /oauth/access_token?grant_type=fb_exchange_token&set_token_expires_in_60_days=true&fb_exchange_token=<current> |
| `user_short_lived` | `Login dialog / GET /oauth/access_token?code=` | About 1-2 hours | — |
| `user_long_lived` | `GET /oauth/access_token?grant_type=fb_exchange_token&fb_exchange_token=<short-lived>` | About 60 days (expires_in 5183944) | — |
| `page_long_lived` | `GET /{app-scoped-user-id}/accounts using a long-lived user token` | No expiration date | — |
| `app` | `GET /oauth/access_token?grant_type=client_credentials, or literally {app-id}|{app-secret}` | Until the app secret is reset | — |

## Surfaces

### Marketing API (campaigns, ad sets, ads, creatives)

- id: `marketing-api`
- base: `https://graph.facebook.com/v25.0`
- permissions: `ads_management`, `pages_read_engagement`, `pages_show_list`, `business_management`
- BUC bucket: `ads_management`
- docs: <https://developers.facebook.com/docs/marketing-apis>

- Marketing API refuses unversioned calls. Always pin a version in the path.
- Everything should be created PAUSED and activated deliberately; both the Ads CLI and the hosted MCP server do this by default.
- Budgets are in minor units — 5000 means $50.00.
- Creation order is campaign, then ad set, then creative, then ad. An ad references a creative that must already exist.
- Lifetime budget requires an end time. Omit ad set budget entirely when the campaign uses campaign budget optimisation.

### Ads Insights (reporting)

- id: `ads-insights`
- base: `https://graph.facebook.com/v25.0/{ad-account-id}/insights`
- permissions: `ads_read`
- BUC bucket: `ads_insights`
- docs: <https://developers.facebook.com/docs/marketing-api/insights>

- Has its own throttle header, X-FB-Ads-Insights-Throttle, separate from the BUC header.
- Async report jobs exist for heavy queries; sync calls with wide date ranges and many breakdowns hit complexity_score limits.
- Remedy for a complexity throttle is shorter time ranges, fewer object ids, fewer metrics or fewer breakdowns.

### Conversions API (server-side events)

- id: `conversions-api`
- base: `https://graph.facebook.com/v25.0/{dataset-id}/events`
- permissions: `ads_read`
- BUC bucket: `ads_management`
- docs: <https://developers.facebook.com/docs/marketing-api/conversions-api>

- ads_read is the CAPI permission — it grants server-side event access, which surprises people who assume ads_management.
- The dataset id IS the pixel id; Meta renamed pixels to datasets and the ids are interchangeable.
- A dataset-scoped token generated in Events Manager avoids needing an app at all for pure CAPI work.
- test_event_code routes events to the Test Events tool instead of production. Never leave it set in production.
- Send events within an hour where possible; user data fields must be SHA-256 hashed except when Meta specifies otherwise.

### Business Management API (businesses, ad accounts, system users, asset assignment)

- id: `business-management`
- base: `https://graph.facebook.com/v25.0`
- permissions: `business_management`
- BUC bucket: `ads_management`
- docs: <https://developers.facebook.com/docs/business-management-apis>

- This is what IS automatable on Meta: creating businesses, ad accounts, system users, assigning assets, minting tokens.
- It cannot create an app. POST /{business_id}/owned_apps claims an existing app and takes no parameters.
- Limited (formerly Standard) Marketing API tier gives no Business Manager access for managing ad accounts, users or Pages.

### Catalog / Commerce

- id: `catalog`
- base: `https://graph.facebook.com/v25.0`
- permissions: `catalog_management`, `business_management`
- BUC bucket: `custom_audience`
- docs: <https://developers.facebook.com/docs/marketing-api/catalog>

- catalog_management depends on business_management — requesting it alone fails.
- Catalog Batch has its own BUC error code, 80014, separate from Catalog Management's 80009.
- Catalogs with active feeds or referencing ads cannot be deleted.

### Custom Audiences

- id: `custom-audiences`
- base: `https://graph.facebook.com/v25.0/{ad-account-id}/customaudiences`
- permissions: `ads_management`
- BUC bucket: `custom_audience`
- docs: <https://developers.facebook.com/docs/marketing-api/audiences>

- User identifiers must be SHA-256 hashed and normalised before upload.
- Has its own BUC bucket, so audience uploads do not consume ads_management quota.

### Instagram (business accounts, media, boosting)

- id: `instagram`
- base: `https://graph.facebook.com/v25.0`
- permissions: `instagram_basic`, `pages_show_list`, `pages_read_user_content`
- BUC bucket: `instagram`
- docs: <https://developers.facebook.com/docs/instagram-platform>

- instagram_basic depends on pages_read_user_content and pages_show_list.
- System user tokens do not carry the newer instagram_business_* permissions — check the supported scope list before assuming.

### WhatsApp Business

- id: `whatsapp`
- base: `https://graph.facebook.com/v25.0`
- permissions: `whatsapp_business_management`, `whatsapp_business_messaging`
- BUC bucket: `whatsapp_business_management`
- docs: <https://developers.facebook.com/docs/whatsapp>

- Requires a business portfolio.
- Own BUC bucket with error code 80008.

### Pages

- id: `pages`
- base: `https://graph.facebook.com/v25.0`
- permissions: `pages_show_list`, `pages_read_engagement`, `pages_manage_ads`
- BUC bucket: `pages`
- docs: <https://developers.facebook.com/docs/pages-api>

- Neither Marketing API tier can create Pages through the API.
- Page throttling uses error 80001 with a Page or system user token, but error 32 with a user token.
- A Page only appears to a system user if it was explicitly assigned to that system user.

### Lead Ads

- id: `leadgen`
- base: `https://graph.facebook.com/v25.0`
- permissions: `leads_retrieval`, `pages_manage_ads`
- BUC bucket: `leadgen`
- docs: <https://developers.facebook.com/docs/marketing-api/guides/lead-ads>

- Leads are only retrievable for 90 days.
- Realtime delivery is via webhooks, not polling.

## Permissions and dependencies

| Permission | Depends on | Does |
|---|---|---|
| `ads_management` | `pages_read_engagement`, `pages_show_list` | read and manage ad accounts, create campaigns, manage ads, fetch metrics |
| `ads_read` | — | Ads Insights API reporting AND server-side Conversions API access |
| `business_management` | `pages_read_engagement`, `pages_show_list` | read and write the Business Manager API, manage and claim assets |
| `catalog_management` | `business_management` | create, read, update, delete business-owned product catalogs |
| `pages_read_engagement` | — | required by both Marketing API use cases and by ads_management |
| `pages_show_list` | — | list the Pages a user manages |
| `pages_manage_ads` | — | manage ads associated with a Page |
| `read_insights` | — | read insights; the Ads CLI asks for this rather than ads_read |
| `instagram_basic` | `pages_read_user_content`, `pages_show_list` | read an Instagram business profile and its media |
| `leads_retrieval` | — | retrieve lead ad submissions |
| `whatsapp_business_management` | — | manage WhatsApp business assets, numbers, templates, webhooks |
| `ads_mcp_management` | — | required by the hosted Ads MCP server only; no CLI or raw-API equivalent |

## Rate limit error codes

| Code | Meaning |
|---|---|
| `4` | App-level too many calls |
| `17` | User-level too many calls; subcode 2446079 is the ad-account API-level limit |
| `32` | Page request limit using a USER token |
| `613` | Custom rate limit. Subcodes: 1487742 ad-account calls, 1487632 ad-set budget changes capped at 4/hour, 1487225 ad-creation daily spend cap, 5044001 100 QPS mutation burst, 1996 inconsistent request volume, null abuse-prevention throttle |
| `80000` | Ads Insights BUC limit (subcode 2446079) |
| `80001` | Page calls with a Page or SYSTEM USER token |
| `80002` | Instagram BUC limit |
| `80003` | Custom Audience BUC limit |
| `80004` | Ads Management BUC limit (subcode 2446079) — the one you will hit most |
| `80005` | LeadGen BUC limit |
| `80006` | Messenger BUC limit |
| `80008` | WhatsApp Business Management BUC limit |
| `80009` | Catalog Management BUC limit |
| `80014` | Catalog Batch BUC limit |

## Auth error codes

| Code | Meaning |
|---|---|
| `190` | Token expired, revoked or invalid. Get a new one. |
| `190.458` | App Not Installed — the user has not authorised your app, or revoked it. |
| `190.459` | User Checkpointed — they must log in at facebook.com to clear an issue. |
| `190.460` | Password Changed, or the user logged out. Both produce this. |
| `190.463` | Expired — session expired on a given date. |
| `190.464` | Unconfirmed User. |
| `190.467` | Invalid Access Token — revoked or malformed. |
| `190.492` | Invalid Session — the user behind a Page token no longer has the right Page role. The classic Page-token killer. |
| `102` | API Session. Handle like 190. |
| `100` | Invalid parameter. The most common error overall. |
| `104` | Incorrect signature — appsecret_proof missing or wrong. |
| `200` | Permission not granted or removed. |
| `368` | Action deemed abusive. Back off and retry later. |
| `506` | Duplicate post. |

**Meta will NOT notify you that a token became invalid. You only find out on the next call. Tokens can also be invalidated early for security reasons with no signal at all.**

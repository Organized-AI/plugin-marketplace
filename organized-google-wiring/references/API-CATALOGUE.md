# Google API catalogue
Generated from `mcp/api-catalogue.json`. The MCP tools read that file directly; this is the offline copy.
## Verification classes
- **non-sensitive** — Basic verification only. No security assessment. Cheapest path.
- **sensitive** — Requires OAuth verification if you exceed the unverified cap. No CASA assessment.
- **restricted** — Requires OAuth verification AND an annual CASA security assessment. Most expensive.

`verified` marks whether the sensitivity class was read from Google's own per-API documentation. Where it is false the scope string is correct but the class is best-effort — re-check at <https://support.google.com/cloud/answer/13464321> before planning a verification submission.

## Universal sign-in scopes

- `openid` — non-sensitive
- `https://www.googleapis.com/auth/userinfo.email` — non-sensitive
- `https://www.googleapis.com/auth/userinfo.profile` — non-sensitive

## Gmail

- id: `gmail`
- enable: `gmail.googleapis.com`
- base: `https://gmail.googleapis.com/gmail/v1`
- docs: <https://developers.google.com/workspace/gmail/api/auth/scopes>
- acts on individual users' private data: yes

| scope | class | verified | does |
|---|---|---|---|
| `gmail.readonly` | restricted | yes | read and search mail |
| `gmail.compose` | restricted | yes | manage drafts and send |
| `gmail.modify` | restricted | yes | label, archive, triage |
| `gmail.send` | sensitive | yes | send only |
| `gmail.metadata` | sensitive | yes | headers and labels, no bodies |
| `gmail.labels` | non-sensitive | yes | manage labels |

**Quirks**

- gmail.send alone cannot read threads; pair with gmail.metadata to thread replies correctly.
- Message bodies are base64url in payload.parts; use format=metadata when you only need headers.
- Incremental sync uses historyId, not page tokens. Store it per account.

## Google Drive

- id: `drive`
- enable: `drive.googleapis.com`
- base: `https://www.googleapis.com/drive/v3`
- docs: <https://developers.google.com/workspace/drive/api/guides/api-specific-auth>
- acts on individual users' private data: yes

| scope | class | verified | does |
|---|---|---|---|
| `drive` | restricted | yes | full access |
| `drive.readonly` | restricted | yes | read all files |
| `drive.file` | non-sensitive | yes | only files this app created or the user picked |

**Quirks**

- drive.file is the single biggest verification saving available. If the app creates the files it touches, use it.
- Always pass supportsAllDrives=true and includeItemsFromAllDrives=true or shared drives silently vanish.
- Google-native docs have no bytes; use /export with a target mimeType instead of alt=media.
- Incremental sync uses the changes endpoint with a startPageToken.

## Google Analytics Data API (GA4)

- id: `analytics-data`
- enable: `analyticsdata.googleapis.com`
- base: `https://analyticsdata.googleapis.com/v1beta`
- docs: <https://developers.google.com/analytics/devguides/reporting/data/v1>
- acts on individual users' private data: no

| scope | class | verified | does |
|---|---|---|---|
| `analytics.readonly` | sensitive | no | read reports |

**Quirks**

- Property id goes in the URL path as properties/{id}:runReport, not a query param.
- Quotas are per property per day and tokens are consumed by query complexity, not row count.
- This API accepts a service account directly — no per-user OAuth needed if you add the service account email as a property viewer. Prefer that over the token vault for reporting-only workloads.

## Google Analytics Admin API (GA4)

- id: `analytics-admin`
- enable: `analyticsadmin.googleapis.com`
- base: `https://analyticsadmin.googleapis.com/v1beta`
- docs: <https://developers.google.com/analytics/devguides/config/admin/v1>
- acts on individual users' private data: no

| scope | class | verified | does |
|---|---|---|---|
| `analytics.readonly` | sensitive | no | list accounts, properties, data streams |
| `analytics.edit` | sensitive | no | create and modify properties, streams, conversions |

**Quirks**

- Account and property listing is the cheapest way to discover what an authenticated user can reach.

## Google Ads API

- id: `google-ads`
- enable: `googleads.googleapis.com`
- base: `https://googleads.googleapis.com/v21`
- docs: <https://developers.google.com/google-ads/api/docs/start>
- acts on individual users' private data: no

| scope | class | verified | does |
|---|---|---|---|
| `adwords` | sensitive | no | full Ads API access |

**Quirks**

- REQUIRES a developer-token header on every call in addition to the bearer. Missing it is the single most common cause of silent 401/403 — a Worker that only sets Authorization will never work.
- Manager accounts require the login-customer-id header set to the MCC id, with customer_id as the target account.
- Customer ids must have hyphens stripped before use.
- Reporting is GAQL via customers/{id}/googleAds:searchStream, not REST resources.
- Developer tokens start with test-account-only access; production access needs an application to Google.

## Google Tag Manager API

- id: `tag-manager`
- enable: `tagmanager.googleapis.com`
- base: `https://tagmanager.googleapis.com/tagmanager/v2`
- docs: <https://developers.google.com/tag-platform/tag-manager/api/v2>
- acts on individual users' private data: no

| scope | class | verified | does |
|---|---|---|---|
| `tagmanager.readonly` | sensitive | no | read containers |
| `tagmanager.edit.containers` | sensitive | no | edit tags, triggers, variables |
| `tagmanager.edit.containerversions` | sensitive | no | create versions |
| `tagmanager.publish` | sensitive | no | publish a version live |
| `tagmanager.manage.accounts` | sensitive | no | manage accounts |
| `tagmanager.manage.users` | sensitive | no | manage container permissions |

**Quirks**

- Everything happens inside a workspace. Create or pick a workspace before writing anything.
- Publishing is a two-step dance: create a version from the workspace, then publish that version.
- Resource paths are long and positional: accounts/{a}/containers/{c}/workspaces/{w}/tags/{t}.
- tagmanager.publish without edit.containerversions cannot create the version it would publish.

## Google tag gateway for advertisers (Cloudflare)

- id: `tag-gateway`
- docs: <https://support.google.com/tagmanager/answer/16061641>
- acts on individual users' private data: no

No OAuth scopes.

**Quirks**

- NOT an OAuth API. There is no client, no token, no scope. Do not build a Worker integration for it.
- It is a Cloudflare zone-level feature that serves Google tags from your own domain path, replacing third-party tag requests with first-party ones.
- Configured in the Cloudflare dashboard against a zone, then pointed at from GTM or the Google tag. Formerly called first-party mode.
- Relevant to this framework only in that it lives on the same Cloudflare account as your Workers — it is a dashboard toggle, not code.

## Search Console API

- id: `search-console`
- enable: `searchconsole.googleapis.com`
- base: `https://searchconsole.googleapis.com/webmasters/v3`
- docs: <https://developers.google.com/webmaster-tools/v1/api_reference_index>
- acts on individual users' private data: no

| scope | class | verified | does |
|---|---|---|---|
| `webmasters.readonly` | sensitive | no | read search analytics and sitemaps |
| `webmasters` | sensitive | no | manage sites and sitemaps |

**Quirks**

- Search analytics data lags roughly two days; do not alert on today.
- siteUrl must match the verified property exactly, including sc-domain: prefix for domain properties.
- Row limits cap at 25000 per request; paginate with startRow.

## Merchant Center / Content API

- id: `merchant-center`
- enable: `shoppingcontent.googleapis.com`
- base: `https://shoppingcontent.googleapis.com/content/v2.1`
- docs: <https://developers.google.com/shopping-content/guides/quickstart>
- acts on individual users' private data: no

| scope | class | verified | does |
|---|---|---|---|
| `content` | sensitive | no | manage products, feeds, and account |

**Quirks**

- Product ids are composite: channel:contentLanguage:targetCountry:offerId.
- Batch endpoints exist and are dramatically cheaper than per-product calls.
- The newer Merchant API is superseding Content API v2.1 — check which your account is on before building.

## BigQuery

- id: `bigquery`
- enable: `bigquery.googleapis.com`
- base: `https://bigquery.googleapis.com/bigquery/v2`
- docs: <https://cloud.google.com/bigquery/docs/reference/rest>
- acts on individual users' private data: no

| scope | class | verified | does |
|---|---|---|---|
| `bigquery` | sensitive | no | run jobs and manage datasets |
| `bigquery.readonly` | sensitive | no | read data and metadata |
| `cloud-platform` | sensitive | no | broad GCP access, avoid unless needed |

**Quirks**

- This is a GCP resource API, not user data. Use a SERVICE ACCOUNT, not the OAuth vault — see the service-account decision rule.
- Queries are asynchronous jobs by default; jobs.query with a timeout is the synchronous shortcut.
- Billing must be enabled on the project or every query fails.

## Google Calendar

- id: `calendar`
- enable: `calendar-json.googleapis.com`
- base: `https://www.googleapis.com/calendar/v3`
- docs: <https://developers.google.com/calendar/api/auth>
- acts on individual users' private data: yes

| scope | class | verified | does |
|---|---|---|---|
| `calendar` | sensitive | no | full calendar access |
| `calendar.readonly` | sensitive | no | read calendars and events |
| `calendar.events` | sensitive | no | manage events only |

**Quirks**

- Recurring events expand only when singleEvents=true; otherwise you get the rule, not the instances.
- Incremental sync uses syncToken, which expires and returns 410 — handle by resyncing from scratch.
- All-day events use date, timed events use dateTime. They are different fields.

## Google Sheets

- id: `sheets`
- enable: `sheets.googleapis.com`
- base: `https://sheets.googleapis.com/v4/spreadsheets`
- docs: <https://developers.google.com/sheets/api/scopes>
- acts on individual users' private data: yes

| scope | class | verified | does |
|---|---|---|---|
| `spreadsheets` | sensitive | no | read and write all sheets |
| `spreadsheets.readonly` | sensitive | no | read all sheets |
| `drive.file` | non-sensitive | yes | only sheets this app created — prefer this |

**Quirks**

- drive.file works for Sheets the app creates and avoids sensitive classification entirely.
- values.batchUpdate is far cheaper than repeated single-range writes.
- A1 notation is 1-indexed; the API's grid ranges are 0-indexed and half-open. Mixing them is the classic bug.

## Google Docs

- id: `docs`
- enable: `docs.googleapis.com`
- base: `https://docs.googleapis.com/v1/documents`
- docs: <https://developers.google.com/docs/api/how-tos/overview>
- acts on individual users' private data: yes

| scope | class | verified | does |
|---|---|---|---|
| `documents` | sensitive | no | read and write all docs |
| `documents.readonly` | sensitive | no | read all docs |
| `drive.file` | non-sensitive | yes | only docs this app created — prefer this |

**Quirks**

- Edits are batchUpdate request arrays applied in order; indexes shift as you go, so build requests back-to-front.
- There is no plain-text write. Everything is structural requests.

## Google Slides

- id: `slides`
- enable: `slides.googleapis.com`
- base: `https://slides.googleapis.com/v1/presentations`
- docs: <https://developers.google.com/slides/api/guides/overview>
- acts on individual users' private data: yes

| scope | class | verified | does |
|---|---|---|---|
| `presentations` | sensitive | no | read and write all presentations |
| `presentations.readonly` | sensitive | no | read presentations |
| `drive.file` | non-sensitive | yes | only decks this app created — prefer this |

**Quirks**

- Same batchUpdate model as Docs. Object ids you supply must be unique per presentation.

## Google Forms

- id: `forms`
- enable: `forms.googleapis.com`
- base: `https://forms.googleapis.com/v1/forms`
- docs: <https://developers.google.com/forms/api/guides>
- acts on individual users' private data: yes

| scope | class | verified | does |
|---|---|---|---|
| `forms.body` | sensitive | no | create and edit forms |
| `forms.responses.readonly` | sensitive | no | read responses |

**Quirks**

- Response watches are push notifications via Pub/Sub, not polling.

## Admin SDK Directory

- id: `admin-directory`
- enable: `admin.googleapis.com`
- base: `https://admin.googleapis.com/admin/directory/v1`
- docs: <https://developers.google.com/admin-sdk/directory/v1/guides/authorizing>
- acts on individual users' private data: no

| scope | class | verified | does |
|---|---|---|---|
| `admin.directory.user` | sensitive | no | manage users |
| `admin.directory.user.readonly` | sensitive | no | read users |
| `admin.directory.group` | sensitive | no | manage groups |

**Quirks**

- Only a Workspace super-admin can consent. This is the one API where domain-wide delegation is usually the right answer instead of the token vault.
- customer=my_customer is the shorthand for the authenticated admin's own domain.

## Google Business Profile

- id: `business-profile`
- enable: `mybusinessbusinessinformation.googleapis.com`
- base: `https://mybusinessbusinessinformation.googleapis.com/v1`
- docs: <https://developers.google.com/my-business/content/basic-setup>
- acts on individual users' private data: no

| scope | class | verified | does |
|---|---|---|---|
| `business.manage` | sensitive | no | manage listings and reviews |

**Quirks**

- Access requires an approved application to Google before the API returns anything — enabling it is not enough.
- The API is split across several hostnames by concern (business information, account management, notifications).

## YouTube Data API

- id: `youtube`
- enable: `youtube.googleapis.com`
- base: `https://www.googleapis.com/youtube/v3`
- docs: <https://developers.google.com/youtube/v3/guides/auth/installed-apps>
- acts on individual users' private data: yes

| scope | class | verified | does |
|---|---|---|---|
| `youtube.readonly` | sensitive | no | read channel and video data |
| `youtube` | sensitive | no | manage account |
| `youtube.upload` | sensitive | no | upload videos |

**Quirks**

- Daily quota is small and per-project, not per-user. Search costs 100 units per call.

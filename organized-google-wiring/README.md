# organized-google-wiring

A framework for wiring any Google API into a Cloudflare Worker, captured from a build that hit most of the sharp edges.

The expensive knowledge here is not the code. It is that no API exists for creating OAuth web clients, that an app left in Testing status kills every refresh token after seven days, that restricted scopes drag an annual security assessment behind them, and that `return handler()` instead of `return await handler()` silently turns every error path into a bodyless 500.

## What's inside

**Skills**

- `google-api-wiring` — the core framework: choosing the auth model, building the encrypted token vault, fanning out across accounts, scoping by role
- `google-oauth-preflight` — Console setup, provisioning, and the traps that break consent
- `google-api-catalogue` — scopes, endpoints, verification cost and quirks per API
- `google-worker-scaffold` — generate a deployable starter Worker
- `google-build-brief` — emit a paste-ready Claude Code build brief

**MCP server** — `google-api-atlas`, zero dependencies, no network:

| Tool | Answers |
|---|---|
| `google_api_lookup` | base URL, service to enable, scopes, quirks |
| `google_scope_plan` | merged scopes for several APIs plus verification burden |
| `google_auth_decision` | service account vs delegation vs token vault |
| `google_wrangler_config` | binding block and secret list |
| `google_oauth_checklist` | the Console steps that cannot be automated |
| `google_failure_modes` | symptom to cause to fix |

**Agent** — `google-oauth-auditor`, checks an existing Worker against eighteen known defects.

**Scripts** — `gcp-provision.sh` (project, APIs, D1, KV, schema, secrets), `set-google-secrets.sh` (uploads the client, refuses desktop-type clients), `oauth-doctor.sh` (diagnoses a live deployment).

## APIs covered

Gmail, Drive, GA4 Data, GA4 Admin, Google Ads, Tag Manager, tag gateway, Search Console, Merchant Center, BigQuery, Calendar, Sheets, Docs, Slides, Forms, Admin SDK Directory, Business Profile, YouTube Data.

## Start here

Ask for what you want in plain language — "wire up the GA4 API on a Worker", "which scopes do I need for Tag Manager", "why did my tokens expire" — and the matching skill loads.

For a new integration the order is always: decide the auth model, provision what is scriptable, deploy and health-check before OAuth exists, create the client in the Console, push secrets, connect one account, then prove the token is ciphertext before connecting more.

## A note on scope classifications

Gmail and Drive classes were read from Google's own per-API documentation and are marked verified. The rest carry correct scope strings with a best-effort class. Google reclassifies scopes; re-check at <https://support.google.com/cloud/answer/13464321> before planning a verification submission. The catalogue says which is which rather than implying uniform certainty.

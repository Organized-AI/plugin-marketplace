---
name: meta-api-wiring
description: Core framework for wiring Meta APIs into a Cloudflare Worker — choosing the token type, building a self-refreshing system-user token vault, surviving Business Use Case rate limits, and fanning out across ad accounts and client businesses. Use when the user says "connect Meta to a Worker", "wire up the Marketing API", "build a Facebook Ads integration", "multi-account Meta", "manage client ad accounts", "Meta OAuth on Cloudflare", "system user token", or asks how to hold Meta credentials for several businesses at once.
---

# Wiring Meta APIs into Cloudflare Workers

Follow this whenever a Worker needs to talk to Meta's Graph or Marketing API. The framework mirrors the Google one, but the constraints are different in ways that break naive ports — read Step 3 carefully even if you have done this on Google.

## Step 1 — Pick the token type before writing anything

Meta's token types are not interchangeable and the wrong choice means rebuilding the vault.

| Situation | Token | Why |
|---|---|---|
| Server-side conversion events only | **Dataset-scoped CAPI token** | Events Manager mints it. No app, no system user, no vault. |
| Unattended Worker, your own assets | **System user token, 60-day expiring** | The only Meta credential designed for machine-to-machine use. |
| Unattended Worker, client businesses | **System user token per client business** | Each client's business creates a system user and assigns you assets. Also triggers Advanced Access and Business Verification. |
| Human present, interactive | **Long-lived user token** | ~60 days, exchanged server-side. Cannot be renewed once expired — the human logs in again. |

Call `meta_auth_decision` to settle this in one shot. Do not build a vault for CAPI-only work.

## Step 2 — Provision what can be automated

**Automatable via the Business Management API:** creating businesses, creating ad accounts, creating system users, assigning assets, minting and refreshing tokens. Run `scripts/meta-provision.sh`.

**Not automatable:** creating the Meta app itself. `POST /{business_id}/owned_apps` looks like it creates one — the auto-generated reference even says "an Application will be created" — but it accepts no parameters and returns an access status. It claims an app that already exists. App creation, use-case selection, App Review submission and app-secret rotation are all dashboard-only. See `meta-app-preflight`.

Two choices made at app creation are permanent: **use cases cannot be removed**, and **the app secret cannot be rotated via API**.

## Step 3 — The token vault, which differs from Google's in one critical way

On Google, a long-lived refresh token mints short-lived access tokens and persists unchanged. **On Meta there is no refresh token.** The system user token is itself the bearer credential, and refreshing it returns a **new token string that replaces the old one**.

That inverts the storage model:

1. **Read-modify-write the credential itself**, not a separate refresh token.
2. **The old token stays valid until its original expiry.** Refresh, deploy, verify, then revoke the old one explicitly. That overlap makes non-atomic deploys safe — use it.
3. **Refresh resets to 60 days from the refresh date**, it does not extend. Refreshing early is idempotent and free, so schedule a cron at ~45 days.
4. **Failing to refresh forfeits the token entirely** — Meta's word. There is no grace period and no recovery except minting a new one by hand.
5. **Encrypt at rest** with AES-GCM and per-account HKDF keys, exactly as on Google. One IV per ciphertext.
6. **Meta never tells you a token died.** No webhook, no notification. Tokens can also be invalidated early for security reasons. Probe `/debug_token` on a schedule and surface `reauth_required` rather than discovering it mid-campaign.

Working implementations are in `references/code-modules.md`.

## Step 4 — Respect Business Use Case rate limiting

Meta's throttling is per business object *and* per use-case type, reported in response headers rather than status codes alone.

- Values in `X-Business-Use-Case-Usage` are **percentages of allowance**, not call counts. Treat 90 as critical and 100 as throttled.
- `estimated_time_to_regain_access` is in **minutes**. `X-Ad-Account-Usage.reset_time_duration` is in **seconds**. Normalise at the parsing boundary or your backoff will be wrong by 60x.
- Buckets are independent: `ads_management`, `ads_insights`, `custom_audience`, `instagram`, `leadgen`, `pages`. Being throttled on one leaves the others usable.
- Back off using the header's own estimate rather than a fixed sleep.

Pipe any header or error code through `meta_rate_limit_decode` rather than reasoning about it by hand.

## Step 5 — Pin your API version

Marketing API **does not support unversioned calls** — omit the version and the call fails outright, unlike Graph API which silently falls back to a dashboard default. Marketing versions ship roughly every four months with only about **90 days** of overlap, against Graph's two-year guarantee. Watch for `X-Ad-Api-Version-Warning`, which means an auto-upgrade fired. Pin explicitly and bump deliberately.

## Step 6 — Make every call name its account, and never default to all

Same two invariants as any multi-tenant system, and they matter more here because the blast radius is a client's ad spend:

- **No mutating route defaults to "all ad accounts."** Creating or activating ads against the wrong client is the worst thing this system can do.
- **One account failing never fails a fan-out.** Return 207 with a per-account error array, stamped with the account it came from.

Create everything **paused** and activate deliberately. Both Meta's own CLI and its hosted MCP server do this by default; match them.

## Step 7 — Review before shipping

Run `meta_failure_modes`, or launch the `meta-token-auditor` agent. The highest-value checks: is the refresh scheduled inside 60 days, does the code treat header values as percentages, is the Marketing version pinned, and is `ads_read` (not `ads_management`) used for Conversions API.

## Reference material

- `references/token-model.md` — every token type, lifetime, refresh and revoke call
- `references/code-modules.md` — vault with self-replacing tokens, BUC-aware client, fan-out
- `references/failure-modes.md` — symptom, cause, fix
- `references/architecture.md` — component diagram and data model

## Related skills

- `meta-app-preflight` — the dashboard steps and irreversible choices
- `meta-api-catalogue` — permissions, endpoints, rate-limit buckets per surface
- `meta-worker-scaffold` — generate a deployable starter Worker
- `meta-ads-connectors` — Ads CLI vs hosted Ads MCP server vs calling Graph directly

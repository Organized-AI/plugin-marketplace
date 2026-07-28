# Failure modes — Meta

Symptom first, because that is how you meet them.

## Tokens

**Calls suddenly fail with error 190 and nothing changed.**
Meta never notifies you that a token became invalid, and tokens can be killed early for security reasons with no signal at all. Probe `/debug_token` on a schedule and surface `reauth_required` rather than discovering it mid-campaign.

**A system user token stops working roughly two months after setup.**
A 60-day expiring token was never refreshed. Meta's wording is that failing to refresh means *forfeiting* the token — there is no grace period and no recovery except minting a new one by hand. Cron the refresh at ~45 days.

**After refreshing, some requests use a stale credential.**
The Meta refresh returns a **new token string that replaces the old one**. There is no persistent refresh token as on Google. Read-modify-write the credential itself. The old value stays valid until its original expiry, so the swap is safe — but only if you actually write the new one back.

**Error 190 subcode 460 — "session is invalid because the user logged out".**
Emitted on logout *or* password change. User-derived tokens are inherently fragile; prefer system user tokens for anything unattended.

**Error 190 subcode 458 — "User has not authorized application".**
Also what you get when a user revokes authorisation. Re-consent required.

**Error 190 subcode 492 — Page token dies.**
The user behind the token no longer has an appropriate role on the Page. Re-mint from someone with a current role.

**Every integration dies at once.**
The app secret was reset — voluntarily, or forced by Meta after a leak. This revokes all user data grants. The secret cannot be rotated via API, so treat it as the highest-blast-radius credential you hold.

**Error 104, incorrect signature.**
`appsecret_proof` is wrong or missing. Two computations exist: HMAC of the token alone with no `appsecret_time`, or HMAC of `token|timestamp` **with** `appsecret_time`. Mixing them fails. Cast float timestamps to integers and hex-encode the digest.

## Rate limiting

**Backoff never triggers, or triggers constantly.**
BUC header values are **percentages of allowance**, not call counts. Treat 90 as critical, 100 as throttled.

**Backoff waits 60x too long or too short.**
`estimated_time_to_regain_access` is in **minutes**. `X-Ad-Account-Usage.reset_time_duration` is in **seconds**. Normalise at the parsing boundary.

**Constant 80004 throttling in production.**
The app is on the Limited (formerly Standard) Marketing API tier, which Meta explicitly describes as "for development only, not for production apps running for live advertisers." Qualify for Full access: 500+ calls in 15 days with under 15% error rate — and note you must make those calls *while* heavily throttled.

**Throttled on one thing, everything stops.**
BUC buckets are independent per type — `ads_management`, `ads_insights`, `custom_audience`, `instagram`, `leadgen`, `pages`. Scope your circuit breaker per bucket, not globally.

**Error 613 with no subcode.**
An abuse-prevention throttle. Subcodes point at specifics: 1487632 caps ad set budget changes at four per hour, 5044001 is a 100 QPS mutation burst, 1996 means Meta noticed inconsistent request volume.

## Versions

**Marketing API call fails outright for no obvious reason.**
Marketing API does not support unversioned calls. Omit the version and it fails — unlike Graph API, which falls back to a dashboard default.

**An integration breaks a few months after working fine.**
Marketing API versions ship roughly every four months with about 90 days of overlap, far shorter than Graph's two-year guarantee. Watch `X-Ad-Api-Version-Warning`, which fires when an auto-upgrade happens.

## Permissions

**Conversions API rejects a token that manages ads fine.**
`ads_read`, not `ads_management`, grants server-side event access.

**A permission request is rejected outright.**
Dependencies. `catalog_management` needs `business_management`; `ads_management` and `business_management` need `pages_read_engagement` and `pages_show_list`; `instagram_basic` needs `pages_read_user_content` and `pages_show_list`.

**A Page you own does not appear.**
System users only see explicitly assigned assets. Business Settings → System Users → Assign Assets.

**Token generation fails at the dashboard.**
The system user was never added as an **App Admin** under App Settings → Roles. Easy step to miss.

## Connectors

**Ads CLI hangs in CI.**
Business-id resolution falls back to an interactive prompt, and dataset creation is gated on a business admin accepting the business tools ToS. Set `BUSINESS_ID` explicitly, pass `--no-input`, and accept the ToS once by hand.

**Ads CLI rejects `--output json`.**
Global flags must precede the subcommand: `meta --output json ads campaign list`.

**Campaign created but nothing runs.**
Both the CLI and the hosted MCP server create entities **paused** by design. Activate campaign, ad set and ad separately. This is a safety feature.

**A working CLI token is rejected by the hosted MCP server.**
Different credential models. The CLI wants a system user token with Page scopes and `read_insights`; the MCP server documents user tokens and requires `ads_mcp_management`, which has no CLI equivalent.

## Process

**A test fails right after deploy and you blame propagation.**
Cloudflare takes 20–30 seconds to roll out. The first failure may be real propagation; the second identical one is not. Read `wrangler tail`.

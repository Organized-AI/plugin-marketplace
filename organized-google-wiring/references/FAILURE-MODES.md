# Failure modes

Every one of these was hit in a real build. Symptom first, because that is how you meet them.

## Auth and tokens

**All accounts stop working about a week after connecting.**
The OAuth app was left in **Testing** publishing status, which expires refresh tokens seven days after consent. Publish to In Production. Tokens minted while in Testing keep the seven-day clock, so those accounts must reconnect. Add a health check that flags any token not refreshed in six days — otherwise the failure is invisible until everything is dead at once.

**`redirect_uri_mismatch` that Console edits never fix.**
The client is type `installed` (desktop), which only accepts loopback and custom-scheme redirects. Check the downloaded JSON: `web` is usable, `installed` is not. Create a Web application client instead.

**`redirect_uri_mismatch` with a correct-looking client.**
Either the URI went into "Authorised JavaScript origins" instead of "Authorised redirect URIs", or the client lives in a different project than you think — the leading digits of a client id are the project number. Or you are inside the few-minute propagation window after saving.

**An account dies weeks later with `invalid_grant` despite steady use.**
The refresh response carried a rotated `refresh_token` that was never persisted. Always write it back when present.

**A working account suddenly has no refresh token at all.**
`INSERT OR REPLACE` on re-consent wrote NULL over a valid token, because Google omits `refresh_token` when the user already granted. Use a targeted UPDATE that cannot null an existing value.

**Everything looks fine but the crypto is weak.**
One `iv` column reused for two ciphertexts under the same AES-GCM key. Nonce reuse breaks GCM's integrity guarantees. Give every ciphertext its own IV; keep access tokens in KV with their own IV and TTL rather than beside the refresh token.

**Consent can be replayed.**
State nonce written at start and never read back at callback. Verify it against the database, require unconsumed and unexpired, and mark consumed atomically in the same statement that claims it.

## Runtime

**Every error path returns a bodyless 500; typed errors never appear.**
In an async router, `return handler(...)` inside `try` returns the promise before it settles, so rejections escape the `catch`. Use `return await handler(...)`. This one is invisible in the happy path and breaks every error path at once.

**Backoff works locally, still gets 429 in production.**
Rate-limit state kept in a module-level `Map`. Module globals do not survive isolate boundaries on Workers. Keep backoff in KV keyed by host and honour `Retry-After`.

**One broken account fails the whole multi-account request.**
`Promise.all` without per-item error capture. Wrap each account, collect failures, return `207` with a per-account error array.

**Sweeps time out or hit CPU limits.**
One job doing all accounts. Enqueue one message per account; when an account needs more than one invocation, re-enqueue it carrying a cursor. That gives resumability without a Durable Object.

**A poisoned account stalls an entire run.**
Retry a bounded number of times, then record the failure and ack, so the rest of the run completes. Send it to a dead-letter queue.

## Per-API

**Google Ads returns 401/403 with a valid bearer.**
Missing `developer-token` header, which is required on every call in addition to the bearer. Manager accounts also need `login-customer-id`. Strip hyphens from customer ids.

**Drive queries miss files the user can obviously see.**
`supportsAllDrives=true` and `includeItemsFromAllDrives=true` not set. Shared drive content is invisible without both.

**Downloading a Google Doc errors.**
Google-native files have no binary content. Use `/export?mimeType=...` rather than `alt=media`.

**Calendar returns rules instead of occurrences.**
`singleEvents=true` is required to expand recurring events. Also expect `410 Gone` on an expired `syncToken` — handle it by resyncing from scratch rather than crashing.

**Sheets writes land in the wrong cells.**
A1 notation is 1-indexed; grid ranges in the API are 0-indexed and half-open. Pick one and convert at the boundary.

**Docs or Slides batch edits corrupt the document.**
Index positions shift as earlier requests apply. Build request arrays back-to-front, or recompute indexes between batches.

## Process

**A test fails right after deploy and you blame propagation.**
Cloudflare genuinely takes 20–30 seconds to roll a version out, so the first failure may be real propagation. The second identical failure is not. Sleep once, retest, and if it still fails read `wrangler tail` rather than retrying.

**A liveness check passes against a broken OAuth client.**
Fetching the Google auth URL unauthenticated returns a sign-in page *before* redirect validation, so a broken client looks healthy. Verify by inspecting client type and the redirect URI the Worker actually emits, not by curling the auth URL.

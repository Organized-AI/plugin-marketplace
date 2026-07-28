---
name: google-api-wiring
description: Core framework for wiring any Google API into a Cloudflare Worker — choosing the auth model, building an encrypted multi-account token vault, fanning out across accounts, and scoping access by role. Use when the user says "connect Google to a Worker", "wire up the GA4 API", "build a Gmail/Drive/Ads/GTM integration", "multi-account Google", "orchestrate multiple Google accounts", "Google OAuth on Cloudflare", or asks how to hold refresh tokens for several Google accounts at once.
---

# Wiring Google APIs into Cloudflare Workers

Follow this framework whenever a Cloudflare Worker needs to talk to a Google API on behalf of one or more accounts. It exists because the same four decisions, and the same dozen failure modes, recur on every Google integration.

## Step 1 — Pick the auth model before writing anything

Getting this wrong costs days. Ask two questions:

**Does the app act on an individual human's private data** — their mail, files, calendar — or on a shared business resource like a GA4 property, an Ads account, or a BigQuery dataset?

**Do the accounts live in one Google Workspace tenant you administer, or across domains you don't control?**

| Situation | Model | Why |
|---|---|---|
| Business resource, not personal data | **Service account** | No consent screen, no refresh tokens, no verification. Grant the service account email direct access to the resource. |
| Personal data, all inside one Workspace you admin | **Domain-wide delegation** | One service account impersonates any user in the domain. No per-user consent. |
| Personal data, accounts across domains you don't admin | **Per-account OAuth refresh-token vault** | Delegation cannot cross a tenant boundary. Each account consents once. |

Call the `google_auth_decision` MCP tool with the API ids and the domain situation to get this decided in one shot. Do not build a token vault for reporting-only APIs — it is pure overhead.

The rest of this skill covers the third case, which is the hard one.

## Step 2 — Provision what can be automated

Scriptable: creating the GCP project, enabling APIs, creating Cloudflare D1/KV/R2/Queues, applying schema, uploading secrets. Run `scripts/gcp-provision.sh`.

Not scriptable, and no CLI changes this: **creating the OAuth Web application client**. There is no public API for it. The IAP OAuth client API produces IAP-locked clients on an internal brand only. gcloud, GAM and `gws` all hit the same wall. Read `skills/google-oauth-preflight` for the Console steps and the traps, and never promise the user this part can be automated.

## Step 3 — Build the token vault correctly

The vault holds long-lived credentials for accounts that are not yours. It is the highest-consequence component; everything else is plumbing. Six rules, each of which exists because a real implementation got it wrong:

1. **Encrypt refresh tokens at rest.** AES-GCM with a per-account key derived via HKDF from a master key salted by account id. Store `iv` and `key_version` alongside.
2. **Never reuse an IV.** Keep short-lived access tokens in KV with their own IV and a TTL — not in the same row as the refresh token. One `iv` column covering two ciphertexts under one key breaks AES-GCM.
3. **Verify OAuth state.** Single-use, expiring, checked against the database and marked consumed atomically. Writing a nonce and never reading it back is the most common OAuth bug in the wild.
4. **Persist rotated refresh tokens.** If a refresh response carries a new `refresh_token`, store it. Dropping it means silent death weeks later.
5. **Never NULL an existing refresh token.** Google omits `refresh_token` on re-consent when one already exists, so `INSERT OR REPLACE` will wipe it. Use a targeted UPDATE.
6. **Surface `invalid_grant`.** Mark the account `reauth_required` and show it, rather than failing silently on every subsequent call.

Working implementations of all six are in `references/code-modules.md`.

## Step 4 — Make every call name its account

Two invariants, enforced in code and covered by tests:

- **No mutating route defaults to "all accounts", and no send route infers the from-address.** It must be typed explicitly or rejected. Sending as the wrong client is the worst thing a multi-account system can do.
- **One account failing never fails a fan-out request.** Return `207` with a per-account error array, and stamp every returned item with the account it came from.

Default mutations to dry-run: execute only when the request carries `confirm: true`, and write the audit row *before* execution so a crash mid-flight still leaves evidence of intent.

## Step 5 — Scope access by role if more than one human uses it

Sign humans in with Google OAuth against the *same* client, routed through the *same* `/oauth/callback`, distinguished by a `purpose` column on the state row — this avoids registering a second redirect URI. Sign-in requests only `openid email profile`, so it never touches anyone's mail or files.

Roles: `owner` (everything including connecting accounts and managing people), `operator` (read and write against granted accounts), `viewer` (read only). Enforce per-account scoping in **both** the account resolver and the per-request account check, so naming an ungranted account id directly still fails. Attribute every audit row to the acting user.

## Step 6 — Review against known failure modes

Before shipping, run the `google_failure_modes` MCP tool, or launch the `google-oauth-auditor` agent against the codebase. The single most damaging non-obvious bug: in a router's `try` block, `return handler(...)` returns the promise before it settles, so rejections escape the `catch` entirely and every error path becomes a bodyless 500. Use `return await`.

## Reference material

- `references/architecture.md` — the full component diagram, data model, and route surface
- `references/code-modules.md` — proven, copy-ready implementations: crypto vault, authed API client with 401-refresh-retry, fan-out engine, role guards
- `references/failure-modes.md` — every failure mode with symptom, cause, and fix

## Related skills

- `google-oauth-preflight` — Console setup, provisioning scripts, the seven-day trap
- `google-api-catalogue` — scopes, endpoints and quirks per Google API
- `google-worker-scaffold` — generate a deployable starter Worker
- `google-build-brief` — emit a paste-ready Claude Code build prompt

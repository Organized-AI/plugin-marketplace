---
name: google-worker-scaffold
description: Generates a deployable Cloudflare Worker wired to one or more Google APIs, with the encrypted token vault, OAuth consent flow, and fan-out already built. Use when the user says "scaffold a Worker for the GA4 API", "start a new Google integration", "spin up a Worker for Sheets", "create a project that talks to Google Ads", "give me the starter", or asks for a template to build a Google-backed personal app quickly.
---

# Scaffold a Google-backed Worker

Produce a working deployment first, then extend. Never hand over a scaffold that has not been deployed and health-checked.

## Sequence

1. **Decide the auth model.** Call `google_auth_decision`. If it returns `service-account`, do not scaffold the vault — build a much smaller Worker that signs a JWT and calls the API. Say so rather than over-building.

2. **Resolve scopes.** Call `google_scope_plan` with the API ids and `mode: minimal` first. Show the user the verification cost before they commit to a scope set.

3. **Get the code.** `template/` ships the parts you edit — `schema.sql`, `wrangler.jsonc`, `src/config.ts` — complete and correct. For the runtime, clone `https://github.com/organized-ai/google-worker-template`, or rebuild from `google-api-wiring/references/code-modules.md` if offline. Then edit only `src/config.ts`: worker name, capability-to-scope map, and any extra headers an API demands.

4. **Provision.** Run `scripts/gcp-provision.sh` with the project and worker name. It creates the GCP project, enables the services, creates D1/KV, applies the schema, and generates `VAULT_MASTER_KEY` and `SESSION_SECRET`.

5. **Deploy before OAuth exists.** `wrangler deploy`, then confirm `/health` reports every binding bound and lists the two missing Google secrets. A green health check with known gaps beats a half-built local project.

6. **Preflight.** Hand the user the three Console links from `google-oauth-preflight`. Wait for the client. Run `scripts/set-google-secrets.sh`.

7. **Connect and verify.** After the first account connects, prove three things rather than assuming them: the D1 refresh token is ciphertext and does not begin with `1//`; a fan-out call returns attributed results; a deliberately broken account yields a 207 rather than a failure.

## Waiting for rollout

Cloudflare takes roughly 20–30 seconds to roll a new version to all edge locations. Tests run immediately after `wrangler deploy` will hit the old version and produce confusing results. Sleep before testing — and when a test fails twice in a row after a deploy, stop blaming propagation and read the logs with `wrangler tail`.

## What the template already contains

Encrypted token vault with per-account HKDF keys, PKCE plus single-use DB-verified OAuth state, rotation-safe refresh, account registry, fan-out engine with partial-success semantics and KV-backed rate limiting, dry-run-by-default write guards, role-based access with per-account scoping, an audit log, and a dark-theme GSAP dashboard served from Worker Assets.

Delete what a given project does not need. It is easier to remove the sweeps and roles from a working system than to retrofit encryption into one.

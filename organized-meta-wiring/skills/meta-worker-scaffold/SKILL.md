---
name: meta-worker-scaffold
description: Generates a deployable Cloudflare Worker wired to Meta APIs, with the self-refreshing system-user token vault, BUC-aware rate limiting and multi-account fan-out already built. Use when the user says "scaffold a Worker for the Marketing API", "start a new Meta integration", "build a Meta ads dashboard", "spin up a Worker for Conversions API", "give me the Meta starter", or asks for a template to manage several ad accounts programmatically.
---

# Scaffold a Meta-backed Worker

Produce a working deployment first, then extend. Never hand over a scaffold that has not been deployed and health-checked.

## Sequence

1. **Decide the token type.** Call `meta_auth_decision`. If it returns a dataset-scoped CAPI token, do not scaffold the vault — build a much smaller Worker that POSTs to `/{dataset-id}/events` with one secret. Say so rather than over-building.

2. **Resolve permissions.** Call `meta_permission_plan` with the surfaces. Show the user the expanded list including dependencies, and whether it implies App Review, before they commit.

3. **Get the code.** `template/` ships the parts you edit — `schema.sql`, `wrangler.jsonc`, `src/config.ts`. For the runtime, lift from `meta-api-wiring/references/code-modules.md`. Edit only `config.ts`: surfaces, permissions, API versions.

4. **Provision.** Run `scripts/meta-provision.sh` for the business, system user, asset assignment and first token — those parts are scriptable. The app itself you create in the dashboard first; `meta-app-preflight` has the steps.

5. **Deploy before the token exists.** Confirm `/health` reports bindings bound and the token secret missing. A green health check with known gaps beats a half-built local project.

6. **Mint and store the token,** then verify: `/debug_token` reports the expected type, scopes and expiry; a fan-out call returns attributed results; a deliberately broken account yields a 207 rather than a failure.

7. **Set the refresh cron before you walk away.** This is the step people skip and it is the one that kills the integration two months later. Verify the cron is registered in the deploy output, not just present in `wrangler.jsonc`.

## What the template already contains

Encrypted vault built for **self-replacing tokens** — the Meta refresh returns a new credential rather than minting from a persistent refresh token, so the vault does read-modify-write on the token itself and keeps the old one usable during the overlap window. Plus BUC-aware rate limiting that parses percentages and honours `estimated_time_to_regain_access`, fan-out with 207 partial-success semantics, dry-run-by-default writes, an audit log, and version pinning for both Graph and Marketing.

## Waiting for rollout

Cloudflare takes 20–30 seconds to roll a new version to all edges. Tests immediately after `wrangler deploy` hit the old version. Sleep once before testing — and if a test fails twice after a deploy, stop blaming propagation and read `wrangler tail`.

---
name: google-build-brief
description: Emits a copy-paste Claude Code prompt and environment variable reference for building a Google API integration on Cloudflare Workers. Use when the user says "give me the Claude Code prompt", "prompt for Claude Code", "I want to build this on the go", "Claude Code Web env vars", or asks for a phased build brief for a Google-backed Worker.
---

# Claude Code prompt generator

Emit two blocks. Do not summarise them or wrap them in commentary — the user copies them verbatim.

## Block A — the prompt

Open with the session command:

```bash
cd /Users/supabowl && claude --dangerously-skip-permissions
```

Then a prompt that must contain, in this order:

1. **First step: scaffold from the Organized Codebase agent templates** before any project code. Say explicitly not to improvise a different structure.
2. **What it is** — one paragraph naming the Google APIs and the auth model, with the reason the model was chosen.
3. **Existing resources to bind to, not create** — a table of D1 uuid, KV id, R2 bucket, queue names. Provision these first so the ids are real.
4. **Schema already applied** — tell it to read the live schema with `wrangler d1 execute <db> --remote --command "SELECT sql FROM sqlite_master"` and migrate forward, never recreate.
5. **Code to reuse** — name any existing deployed Worker with a working token vault and say which modules to lift.
6. **Defects to fix while lifting** — list them concretely; see `google-api-wiring/references/failure-modes.md`.
7. **The seven-day publishing trap** as a Phase 0 requirement, not a footnote.
8. **Per-account scopes**, with the classification table for the APIs in play.
9. **Route table** — every endpoint with its method.
10. **Hard rules** — no mutating route defaults to all accounts; no send route infers the from-address; one account failing never fails a fan-out.
11. **Build order** with a gate per phase, and an instruction to stop for confirmation after each.
12. **Verification requirements** — tests written as it goes, listing the specific properties to prove.
13. **Repo** — push to `https://github.com/organized-ai/<name>` (private).

Never include time estimates. Phases are an order, not a schedule.

## Block B — environment

Cloudflare: `CLOUDFLARE_API_TOKEN` (Workers Scripts Edit, Workers KV Edit, D1 Edit, R2 Edit, Queues Edit, Account Settings Read), `CLOUDFLARE_ACCOUNT_ID`.

Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_PROJECT_ID`.

Worker secrets via `wrangler secret put`, never in `wrangler.toml`: `VAULT_MASTER_KEY` (`openssl rand -base64 32`; losing it forces every account to re-consent), `SESSION_SECRET`, `GOOGLE_CLIENT_SECRET`.

Then the full `wrangler.jsonc` — call `google_wrangler_config` to generate it rather than writing it by hand — and the list of services to enable from `google_api_lookup`.

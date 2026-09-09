# Skill Loop connected history · Chumbo + Supabase

Keep Skill Loop’s existing QA engine and Claude artifact. This optional backend
adds an authenticated archive and an MCP App that saves review decisions across
chats. Organized AI · Jordaaan.

## Architecture

Desktop connector → Cloudflare Worker `/mcp` → Chumbo Supabase Edge Function →
Supabase Auth + Postgres with row-level security. The Worker is a proxy, not a
second database. It forwards OAuth and MCP discovery paths. No D1 or KV is needed.

Each signed-in user reads/writes only their own archive. All authenticated owners
have read, write and review access to their own data; these internal permission
labels are not separately negotiated read-only OAuth grants. Identity scopes are
limited to `openid` and `email`. No service-role key is exposed to the UI.

## Local builder setup

Requires Node22+, Deno, Supabase CLI, working Docker, and Wrangler. Participants
connecting to a hosted deployment do not need this development toolchain.

From this directory:

1. `npm ci --ignore-scripts` and `npm run build`.
2. `supabase start` (uses this project’s distinct local ports).
3. `supabase migration up --local`.
4. Copy `local-env.example` to `supabase/functions/.env.local`.
5. `supabase functions serve skill-loop --env-file supabase/functions/.env.local`.
6. In another shell, `wrangler dev --config cloudflare/wrangler.toml --env local --port 8787`.
7. `npx chumbo@0.11.0 doctor --url http://127.0.0.1:8787/mcp` checks discovery and
   the authentication challenge. A real signed-in local Supabase user token is
   required to call private tools; there is no authentication bypass.

A local Worker can reach local Supabase. A deployed Worker cannot reach your
computer’s localhost. Claude’s hosted custom connector also requires a reachable
HTTPS endpoint, OAuth server and dynamic client registration. Local SQL tests
alone do not verify that complete desktop connection.

## Hosted setup after local verification

Use a dedicated Supabase project. Link it, apply this migration, and deploy the
function with the Supabase CLI. The gateway’s `verify_jwt = false` permits Chumbo
to issue the OAuth challenge; Chumbo still authenticates every protected request.

- Enable Supabase OAuth server and dynamic client registration for Claude’s
  custom connector. Configure the app-owned sign-in/authorization page and
  authorized redirect URLs. Chumbo does not replace that product sign-in page.
- Set `MCP_PUBLIC_URL` to the final Worker HTTPS `/mcp` URL in Supabase secrets.
- Set `MCP_UPSTREAM` in `cloudflare/wrangler.toml` to the hosted Edge Function.
- Keep `LOCAL_DEVELOPMENT = "false"` in production.
- `wrangler deploy --config cloudflare/wrangler.toml --env ""` publishes the proxy.
- Run Chumbo doctor against the final public URL, then verify OAuth, discovery,
  a saved run, a new-chat read, and a review decision in Claude Desktop.
- Verify Codex separately; protocol compatibility is not a completed app test.

No production project, login flow or database is silently provisioned by this
package. Existing static workshop hosting can remain on Cloudflare.

## Save and inspect history

In a Skill Loop workspace, add a history configuration with stable names:

```json
"history": {
  "project": "my-workshop",
  "skillId": "tracking-health-check",
  "mode": "summary"
}
```

Use `history-export CONFIG` through the local Skill Loop engine to produce
`history-upload.json`, then have the signed-in Chumbo connector call
`save_history_record` for each exact record. No secret is needed to export.
In regular Claude Chat, these are assistant operations; users need not type
terminal commands. The user must explicitly choose cloud storage before upload.

`summary` is the default: hashes, timestamps, reported scores and component
counts, with raw source/output fields rejected by the server. `evidence` explicitly
uploads the supplied skill/package text, suite and responses. Review the content
before choosing that mode. Records are limited to700KB; larger package archives
remain local until a separate Supabase Storage path is implemented.

The connected tools are `save_history_record`, `list_skill_history`,
`get_history_record`, `open_skill_history`, `add_review_finding`,
`decide_review_finding` (app action), and `list_review_history`. Full evidence is
rescored with the same pure scoring module as the local engine. This proves the
checks on supplied outputs, not the provenance of the model run. Summary scores
are explicitly client-reported. Changing test conditions never implies comparable
scores or effectiveness drift by itself.

An optional machine client supports `history-sync`, `history`, and `history-report`
when configuration also contains the full HTTPS endpoint and a `tokenEnv` naming
an environment variable with a **Supabase user access token**. Tokens expire;
use the desktop OAuth connector for the normal participant experience. Do not
paste tokens into chat, HTML, source files, or the config. Sync is explicit;
no background process or automatic upload is enabled.

## Decisions, versions and retention

- Run/baseline/proposal/package snapshots are append-only and content-addressed.
  Re-uploading the same record is idempotent. Different versions have distinct
  hashes and remain readable over time.
- Findings attach to one exact saved record. Up to100 findings per record.
  Accept/dismiss/reopen updates require the current revision and append an audit
  event in the same database transaction. Dismissal requires a reason.
- Accepting a finding requests a fix; it does not approve a candidate, modify
  the installed skill, or change a QA score. Retest candidates using Skill Loop.
- The archive retains records until the account/project owner deletes them;
  no six-month expiry is configured. Supabase plan limits and backups still apply.
  A six-month history means keeping records and periodically syncing—not having
  already observed six months of data.
- Summary archives do not restore source files. Evidence snapshots may include
  text, but binary/oversized package files and automatic multi-file restore remain
  outside this release. This service never becomes an automatic skill updater.

## Verification

- `python3 tests/database.py`: actual isolated PostgreSQL migration, two-user RLS,
  owner spoof rejection, immutable archives, stale decision rejection, audit
  journaling, whitespace dismissal checks, and the finding cap.
- `deno test --config supabase/functions/skill-loop/deno.json --allow-env --allow-read --allow-net tests/`:
  Chumbo protocol with test identities, archive validation, rescoring, and proxy.
- `npm run check`, `npm run build`, and Wrangler deployment dry-run.
- The parent engine verification also checks that cloud/local scoring sources
  match. No model is required for these checks.

Tests using fixture identities are not a live OAuth or hosted Supabase proof.
Local PostgreSQL tests are not a running full Supabase Docker stack.

References: [Chumbo](https://github.com/elsheppo/chumbo),
[clean URL proxies](https://github.com/elsheppo/chumbo/tree/main/docs/reference/clean-urls),
[interactive apps](https://github.com/elsheppo/chumbo/tree/main/docs/patterns/mcp-apps-on-supabase).

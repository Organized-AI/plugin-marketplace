# Architecture

The shape a multi-account Google Worker takes. Delete layers a given project does not need; do not add encryption later.

```
                        ┌──────────────────────────────────────────────┐
                        │   DASHBOARD — Worker Assets + GSAP           │
                        │   account grid · runs · audit · people       │
                        └───────────────────────┬──────────────────────┘
                                                │ session cookie
                                                ▼
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                        Cloudflare Worker (single entry)                               │
│                                                                                       │
│  PUBLIC          │  IDENTITY           │  ACCOUNTS         │  DATA         │ CONTROL  │
│  /health         │  /auth/google       │  /oauth/start     │  /api/search  │ /api/    │
│  /api/session    │  /api/login (bg)    │  /oauth/callback  │  /api/<api>/* │  sweeps  │
│                  │  /api/users         │  /api/accounts    │               │ /api/    │
│                  │  /api/users/grant   │                   │               │  audit   │
└──────┬───────────────────┬──────────────────────┬─────────────────────┬───────────────┘
       ▼                   ▼                      ▼                     ▼
┌──────────────┐  ┌────────────────┐   ┌──────────────────┐  ┌──────────────────┐
│ TOKEN VAULT  │  │ ACCOUNT        │   │ FAN-OUT ENGINE   │  │ AUDIT LOG        │
│ AES-GCM      │◀▶│ REGISTRY       │◀─▶│ resolve filter   │─▶│ actor · account  │
│ HKDF per acct│  │ email · domain │   │ concurrency cap  │  │ action · outcome │
│ key_version  │  │ caps · health  │   │ per-acct timeout │  │ before + after   │
│ rotation-safe│  │ status         │   │ partial success  │  │ every mutation   │
└──────┬───────┘  └───────┬────────┘   └────────┬─────────┘  └────────┬─────────┘
       └──────────────────┴─────────────┬───────┴─────────────────────┘
                                        ▼
                    ┌──────────────────────────────────────┐
                    │ D1   accounts · tokens · oauth_state │
                    │      users · user_accounts           │
                    │      sweeps · sweep_runs · findings   │
                    │      sync_state · audit_log          │
                    └──────────────────────────────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        ▼                               ▼                               ▼
   ┌──────────────┐            ┌────────────────┐            ┌──────────────────┐
   │ KV           │            │ R2             │            │ QUEUE            │
   │ access tokens│            │ blobs, exports │            │ 1 msg per account│
   │ rate windows │            │ attachments    │            │ retry + DLQ      │
   └──────────────┘            └────────────────┘            └──────────────────┘

  ════════════════════ FAN-OUT: the reason this exists ════════════════════

   GET /api/search?q=...&accounts=*
              │
      ┌───────┼───────┬───────────────┬───────────────┐
      ▼       ▼       ▼               ▼               ▼
   acct_a  acct_b  acct_c          acct_d          acct_e
   you     yours   client one      client two      personal
      │       │       │               │               │
      └───────┴───────┴───────┬───────┴───────────────┘
                              ▼
              MERGE · dedupe · stamp every hit with its account
              partial failure → 207 + per-account error array
```

## Data model

`accounts` — one row per connected Google account. Opaque `account_id`, `email` unique, `domain`, `label`, granted `scopes`, per-surface enable flags, `status` (`active` / `paused` / `reauth_required`), `last_ok_at`, `last_error`.

`tokens` — one row per account. `refresh_token_enc` plus its own `iv` and `key_version`. Access tokens live in KV with a TTL, deliberately not here.

`oauth_state` — single-use CSRF state with `pkce_verifier`, `expires_at`, `consumed_at`, and a `purpose` column that lets one callback serve both account connection and human sign-in.

`users` / `user_accounts` — humans, roles, and which accounts each may reach.

`audit_log` — `ts`, `actor`, `account_id`, `action`, `target`, `outcome`, `detail`. Written before a mutation and updated after.

`sweeps` / `sweep_runs` / `sweep_findings` / `sync_state` — scheduled work and its incremental cursors.

## Request lifecycle

Authenticate → resolve principal and role → resolve the account allowlist for that principal → resolve the account filter against the allowlist → fan out with a concurrency cap and per-account timeout → merge, attribute, and return 200 or 207.

For writes, insert the audit row before executing, honour dry-run unless `confirm: true`, then update the audit row with the outcome.

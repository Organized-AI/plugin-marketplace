# Template

`schema.sql`, `wrangler.jsonc` and `src/config.ts` are the parts you edit; they are complete as-is.

The runtime — vault, BUC-aware client, fan-out — is in `meta-api-wiring/references/code-modules.md`. The vault is the one module that does **not** port from the Google framework: Meta has no refresh token, so refreshing replaces the credential itself.

Order: create the app in the dashboard → provision the system user and assets → deploy → health-check → mint the token → verify with `/debug_token` → **confirm the refresh cron is registered**.

That last step is the one people skip, and it is why Meta integrations die around day 60.

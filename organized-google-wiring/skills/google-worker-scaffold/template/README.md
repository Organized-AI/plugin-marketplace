# Template

`schema.sql`, `wrangler.jsonc` and `src/config.ts` are the parts you edit. They are complete and correct as-is.

The full runtime — token vault, OAuth callback, fan-out engine, role guards, dashboard — is deliberately not duplicated here. Get it from whichever is available:

1. `git clone https://github.com/organized-ai/google-worker-template` — the complete deployable Worker
2. `skills/google-api-wiring/references/code-modules.md` — the same modules inline, enough to rebuild offline

Then edit only `src/config.ts`: name the worker, define the capability-to-scope map for your APIs, and add any extra headers a specific API demands.

Order: provision → deploy → health-check → create the OAuth client in the Console → push secrets → connect an account → verify the token is ciphertext.

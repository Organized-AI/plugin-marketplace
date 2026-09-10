# Package backup and restore

Quick QA summaries use Claude's Cloudflare Developer Platform connector. Full backups use cloudflare-backup.mjs so the model never reproduces encoded bytes.

Configure CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID and CLOUDFLARE_API_TOKEN securely in the execution host. Never paste credentials into chat or HTML. Connector sign-in does not configure this adapter; stop and explain setup if these credentials are unavailable.

Save: node scripts/cloudflare-backup.mjs save CONFIG RECEIPT_JSON STABLE_SKILL_ID
Retrieve: node scripts/cloudflare-backup.mjs read CHECKPOINT_KEY FRESH_RECEIPT_JSON
Restore: node scripts/cli.mjs cloudflare-restore FRESH_RECEIPT_JSON NEW_DIRECTORY

The adapter verifies each actual stored chunk before committing and validates the complete readback. Restore creates a new directory and executes no code. It captures the selected package, suite, and saved local state; receipt coverage and exclusions remain authoritative. External linked files, dependency caches, credentials and unsaved browser edits are excluded. Current limit: 1 MB compressed checkpoint and 90 KB manifest, in addition to capture limits. Conflicting data fails verification rather than being overwritten. Historical scores do not prove present-day effectiveness.

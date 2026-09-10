# Optional Cloudflare history in Claude Chat

Run QA first. Cloud storage is optional. Use the participant's existing Cloudflare Developer Platform connector and their own confirmed D1 database. No custom Worker or Supabase setup is required for this route.

## Artifact handoff

The generated report contains a **Save My History** button and inert JSON evidence. The short request identifies the evidence by SHA-256. Read the actual HTML file in code execution, extract the indicated script element without executing HTML, and verify the raw text hash before parsing. Never reconstruct large evidence from chat text. If the file is missing, request the HTML using Claude's artifact-level Download menu (not a Blob download inside the preview).

The workshop dashboard passes current review choices separately, bound to its run identities and evidenceKey. Validate those before merging. Generic engine reports save the recorded runs, versions, proposals, and assessment; unsaved browser drafts are not saved.

Use immutable snapshots in D1, transfer exact generated values, fetch every stored value back, and verify hashes before reporting saved. Return the complete fetched receipt and database/snapshot identity for future retrieval. Failure, truncation, a missing file, or mismatched hashes means **not verified**, never success. Creating a new database requires the participant's chosen destination and authorization.

## Full current-package checkpoint (engine)

`node scripts/cli.mjs cloudflare-export CONFIG d1 STABLE_SKILL_ID [REVIEW_DECISIONS_FILE]` prepares SQL and a gzip/base64 checkpoint in the state directory; it does not save remotely. Execute its setup, writes and commit through the confirmed D1 connector. Read back the manifest and every chunk. Save the fetched `{manifest,chunks}` as a receipt, then run `cloudflare-verify RECEIPT`. Each chunk hash is SHA-256 of its UTF-8 base64 text; manifest.id hashes the decoded compressed bytes; contentHash hashes the decompressed bytes. Do not interchange them.

`cloudflare-restore RECEIPT NEW_DIRECTORY` restores verified files without executing commands or changing an installed skill. Reconnect the runner and review component checks before testing. The checkpoint includes selected current package bytes (including binaries), suite and saved local state. Exclusions are explicit. Historical runs may not contain older binary package versions. Credentials, dependency caches and external symlinks are not part of this restore guarantee. Review sensitive content before uploading; filenames alone are not a secret detector.

## Capability limits

The installed Cloudflare Developer Platform connector was tested for D1 SQL access. Its KV and R2 tools exposed namespace/bucket management, not value/object content operations. KV/R2 export plans are prepared formats only until a content-capable adapter is verified. A custom Worker remains an optional future adapter. Neither a prepared request nor local browser storage establishes cloud persistence.

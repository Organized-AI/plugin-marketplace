---
name: google-api-catalogue
description: Looks up scopes, endpoints, service names, verification cost, and implementation quirks for a specific Google API. Use when the user names a Google product and asks what it needs — "which scopes for GA4", "Google Ads API on Workers", "Tag Manager API", "Search Console scopes", "Merchant Center", "BigQuery from a Worker", "Sheets API", "Admin SDK", "Tag Gateway" — or asks how to reduce OAuth verification burden.
---

# Google API catalogue

Answer scope and endpoint questions from the catalogue rather than from memory. Google reclassifies scopes, and a confidently wrong scope table costs a verification cycle.

## How to use it

Prefer the MCP tools — they read the machine-readable catalogue and cannot drift from it:

- `google_api_lookup` — base URL, service to enable, scopes, docs link, quirks
- `google_scope_plan` — merged scope list for several APIs plus the verification burden, with `mode: read | minimal | full`
- `google_auth_decision` — whether this API even needs OAuth
- `google_wrangler_config` — binding block and secret list for a new Worker

Fall back to `references/catalogue.md` when MCP is unavailable.

## Verification cost drives scope choice

Three classes, in ascending cost: **non-sensitive** (basic verification), **sensitive** (verification past the unverified cap), **restricted** (verification plus an annual CASA security assessment).

Always check whether a cheaper scope does the job. The highest-leverage substitution across all of Google: `drive.file` is **non-sensitive** and covers Sheets, Docs, Slides and Drive files the app itself creates, where `drive`, `spreadsheets`, `documents` and `presentations` are sensitive or restricted. Restructuring so the app owns the files it touches can remove the CASA requirement entirely.

## Confidence

Gmail and Drive classifications in the catalogue were read from Google's own per-API scope documentation and are marked `verified: true`. Others carry the correct scope strings but a best-effort class, marked `verified: false`. Before planning a verification submission, re-check at `https://support.google.com/cloud/answer/13464321`. Say which is which rather than implying uniform certainty.

## Things the catalogue will tell you that memory will not

- **Google Ads** requires a `developer-token` header on every call in addition to the bearer, plus `login-customer-id` for manager accounts. A Worker that only sets `Authorization` silently 401s forever.
- **Google tag gateway for advertisers** is not an OAuth API at all. It is a Cloudflare zone feature that serves Google tags first-party from your own domain, configured in the Cloudflare dashboard. Do not build a Worker integration for it.
- **GA4 Data API and BigQuery** take a service account directly. Adding the service account email as a property viewer or dataset reader is simpler than any OAuth flow.
- **Admin SDK Directory** is the one API where domain-wide delegation is usually correct, because only a super-admin can consent.
- **Drive** silently hides shared drives unless `supportsAllDrives` and `includeItemsFromAllDrives` are both set, and Google-native files have no bytes — use `/export`, not `alt=media`.

---
name: cmp-audit
description: Audit consent management platform behavior on one or more web pages. Use when a user needs browser evidence for pre-consent, accept, reject, withdrawal, persistence, consent categories, GPC, or tracking changes.
---

# CMP Audit

Use the `cmp-audit` MCP tools when an audit should be run. Use the CLI when the user needs a local artifact or a CI-friendly command.

Start with the target URLs and the browser behaviors that matter. Cover representative templates when a tag, CMP, or app integration can differ by page. Use `audit_cmp_page` for one page and `audit_cmp_pages` for a batch.

Configure selectors when the CMP controls cannot be found by accessible name. For a category-level choice or multi-step preferences dialog, pass a `flows` object with click and toggle steps. Use the `withdraw` scenario only when the flow reaches a setting or preference control after acceptance.

Define a `profile` before auditing when the expected CMP, consent model, Consent Mode, geography, or scenario behavior is known. Validate it with `validate_cmp_audit_profile`. Locale and timezone do not verify geography; record how the network location was established.

Read `audit.json` with `read_cmp_audit` after a run. Use `explain_cmp_finding` for a finding's referenced evidence, `inspect_cmp_request` for a single request, `trace_cmp_vendor` for behavior across scenarios, `query_cmp_storage_events` for writes/removals, and `check_cmp_capture_health` before relying on the result. Compare releases with `compare_cmp_audits`.

Interpret findings as evidence to investigate. A request before consent may be a constrained consent-mode ping; inspect the endpoint, request body, data-layer state, and storage before deciding whether it violates the expected behavior. A clean result applies only to the tested pages, paths, and browser location.

Use a proxy configuration when the requested audit depends on the real network location. Locale and timezone alone do not change the source IP.

For detailed evidence reading and flow configuration, read [references/evidence.md](references/evidence.md).

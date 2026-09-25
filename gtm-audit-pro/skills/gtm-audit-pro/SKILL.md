---
name: gtm-audit-pro
description: Run a report-only GTM configuration audit before a workshop or after a container change. Inspect references, duplicate configurations, naming, unused components, legacy tags, and folders; save findings and questions.
---

# GTM Audit Skill Pro

Use the bundled sibling `gtm-autoresearch-loop` skill's
[setup reference](../gtm-autoresearch-loop/references/audit-integration.md).
Resolve its `scripts/runtime/cli.mjs` and run `audit` against a complete export or
authorized remote GTM target. Open the saved report and verify target and coverage.

Default to a one-time report-only run. If ongoing monitoring is requested, use
`start` or supervised `watch` with `optimize: false` and verify `status`. If the user
also requests Autoresearch, follow the sibling skill's bounded optimization setup.
No mode imports or publishes a GTM change. Existing `tidy-gtm` remains the separate
remediation workflow for explicitly authorized fixes.

This 0.1 release implements six static quality dimensions. Report skipped checks;
do not claim 72 checkpoints, GA4/ads reconciliation, compliance verification,
live firing validation, or a complete business-event audit. An exported file
source only sees new changes when that file is refreshed.

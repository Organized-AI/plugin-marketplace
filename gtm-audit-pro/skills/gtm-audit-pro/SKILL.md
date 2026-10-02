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

Every run also writes `audit.html`, an interactive container atlas: the tags,
triggers and variables drawn as a dependency diagram (Structured, Free-form,
Axonometric and Schedule views), with findings marked on the elements they apply
to, identical pairs linked, an inspector that traces what each element fires on,
reads and feeds, and a prioritized recommendation list. It embeds names, types and
relationships only, never parameter values such as constants or access tokens.
Each run also writes `hyperframes/index.html`, a 14-second HyperFrames composition
of the headline findings. To share the atlas, publish `audit.html` (combine a web
and server container with `htmlBundle`, see the setup reference). To make the
video, run `npx hyperframes lint` then `npx hyperframes render` on the
`hyperframes` folder on a machine with Chrome and ffmpeg. Both outputs contain
container and element names, so treat them as client material.

This 0.1 release implements six static quality dimensions. Report skipped checks;
do not claim 72 checkpoints, GA4/ads reconciliation, compliance verification,
live firing validation, or a complete business-event audit. An exported file
source only sees new changes when that file is refreshed.

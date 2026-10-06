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

Every run also writes `audit.html`, an interactive container atlas: tags,
triggers and variables drawn as a dependency diagram (Structured, Free-form,
Axonometric, Schedule and 3D views) with pan and zoom, draggable nodes, a
minimap and neighbor or full-path tracing. Findings are marked on the elements
they apply to and the inspector traces what each element fires on, reads and
feeds. When a web container and its server container are audited together
(`htmlBundle`), the atlas adds a Web → Server signal-flow tab: which web tags
send which events to the server, which client claims them, which server
triggers match and which platforms receive them, with dead ends, unreached
server tags and duplicate page-view fan-in called out. This is worked out from
configuration, not live traffic; say so when presenting it.
The atlas also has an Audit tab and a GTM auto tab (`node CLI atlas OUT.html
web.json server.json [--compiled gtm.js] [--observed scan.json] [--attribution
attr.json]`). The Audit tab gives every element a status (broken, not firing,
orphaned, drifted, duplicated, untested, paused, outside GTM, OK) from the static
audit, the signal flow, a comparison of the export with the published gtm.js,
and a browser scan of the live site. Say which inputs were supplied; without a
scan nothing is "verified live", and conversion tags stay untested unless the
scan performed those actions (it must never submit forms or purchases without
the site owner's permission). The GTM auto tab runs the Autoresearch loop in the
page on a stripped copy of the container (names, links, settings hashes) with
the same gates and identical scores; it proposes metadata-only operations and
never writes to GTM. "Export container (JSON)" applies the accepted rounds to the
user's own export file in the browser and saves an importable container for
them to import into a new workspace and review.
The page embeds names, types, event names, the endpoint host and relationships
only, never tag HTML or parameter values such as constants or access tokens.
Each run also writes `hyperframes/index.html`, a 14-second HyperFrames
composition of the headline findings. To make the video, run
`npx hyperframes lint` then `npx hyperframes render` on the `hyperframes` folder
on a machine with Chrome and ffmpeg. Both outputs contain container and element
names, so treat them as client material.

## One-shot report (Markdown + PDF, optional Jev)

`node CLI report OUT_DIR web.json [server.json] --website example.com [--jev] [--title T] [--name STEM]`
writes `STEM.md`, `STEM.pdf` (headless Chrome/Chromium/Edge; set `CHROME_PATH` if it is
not in /Applications; `--no-pdf` skips it), `STEM.print.html`, and `STEM-atlas.html` with
"Report (.md)" and "Report (PDF)" buttons in the header.

With `--jev`, every Fix first / Confirm finding goes to jev-gateway (Cloudflare Worker
behind AI Gateway `jev-gateway`) as one `evaluate` claim against
`RUB-S1-JEV-ATLAS-FINDING`, with the element's GTM notes, folder and paused state as
evidence: VERIFIED = fix, REFUTED = intended, INCONCLUSIVE/ERROR = ask the owner. Set
`JEV_GATEWAY_TOKEN` (direct; `JEV_GATEWAY_URL` overrides the endpoint) or `JEV_KEY`
(hosted key via the Container Atlas `/api/judge`). Without either, or if the gateway
fails, Jev is reported as not run and every finding stays with the user. Verdicts are an
appendix column only: they never change scores, priorities or statuses, and until the
rubric reaches the gating stage they are labelled suggestions. Tokens are read from the
environment and never written to any output; `STEM-jev.json` keeps the verdicts.

This release implements six static quality dimensions plus the optional live
evidence above. Report skipped checks; do not claim 72 checkpoints, GA4/ads
reconciliation, compliance verification, live firing validation beyond the
scanned pages, or a complete business-event audit. An exported file
source only sees new changes when that file is refreshed.

---
description: Reuse Fix Your Tracking's GTM Autoresearch workflow after an audit, with runtime preflight.
---

Load the bundled `gtm-autoresearch-loop` skill and its
`references/audit-integration.md`. Use the client/runtime location supplied in
the request, or discover it from the current workspace. Verify Node.js 22 and the
bundled runtime, then run an initial audit before enabling the loop.

If a report-only audit was requested, use the installed `gtm-audit-pro` skill;
do not launch mutation rounds. If optimization is authorized, reuse the original
bundled runtime and validation gates against an isolated container export. Preserve its
stopping conditions. Report candidate changes without importing or publishing
them unless the user authorized those actions.

If asked to watch for changes, inspect the existing host runner and follow the
integration reference. Do not claim a background process was installed by this
command alone or treat descriptive hook metadata as an executable monitor. Use
the bundled CLI's start/status/stop commands only when monitoring is requested.

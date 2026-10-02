# Setup and integration

## Requirements and source

Node.js 22 or newer; no npm dependencies. Resolve `scripts/runtime/cli.mjs`
relative to this installed skill, then use its absolute path in commands below.
Keep the configuration, exports, and output directory outside the plugin cache.
The examples use `CLI` to stand for that absolute path; it is not an installed command.

The canonical workflow is reused from Fix Your Tracking. Static checks are based
on its `tidy-gtm/references/audit-checklist.md`. Do not copy its heuristic claims
as verified facts: GA4 event tags (`gaawe`) are not UA tags, and container configuration
alone cannot establish live firing, consent timing, or conversion accuracy.

## One-time audit from an export

Save a GTM export as `container.json`. The runtime accepts its `containerVersion`
object or a direct container object. Require explicit `tag`, `trigger`, `variable`,
`folder`, and `builtInVariable` arrays. If a native export omits an empty collection,
confirm the export is complete before explicitly adding `[]`; do not silently
turn an incomplete MCP response into an empty, passing audit.

Create `audit-config.json` alongside the export:

```json
{
  "source": { "type": "file", "path": "container.json" },
  "outputDir": ".gtm-audit",
  "intervalSeconds": 60,
  "stablePolls": 2,
  "maxConsecutiveErrors": 3,
  "optimize": false
}
```

```sh
node CLI audit audit-config.json
```

Paths are relative to the config file. Reopen `audit.md`, `audit.json`, and
`questions.md` in the returned run directory. The same folder holds `audit.html`
(interactive container atlas) and `hyperframes/index.html` (video composition). Empty inventories are valid but
do not prove required business events exist. Generated reports are private local
files; nothing is sent to recipients automatically.

## Monitor real GTM changes

Replace `source` with the selected numeric API account/container/workspace IDs:

```json
{
  "type": "gtm",
  "accountId": "123456",
  "containerId": "789012",
  "workspaceId": "3",
  "tokenCommand": ["/absolute/path/to/your-existing-token-provider"]
}
```

The IDs above are examples; use verified IDs, not the `GTM-...` public ID. Omit
`workspaceId` to monitor the published version instead. The workspace source
reads all pages of tags, triggers, variables, folders, built-in variables, and
templates. This release targets web containers; server-specific clients and
transformations are not included in the workspace inventory.

The token command must print only a fresh Google OAuth access token with
`https://www.googleapis.com/auth/tagmanager.readonly` access to the target. It is
called on every capture, so the host provider owns secure storage and refresh.
For a short-lived trial, `tokenEnv` can name an existing environment variable
instead, but it will stop working when that token expires. Do not place tokens
in the JSON config, prompt, or reports. Interactive Stape MCP credentials are not
automatically reusable as Google API tokens. If no direct provider is available,
use a complete exported file for the one-time audit; disclose that file monitoring
does not detect remote edits unless an external exporter refreshes that file.

```sh
node CLI audit audit-config.json
node CLI start audit-config.json
node CLI status audit-config.json
node CLI stop audit-config.json
```

`start` launches a detached local process. It does not install a boot-time service;
the host must remain awake and a supervisor is needed for restart after reboot.
`watch` runs in the foreground for a host service manager. Windows service and
all five agent clients have not been end-to-end verified; any agent with local
Node and command access can invoke the same runtime, while ordinary Desktop chat
needs a local execution host.

Polling is eventual, not an event stream. Two matching captures are required by
default; intermediate edits may be coalesced. API calls are spaced seven seconds
apart by default to reduce quota pressure. Multiple targets share provider quotas.
Use one output root per host for all copies of this plugin: locks are per target
within that root, not distributed across machines or arbitrary output directories.

The watcher saves fingerprints across restarts, ignores its own generated files,
and logs only completion or errors. It retries failed work up to the configured
consecutive-failure limit, then exits nonzero for the supervisor. `stop` waits for
the current capture/round to finish. Use `status` to confirm exit. After a crash,
`unlock` removes a stale lock only when its recorded PID no longer exists; inspect
the process if the OS reused its PID.

## Enable Autoresearch candidates

First verify audit-only mode. For an authorized optimization workflow, add:

```json
{
  "optimize": true,
  "mutationCommand": ["claude", "-p", "--safe-mode", "--tools", "", "--disallowedTools", "mcp__*", "--output-format", "json", "--no-session-persistence"],
  "commandTimeoutMs": 120000,
  "loop": { "maxRounds": 5, "maxFailures": 2, "plateauRounds": 2 }
}
```

Check the installed Claude CLI supports these flags before using this example.
It disables customizations and tools; do not use a permissions-bypass flag. Each
round consumes the model account's usage. The model receives container content;
use only a model/provider your organization permits for that data.

Other providers can supply a trusted argv command that reads one JSON request
from stdin and emits only `{"operations": [...]}` to stdout. The request contains
the container, current findings, round number, and allowed operation shapes. Codex,
Hermes, and GrokBot adapters must satisfy that contract; no unverified CLI syntax
is assumed. Commands are administrator-controlled executable code, not a sandbox.

`node CLI loop audit-config.json` runs one bounded optimization. Restart the
watcher after config changes; with `optimize: true`, a new stable snapshot triggers
audit → propose → validate → keep/revert. Changing loop policy also forces a new run.
The runtime saves `optimization.json` and `candidate.json`; it never deploys them.
Candidates must improve the aggregate heuristic score without worsening any
dimension. Referenced-variable and sequenced-tag renames are rejected. Unresolved
reference or functional issues can remain; the output is not a deploy-ready claim.

## Verification

From `scripts/runtime`, run `node --test test/*.test.mjs`. Tests use synthetic
containers, mocked read-only API responses, and local process fixtures. Production
OAuth and a real model need a separate end-to-end smoke test on an authorized
container before workshop distribution.

## Provider references

- [GTM authorization](https://developers.google.com/tag-platform/tag-manager/api/v2/authorization)
- [Workspace tag pagination](https://developers.google.com/tag-platform/tag-manager/api/reference/rest/v2/accounts.containers.workspaces.tags/list)
- [Published container snapshot](https://developers.google.com/tag-platform/tag-manager/api/reference/rest/v2/accounts.containers.versions/live)
- [Claude CLI](https://code.claude.com/docs/en/cli-reference)

## HTML report and HyperFrames video

`audit.html` is an interactive container atlas in the GTM Command Center style.
It loads GSAP (cdnjs), Space Mono (Google Fonts) and, only when the 3D view is
opened, three.js r128 (cdnjs); everything else is inline. The page source lives
in `scripts/runtime/atlas/` (`client.js`, `style.css`) and is assembled by
`atlas.mjs`.

- Graph: a node for every tag, trigger, variable, client and referenced built-in;
  edges for firing and blocking triggers, `{{variable}}` reads, tag sequencing
  and identical-configuration pairs.
- Views: Structured, Free-form, Axonometric, Schedule (sortable table) and 3D
  (orbit, zoom, click to select, fly to selection).
- Explore: drag to pan, ctrl/cmd + scroll or pinch to zoom, drag nodes to move
  them, minimap, Fit, keyboard (+, -, 0, arrows, / to find, Esc to clear), and a
  Trace control that switches between direct neighbors and the full upstream and
  downstream path.
- Signal flow (web + server bundles): `flow.mjs` finds web senders (Stape Data
  Tags via `gtm_server_domain`, custom HTML posting to the endpoint, GA4 routed
  by a Google tag's `server_container_url`), picks the claiming client by type
  and priority, tests each event name against every server trigger condition
  (yes / no / maybe) and follows the fired server tags to their platform.
  Findings: dead-end events, server tags no web event reaches, page-view fan-in
  into one server tag, and GA4 clients nothing is routed to. Conditions that
  depend on request data are marked conditional. Events from other sources (apps,
  other containers, Google tag settings outside GTM) are not visible.

Animations always settle to their end state, so throttled tabs and previews
still show the full diagram. Only names, IDs, types, folders, event names, the
endpoint host and relationships are embedded. Tag HTML, constants and tokens are
read only to find references, event names and URLs, and are never written to
the page. Embedded data is JSON with `<` escaped.

Re-render an existing run after updating the plugin:

```sh
node CLI render path/to/run-folder
```

Combine containers (for example web plus server) into one page from Node:

```js
import { htmlBundle } from './scripts/runtime/report-html.mjs';
htmlBundle([{ report: webAudit, snapshot: webSnapshot }, { report: sgtmAudit, snapshot: sgtmSnapshot }],
  { title: 'Client Container Atlas', fragment: false });
```

`fragment: true` omits the `<html>`/`<head>`/`<body>` wrapper for hosts that add
their own, such as claude.ai artifacts.

The composition follows the HyperFrames contract: a `#stage` root with
`data-composition-id`, `data-duration`, `data-width` and `data-height`, and a
paused GSAP timeline registered on `window.__timelines`. Render it with:

```sh
npx hyperframes lint path/to/run-folder/hyperframes
npx hyperframes render path/to/run-folder/hyperframes --output audit.mp4 --quality draft --workers 1
```

Rendering needs Chrome and ffmpeg, so run it on a workstation rather than a
locked-down sandbox.

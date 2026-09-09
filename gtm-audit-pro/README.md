# GTM Audit Skill Pro

Installable GTM-only audit package backed by the same runtime bundled in GTM AI
and Fix Your Tracking. This release replaces the marketplace's previously missing
source with a scoped implementation; the earlier advertised 72-checkpoint engine
was not present and is not represented as implemented here.

```text
/plugin marketplace add Organized-AI/plugin-marketplace
/plugin install gtm-audit-pro@organized-ai-marketplace
```

These commands use the published marketplace; local branch changes must be
published before those commands install this release. In a checkout, load the
local plugin using your client's supported local-plugin installation mechanism.

## Agent prompt

Use GTM Audit Skill Pro to audit my selected GTM container before the workshop.
Read the bundled setup reference, verify Node.js 22, and create a persistent
config outside the plugin cache. Reuse my approved read-only token provider or
a complete container export. Run the audit and give me its report and top three
questions. If I request background monitoring, start the watcher, verify status,
and give me the stop command. Enable candidate optimization only if I request it.
Do not import or publish candidates.

## Capabilities

- Deterministic static checks across references, duplicates, naming, hygiene,
  legacy UA tags, and folders; honest skipped-check reporting.
- Complete paginated workspace reads or the current published container version.
- Stable-snapshot polling, persistent state, per-target locking, bounded retries,
  and start/status/stop commands.
- Optional model proposals for names and folder organization, with strict
  keep/revert evaluation on local candidates.

See [full setup](skills/gtm-autoresearch-loop/references/audit-integration.md) for
authentication, model adapters, source selection, and host requirements. MCP
login alone does not provision background Google API authentication.

Run `node --test skills/gtm-autoresearch-loop/scripts/runtime/test/*.test.mjs`.
The runtime is maintained in Fix Your Tracking and bundled by
`python3 gtm-ai-plugin/scripts/sync-autoresearch.py`; `--check` detects drift.

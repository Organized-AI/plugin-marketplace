---
name: gtm-autoresearch-loop
description: Audit GTM configuration changes and run a bounded score-propose-validate-keep/revert loop on exported candidates. Use for GTM Autoresearch, automatic re-audits, background container monitoring, or optimizing an audit report.
---

# GTM Autoresearch

Reuse Fix Your Tracking's container-audit criteria and keep/revert workflow with
the bundled dependency-free Node.js 22 runtime. Read
[setup and integration](references/audit-integration.md) before the first run.

## Modes

- **Audit**: inspect a complete GTM export or read the selected remote GTM target;
  save findings and workshop questions. No model required.
- **Loop**: ask a configured model command for metadata-only candidate edits;
  keep strict score improvements with no per-dimension regression. Stop after
  the configured rounds, plateau, or failures.
- **Watch/start**: poll the selected source, wait for stable snapshots, audit each
  changed snapshot, and optionally invoke the loop. A running host is required.
  Installing the skill alone does not enable monitoring.

The first runtime release implements six static quality dimensions: references,
duplicates, naming, hygiene, legacy UA tags, and folders. These are heuristic
configuration checks, not a complete tracking validation. The former skill
described an unavailable twelve-dimension ads-driven evaluator; this rebuild
does not claim to implement those missing checks. Report skipped coverage.

## Workflow

1. Identify the requested target and mode. Preserve the user's existing scope:
   an audit request does not authorize a background service or optimization.
2. Set up a persistent configuration outside the plugin cache using the reference.
   For direct remote monitoring, obtain read-only GTM OAuth through the host's
   existing credential provider; MCP login alone does not authenticate this runner.
3. Run the initial audit, reopen the report, and verify target and findings.
4. For an authorized loop, configure a trusted model command, validate it on a
   sample, and run `loop`. Save baseline, rounds, candidate, and final report.
5. For authorized monitoring, use `start` or a supervised `watch`, then verify
   status and a changed source. Provide the status/stop commands. Clearly identify
   whether the source is a live GTM workspace, published version, or local file.

The runtime can rename unreferenced components, add folders, and assign folders.
It cannot change tag parameters, consent settings, triggers, or delete components.
It only issues GET requests to GTM and never imports, publishes, or rolls back.
Use the existing `tidy-gtm` remediation workflow separately for authorized live fixes.

## Maintainer source

This directory in Fix Your Tracking is canonical. Run
`python3 gtm-ai-plugin/scripts/sync-autoresearch.py` from the marketplace checkout
to update the identical standalone bundles in GTM AI and GTM Audit Pro.
Run the same command with `--check` to detect drift. Do not edit bundled copies.

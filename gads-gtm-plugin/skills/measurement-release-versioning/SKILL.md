---
name: measurement-release-versioning
description: Capture, compare, and govern GTM and server-side GTM measurement releases. Use when a user wants to baseline a GTM/sGTM container, document a published container version, map pixel or event changes to results, compare tracking performance before and after a release, create a measurement changelog, or investigate whether a configuration change affected measurement.
---

# Measurement Release Versioning

Treat each tracking deployment as an immutable measurement release. Capture the baseline before editing, create/publish through the existing GTM workflow, then append validated outcome snapshots.

## Required baseline

Before a production change, capture:

| Area | Record |
| --- | --- |
| Web GTM | account/container, live version ID/name, workspace, preview evidence |
| sGTM | account/container, live version ID/name, hosting/domain evidence |
| Change | create/update/delete entities: tags, triggers, variables, clients, transformations, templates, consent |
| Contract | event schema version, required fields, dedupe key, consent gate, destinations |
| Destinations | platform + pixel/dataset/conversion-action identifier + mapping version; never tokens |
| Evaluation | owner, baseline window, comparison window, known confounders |
| Results | receipt, delivery errors, dedupe/match health, aggregate conversion and CRM outcome metrics |

Run `scripts/create_measurement_release.py` to create a new manifest. It stores identifiers and a configuration hash, never raw PII or credentials.

## Workflow

1. Read the current live web GTM and sGTM versions using the GTM MCP.
2. Create a baseline release manifest before creating a mutable workspace.
3. Use `gtm-ai` and `gtm-debug-agent` to make and preview the change.
4. After explicit approval, publish immutable versions and add their IDs to the release record.
5. Append outcome snapshots only after the stated comparison window.
6. Compare implementation health separately from marketing performance.

## Comparison guardrails

- Do not compare a draft workspace with a published version.
- Keep event definitions and reporting windows consistent.
- Record overlapping changes in traffic, campaigns, creative, audience, budget, consent banner, website, CRM, and attribution settings.
- A higher match rate or event count is not proof that campaign performance improved.
- Prefer an experiment, holdout, phased rollout, or repeated windows over a single before/after claim.
- Roll back on duplicate events, invalid payloads, material unexplained data loss, or failed validation.

## Output

For a release comparison, return:

1. Container/version and event-contract differences.
2. Destination/pixel mapping changes.
3. Baseline and comparison windows with confounders.
4. Health metrics versus business metrics.
5. Confidence level, recommended next test, and any rollback decision.

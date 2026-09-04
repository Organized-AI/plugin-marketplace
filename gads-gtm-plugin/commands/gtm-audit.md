# /gtm-audit — superseded by gtm-audit-pro

> **This command is deprecated.** Its inventory → naming/duplicate check → optional browser-verify pipeline is now
> covered, more thoroughly, by the `gtm-audit-pro` plugin: the same inventory and correlation checks plus consent,
> data-layer parameter integrity, sGTM cross-container dedup, version history/drift, and offline-conversion /
> Data Manager API coverage — with a scored report and tiered recommendations instead of a single health number.
>
> Install it: `/plugin install gtm-audit-pro@organized-ai-marketplace`, then just describe what you want ("audit
> this GTM container") — no command syntax needed.

## What this command used to do

Ran a lighter version of the same idea: inventory (`gtm-ai`) → naming/duplicate analysis (`tidy-gtm`) → optional
browser verification (`gtm-debug-agent`) → a 0-100 health score.

## Still here for remediation

`tidy-gtm` itself is not deprecated — after `gtm-audit-pro` produces findings, `tidy-gtm` is still the tool that
actually applies fixes (renames, dedup, folder reorganization, republish). `gtm-audit-pro` is read-only by design
and never writes to your container; `tidy-gtm` is where you go once you know what to fix.

## Required MCP
- Stape GTM MCP (`gtm-mcp.stape.ai`)

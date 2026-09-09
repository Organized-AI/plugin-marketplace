---
name: skill-loop
description: Test uploaded reusable skills against explicit QA checks, compare versions, and return an interactive QA artifact in regular Claude Chat. Use for Skill Loop, effectiveness drift, or a Brain Gainz first-run demonstration.
---

# Skill Loop by Jordaaan — Claude Chat

Stay in regular Claude Chat. Run the included engine through Claude's code-execution
environment and return an interactive artifact in this conversation. No Cowork,
local terminal, separate coding-agent login, or local MCP setup is needed for this
route. The runtime still needs Node.js 22+ inside code execution; check it first and
report an unavailable runtime rather than inventing a test result.

## First run

Resolve `scripts/cli.mjs` relative to this SKILL.md, using a canonical absolute path.
Run its `doctor` command. For the workshop, use `humanizer-init` in a new empty workspace, record the model
in runner.label, then prepare and evaluate the returned full Humanizer skill and
paragraphs. Ingest the actual outputs, save a baseline, and generate report. Keep
an all-pass outcome; do not force a revision. The optional `demo` command runs
only a deterministic punctuation adaptation, not the full skill or a model.

## Required result: artifact in this chat

Read the generated HTML and create **Skill Loop QA Review · Jordaaan** with Claude's
available native artifact capability. Present the artifact as the output of the
run, with a brief explanation of the observed result. Preserve the actual saved
skill versions, scores, per-check outputs, QA source, and coverage from the engine.
Use the included charcoal/gold styling, Jordaaan branding, version selectors,
side-by-side comparison, and changed-line highlighting. If the native artifact
format requires adapting the HTML, preserve the evidence and behaviors exactly.
Do not regenerate scores from intuition or fabricate a completed run.

Artifact controls may compare saved evidence or edit an untested draft. A changed
draft loses the saved version's QA status immediately. When the user asks in chat
to test a draft, use the engine and refresh the artifact from the new output.
Requests for revisions or version choices continue in this conversation. Only an
explicitly approved engine decision changes the working skill copy. Artifact
version history and tested skill-version history are different records.

Do not replace the artifact with a website button, browser-demo link, localhost
address, or raw path. If native artifact creation is unavailable, return the
actual generated HTML as a downloadable file and state the specific limitation.
Do not claim a native artifact was created without the host returning one.
Do not publish the artifact or change sharing settings.

## Participant skills and QA

Regular Chat can test skills and source material the user uploads or explicitly
makes available to this conversation. It cannot inventory the user's computer
or silently replace skills installed in another app. Ask for the skill and its
QA source if missing. A skill without task-specific checks is untested.

Use `init` for a working copy and a versioned suite. Each case includes observable
checks and a named source of truth. For a skill that needs reasoning, `prepare`
returns skill text, supporting package context, and case inputs; evaluate those inputs without reading
private expected checks and return the requestId and outputs through `ingest`.
This is procedural separation, not an independent or blinded benchmark of the
assistant. Automatic `run` and candidate `stage` require a configured trusted
runner. Do not claim an unconfigured model adapter or an unexecuted candidate test
worked. The introductory rules demo supplies its own runner.

Save a reviewed baseline, then compare runs under matching test conditions.
Effectiveness drift means a previously passing check failed. Different suites or
runner settings are incomparable. A file change alone is not effectiveness drift.
After a completed run or authorized decision, regenerate `report CONFIG` and
update the chat artifact. Run fresh holdout cases before claiming broader quality.
Workspaces in code execution are not a permanent installation on the user's PC;
return requested revised skill files and evidence as downloadable outputs.


## Default: assess the supplied package

When a participant supplies a real skill, preserve its complete package directory,
including references, scripts, commands, hooks, assets, and dependency manifests.
Do not copy only SKILL.md into an empty workspace. Keep QA suite/config/state
outside the package and point `skill` to the original entrypoint in a working
copy. For a standard SKILL.md, the engine discovers the containing plugin root
when present; otherwise it inventories the skill directory. Set `package.root`
explicitly for nonstandard layouts. Custom lowercase entry files use a bounded
support-directory scan whose exclusions are shown; use an explicit root for all
associated root files. Single-file mode is an explicit limited opt-out.

Run `assess CONFIG` at intake; this does not execute discovered files. Package
context and fingerprints are also included by default in prepare, run, ingest,
inventory, and generated reports. Associated-file changes invalidate pending
outputs and approvals. Preserve component statuses and exclusions in the artifact.

Only configure executable checks that are appropriate for the selected test
workspace. A configured script check uses explicit argv, expected stdout and a
finite timeout, and is executed during run/ingest or `assess CONFIG --execute`.
Do not automatically execute scripts found in a downloaded package. Script checks
use a copied package snapshot and are host subprocesses, not an OS sandbox. Commands, hooks and external
tools without a verified host adapter are reported unsupported. Do not label a
script invocation as successful hook registration or a live connector test.
References without their own behavioral evidence and unconfigured components
remain untested. Full-package inventory is not full-package certification.

Entry-file proposals are guarded by the entire package fingerprint. History
preserves package-only versions. Restoring a historical entry while its supporting
files differ is blocked before any write; automatic multi-file restoration is
not yet supported. Return the complete reviewed package for manual installation
when needed, and never describe a downloaded export as an active installation.


## Optional connected history (Chumbo + Supabase)

Cloud storage is opt-in. Once the user chooses it and connects the deployed
Chumbo server, use stable history.project and history.skillId names in the
workspace config. Default to summary mode; full evidence mode uploads source
text, package content, tests and actual outputs and requires the user's choice.
Use the engine's history-export operation, then save each exact generated record
with the signed-in connector's save_history_record tool. Never invent hashes or
ask for database credentials in chat. A successful local run is not a successful
cloud save until the connector returns its acknowledgement.

Open the saved history with open_skill_history. Use get_history_record for exact
QA evidence and add_review_finding for prose findings bound to that record.
The connected app saves accept/dismiss/reopen decisions through the user's
existing authenticated connection. Accepting a finding requests a fix; candidate
approval and local skill changes still require the ordinary review workflow.

Do not describe the connected service as live until this deployment's login,
private save/read, and UI actions have been verified. If no connector is available,
keep the existing local artifact and export. Setup and limitations are documented
in storage/chumbo/README.md. The Cloudflare Worker is only a proxy; Chumbo and
Supabase handle the user's database access. No D1/KV fallback is automatic.

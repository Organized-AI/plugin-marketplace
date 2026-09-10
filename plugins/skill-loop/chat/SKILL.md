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

## Default first run: all accessible skills

When the user says “run this” or “run this for all skills,” assess all skills you can access in the current session. Do not start with a bundled example unless the user explicitly asks for a demo. Use code execution and file creation; do not switch to Cowork.

Inventory skills exposed through available skill tools, readable local directories, connected sources, and uploaded packages. Report the discovery sources and scope. A visible skill name does not prove its files are readable, and this session does not automatically have access to the user's entire computer. Keep inaccessible entries in the overview with the missing access stated; continue with accessible packages.

For each readable skill, inspect its complete package, including references, scripts, commands, hooks, assets, and dependencies. Interpret imperfect formatting without requiring a particular filename or frontmatter. Preserve package identities and originals. Use existing task-specific checks on actual outputs. When checks are absent, draft source-grounded cases and run appropriate checks where supported, clearly labeling inferred expectations and limited coverage. Do not execute discovered hooks or external actions simply to inventory them. Keep static package findings separate from behavioral results; unreadable packages are Inaccessible, unrun checks Untested, unavailable host execution Unsupported, and judgment calls Needs review. Never manufacture scores, failures, or revisions.

Return the approved Organized AI / Jordaaan interactive HTML layout with a selectable report for each discovered skill, actual evidence, coverage gaps, and contextual next-step requests. Show available results first; do not promise background work unless an actual runner is active. Keep baseline, drift, version review, and optional Cloudflare history behavior defined in the package guides. An artifact button prepares a request; it does not itself repair or save anything.

Resolve `scripts/cli.mjs` from the package root and run `doctor`. Prepare a separate working configuration for each assessed skill; use prepare/ingest for actual assistant outputs, then baseline and report as appropriate. Preserve all-pass outcomes. Do not run bundled fixtures as a substitute for the requested skills.

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

## Optional Save My History

Preserve the generated report's Save My History button and checksum-bound evidence.
Follow `storage/cloudflare/README.md`. Read the actual HTML file in code execution;
never reconstruct QA JSON from pasted text. Use the participant's confirmed D1
through Cloudflare Developer Platform, and verify full readback before saying saved.
The first QA run does not require a connector. This is a guided chat handoff, not
an automatic background save. Keep the HTML available for a later save request.


## Tolerant intake and initial checks

Assess every readable skill, even without YAML frontmatter, standard headings,
or a canonical filename. Accept plain instructions, Markdown, text, and uploaded
package contents. Preserve original bytes and paths; create a separate working
interpretation recording the entrypoint, purpose, inputs, outputs, requirements,
references, and uncertain assumptions. Do not rewrite the source just to parse it.
For a custom entrypoint such as README.md, explicitly select package.root so all
associated files are inventoried. Do not treat every README as a separate skill.
If multiple plausible entrypoints exist, expose the ambiguity rather than silently
merging their instructions. Resolve readable references within the selected package;
list inaccessible or unsupported components while continuing the accessible checks.

Do not stop at “untested” solely because a suite is absent. Draft a small initial
suite from explicit requirements: a normal case, a relevant edge case, and an
observable invariant when applicable. Record the exact QA source for each assertion.
Label inferred expectations separately and avoid inventing requirements. Run safe,
isolated cases when the host supports execution, keeping evaluator expectations
separate from the skill response. Report “initial checks passed” with the actual
coverage, not full verification. Subjective judgments need review. If requirements
are too ambiguous to score, ask one focused question and continue other skills.
Do not execute bundled hooks or external writes merely to discover requirements.
Retain “untested” only for checks that have not run, with a concrete reason and a
next-step action. A generated suite is not a run, and a static inspection is not a
behavioral test. Record the suite/version before establishing a comparable baseline.


## Default Claude artifact layout

Use `scripts/skill-loop-all-skills-layout-preview.html` as the approved visual reference (relative to the package root), also available at https://skill.organizedai.vip/workshop/files/skill-loop-all-skills-layout-preview.html. Read its HTML before producing the artifact. Keep its Organized AI wordmark, charcoal/gold palette, Jordaaan LinkedIn attribution, overview, selectable per-skill cards, separate QA and coverage states, case comparison, findings and next-step actions. Populate the layout with this run’s actual discovered skills and evidence. The reference contains saved example scores and hypothetical gap cards: do not copy those into a new assessment or imply they were just tested. Remove hypothetical cards unless explicitly demonstrating the layout. Preserve the engine’s evidence, version review, actionable request handoffs, compact Cloudflare summary save/readback, and separately configured package-backup path. Do not inherit the reference’s disabled preview-only controls into a real report, or claim a save/repair succeeded before verified execution. If only preview evidence is available, retain the preview label and disabled write controls.

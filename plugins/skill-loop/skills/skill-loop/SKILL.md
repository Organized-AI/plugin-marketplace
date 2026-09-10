---
name: skill-loop
description: Test reusable skills, establish baselines, detect effectiveness drift, and stage researched revisions with evidence. Use for Skill Loop, skill regression testing, drift checks, or a Brain Gainz demonstration.
---

# Skill Loop by Jordaaan

The bundled Node.js 22+ engine shares iteration mechanics with GTM Autoresearch.
Read `../../README.md` for setup and transport details. All paths below are relative
to this skill directory; resolve them to absolute paths before invoking commands.

1. Run `node ../../scripts/cli.mjs doctor`. For first-run discovery, use `overview`
   as described below. For behavioral QA, create a workspace outside the plugin cache
   with `init /absolute/empty/directory --skill /absolute/skill --suite /absolute/suite.json`.
   Add `--demo` only for
   the clearly labeled deterministic demonstration, which is not an AI benchmark.
2. For a real skill, configure its path and a versioned JSON test suite. Agree on
   task, observable checks, source of truth, and test cases. Keep private data out
   of fixtures unless the user authorizes its use with the selected assistant.
3. Use `prepare CONFIG` or the corresponding MCP tool. Evaluate only its returned
   skill and case inputs. Do not read the private suite/checks to answer cases.
   Return the supplied requestId and one JSON output per case, then `ingest` it.
   Automatic runs instead use a trusted, explicitly configured command adapter.
4. Save a completed current run as a baseline. Repeated runs can detect
   **effectiveness drift**: a previously passing check now fails. Changed suite,
   scorer, or runner settings are incomparable and need a separately reviewed baseline.
   A single failure is evidence to investigate, not proof that a model update caused it.
5. Investigate failed rules using the task's authoritative sources. Write a candidate
   skill and evidence/rationale, then `stage`. A configured proposer can use `loop`
   for bounded rounds. Research is performed by the host assistant/proposer;
   the engine does not supply a search service or verify source truth automatically.
6. Generate `report CONFIG` and deliver it as the interactive artifact described
   below, showing checks, drift, original and candidate. A candidate
   must strictly improve without losing any previously passing check to be eligible.
   Ask the user to approve the concrete proposal before `approve`; otherwise keep
   it staged. Installing or testing does not authorize changing the active skill.
7. Run holdout cases separately after revision. The first release has no enforced
   holdout partition, so do not describe training-fixture gains as general reliability.

Do not claim background monitoring is active after installation. `watch` is a
bounded foreground runner requiring a live host; enable only when requested.
Do not use the unrelated unscoped npm package named skill-loop.
The included rules demo and interactive HTML preview are verified in regular
Claude Desktop Chat using a repository link; this is not persistent installation.
Other host integrations require their own install and execution checks. Generic
MCP tests establish transport behavior, not every host integration.

## Default output: interactive QA artifact

After a completed test, demo, revision, or version decision, generate a fresh
report and return **Skill Loop QA Review · Jordaaan** as the task's artifact. The
report result includes its file path, MIME type, and preferred presentation.
## Fast first overview

For a first run, use the bundled renderer instead of writing a new dashboard:
`node /absolute/package/scripts/cli.mjs overview /absolute/empty/qa-output [accessible-skill-root ...]`.
This scans the selected roots and writes `inventory.json` and `report.html` without
running an LLM or executing discovered skills. In terminal agents, omitting roots
uses common local skill locations; in Claude Chat, pass the roots actually exposed
inside code execution or provided by authorized connectors. List additional sources
that cannot be accessed. Do not claim an exhaustive machine scan.

Present this HTML immediately using the host's artifact/file preview. Do not wait
for behavioral suites or redraw the layout before showing the first useful result.
Then run appropriate deeper checks for the discovered skills and update their results.
No suite or `init` is needed for an overview. An absent skill source needs an upload
or authorized connection, not a sample. Missing Node requires the host's runtime
setup; an expired coding-agent login requires that agent's normal sign-in.

## Default first run: all accessible skills

When the user says “run this” or “run this for all skills,” assess all skills you can access in the current session. Do not start with a bundled example unless the user explicitly asks for a demo. In regular Claude Desktop Chat, follow `chat/SKILL.md` (the ZIP bundles this as its root `SKILL.md`). Use code execution and file creation; do not switch to Cowork.

Inventory skills exposed through available skill tools, readable local directories, connected sources, and uploaded packages. Report the discovery sources and scope. A visible skill name does not prove its files are readable, and this session does not automatically have access to the user's entire computer. Keep inaccessible entries in the overview with the missing access stated; continue with accessible packages. If no skill package is readable, ask the user to attach one or connect an authorized source; do not substitute a bundled example.

For each readable skill, inspect its complete package, including references, scripts, commands, hooks, assets, and dependencies. Interpret imperfect formatting without requiring a particular filename or frontmatter. Preserve package identities and originals. Use existing task-specific checks on actual outputs. When checks are absent, draft source-grounded cases and run appropriate checks where supported, clearly labeling inferred expectations and limited coverage. Do not execute discovered hooks or external actions simply to inventory them. Keep static package findings separate from behavioral results; unreadable packages are Inaccessible, unrun checks Untested, unavailable host execution Unsupported, and judgment calls Needs review. Never manufacture scores, failures, or revisions.

Return the approved Organized AI / Jordaaan interactive HTML layout with a selectable report for each discovered skill, actual evidence, coverage gaps, and contextual next-step requests. Show available results first; do not promise background work unless an actual runner is active. Keep baseline, drift, version review, and optional Cloudflare history behavior defined in the package guides. An artifact button prepares a request; it does not itself repair or save anything.



In regular Claude Chat in Claude Desktop, use the host's available artifact capability to create
or update an interactive artifact from the generated self-contained HTML. Keep
the original and candidate, saved versions, change highlights, actual QA scores,
source, coverage, and untested-draft labels intact. If the host needs its own
artifact representation, preserve that evidence exactly; do not invent or
recalculate scores in the presentation layer. Return the artifact in the task
and use its preview when available. A website button, localhost URL, raw file
path, or prose summary alone does not fulfill artifact delivery.


Include **Save My History** from the generated report. It prepares a short,
file-backed request for the participant's Cloudflare Developer Platform connector.
Read the actual HTML evidence in code execution and verify its embedded hash;
never retype or summarize the payload. Preserve and validate current review choices.
Report saved only after exact D1 readback verification. If the HTML file is absent,
request it through the host artifact Download menu. No automatic background save
or direct artifact MCP bridge is implied. See `../../storage/cloudflare/README.md`
for the tested connector path, full-package checkpoint commands and limitations.

Keep Jordaaan branding, charcoal surfaces, gold controls, and readable side-by-side
comparison. Artifact edits remain untested drafts until the engine retests them.
Version choices and revisions still use the engine's existing approval flow.
Refresh the artifact after results change; artifact version history is not the
same as engine skill-version history. Keep sharing private to the task/user by
default; do not publish the artifact or broaden access.

When native artifact creation is unavailable or fails, attach the actual HTML
file as a downloadable task output and explain the preview limitation. Do not
claim native artifact delivery succeeded without a returned artifact or visible
output. In Codex, present the same HTML as a task file/preview using the available
file presentation capability. In terminal-only hosts, return the existing file.


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

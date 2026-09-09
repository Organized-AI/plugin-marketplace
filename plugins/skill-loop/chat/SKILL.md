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
returns only skill text and case inputs; evaluate those inputs without reading
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

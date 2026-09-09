---
name: skill-loop
description: Test reusable skills, establish baselines, detect effectiveness drift, and stage researched revisions with evidence. Use for Skill Loop, skill regression testing, drift checks, or a Brain Gainz demonstration.
---

# Skill Loop by Jordaaan

The bundled Node.js 22+ engine shares iteration mechanics with GTM Autoresearch.
Read `../../README.md` for setup and transport details. All paths below are relative
to this skill directory; resolve them to absolute paths before invoking commands.

1. Run `node ../../scripts/cli.mjs doctor`. Create a persistent workspace outside
   the plugin cache with `init /absolute/empty/directory`. Add `--demo` only for
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
For the workshop first run, follow the README’s Humanizer guide: humanizer-init,
prepare, actual assistant outputs, ingest, baseline, report. Use the supplied full
Humanizer skill and preserve actual outcomes, including an all-pass result.
The offline `demo /absolute/empty/directory` runs only an explicitly labeled
punctuation adaptation with a prepared correction. Do not substitute it for a
requested live Humanizer evaluation.

In regular Claude Chat in Claude Desktop, use the host's available artifact capability to create
or update an interactive artifact from the generated self-contained HTML. Keep
the original and candidate, saved versions, change highlights, actual QA scores,
source, coverage, and untested-draft labels intact. If the host needs its own
artifact representation, preserve that evidence exactly; do not invent or
recalculate scores in the presentation layer. Return the artifact in the task
and use its preview when available. A website button, localhost URL, raw file
path, or prose summary alone does not fulfill artifact delivery.

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

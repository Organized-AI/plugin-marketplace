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
6. Open `report CONFIG` to show checks, drift, original and candidate. A candidate
   must strictly improve without losing any previously passing check to be eligible.
   Ask the user to approve the concrete proposal before `approve`; otherwise keep
   it staged. Installing or testing does not authorize changing the active skill.
7. Run holdout cases separately after revision. The first release has no enforced
   holdout partition, so do not describe training-fixture gains as general reliability.

Do not claim background monitoring is active after installation. `watch` is a
bounded foreground runner requiring a live host; enable only when requested.
Do not use the unrelated unscoped npm package named skill-loop.
Do not claim Claude Desktop, Codex, OpenClaw, or Hermes host compatibility until
an actual install and tool call succeeds there. Generic MCP protocol tests alone
establish transport behavior, not every host integration.

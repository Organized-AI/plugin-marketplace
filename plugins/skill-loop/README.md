# Skill Loop by Jordaaan

Detect **effectiveness drift**, test a researched fix, and review it before it changes
an active skill. This first local engine uses the same bounded iteration core as
GTM Autoresearch. It requires Node.js 22 or later and no npm dependencies.

## One-command QA demo

From the plugin directory, run `node scripts/cli.mjs demo ~/skill-loop-demo`.
Use an empty destination. It runs real declarative rules, saves a baseline, tests
a prepared correction, and returns the visual report path without changing the
active skill. No account, model, cloud service, or result-id copying is required.

## Five-minute offline demo

From this plugin directory:

```sh
node scripts/cli.mjs doctor
node scripts/cli.mjs init ~/skill-loop-demo --demo
node scripts/cli.mjs run ~/skill-loop-demo/skill-loop.json
```

Copy the returned run `id` into the baseline command, then iterate:

```sh
node scripts/cli.mjs baseline ~/skill-loop-demo/skill-loop.json RUN_ID
node scripts/cli.mjs loop ~/skill-loop-demo/skill-loop.json
node scripts/cli.mjs report ~/skill-loop-demo/skill-loop.json
```

Open the returned report file. The supplied deterministic adapter scores 1/2,
then stages a prepared 2/2 candidate. It does not call an AI model, browse sources,
or prove general skill reliability. The original skill remains intact. After
review, use `approve CONFIG PROPOSAL_ID` or `reject CONFIG PROPOSAL_ID`.

## Connect your assistant

The Claude Code marketplace entry and Codex plugin both expose the `skill-loop`
skill. Ask your installed assistant to help initialize and run Skill Loop.
The skill resolves its bundled CLI path; keep your workspace outside the plugin cache.

For clients supporting local stdio MCP, run:

```sh
node scripts/cli.mjs connect
```

This prints the exact command and absolute argument path for this installation.
Add the returned server entry through your client's MCP settings; it does not
rewrite existing client configuration. Restart/reconnect as required by the host,
then call `skill_loop_init`, `skill_loop_prepare`, and `skill_loop_ingest`.
Claude Desktop, Codex, OpenClaw and Hermes require host-specific installation
verification. The transport is tested; this is not a blanket compatibility claim.

The engine also works without MCP: `prepare CONFIG` returns only the skill and
case inputs, and `ingest CONFIG response.json` scores the assistant's response.
The response must copy the requestId and contain exactly one `{id, output}` per
case. Private checks are withheld by prepare and command execution. This is
procedural isolation, not a security sandbox against an agent that can read disk.

For automated runs set `runner.command` to a trusted executable argv array.
It receives the prepared JSON on stdin and must return the same response shape
on stdout. `scripts/claude-runner.mjs` is an optional Claude Code adapter using
existing host authentication. It disables tools for the evaluation request.
No credentials are bundled, and no account setup is performed automatically.

## What drift means

- **Effectiveness drift:** a previously passing check now fails under the same
  versioned suite, scorer and runner configuration. Score drops and lost checks
  are recorded. Model randomness can cause failures; investigate and repeat.
- **Conditions changed:** suite or runner settings changed, making the old baseline
  incomparable. Model changes behind the same configured model alias can still be
  detected as output drift; actual model identity should be recorded by the operator.
- **GTM configuration drift:** the container snapshot changed. The GTM adapter
  separately checks whether any of its static audit dimensions worsened. It does
  not establish whether live conversion tracking broke.

## Research, iteration and approval

Research belongs to the domain assistant, using cited authoritative rules and
observed failures. `stage CONFIG candidate.md "source and rationale"` tests a
manual candidate. A trusted `proposerCommand` enables `loop`; it receives skill
text and test feedback, and returns `{text, evidence}`. Feedback contains expected
training answers. Use a separate holdout suite for a generalization check.

The shared core stops at a round limit, plateau, or failure limit. Domain adapters
own permissible changes and acceptance. Skill Loop requires a strict score
improvement with no lost passing check. GTM retains metadata-only edits, no lost
audit dimension, no increase in critical findings, and no live import/publish.

Proposal creation never applies a change. Approval verifies the current skill,
suite, baseline and candidate evidence; saves a backup; and uses a recovery journal
for interrupted writes. If interrupted, repeat approval for that same proposal.
Do not delete a lock until its recorded process has ended. Reports, inputs and
outputs remain local in the workspace state directory and may contain test data.

## Watching and limits

`watch CONFIG INTERVAL_SECONDS MAX_RUNS` repeats tests in the foreground; Ctrl-C
stops between runs. It stops after three consecutive execution failures. This first
release does not provision Cloudflare, D1, a scheduler, or a background service.
No watch starts on install. Use your host's supervisor only after validating setup.

This engine is local, dependency-free, and fixture-based. It does not automatically
verify source credibility, causal model regressions, adversarial skill behavior,
or every agent host. Do not install the unrelated unscoped npm `skill-loop` package.

## Shared source and tests

Canonical mechanics live in `shared/iteration-engine` at the marketplace root.
Run its sync script, then the GTM bundle sync before release; both support `--check`.
Bundled copies make each plugin independently installable. The GTM adapter comes
from the existing `codex/reuse-gtm-autoresearch` implementation.

```sh
npm test
```

## All skills in a coding environment

The consent example is only a starter fixture. Inventory any skill directory:

```sh
node scripts/cli.mjs inventory
node scripts/cli.mjs inventory /path/to/project/skills /path/to/plugin/cache
```

Defaults cover personal Codex, Claude, Agents and Hermes skill directories plus
project Claude/Agents directories. They do not discover every application's
plugin cache automatically. The report lists scanned roots and unreadable paths.
Each discovered skill is **untested**, not assumed effective. Associate each skill
with its own config and test suite in a registry:

```json
{"version":1,"entries":[{"skill":"skills/a/SKILL.md","config":"tests/a/skill-loop.json"},{"skill":"skills/b/SKILL.md"}]}
```

`check-all registry.json` runs the enrolled evaluations sequentially. Missing
configs remain untested; failures stay errors. It verifies config-to-skill identity.
There is no universal correctness test for arbitrary skills: each needs observable
outputs, executable checks and its authoritative rules. Screenshots, files, API
results or compiler/test outcomes can be normalized by a command adapter into JSON.

## More deterministic outputs

- `init DIR --rules` creates a declarative JSON rule skill executed without an LLM.
  Rules use explicit JSON paths, comparisons, first-match priority and a default
  output; no dynamic code evaluation is used. It supports rule-shaped work, not
  arbitrary natural-language reasoning.
- `replay CONFIG RUN_ID` rescores saved outputs with the saved suite, without a
  new model call. This reproduces evidence; it does not measure fresh drift.
- CLI and MCP invoke the same functions. Neither transport makes model inference
  deterministic. Slash commands are convenient entry points, not deterministic
  substitutes for executable checks.
- Keep fixtures, scorer and model/harness settings versioned. A code-based checker
  supplies repeatable judgments even when the upstream model output varies.

## QA record and source of truth

Add `source: {title, reference, version}` and `coverage` to each suite. The report
shows that source, actual versus expected outputs, lost checks, candidate evidence,
and review status. Missing sources are explicitly labeled. Source metadata is
part of the versioned test conditions. This makes the output a reviewable QA
record; it does not certify that the operator's source or expected answers are
correct, complete, current, or independently verified.

## Version history and user preference

`versions CONFIG` lists the saved skill versions, active version, QA scores and
whether test conditions are still comparable. Approved QA improvements become the
new active default. Staged candidates do not silently replace it.

`select-version CONFIG FULL_VERSION_HASH` explicitly activates a saved version,
even if the user prefers it over a higher-scoring candidate. This is recorded as a
**preference override**, not a QA improvement. A current-condition run becomes the
selected version's baseline; historical conditions clear the baseline until a fresh
run. The selection preserves the previous text and supports interrupted-write recovery.
A host assistant must get the user's explicit version choice before invoking it.

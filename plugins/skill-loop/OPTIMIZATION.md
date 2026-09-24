# Bounded skill optimization

This revision adds an optional, dependency-free optimization mode inspired by
[SkillOpt](https://arxiv.org/abs/2605.23904). Skill Loop still owns package
integrity, evidence, review, and installation. The optimizer changes the skill
entry document; supporting package files remain fingerprinted and preserved.

## Reviewed decisions

- Enforce independent training, selection, and final test suites. Reject shared
  case IDs and identical case inputs across splits. Similar paraphrases still
  need dataset review; a hash cannot establish semantic independence.
- Let the proposer see training feedback only. Selection decides whether a
  revision improves without losing previously passing checks.
- Limit each automatic revision to at most four exact text operations and a
  changed-character budget. A complete rewrite is not a patch.
- Retain at most five rejected-change summaries in optimizer context. Keep
  optimizer memory out of the installed skill.
- Run the final test only after selection has produced an improved candidate.
  Require all final checks to pass and preserve baseline passes. Record test
  exposure so subsequent optimization requires fresh test evidence.
- Keep approval separate from evaluation. Recheck stored evidence and package
  identity before approval, including recovery after an interrupted write.
- Keep Jev optional. It can triage training failures; it cannot approve a
  candidate or replace deterministic checks. Reasoning writes a bounded patch
  when repair is warranted. No new service or model dependency is required.

The earlier comparison overstated the case for wholesale adoption: SkillOpt's
default aggregate gate is less strict than Skill Loop's per-check regression
guard, and its repository exposes slow-update configurations that bypass the
selection gate. Neither behavior is adopted here. Lines of code alone also do
not establish implementation quality; the two repositories cover different
scopes.

## Configure

Keep the existing version-1 configuration, runner, source skill, state path,
and `suite` for the normal baseline/report workflow. Add:

```json
{
  "optimization": {
    "trainSuite": "qa/train.json",
    "selectionSuite": "qa/selection.json",
    "testSuite": "qa/test.json",
    "patchMaxEdits": 4,
    "patchMaxChangedChars": 8000
  }
}
```

Each file uses the existing suite schema: `version: 1`, nonempty `cases`, unique
IDs, `input`, and observable `checks`. Keep source metadata and coverage honest.
Freeze the runner/model configuration for the comparison. Changing it requires
new comparable evidence.

The trusted `proposerCommand` receives training evidence and emits:

```json
{
  "edits": [
    {"op": "replace", "old": "Exact old instruction.", "new": "Reviewed replacement instruction."}
  ],
  "evidence": "Observed failure and authoritative rationale for this change."
}
```

Supported operations are `append` (`text`), `insert_after` (`anchor`, `text`),
`replace` (`old`, `new`), and `delete` (`old`). Anchors must match exactly once.
Malformed, ambiguous, empty, excessive, or ineffective edits fail closed. The
budget counts inserted and removed characters; splitting a rewrite into a single
large replacement does not evade it.

Run `loop CONFIG`; optimization evaluates its own baseline for each split and
does not require a saved legacy baseline. Manual `stage` is disabled in this
mode so it cannot bypass the split gates. A successful loop stages a proposal. Review the proposal and use `approve CONFIG PROPOSAL_ID` only after
the user selects that candidate. The engine does not install into another host
or deploy cloud assets merely because tests pass.

## Optional Jev triage

Set `optimization.triageCommand` to a trusted executable argument array. It
receives JSON on stdin containing training checks and the component-blocker
flag, and returns JSON on stdout:

```json
{"choice":"fail","reason":"Repeated training failure warrants a repair."}
```

`pass` means no repair is needed, `fail` means a blocker warrants repair, and
`insufficient` means uncertain evidence warrants escalation. A deterministic
failure overrides `pass`. Provider or parsing errors also escalate. Without an
adapter, deterministic training failures route directly to the proposer and
clean training stops.

This is an adapter contract, not a provisioned Jev connection. The public GTM
endpoint evaluates its own server-owned GTM export; it must not be repurposed as
an arbitrary private skill-evidence endpoint. A real Jev adapter must explicitly
select its provider, authentication, evidence boundary, and Gateway logging.

## Compatibility and limits

Legacy fixtures and the offline demo continue to use the original training-only
loop. They do not demonstrate held-out generalization. Configuring optimization
enables the stronger contract; it must not silently fall back to legacy mode.

The final test cannot remain untouched after its outputs have been inspected.
Use a fresh test suite after exposure rather than repeatedly editing against a
failed final test. Small or noisy datasets still need repeated evaluation and
human review; a single passing run is not a reliability guarantee.

Source changes do not automatically update installed plugin caches or the live
Cloudflare sites. No scheduler, transcript harvesting, extra dashboard, second
database, or automatic promotion is added. Consolidating existing sites and
storage backends requires a separate migration with verified consumers.

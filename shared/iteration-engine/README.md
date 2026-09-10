# Shared iteration engine

One canonical source, independently installable bundles. Jordaaan's Skill Loop
and GTM Autoresearch use `iterate()` for bounded proposal/evaluation rounds.
`io.mjs` provides bounded command execution, explicit environment forwarding,
atomic file replacement and exclusive state locks. Domain adapters own:

| Responsibility | Skill Loop | GTM Autoresearch |
|---|---|---|
| Input | Skill text and versioned cases | Complete GTM export |
| Evaluation | Explicit JSON output checks | Six static configuration dimensions |
| Drift | Previously passing check fails | Snapshot changed; quality separately assessed |
| Permitted candidate | Revised skill text | Metadata-only operations |
| Acceptance | Strict improvement, no lost check | Strict improvement, no lost dimension or new critical finding |
| Delivery | Staged skill, explicit approval | Candidate export, never live publication |

This does not unify model authentication, live GTM access, source research,
scoring semantics or publication. Sharing those indiscriminately would weaken
boundaries. Foreground skill retesting and stable-snapshot GTM watching also
retain distinct triggers because they detect different forms of drift.

Run `python3 shared/iteration-engine/sync.py`, then
`python3 gtm-ai-plugin/scripts/sync-autoresearch.py`. Both `--check` modes must
pass before release. Do not edit vendored `scripts/shared` copies.

## Harness decision

Start with an existing assistant or a trusted command adapter. The deterministic
local demo needs neither credentials nor a hosted service. A dedicated harness
adds value for unattended execution, controlled tools, repeatable environments,
and a packaged interface; it also adds authentication, updates and support work.

[Pi](https://github.com/earendil-works/pi) provides an agent runtime and coding CLI.
[Prime Agent](https://github.com/PrimeIntellect-ai/prime-agent) offers a persistent,
self-improving RLM harness. Both are candidates for a later adapter, not current
verified integrations. Interpret the spoken “Py Agent” as Pi only provisionally.
[DeepSeek](https://api-docs.deepseek.com/) supplies a model API compatible with
OpenAI-style clients; choosing a DeepSeek model is separate from choosing the
harness that manages tools, state and execution. No standalone DeepSeek harness
was identified or integrated in this work. Sources reviewed September 8, 2026.

Cloudflare hosting remains a future adapter. The Node subprocess runtime cannot
be deployed unchanged as a Worker; a hosted design needs remote execution,
authentication, storage, scheduling and budget controls. The existing landing
page must distinguish that option from today's local implementation.

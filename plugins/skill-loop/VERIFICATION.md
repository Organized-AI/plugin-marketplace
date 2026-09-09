# Verification

## September 9, 2026 — regular Claude Desktop Chat

- Started a new regular Chat with the public GitHub branch URL and a request to
  run the included demo and return an interactive artifact. No skill ZIP upload,
  Cowork session, local participant terminal, or separate CLI login was used.
- Claude cloned the implementation and ran it with Node v22.22.2. Engine doctor
  reported ready. Actual demo stdout reported baseline 50, candidate improved,
  and activeSkillChanged:false.
- Original 1/2; prepared correction 2/2; proposal pending. Active skill remained
  the original. These are deterministic rules-fixture results, not model scores.
- The returned HTML opened in Claude’s native Preview pane, branded Jordaaan,
  with both saved skill texts, highlighted changes, QA source, and actual checks.
- Clicked Edit a draft: saved score was removed, untested label appeared, and
  version-choice controls disabled. Discard restored the saved 2/2 evidence.
- Clicked Prepare version choice: the artifact produced a request for review and
  explicit confirmation; it did not apply the candidate.
- Claude also ran the plugin suite: 18/18 tests passed.
- Verified conversation: [Running Skill Loop QA demo with results comparison](https://claude.ai/chat/f0241632-08f4-4d7e-9b6b-d886499620ee) (account access required).
- Limits: verified on this signed-in account with code execution/file creation
  available. This is not an all-plan compatibility test, persistent installation,
  a test of arbitrary uploaded skills, or proof of automatic local-skill updates.
  Artifact requests still go back through chat for testing/applying changes.
- Optional Chat ZIP extraction and demo execution passed locally; the persistent
  skill-upload flow and Cowork execution remain unverified.

## September 8, 2026 — engine and adapters

- 16 Skill Loop tests pass, including real subprocess demo, MCP stdio discovery
  and prepare, private-check omission, strict results, stale requests/proposals,
  non-regressing improvement gates, timeout handling, filtered environment, and
  failure-injected approval recovery.
- 20 existing GTM tests pass with the extracted shared core, including the
  actual background start/change/restart/stop test and metadata-only safeguards.
- Shared and GTM bundle drift checks pass. Plugin and skill validators pass.
- Offline demonstration: initial 1/2, prepared candidate 2/2, staged without
  applying. These are deterministic example outputs, not measured AI improvement.
- Live Claude Code evaluation attempted but blocked by expired host OAuth.
- The PATH Codex shortcut is missing its platform dependency. The bundled CLI
  in ChatGPT.app was found signed in and completed a real evaluation: incomplete
  skill 1/2, corrected candidate 2/2, staged without applying. No login change
  was required. This small test is not general proof of reliability.
- At this initial checkpoint, Claude Desktop, Codex app plugin installation, Grok Bot, OpenClaw, Hermes, Pi, Prime Agent and
  DeepSeek-backed execution have not completed host integration tests.
- Cloudflare-hosted execution and automatic research are not implemented;
  configured host commands perform evaluation/research. Local evidence storage,
  bounded iteration and explicit approval are implemented.

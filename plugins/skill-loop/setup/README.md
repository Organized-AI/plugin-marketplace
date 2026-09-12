# Guided setup: participant-owned deployment

Branch: `codex/skill-loop-guided-setup`. This branch is separate from the workshop release.

## What is implemented here

A resumable setup profile, a deterministic first-report check using the existing engine, and an explicit direct-adapter D1 write/read/hash/delete verification. The profile stores sources, chosen assistant, versioned product defaults, and check receipts. Secrets stay in the execution host's environment. Re-running a check creates a new report and preserves prior reports and skill files. A failed reconnection clears the prior connection success.

This is the setup foundation, not a deployed cloud onboarding service. Assistant selection is not login verification. A D1 receipt proves that connection at that time, not Sandbox execution, R2 support, or future token validity. The native Cloudflare connector is not interchangeable with direct-adapter environment credentials.

## Participant experience we are building

1. **Choose your assistant.** Claude Desktop, Codex, Claude Code, or Hermes. Detect what is accessible and explain one missing prerequisite at a time.
2. **Choose your skills.** Discover authorized sources, show the scope, and allow uploaded packages. Produce the first useful HTML overview before deeper checks. Never substitute an example.
3. **Keep your history (optional).** Guide account connection and participant-owned deployment. Show exact resources and costs before provisioning. Run save/read/restore verification before indicating connected.
4. **Ready.** Remember successful setup and open “Check my skills” on later visits. Request authorization again only when credentials expire, permissions change, or the user changes accounts.

“One-time” means reusable configuration, not permanent credentials. Local QA remains available if the cloud connection is unavailable. No scheduled checks are enabled implicitly.

## Working developer/assistant commands

Participants should ask their assistant to perform these commands; a web setup interface will eventually drive the same state transitions.

```sh
node scripts/cli.mjs setup-create /absolute/new-profile codex /absolute/my-skills
node scripts/cli.mjs setup-check /absolute/new-profile/setup.json
node scripts/cli.mjs setup-status /absolute/new-profile/setup.json
```

The check returns an existing HTML report path and inventory evidence. Resume using the same setup.json instead of creating a new profile. For an explicitly selected existing D1 database, configure `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID`, and `CLOUDFLARE_API_TOKEN` privately on the execution host, then:

```sh
node scripts/cli.mjs setup-connect /absolute/new-profile/setup.json
```

This creates the dedicated `skill_loop_setup_probes` table if absent and inserts only a unique synthetic probe. It verifies exact readback and deletes only that row. It creates no Cloudflare account, database, Worker, or sandbox. Never paste the token into a chat or report. Native-connector guided authentication will need its own adapter and verification.

## Product manager controls

`product.json` is a versioned product definition embedded in each new profile. Initial controls cover branding, assistant choices, and onboarding defaults/copy. These are configuration inputs for the future setup UI; existing QA renderer branding and scheduler behavior are not automatically changed by this file. The programmatic createSetup API accepts an alternative product file.

Future controls: default testing depth, per-run time and spend limits, retention policy, allowed sources, optional providers, and rollout/rollback policy. The deployed service must validate and enforce these, not rely on prompt wording. Do not expose “turn untested into passed,” silent baseline replacement, or automatic GTM publication as customization switches.

## Cloudflare implementation milestones

- **Deployment package:** versioned Worker + Sandbox image, D1 migrations, R2 bucket, Workflow binding, and an idempotent installer that adopts only explicitly selected resources. No duplicate resources when setup resumes. Pin compatible SDK/image versions.
- **Authenticated setup service:** browser authorization, account selection, deployment identity, scoped credentials, durable setup state, expiry recovery, and a least-privilege connector. Cloudflare's existing developer connector can help provision; it does not automatically expose our custom QA API.
- **Execution:** Worker validates user/source identity; Workflow coordinates; Sandbox runs the pinned engine on supplied files; D1 records run status; R2 stores exact packages, container exports, and HTML. Sandbox disk is working space, not the durable source of truth.
- **Readiness:** verify source access, execute the actual engine, save bytes, retrieve and hash them, restore to a fresh sandbox, and render the report. Persist evidence per step and deployment revision. Do not mark cloudReady until this deployed path passes.
- **Return visits:** resume progress, reuse connections, recheck validity, and present only the unresolved step. Enforce run idempotency, concurrency limits, timeouts, and spending limits.
- **Schedules:** explicit opt-in after a successful first run; handle expired Google access, quota/backoff, and failed runs. Separate config drift from effectiveness regressions.

Acceptance tests must include clean accounts; interrupted deployment; duplicate setup requests; expired/revoked credentials; inaccessible skills; empty sources; malicious package contents; changed dependencies; corrupted storage; wrong-account access; concurrent client/container runs; uninstall/export; and cross-version migration. Test Claude Desktop, Codex, Claude Code, and Hermes independently.

## Where SF Compute Autoresearch fits

Cloudflare is the default product infrastructure for ordinary CPU-based skill checks, GTM JSON scoring, storage, and scheduling. SF Compute is an optional experiment runner for GPU-dependent work, model fine-tuning, many parallel evaluations, or repeated training/benchmark experiments. Basic Skill Loop QA does not require model training or a GPU.

Example: you want to compare ten candidate skill strategies across repeated model runs, or fine-tune a small model on an explicitly approved dataset. The product creates a bounded experiment specification; an authorized SF adapter uploads the approved source/data and runs it; our engine checks returned evidence against the unchanged suite; approved results return to the same D1/R2 history and HTML review. Provider output alone cannot activate a skill or publish a GTM container.

Keep provider choice under advanced options, with separate sign-in, explicit data transfer, budget, and stop conditions. SF results must retain model/image versions, checks, repetitions, cost, and source hashes. A provider's summary statistic does not replace per-case no-regression checks. No SF connector, account, resource, or job is provisioned by this branch.

SF's managed Research mode is documented as private preview requiring enablement, distinct from its compute/sandbox offering. Do not make novice onboarding depend on preview access.

Sources reviewed September 12, 2026:
- https://developers.cloudflare.com/sandbox/
- https://developers.cloudflare.com/workflows/
- https://autoresearch.sfcompute.com/docs#research

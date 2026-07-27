# Quick Start: website events → GTM → sGTM/CAPI

This guide is designed for a technical novice. It produces a **proposal**, then asks you to test it. Nothing in this plugin publishes a GTM container, clicks a website control, submits a form, or sends an ad-platform conversion by itself.

## 1. Install the plugin

In Claude Code, add this marketplace once, then install the plugin:

```text
/plugin marketplace add Organized-AI/plugin-marketplace
/plugin install gads-gtm-plugin@organized-ai-marketplace
```

Restart Claude Code if it does not immediately show the commands. This repository is a Claude Code marketplace, so those are the one-command install instructions. Other coding agents can still use the same Actor, JSON contracts, scripts, and MCP configuration, but their plugin-install format is host-specific; point the agent at this plugin folder and ask it to follow `skills/event-surface-audit/SKILL.md`. Do not represent it as a native install for an agent that does not support Claude plugins.

## 2. Decide what you are allowed to audit

Use the DOM inventory only for a domain you own or have written authorization to assess. Start with 5–10 public pages. Do not use it for logged-in areas, session replay, form submission, credential collection, or consent bypass. Its output intentionally excludes input values and URL query strings.

## 3. Create a DOM inventory with Apify

The Actor uses a browser because many modern sites render controls with JavaScript. It **does not click controls or submit forms**; it reports visible links, buttons, forms, and fields plus conservative selector evidence.

Prerequisites: Node.js 22+, an Apify account, and the Apify CLI.

```bash
npm install -g apify-cli
apify login
cd gads-gtm-plugin/actors/dom-event-inventory
npm ci
npm run build
apify push
```

After the first push, run it from the Apify Console with the contents of `../../examples/dom-event-inventory.input.json`, replacing `https://example.com/` with your authorized website. Keep `sameDomainOnly` enabled for a first pass. Export the resulting default dataset as JSON to `dom-inventory.json`.

Apify documents `apify login` followed by `apify push` as the CLI deployment path; its Playwright crawler is designed for JavaScript-rendered pages and can save results to the Actor dataset. [Apify deployment docs](https://docs.apify.com/actors/development/deployment) and [PlaywrightCrawler guide](https://docs.apify.com/sdk/js/docs/guides/playwright-crawler) cover those primitives.

## 4. Turn the inventory into an event plan

```bash
cd ../..
python3 scripts/build_event_surface_map.py \
  --input dom-inventory.json \
  --out event-surface-map.json
```

Or, in Claude Code:

```text
/event-surface-audit dom-inventory.json
```

Review every candidate. `cta_clicked` means “a clickable thing was found,” not “this is a conversion.” Retain only actions that matter to the business: lead form start/submit, qualified survey result, checkout completion, account creation, or a meaningful CTA.

For each retained event, agree on a small metadata allowlist. Good examples: `page_type`, `form_id`, `step`, `content_id`, `experiment_id`. Do not include form text, email, phone, address, full URLs with query strings, access tokens, or ad-platform secrets.

## 5. Capture client-side events safely

Ask your developer to emit the event at the confirmed business action—not merely when a button is clicked:

```javascript
window.dataLayer = window.dataLayer || [];
window.dataLayer.push({
  event: 'quiz_result_viewed',
  event_id: crypto.randomUUID(),
  use_case: 'measurement_audit',
  platform_selection: ['google_ads', 'meta']
});
```

Use a stable `data-track` or `data-event` attribute only if application instrumentation is not available. In GTM, build triggers and variables in a **test workspace**, use Preview/Tag Assistant, and verify that consent blocks advertising events when it should.

## 6. Add server-side destinations only after browser validation

Send the approved event through sGTM/Stape only after the client-side data layer is verified. Keep the same `event_id` in matching browser/server Meta and TikTok events. For X, use the same `conversion_id` for an overlapping Pixel/CAPI event. Store credentials only in Stape or secret management, never in GTM variables, source files, exported manifests, or prompts.

Copy the readiness template and validate it before enabling a destination:

```bash
cp config/conversion-api-readiness.example.json my-capi-readiness.json
python3 scripts/check_conversion_api_readiness.py --config my-capi-readiness.json
```

Then send a test event and confirm it in each platform’s diagnostic view. Do not publish until the event, consent behavior, and deduplication are proven.

## 7. Version and compare the measurement release

Before publishing, capture the current web GTM and sGTM container version IDs:

```text
/measurement-release <release-id> <web-container> <web-version> <server-container> <server-version>
```

After the release, save aggregate results and diagnostic evidence under the same release. Compare equivalent windows and event definitions; a before/after change alone does not prove that a container edit caused a performance change.

## What to ask your agent

- “Use `event-surface-audit` on this Apify dataset. Return only a proposed event map and ask me to approve it.”
- “Implement approved events in a GTM test workspace, then give me Preview evidence. Do not publish.”
- “Run conversion-api readiness for Meta and TikTok; do not include credentials in files or chat.”
- “Create a measurement release manifest for the currently published web GTM and sGTM versions.”

---
name: event-surface-audit
description: Convert an authorized Apify DOM inventory into a consent-aware event-capture plan for web GTM, sGTM, and server-side conversion destinations. Use when a user asks to scrape or audit a website's interactive surfaces, identify DOM elements for tracking, propose data-layer events or GTM triggers, map browser events to server events, or capture page metadata without automatically publishing changes.
---

# Event-surface audit

Use the included `actors/dom-event-inventory` only on a website the requester owns or is authorized to audit. It is read-only: do not add interaction simulation, form submission, login, or consent-bypass behavior.

## Workflow

1. Run the Actor with a narrow scope and save its dataset.
2. Run `scripts/build_event_surface_map.py --input <dataset.json> --out <event-map.json>`.
3. Review every candidate with the requester. A visible control is evidence of an interaction surface, not proof it is a business conversion.
4. Prefer an application-owned `dataLayer.push()` at the business action. Use a DOM selector only as a documented fallback, with a stable data attribute where possible.
5. Define a small event contract: event name, business meaning, allowed metadata, consent gate, event ID, and browser/server destinations.
6. Implement in a GTM test workspace, validate in Preview/Tag Assistant, and record diagnostics. Publish only after explicit approval.
7. Capture published GTM/sGTM versions with `measurement-release-versioning`; run `conversion-api-process` whenever server routing or a destination changes.

## Candidate-event rules

- Capture high-intent milestones: form started/submitted, qualified survey result, checkout step/completion, search submitted, account creation, and meaningful CTA clicks.
- Do not create a custom event for every link, field, or scroll. Avoid labels, free text, form values, email, phone, address, or URL query parameters as event metadata.
- Use an allowlist such as `page_type`, `content_id`, `offer_id`, `form_id`, `step`, `experiment_id`, `use_case`, and `platform_selection` only after privacy review.
- Emit one UUID `event_id` for matching browser/server copies. Platform adapters impose their own identifiers: Meta and TikTok use the same `event_id`; X uses the same `conversion_id` for overlapping copies.
- Enforce the consent decision before browser pixels or sGTM delivery. Never use server-side tagging to evade a user's choice.

## Required deliverable

Return a concise table with business action, evidence URL/selector, proposed event, approved metadata, consent category, data-layer source, and browser/server destinations. Separate **proposed** configuration from **verified** implementation; do not claim a tag fired until preview and destination diagnostics prove it.

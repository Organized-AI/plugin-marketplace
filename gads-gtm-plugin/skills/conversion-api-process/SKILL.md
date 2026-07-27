---
name: conversion-api-process
description: Plan, configure, and validate consent-gated server-side conversion delivery for Google Ads, Meta Conversions API, TikTok Events API, and X Conversion API. Use when a user asks to set up or audit CAPI, events API, server-side conversions, enhanced conversions, offline conversions, pixel plus server deduplication, or cross-platform conversion measurement.
---

# Cross-platform conversion process

Use one consent-aware event contract and platform-specific adapters. Browser pixels complement server delivery; they do not replace it. Never use server-side delivery to bypass consent, platform policies, or user privacy choices.

## Shared prerequisites

Before configuring a platform, confirm:

1. The conversion event has a named source of truth: website, payment system, CRM, or warehouse.
2. Advertising consent is evaluated before data leaves the controlled environment.
3. Each conversion has an immutable ID: event UUID for browser/server copies, plus transaction or CRM ID where applicable.
4. Customer identifiers are normalized/hashed only when the destination requires and permits them; IP, user agent, and click IDs remain raw where required.
5. Credentials are stored as secrets; never in GTM variables, manifest files, prompts, browser code, or logs.
6. A browser event and its server copy use the required identical dedupe key when both are sent.
7. A test event, platform diagnostic, owner, and rollback path are recorded.

## Platform adapters

| Platform | Server process | Browser complement | Required identity / dedupe focus |
| --- | --- | --- | --- |
| Google Ads | Google tag/sGTM + Data Manager API or approved Ads API job for enhanced/offline conversions | Google tag | `gclid`/`gbraid`/`wbraid`, consented hashed first-party data, transaction/order ID |
| Meta | Conversions API | Meta Pixel | Same `event_id` and event name; retain `_fbp`/`_fbc`, IP, UA, and permitted hashed identifiers |
| TikTok | Events API | TikTok Pixel | Same `event_id`, event name, Pixel Code; retain `_ttp`/`ttclid` and permitted match keys |
| X | Conversion API | X Pixel | Same `conversion_id` for overlapping browser/server events; retain `twclid`, permitted identifiers, IP/UA |

## Configure in this order

1. Copy `config/conversion-api-readiness.example.json` into the project and complete it without secrets.
2. Run `scripts/check_conversion_api_readiness.py --config <path>`; resolve every failure before deployment.
3. Create a measurement release baseline using `measurement-release-versioning`.
4. Implement browser and server mappings in a test workspace/container.
5. Send test events; confirm each in platform diagnostics and confirm deduplication for overlapping events.
6. Publish only after explicit approval, then append diagnostic and outcome snapshots to the release manifest.

## Verification and operations

- Google Ads: monitor enhanced-conversion/offline import diagnostics and conversion-action health.
- Meta: monitor Test Events, event match quality, and browser/server deduplication.
- TikTok: monitor Test Events and Events Manager diagnostics; confirm Pixel + Events API `event_id` alignment.
- X: confirm Events Manager event receipt, CAPI/Pixel dedupe by `conversion_id`, and campaign reporting after the attribution window.

Run the readiness check during every release that changes event capture, consent, identifiers, destination/pixel configuration, or server routing.

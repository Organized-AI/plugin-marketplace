# /conversion-api-readiness — Validate server-side conversion readiness

Validate the consent, identity, deduplication, test, and monitoring prerequisites for Google Ads, Meta, TikTok, and X before enabling production server-side delivery.

## Usage

```text
/conversion-api-readiness <config-path>
```

## Procedure

1. Confirm the configuration has no credentials, raw PII, or click IDs.
2. Run `scripts/check_conversion_api_readiness.py --config <config-path>`.
3. Treat every failure as a blocker; warnings require an owner and release note.
4. Capture the current GTM/sGTM state with `/measurement-release` before making changes.
5. Use platform test events and diagnostics before requesting publication.

## Production gate

Do not enable a destination until it has: consent gate, event mapping, destination ID, secret stored outside the config, a dedupe key for overlapping browser/server events, a test-event result, a diagnostics owner, and rollback instructions.

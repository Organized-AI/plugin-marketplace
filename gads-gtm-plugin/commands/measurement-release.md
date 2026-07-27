# /measurement-release — Capture a GTM/sGTM measurement baseline

Create a release manifest before changing tracking configuration. This command does not publish tags or call ad-platform write APIs.

## Usage

```text
/measurement-release <release-id> <web-container> <web-version> <server-container> <server-version>
```

## Procedure

1. Confirm the supplied version IDs are the currently published versions, not a workspace draft.
2. Ask for any missing owner, reason, event-contract version, baseline window, and relevant destination mappings.
3. Run `scripts/create_measurement_release.py` with the supplied identifiers.
4. Record only aggregate metrics and privacy-safe evidence links.
5. Return the manifest path and the required test/publish/compare steps.

## Example

```bash
python3 scripts/create_measurement_release.py \
  --out measurement-releases/quiz-funnel-2026-07-27-01.json \
  --release-id quiz-funnel-2026-07-27-01 \
  --owner jordan \
  --reason 'Add server-side result-delivery event' \
  --web-container accounts/123/containers/456 \
  --web-version 12 \
  --server-container accounts/123/containers/789 \
  --server-version 7 \
  --event-contract-version quiz-events/v2 \
  --baseline-start 2026-07-13T00:00:00Z \
  --baseline-end 2026-07-26T23:59:59Z \
  --destination 'google_ads:conversion-action-123:v1' \
  --baseline-metric 'lead_result_submitted=42'
```

# /event-surface-audit — Discover website event surfaces

Create a measurement plan from an authorized read-only DOM inventory. This command does not publish GTM changes or send any ad-platform event.

## Usage

```text
/event-surface-audit <path-to-apify-dataset.json>
```

## Procedure

1. Confirm the requester is authorized to audit the domain and the Actor ran without clicking or submitting forms.
2. Run `scripts/build_event_surface_map.py --input <dataset> --out <event-map.json>`.
3. Review candidate events, retain only business-relevant actions, and agree a metadata allowlist and consent category.
4. Prefer application `dataLayer.push()` events; document any selector fallback.
5. Produce a GTM test-workspace plan, then require preview evidence, explicit publish approval, a measurement release manifest, and CAPI readiness checks where applicable.

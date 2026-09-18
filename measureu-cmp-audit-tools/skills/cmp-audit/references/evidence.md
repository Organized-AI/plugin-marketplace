# CMP audit evidence

Use the scenario that answers the behavior in question:

| Scenario | Evidence it creates |
| --- | --- |
| `preconsent` | Page activity before a choice. |
| `accept` | Collection and state changes after granting consent. |
| `reject` | Collection and state changes after declining consent. |
| `gpc` | Activity when `Sec-GPC: 1` and `navigator.globalPrivacyControl` are set. |
| `persistence-accept` / `persistence-reject` | Whether observed consent state remains after reload. |
| `withdraw` | Acceptance, access to preferences, and a later reject action. |

Each request has a `phase`. Requests in `action-accept`, `action-reject`, or another configured action phase occurred after that action began. Compare those requests with the preceding timeline entries and the relevant data-layer consent command.

Check `coverage.state` and `captureHealth` before interpreting findings. A `partial` run missed a configured interaction. An `inconclusive` run observed different request signatures when instrumentation was enabled. Findings and requests have stable IDs for MCP inspection.

`consentSignals` merges known consent fields from the URL and request body. `consentState.dataLayerConsentEvents` captures browser data-layer commands such as `consent/default` and `consent/update`. `consentState.consentStorage` narrows browser storage to keys whose names suggest consent or privacy state.

Timestamped consent and storage events include `epochMs`, allowing comparison with request `epochMs`. Storage events capture writes and removals that final snapshots can miss. Values may still contain sensitive site data; handle audit artifacts accordingly.

When a CMP needs categories, define a custom scenario and flow. A flow may contain named actions, selector clicks, and checkbox toggles:

```json
{
  "scenarios": ["analytics-disabled"],
  "flows": {
    "analytics-disabled": [
      { "action": "open-preferences", "selector": "#privacy-settings" },
      { "action": "disable-analytics", "type": "toggle", "selector": "#analytics", "checked": false },
      { "action": "save", "selector": "#save-preferences" }
    ]
  }
}
```

Use stable request signatures from `compare_cmp_audits` to detect changed integrations. They ignore query values that often vary between runs; inspect full URLs and request bodies when the signature is unchanged but behavior appears different.

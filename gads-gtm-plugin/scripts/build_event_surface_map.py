#!/usr/bin/env python3
"""Build a reviewable GTM event-map draft from a DOM Event Inventory dataset."""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path
from typing import Any


ALLOWED_METADATA = ["page_type", "content_id", "form_id", "step", "experiment_id"]


def load_dataset(path: Path) -> list[dict[str, Any]]:
    raw = path.read_text(encoding="utf-8").strip()
    if not raw:
        raise ValueError("input dataset is empty")
    parsed = json.loads(raw)
    if isinstance(parsed, list):
        return [row for row in parsed if isinstance(row, dict)]
    if isinstance(parsed, dict):
        return [parsed]
    raise ValueError("input must be a JSON object or array")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="Apify dataset JSON export")
    parser.add_argument("--out", required=True, help="Output JSON path (must not exist)")
    args = parser.parse_args()

    output = Path(args.out)
    if output.exists():
        raise SystemExit(f"refusing to overwrite existing output: {output}")

    grouped: dict[tuple[str, str, str], dict[str, Any]] = {}
    for page in load_dataset(Path(args.input)):
        if page.get("kind") != "page_inventory":
            continue
        url = page.get("url")
        if not isinstance(url, str):
            continue
        for control in page.get("controls", []):
            if not isinstance(control, dict):
                continue
            for candidate in control.get("candidates", []):
                if not isinstance(candidate, dict):
                    continue
                event = candidate.get("eventName")
                selector = candidate.get("selector")
                interaction = candidate.get("interaction")
                if not all(isinstance(value, str) and value for value in (event, selector, interaction)):
                    continue
                key = (event, interaction, selector)
                proposal = grouped.setdefault(key, {
                    "event_name": event,
                    "interaction": interaction,
                    "selector_fallback": selector,
                    "evidence_urls": [],
                    "rationale": candidate.get("rationale", ""),
                    "recommended_source": "application dataLayer.push() (preferred); selector fallback only after review",
                    "metadata_allowlist": ALLOWED_METADATA,
                    "consent_category": "advertising (confirm with privacy owner)",
                    "status": "proposed — not a published GTM configuration",
                })
                if url not in proposal["evidence_urls"]:
                    proposal["evidence_urls"].append(url)

    result = {
        "schema_version": "event-surface-map/v1",
        "purpose": "Reviewable candidate event map generated from a read-only DOM inventory.",
        "privacy_note": "No form values, query parameters, identifiers, or credentials are included. Review metadata and consent before implementation.",
        "required_next_steps": [
            "Confirm business intent and remove irrelevant candidates.",
            "Implement application-owned dataLayer events where possible.",
            "Validate in GTM Preview/Tag Assistant and destination diagnostics.",
            "Capture GTM/sGTM versions and run conversion API readiness before production routing.",
        ],
        "proposals": sorted(grouped.values(), key=lambda item: (item["event_name"], item["selector_fallback"])),
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(result['proposals'])} proposed event mappings to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

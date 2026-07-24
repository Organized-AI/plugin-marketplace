#!/usr/bin/env python3
"""Zero-dependency validation for an Organized AI Shorts/carousel brief."""

from __future__ import annotations

import json
import sys
from pathlib import Path


def fail(message: str) -> None:
    raise SystemExit(f"INVALID: {message}")


def main() -> int:
    if len(sys.argv) != 2:
        fail("usage: validate_brief.py <brief.json>")
    path = Path(sys.argv[1])
    if not path.is_file():
        fail(f"file not found: {path}")
    try:
        data = json.loads(path.read_text())
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON: {exc}")
    if not isinstance(data, dict):
        fail("brief root must be an object")
    for key in ("title", "platform", "aspect_ratio", "variance_map"):
        if key not in data:
            fail(f"missing required key: {key}")
    if data["platform"] not in {"youtube", "instagram", "facebook", "linkedin", "multi"}:
        fail("platform must be youtube, instagram, facebook, linkedin, or multi")
    if data["aspect_ratio"] not in {"9:16", "4:5"}:
        fail("aspect_ratio must be 9:16 or 4:5")
    variance = data["variance_map"]
    if not isinstance(variance, dict):
        fail("variance_map must be an object")
    for key in ("preserve", "change", "brand_markers", "rights_note"):
        if key not in variance:
            fail(f"variance_map missing required key: {key}")
    if not variance["rights_note"]:
        fail("variance_map.rights_note must be explicit")
    if "slides" in data and not isinstance(data["slides"], list):
        fail("slides must be an array")
    print(f"VALID: {path}")
    print(f"platform={data['platform']} aspect_ratio={data['aspect_ratio']} title={data['title']!r}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

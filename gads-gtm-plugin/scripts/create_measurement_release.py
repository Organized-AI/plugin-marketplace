#!/usr/bin/env python3
"""Create a versioned, privacy-safe GTM/sGTM measurement release manifest."""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path


def key_values(values: list[str], label: str) -> dict[str, str]:
    parsed: dict[str, str] = {}
    for value in values:
        key, separator, item = value.partition("=")
        if not separator or not key or not item:
            raise ValueError(f"{label} must use key=value: {value}")
        if key in parsed:
            raise ValueError(f"duplicate {label} key: {key}")
        parsed[key] = item
    return parsed


def config_hash(path: str | None) -> str | None:
    if not path:
        return None
    config = Path(path)
    if not config.is_file():
        raise FileNotFoundError(f"config file not found: {config}")
    return hashlib.sha256(config.read_bytes()).hexdigest()


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", required=True)
    parser.add_argument("--release-id", required=True)
    parser.add_argument("--owner", required=True)
    parser.add_argument("--reason", required=True)
    parser.add_argument("--web-container", required=True)
    parser.add_argument("--web-version", required=True)
    parser.add_argument("--server-container", required=True)
    parser.add_argument("--server-version", required=True)
    parser.add_argument("--event-contract-version", required=True)
    parser.add_argument("--baseline-start", required=True)
    parser.add_argument("--baseline-end", required=True)
    parser.add_argument("--config-file")
    parser.add_argument("--changed-entity", action="append", default=[], help="type:action:name")
    parser.add_argument("--destination", action="append", default=[], help="platform:identifier:mapping-version")
    parser.add_argument("--baseline-metric", action="append", default=[], help="metric=value")
    parser.add_argument("--evidence", action="append", default=[], help="label=url-or-path")
    return parser.parse_args()


def main() -> None:
    args = arguments()
    output = Path(args.out)
    if output.exists():
        raise FileExistsError(f"refusing to overwrite existing release: {output}")
    payload = {
        "schema_version": "measurement-release/v1",
        "release": {
            "id": args.release_id,
            "created_at": datetime.now(UTC).isoformat(),
            "owner": args.owner,
            "reason": args.reason,
            "status": "baseline-captured",
        },
        "containers": {
            "web_gtm": {"container": args.web_container, "published_version": args.web_version},
            "server_gtm": {"container": args.server_container, "published_version": args.server_version},
        },
        "measurement": {
            "event_contract_version": args.event_contract_version,
            "changed_entities": args.changed_entity,
            "destinations": args.destination,
            "config_sha256": config_hash(args.config_file),
        },
        "evaluation": {
            "baseline_window": {"start": args.baseline_start, "end": args.baseline_end},
            "baseline_metrics": key_values(args.baseline_metric, "baseline metric"),
            "comparison_window": None,
            "known_confounders": [],
        },
        "evidence": key_values(args.evidence, "evidence"),
        "outcome_snapshots": [],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(f"Created measurement release: {output}")


if __name__ == "__main__":
    main()

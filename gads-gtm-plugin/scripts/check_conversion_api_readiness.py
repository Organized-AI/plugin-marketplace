#!/usr/bin/env python3
"""Validate a privacy-safe cross-platform server-side conversion configuration."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


PLATFORM_RULES = {
    "google_ads": {"server_process"},
    "meta": {"browser_event", "server_event", "dedupe_key"},
    "tiktok": {"browser_event", "server_event", "dedupe_key"},
    "x": {"browser_event", "server_event", "dedupe_key"},
}
DEDUPE_KEYS = {"meta": "event_id", "tiktok": "event_id", "x": "conversion_id"}
FORBIDDEN_KEYS = {"access_token", "api_token", "secret", "password", "email", "phone", "click_id"}


def load_config(path: Path) -> dict:
    return json.loads(path.read_text())


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", required=True)
    args = parser.parse_args()
    config = load_config(Path(args.config))
    failures: list[str] = []
    warnings: list[str] = []

    if config.get("schema_version") != "conversion-api-readiness/v1":
        failures.append("schema_version must be conversion-api-readiness/v1")
    if not config.get("event_contract_version"):
        failures.append("event_contract_version is required")
    consent = config.get("consent", {})
    if consent.get("advertising_required") and not consent.get("gate_implemented"):
        failures.append("advertising consent gate is required before enabling destinations")
    if not consent.get("policy_reference"):
        failures.append("consent.policy_reference is required")
    if not config.get("events"):
        failures.append("at least one event is required")

    destinations = config.get("destinations", {})
    for platform, required in PLATFORM_RULES.items():
        destination = destinations.get(platform, {})
        if not destination.get("enabled"):
            continue
        if not destination.get("destination_id"):
            failures.append(f"{platform}: destination_id is required")
        if not destination.get("test_evidence"):
            failures.append(f"{platform}: test_evidence is required")
        if not destination.get("diagnostics_owner"):
            failures.append(f"{platform}: diagnostics_owner is required")
        missing = [field for field in required if not destination.get(field)]
        if missing:
            failures.append(f"{platform}: missing {', '.join(sorted(missing))}")
        if platform in DEDUPE_KEYS:
            if destination.get("browser_event") != destination.get("server_event"):
                failures.append(f"{platform}: overlapping browser/server events must use the same event name")
            if destination.get("dedupe_key") != DEDUPE_KEYS[platform]:
                failures.append(f"{platform}: dedupe_key must be {DEDUPE_KEYS[platform]}")

    def scan(value: object, path: str = "") -> None:
        if isinstance(value, dict):
            for key, child in value.items():
                if key.lower() in FORBIDDEN_KEYS and child:
                    failures.append(f"{path}{key}: credentials or raw personal identifiers are not allowed in readiness config")
                scan(child, f"{path}{key}.")
        elif isinstance(value, list):
            for child in value:
                scan(child, path)

    scan(config)
    if not any(destination.get("enabled") for destination in destinations.values()):
        warnings.append("no destination is enabled; this is a planning-only configuration")

    for warning in warnings:
        print(f"WARN: {warning}")
    for failure in failures:
        print(f"FAIL: {failure}")
    if failures:
        return 1
    print("PASS: conversion API readiness checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())

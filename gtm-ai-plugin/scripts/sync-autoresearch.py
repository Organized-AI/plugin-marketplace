#!/usr/bin/env python3
"""Vendor the canonical Fix Your Tracking skill for standalone plugin installs."""
import argparse
import shutil
from pathlib import Path


def sync(source, destination, check=False):
    source_files = {p.relative_to(source): p for p in source.rglob('*') if p.is_file()}
    if Path('SKILL.md') not in source_files:
        raise ValueError('Canonical Fix Your Tracking SKILL.md is missing')
    destination_files = {p.relative_to(destination): p for p in destination.rglob('*') if p.is_file()}
    changed = set(source_files) != set(destination_files) or any(
        key not in destination_files or path.read_bytes() != destination_files[key].read_bytes()
        for key, path in source_files.items()
    )
    if check:
        return not changed
    for key, path in source_files.items():
        target = destination / key
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)
    for key in set(destination_files) - set(source_files):
        destination_files[key].unlink()
    return True


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    source = root / 'fix-your-tracking/.claude/skills/gtm-autoresearch-loop'
    targets = [root / name / 'skills/gtm-autoresearch-loop' for name in ['gtm-ai-plugin', 'gtm-audit-pro']]
    results = [sync(source, target, args.check) for target in targets]
    audit_source = root / 'gtm-audit-pro/skills/gtm-audit-pro'
    results += [sync(audit_source, target, args.check) for target in [
        root / 'gtm-ai-plugin/skills/gtm-audit-pro',
        root / 'fix-your-tracking/.claude/skills/gtm-audit-pro',
    ]]
    if not all(results):
        parser.exit(1, 'Autoresearch bundle differs from Fix Your Tracking; run sync-autoresearch.py\n')

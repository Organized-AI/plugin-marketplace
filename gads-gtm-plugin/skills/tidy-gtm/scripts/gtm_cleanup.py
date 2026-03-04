#!/usr/bin/env python3
"""
GTM Cleanup Utility

Identifies and helps clean up unused tags, triggers, and variables
in Google Tag Manager containers.

Usage: python scripts/gtm_cleanup.py --container GTM-XXXXX
"""

import json
import argparse
from collections import defaultdict
from typing import Dict, List, Set, Any

class GTMCleanupAnalyzer:
    """Analyzes GTM containers for cleanup opportunities."""

    def __init__(self, container_data: Dict[str, Any]):
        """Initialize with container export data."""
        self.container = container_data
        self.tags = container_data.get('containerVersion', {}).get('tag', [])
        self.triggers = container_data.get('containerVersion', {}).get('trigger', [])
        self.variables = container_data.get('containerVersion', {}).get('variable', [])

    def find_unused_triggers(self) -> List[Dict]:
        """Find triggers not used by any tag."""
        used_trigger_ids = set()

        for tag in self.tags:
            # Get firing triggers
            firing = tag.get('firingTriggerId', [])
            blocking = tag.get('blockingTriggerId', [])
            used_trigger_ids.update(firing)
            used_trigger_ids.update(blocking)

        unused = []
        for trigger in self.triggers:
            if trigger.get('triggerId') not in used_trigger_ids:
                unused.append({
                    'id': trigger.get('triggerId'),
                    'name': trigger.get('name'),
                    'type': trigger.get('type')
                })

        return unused

    def find_unused_variables(self) -> List[Dict]:
        """Find variables not referenced anywhere."""
        # Get all variable names
        variable_names = {v.get('name') for v in self.variables}

        # Find referenced variables
        referenced = set()
        container_str = json.dumps(self.container)

        for name in variable_names:
            # Variables are referenced as {{Variable Name}}
            if f'{{{{{name}}}}}' in container_str:
                referenced.add(name)

        unused = []
        for variable in self.variables:
            name = variable.get('name')
            if name not in referenced:
                unused.append({
                    'name': name,
                    'type': variable.get('type')
                })

        return unused

    def find_duplicate_tags(self) -> List[Dict]:
        """Find potentially duplicate tags."""
        tag_signatures = defaultdict(list)

        for tag in self.tags:
            # Create signature from type and key parameters
            signature = (
                tag.get('type'),
                json.dumps(sorted(tag.get('parameter', []), key=lambda x: x.get('key', '')))
            )
            tag_signatures[signature].append(tag.get('name'))

        duplicates = []
        for signature, names in tag_signatures.items():
            if len(names) > 1:
                duplicates.append({
                    'type': signature[0],
                    'tag_names': names,
                    'count': len(names)
                })

        return duplicates

    def find_paused_tags(self) -> List[Dict]:
        """Find paused tags that might be candidates for removal."""
        paused = []
        for tag in self.tags:
            if tag.get('paused', False):
                paused.append({
                    'name': tag.get('name'),
                    'type': tag.get('type'),
                    'id': tag.get('tagId')
                })
        return paused

    def find_naming_issues(self) -> List[Dict]:
        """Find items with inconsistent naming."""
        issues = []

        # Check for tags without proper naming convention
        for tag in self.tags:
            name = tag.get('name', '')
            if name.startswith('Untitled') or name.startswith('Copy of'):
                issues.append({
                    'type': 'tag',
                    'name': name,
                    'issue': 'Default or copy name'
                })

        for trigger in self.triggers:
            name = trigger.get('name', '')
            if name.startswith('Untitled') or name.startswith('Copy of'):
                issues.append({
                    'type': 'trigger',
                    'name': name,
                    'issue': 'Default or copy name'
                })

        for variable in self.variables:
            name = variable.get('name', '')
            if name.startswith('Untitled') or name.startswith('Copy of'):
                issues.append({
                    'type': 'variable',
                    'name': name,
                    'issue': 'Default or copy name'
                })

        return issues

    def generate_report(self) -> str:
        """Generate a comprehensive cleanup report."""
        unused_triggers = self.find_unused_triggers()
        unused_variables = self.find_unused_variables()
        duplicate_tags = self.find_duplicate_tags()
        paused_tags = self.find_paused_tags()
        naming_issues = self.find_naming_issues()

        report = """
# GTM Container Cleanup Report

## Summary

| Category | Count |
|----------|-------|
| Unused Triggers | {unused_triggers} |
| Unused Variables | {unused_vars} |
| Potential Duplicate Tags | {duplicates} |
| Paused Tags | {paused} |
| Naming Issues | {naming} |

## Unused Triggers
{triggers_section}

## Unused Variables
{variables_section}

## Potential Duplicate Tags
{duplicates_section}

## Paused Tags
{paused_section}

## Naming Issues
{naming_section}

## Recommendations

1. Review and remove unused triggers (saves container size)
2. Remove unused variables (reduces complexity)
3. Consolidate duplicate tags (prevents double-firing)
4. Review paused tags - delete or unpause
5. Fix naming conventions for maintainability
""".format(
            unused_triggers=len(unused_triggers),
            unused_vars=len(unused_variables),
            duplicates=len(duplicate_tags),
            paused=len(paused_tags),
            naming=len(naming_issues),
            triggers_section=self._format_list(unused_triggers, 'trigger'),
            variables_section=self._format_list(unused_variables, 'variable'),
            duplicates_section=self._format_duplicates(duplicate_tags),
            paused_section=self._format_list(paused_tags, 'tag'),
            naming_section=self._format_naming_issues(naming_issues)
        )

        return report

    def _format_list(self, items: List[Dict], item_type: str) -> str:
        if not items:
            return "None found ✓"
        return '\n'.join(f"- {item.get('name', 'Unknown')} ({item.get('type', 'Unknown type')})"
                        for item in items)

    def _format_duplicates(self, duplicates: List[Dict]) -> str:
        if not duplicates:
            return "None found ✓"
        lines = []
        for dup in duplicates:
            lines.append(f"- Type: {dup['type']}")
            lines.append(f"  Tags: {', '.join(dup['tag_names'])}")
        return '\n'.join(lines)

    def _format_naming_issues(self, issues: List[Dict]) -> str:
        if not issues:
            return "None found ✓"
        return '\n'.join(f"- [{issue['type']}] {issue['name']}: {issue['issue']}"
                        for issue in issues)


def main():
    parser = argparse.ArgumentParser(description='GTM Cleanup Analyzer')
    parser.add_argument('--file', required=True, help='GTM container export JSON file')
    parser.add_argument('--output', help='Output report file')

    args = parser.parse_args()

    # Load container data
    with open(args.file, 'r') as f:
        container_data = json.load(f)

    # Analyze
    analyzer = GTMCleanupAnalyzer(container_data)
    report = analyzer.generate_report()

    if args.output:
        with open(args.output, 'w') as f:
            f.write(report)
        print(f"Report saved to: {args.output}")
    else:
        print(report)


if __name__ == "__main__":
    main()

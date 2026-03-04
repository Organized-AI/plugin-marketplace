#!/usr/bin/env python3
"""
Meta Ads Data Audit Analyzer

Analyzes Meta Ads account data for performance issues,
tracking gaps, and optimization opportunities.

Dependencies: pip install pandas numpy --break-system-packages
Usage: python scripts/audit_analyzer.py <data_export.csv>
"""

import json
import sys
from datetime import datetime, timedelta
from collections import defaultdict

# Benchmark thresholds for Meta Ads
BENCHMARKS = {
    'ctr': {
        'poor': 0.5,
        'average': 1.0,
        'good': 2.0,
        'excellent': 3.0
    },
    'cpc': {
        'excellent': 0.50,
        'good': 1.00,
        'average': 2.00,
        'poor': 3.00
    },
    'cpm': {
        'excellent': 5.00,
        'good': 10.00,
        'average': 15.00,
        'poor': 20.00
    },
    'conversion_rate': {
        'poor': 1.0,
        'average': 2.5,
        'good': 5.0,
        'excellent': 10.0
    },
    'roas': {
        'poor': 1.0,
        'average': 2.0,
        'good': 4.0,
        'excellent': 6.0
    },
    'frequency': {
        'optimal': 3.0,
        'warning': 5.0,
        'critical': 7.0
    }
}

def analyze_performance_metrics(data):
    """Analyze key performance metrics against benchmarks."""
    findings = []

    metrics = {
        'ctr': data.get('ctr', 0),
        'cpc': data.get('cpc', 0),
        'cpm': data.get('cpm', 0),
        'conversion_rate': data.get('conversion_rate', 0),
        'roas': data.get('roas', 0),
        'frequency': data.get('frequency', 0)
    }

    for metric, value in metrics.items():
        if metric in BENCHMARKS:
            benchmark = BENCHMARKS[metric]
            rating = rate_metric(value, benchmark, metric)
            findings.append({
                'metric': metric.upper(),
                'value': value,
                'rating': rating,
                'benchmark': benchmark
            })

    return findings

def rate_metric(value, benchmark, metric_type):
    """Rate a metric value against benchmark."""
    # Handle metrics where lower is better
    if metric_type in ['cpc', 'cpm', 'frequency']:
        if metric_type == 'frequency':
            if value <= benchmark['optimal']:
                return 'OPTIMAL'
            elif value <= benchmark['warning']:
                return 'WARNING'
            else:
                return 'CRITICAL'
        else:
            if value <= benchmark['excellent']:
                return 'EXCELLENT'
            elif value <= benchmark['good']:
                return 'GOOD'
            elif value <= benchmark['average']:
                return 'AVERAGE'
            else:
                return 'POOR'
    else:
        # Higher is better
        if value >= benchmark.get('excellent', 999):
            return 'EXCELLENT'
        elif value >= benchmark.get('good', 0):
            return 'GOOD'
        elif value >= benchmark.get('average', 0):
            return 'AVERAGE'
        else:
            return 'POOR'

def check_tracking_health(pixel_data):
    """Analyze pixel/CAPI tracking health."""
    issues = []

    # Check event coverage
    standard_events = ['PageView', 'ViewContent', 'AddToCart', 'InitiateCheckout', 'Purchase']
    missing_events = [e for e in standard_events if e not in pixel_data.get('events', [])]

    if missing_events:
        issues.append({
            'type': 'MISSING_EVENTS',
            'severity': 'HIGH',
            'details': f"Missing standard events: {', '.join(missing_events)}"
        })

    # Check CAPI coverage
    if not pixel_data.get('capi_enabled', False):
        issues.append({
            'type': 'NO_CAPI',
            'severity': 'HIGH',
            'details': 'Conversions API not configured - recommend implementing for iOS 14+ tracking'
        })

    # Check event match quality
    emq = pixel_data.get('event_match_quality', 0)
    if emq < 6:
        issues.append({
            'type': 'LOW_EMQ',
            'severity': 'MEDIUM',
            'details': f'Event Match Quality {emq}/10 - recommend adding more customer parameters'
        })

    # Check deduplication
    if pixel_data.get('capi_enabled') and not pixel_data.get('deduplication_enabled'):
        issues.append({
            'type': 'NO_DEDUPLICATION',
            'severity': 'MEDIUM',
            'details': 'CAPI enabled without deduplication - may cause duplicate event counting'
        })

    return issues

def generate_recommendations(findings, tracking_issues):
    """Generate prioritized recommendations."""
    recommendations = []

    # Performance-based recommendations
    for finding in findings:
        if finding['rating'] == 'POOR':
            if finding['metric'] == 'CTR':
                recommendations.append({
                    'priority': 'HIGH',
                    'area': 'Creative',
                    'action': 'Test new ad creatives - current CTR below benchmark',
                    'expected_impact': 'Improved engagement and lower CPM'
                })
            elif finding['metric'] == 'ROAS':
                recommendations.append({
                    'priority': 'HIGH',
                    'area': 'Targeting',
                    'action': 'Review audience targeting and exclude non-converting segments',
                    'expected_impact': 'Better return on ad spend'
                })
            elif finding['metric'] == 'FREQUENCY':
                recommendations.append({
                    'priority': 'MEDIUM',
                    'area': 'Budget',
                    'action': 'Expand audience or refresh creatives to combat ad fatigue',
                    'expected_impact': 'Reduced frequency, maintained performance'
                })

    # Tracking-based recommendations
    for issue in tracking_issues:
        if issue['severity'] == 'HIGH':
            recommendations.append({
                'priority': 'HIGH',
                'area': 'Tracking',
                'action': issue['details'],
                'expected_impact': 'Improved attribution and optimization'
            })

    return sorted(recommendations, key=lambda x: 0 if x['priority'] == 'HIGH' else 1)

def generate_audit_report(data, pixel_data):
    """Generate complete audit report."""
    report = {
        'generated_at': datetime.now().isoformat(),
        'account_id': data.get('account_id', 'Unknown'),
        'performance_analysis': analyze_performance_metrics(data),
        'tracking_health': check_tracking_health(pixel_data),
        'recommendations': []
    }

    report['recommendations'] = generate_recommendations(
        report['performance_analysis'],
        report['tracking_health']
    )

    return report

def print_report(report):
    """Print formatted audit report."""
    print("=" * 70)
    print("META ADS ACCOUNT AUDIT REPORT")
    print(f"Generated: {report['generated_at']}")
    print(f"Account: {report['account_id']}")
    print("=" * 70)

    print("\n## PERFORMANCE ANALYSIS\n")
    for finding in report['performance_analysis']:
        status_emoji = {'EXCELLENT': '🟢', 'GOOD': '🟡', 'AVERAGE': '🟠', 'POOR': '🔴', 'OPTIMAL': '🟢', 'WARNING': '🟠', 'CRITICAL': '🔴'}
        emoji = status_emoji.get(finding['rating'], '⚪')
        print(f"  {emoji} {finding['metric']}: {finding['value']} [{finding['rating']}]")

    print("\n## TRACKING HEALTH\n")
    if report['tracking_health']:
        for issue in report['tracking_health']:
            severity_emoji = {'HIGH': '🔴', 'MEDIUM': '🟠', 'LOW': '🟡'}
            emoji = severity_emoji.get(issue['severity'], '⚪')
            print(f"  {emoji} [{issue['type']}] {issue['details']}")
    else:
        print("  🟢 No tracking issues detected")

    print("\n## RECOMMENDATIONS\n")
    for i, rec in enumerate(report['recommendations'], 1):
        priority_emoji = {'HIGH': '🔴', 'MEDIUM': '🟠', 'LOW': '🟡'}
        emoji = priority_emoji.get(rec['priority'], '⚪')
        print(f"  {i}. {emoji} [{rec['area']}] {rec['action']}")
        print(f"     Expected Impact: {rec['expected_impact']}\n")

    print("=" * 70)

def main():
    # Demo data for testing
    sample_data = {
        'account_id': 'act_123456789',
        'ctr': 0.8,
        'cpc': 1.50,
        'cpm': 12.00,
        'conversion_rate': 2.0,
        'roas': 1.8,
        'frequency': 4.5
    }

    sample_pixel_data = {
        'events': ['PageView', 'ViewContent', 'AddToCart'],
        'capi_enabled': False,
        'event_match_quality': 5,
        'deduplication_enabled': False
    }

    print("Running audit with sample data...")
    print("(Pass a CSV file to analyze real data)\n")

    report = generate_audit_report(sample_data, sample_pixel_data)
    print_report(report)

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
GTM AI Assistant

AI-powered Google Tag Manager configuration helper.
Generates tag configurations, analyzes implementations,
and provides recommendations.

Usage: python scripts/gtm_assistant.py --help
"""

import json
import argparse
from typing import Dict, List, Any

class GTMAIAssistant:
    """AI-powered GTM configuration assistant."""

    # Common tag templates
    TAG_TEMPLATES = {
        'ga4_event': {
            'type': 'gaawe',
            'name': 'GA4 - {event_name}',
            'parameters': {
                'eventName': '{event_name}',
                'measurementId': '{{GA4 Measurement ID}}',
            }
        },
        'ga4_pageview': {
            'type': 'gaawe',
            'name': 'GA4 - Page View',
            'parameters': {
                'eventName': 'page_view',
                'measurementId': '{{GA4 Measurement ID}}',
            }
        },
        'meta_pixel': {
            'type': 'html',
            'name': 'Meta Pixel - {event_name}',
            'html': """
<script>
  fbq('track', '{event_name}', {parameters});
</script>
"""
        },
        'linkedin_insight': {
            'type': 'html',
            'name': 'LinkedIn - {event_name}',
            'html': """
<script>
  window.lintrk('track', {{ conversion_id: {conversion_id} }});
</script>
"""
        },
        'custom_html': {
            'type': 'html',
            'name': '{tag_name}',
            'html': '{html_code}'
        }
    }

    # Common trigger templates
    TRIGGER_TEMPLATES = {
        'page_view': {
            'type': 'pageview',
            'name': 'All Pages',
            'filter': None
        },
        'click': {
            'type': 'click',
            'name': 'Click - {element}',
            'filter': '{css_selector}'
        },
        'form_submit': {
            'type': 'formSubmit',
            'name': 'Form Submit - {form_name}',
            'filter': '{form_selector}'
        },
        'custom_event': {
            'type': 'customEvent',
            'name': 'Custom Event - {event_name}',
            'filter': '{event_name}'
        },
        'dom_ready': {
            'type': 'domReady',
            'name': 'DOM Ready',
            'filter': None
        },
        'window_loaded': {
            'type': 'windowLoaded',
            'name': 'Window Loaded',
            'filter': None
        }
    }

    # Variable templates
    VARIABLE_TEMPLATES = {
        'data_layer': {
            'type': 'v',
            'name': 'DLV - {variable_name}',
            'dataLayerVersion': 2,
            'setDefaultValue': False
        },
        'javascript': {
            'type': 'jsm',
            'name': 'JS - {variable_name}',
            'javascript': '{js_code}'
        },
        'constant': {
            'type': 'c',
            'name': 'Const - {variable_name}',
            'value': '{value}'
        },
        'url': {
            'type': 'u',
            'name': 'URL - {component}',
            'component': '{component}'  # PATH, HOST, QUERY, etc.
        },
        'first_party_cookie': {
            'type': 'k',
            'name': 'Cookie - {cookie_name}',
            'name': '{cookie_name}'
        }
    }

    @staticmethod
    def generate_ga4_event_tag(event_name: str, parameters: Dict = None) -> Dict:
        """Generate a GA4 event tag configuration."""
        tag = {
            'name': f'GA4 - {event_name}',
            'type': 'gaawe',
            'parameter': [
                {'key': 'eventName', 'type': 'template', 'value': event_name},
                {'key': 'measurementIdOverride', 'type': 'template', 'value': '{{GA4 Measurement ID}}'}
            ]
        }

        if parameters:
            event_params = []
            for key, value in parameters.items():
                event_params.append({
                    'map': [
                        {'key': 'name', 'type': 'template', 'value': key},
                        {'key': 'value', 'type': 'template', 'value': value}
                    ],
                    'type': 'map'
                })
            tag['parameter'].append({
                'key': 'eventParameters',
                'type': 'list',
                'list': event_params
            })

        return tag

    @staticmethod
    def generate_meta_pixel_event(event_name: str, parameters: Dict = None) -> str:
        """Generate Meta Pixel event tracking code."""
        params_str = json.dumps(parameters or {})
        return f"""<script>
  fbq('track', '{event_name}', {params_str});
</script>"""

    @staticmethod
    def generate_data_layer_push(event_name: str, parameters: Dict = None) -> str:
        """Generate dataLayer.push code."""
        data = {'event': event_name}
        if parameters:
            data.update(parameters)
        return f"dataLayer.push({json.dumps(data, indent=2)});"

    @staticmethod
    def analyze_implementation(tags: List[Dict]) -> Dict:
        """Analyze GTM implementation for issues and recommendations."""
        analysis = {
            'total_tags': len(tags),
            'issues': [],
            'recommendations': [],
            'by_type': {}
        }

        for tag in tags:
            tag_type = tag.get('type', 'unknown')
            analysis['by_type'][tag_type] = analysis['by_type'].get(tag_type, 0) + 1

            # Check for issues
            if tag.get('paused'):
                analysis['issues'].append(f"Paused tag: {tag.get('name')}")

            if 'Untitled' in tag.get('name', ''):
                analysis['issues'].append(f"Unnamed tag: {tag.get('name')}")

        # Generate recommendations
        if analysis['by_type'].get('html', 0) > 5:
            analysis['recommendations'].append(
                'Consider using built-in tag templates instead of Custom HTML where possible'
            )

        if analysis['total_tags'] > 50:
            analysis['recommendations'].append(
                'Large number of tags - consider consolidating or using tag sequences'
            )

        return analysis

    @staticmethod
    def suggest_tracking_plan(site_type: str) -> Dict:
        """Suggest a tracking plan based on site type."""
        plans = {
            'ecommerce': {
                'events': [
                    'page_view',
                    'view_item',
                    'add_to_cart',
                    'remove_from_cart',
                    'view_cart',
                    'begin_checkout',
                    'add_payment_info',
                    'add_shipping_info',
                    'purchase'
                ],
                'parameters': {
                    'purchase': ['transaction_id', 'value', 'currency', 'items'],
                    'add_to_cart': ['item_id', 'item_name', 'price', 'quantity']
                }
            },
            'saas': {
                'events': [
                    'page_view',
                    'sign_up',
                    'login',
                    'feature_used',
                    'subscription_started',
                    'subscription_cancelled',
                    'upgrade',
                    'downgrade'
                ],
                'parameters': {
                    'sign_up': ['method', 'plan'],
                    'feature_used': ['feature_name', 'usage_count']
                }
            },
            'content': {
                'events': [
                    'page_view',
                    'scroll',
                    'article_read',
                    'video_play',
                    'video_complete',
                    'share',
                    'newsletter_signup'
                ],
                'parameters': {
                    'article_read': ['article_id', 'category', 'author'],
                    'video_play': ['video_id', 'video_title', 'duration']
                }
            }
        }

        return plans.get(site_type, plans['content'])


def main():
    parser = argparse.ArgumentParser(description='GTM AI Assistant')
    parser.add_argument('--generate-tag', choices=['ga4', 'meta', 'linkedin'],
                       help='Generate tag configuration')
    parser.add_argument('--event', help='Event name')
    parser.add_argument('--tracking-plan', choices=['ecommerce', 'saas', 'content'],
                       help='Generate tracking plan')
    parser.add_argument('--analyze', help='Analyze GTM export file')

    args = parser.parse_args()

    assistant = GTMAIAssistant()

    if args.generate_tag == 'ga4' and args.event:
        tag = assistant.generate_ga4_event_tag(args.event)
        print(json.dumps(tag, indent=2))

    elif args.tracking_plan:
        plan = assistant.suggest_tracking_plan(args.tracking_plan)
        print(json.dumps(plan, indent=2))

    elif args.analyze:
        with open(args.analyze, 'r') as f:
            data = json.load(f)
        tags = data.get('containerVersion', {}).get('tag', [])
        analysis = assistant.analyze_implementation(tags)
        print(json.dumps(analysis, indent=2))

    else:
        parser.print_help()


if __name__ == "__main__":
    main()

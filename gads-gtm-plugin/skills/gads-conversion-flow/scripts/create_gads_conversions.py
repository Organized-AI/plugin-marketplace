#!/usr/bin/env python3
"""
Google Ads Conversion Action Creator

Creates conversion actions via the Google Ads API and fetches their
conversion labels for use in GTM tags.

Required: pip install google-ads

Config via env vars or --config JSON file:
  GADS_DEVELOPER_TOKEN, GADS_CLIENT_ID, GADS_CLIENT_SECRET,
  GADS_REFRESH_TOKEN, GADS_LOGIN_CUSTOMER_ID, GADS_CUSTOMER_ID
"""
import argparse
import json
import os
import re
import sys

def get_config(config_path=None):
    """Load config from JSON file or environment variables."""
    if config_path:
        with open(config_path) as f:
            return json.load(f)

    required = {
        "developer_token": os.getenv("GADS_DEVELOPER_TOKEN"),
        "client_id": os.getenv("GADS_CLIENT_ID"),
        "client_secret": os.getenv("GADS_CLIENT_SECRET"),
        "refresh_token": os.getenv("GADS_REFRESH_TOKEN"),
        "login_customer_id": os.getenv("GADS_LOGIN_CUSTOMER_ID"),
    }
    missing = [k for k, v in required.items() if not v]
    if missing:
        print(f"Missing env vars: {', '.join('GADS_' + k.upper() for k in missing)}")
        print("Set env vars or pass --config path/to/config.json")
        sys.exit(1)

    required["use_proto_plus"] = True
    return required


# Default conversion actions — override with --conversions JSON
DEFAULT_CONVERSIONS = [
    {"name": "Purchase", "category": "PURCHASE"},
    {"name": "Begin Checkout", "category": "BEGIN_CHECKOUT"},
    {"name": "Add to Cart", "category": "ADD_TO_CART"},
]

CATEGORY_MAP_KEYS = [
    "PURCHASE", "BEGIN_CHECKOUT", "ADD_TO_CART",
    "SIGNUP", "LEAD", "PAGE_VIEW", "SUBSCRIBE_PAID",
    "ADD_TO_WISHLIST", "CONTACT", "DOWNLOAD",
]


def main():
    parser = argparse.ArgumentParser(description="Create Google Ads conversion actions")
    parser.add_argument("--config", help="Path to JSON config file with API credentials")
    parser.add_argument("--customer-id", default=os.getenv("GADS_CUSTOMER_ID"),
                        help="Google Ads customer ID (no dashes)")
    parser.add_argument("--conversions", help="JSON file with conversion definitions")
    parser.add_argument("--dry-run", action="store_true", help="Print plan without creating")
    parser.add_argument("--labels-only", action="store_true",
                        help="Skip creation, only fetch existing labels")
    parser.add_argument("--output", choices=["table", "json", "env"], default="table",
                        help="Output format for labels")
    args = parser.parse_args()

    if not args.customer_id:
        print("Error: --customer-id or GADS_CUSTOMER_ID required")
        sys.exit(1)

    customer_id = args.customer_id.replace("-", "")
    config = get_config(args.config)

    # Load conversion definitions
    if args.conversions:
        with open(args.conversions) as f:
            conversions = json.load(f)
    else:
        conversions = DEFAULT_CONVERSIONS

    try:
        from google.ads.googleads.client import GoogleAdsClient
    except ImportError:
        print("Error: pip install google-ads")
        sys.exit(1)

    client = GoogleAdsClient.load_from_dict(config)
    svc = client.get_service("ConversionActionService")
    ga = client.get_service("GoogleAdsService")
    enums = client.enums

    print(f"\n{'=' * 60}")
    print(f"Google Ads Conversion Actions")
    print(f"Account: {customer_id}")
    print(f"{'=' * 60}")

    # Build category map dynamically
    cat_enum = enums.ConversionActionCategoryEnum
    cat_map = {}
    for key in CATEGORY_MAP_KEYS:
        if hasattr(cat_enum, key):
            cat_map[key] = getattr(cat_enum, key)

    # --- Create conversion actions ---
    if not args.labels_only:
        for conv in conversions:
            name = conv["name"]
            cat = conv["category"]

            if args.dry_run:
                print(f"\n[DRY RUN] Would create: {name} (category: {cat})")
                continue

            if cat not in cat_map:
                print(f"\n⚠️  Unknown category '{cat}' for {name}, skipping")
                continue

            op = client.get_type("ConversionActionOperation")
            a = op.create
            a.name = name
            a.type_ = enums.ConversionActionTypeEnum.WEBPAGE
            a.category = cat_map[cat]
            a.value_settings.default_value = 0.0
            a.value_settings.always_use_default_value = False
            a.counting_type = enums.ConversionActionCountingTypeEnum.MANY_PER_CLICK
            a.attribution_model_settings.attribution_model = (
                enums.AttributionModelEnum.GOOGLE_SEARCH_ATTRIBUTION_DATA_DRIVEN
            )
            a.primary_for_goal = True
            a.click_through_lookback_window_days = 30
            a.view_through_lookback_window_days = 1

            try:
                resp = svc.mutate_conversion_actions(
                    customer_id=customer_id, operations=[op]
                )
                print(f"\n✅ Created: {name}")
                print(f"   Resource: {resp.results[0].resource_name}")
            except Exception as e:
                if "DUPLICATE_NAME" in str(e):
                    print(f"\n⏭️  Skipped: {name} (already exists)")
                else:
                    print(f"\n❌ Error: {name} — {e}")

    if args.dry_run:
        print("\n[DRY RUN] No changes made.")
        return

    # --- Fetch conversion labels ---
    print(f"\n{'-' * 60}")
    print("Fetching conversion labels...\n")

    query = """
        SELECT
            conversion_action.id,
            conversion_action.name,
            conversion_action.category,
            conversion_action.tag_snippets
        FROM conversion_action
        WHERE conversion_action.type = 'WEBPAGE'
          AND conversion_action.status = 'ENABLED'
    """
    rows = ga.search(customer_id=customer_id, query=query)

    labels = []
    seen = set()
    for row in rows:
        a = row.conversion_action
        for snip in a.tag_snippets:
            if snip.type_ == enums.TrackingCodeTypeEnum.WEBPAGE:
                m = re.search(r"AW-(\d+)/([A-Za-z0-9_-]+)", snip.event_snippet)
                if m and a.name not in seen:
                    seen.add(a.name)
                    labels.append({
                        "name": a.name,
                        "conversion_id": m.group(1),
                        "label": m.group(2),
                        "send_to": f"AW-{m.group(1)}/{m.group(2)}",
                    })

    # --- Output ---
    if args.output == "json":
        print(json.dumps(labels, indent=2))
    elif args.output == "env":
        for l in labels:
            key = l["name"].upper().replace(" ", "_")
            print(f'GADS_LABEL_{key}="{l["label"]}"')
            print(f'GADS_SEND_TO_{key}="{l["send_to"]}"')
    else:
        print(f"{'=' * 60}")
        print("CONVERSION LABELS FOR GTM")
        print(f"{'=' * 60}")
        for l in labels:
            print(f"\n  {l['name']}:")
            print(f"    Conversion Label: {l['label']}")
            print(f"    Full send_to:     {l['send_to']}")

        print(f"\n{'=' * 60}")
        print("Paste these labels to update GTM variables.")
        print(f"{'=' * 60}\n")


if __name__ == "__main__":
    main()

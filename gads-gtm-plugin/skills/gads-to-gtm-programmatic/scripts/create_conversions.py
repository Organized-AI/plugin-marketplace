#!/usr/bin/env python3
"""
Google Ads Conversion Action Creator
Templatized for any client. Fill in CONFIG and CUSTOMER_ID, then run locally.

Usage:
  pip install google-ads
  python3 create_conversions.py
"""
from google.ads.googleads.client import GoogleAdsClient
import re

# ─── FILL THESE IN PER CLIENT ───────────────────────────────────────
CONFIG = {
    "developer_token": "PASTE_DEV_TOKEN",
    "client_id": "PASTE_OAUTH_CLIENT_ID",
    "client_secret": "PASTE_OAUTH_CLIENT_SECRET",
    "refresh_token": "PASTE_REFRESH_TOKEN",
    "login_customer_id": "PASTE_MCC_ID_NO_DASHES",  # e.g. "4761832056"
    "use_proto_plus": True,
}

CUSTOMER_ID = "PASTE_CUSTOMER_ID_NO_DASHES"  # e.g. "1631704656"

# ─── CONVERSION ACTIONS TO CREATE ───────────────────────────────────
# Format: (display_name, category_key)
# Available categories: PURCHASE, BEGIN_CHECKOUT, ADD_TO_CART, PAGE_VIEW,
#   SIGNUP, LEAD, DOWNLOAD, ADD_TO_WISHLIST, SUBSCRIBE_PAID, BOOK_APPOINTMENT,
#   GET_DIRECTIONS, OUTBOUND_CLICK, CONTACT, ENGAGEMENT, STORE_VISIT,
#   STORE_SALE, QUALIFIED_LEAD, CONVERTED_LEAD
CONVERSIONS = [
    ("Purchase", "PURCHASE"),
    ("Begin Checkout", "BEGIN_CHECKOUT"),
    ("Add to Cart", "ADD_TO_CART"),
]
# ────────────────────────────────────────────────────────────────────


def get_category_enum(client, key):
    """Map category string to protobuf enum value."""
    cat = client.enums.ConversionActionCategoryEnum
    mapping = {
        "PURCHASE": cat.PURCHASE,
        "BEGIN_CHECKOUT": cat.BEGIN_CHECKOUT,
        "ADD_TO_CART": cat.ADD_TO_CART,
        "PAGE_VIEW": cat.PAGE_VIEW,
        "SIGNUP": cat.SIGNUP,
        "LEAD": cat.LEAD,
        "DOWNLOAD": cat.DOWNLOAD,
        "SUBSCRIBE_PAID": cat.SUBSCRIBE_PAID,
        "BOOK_APPOINTMENT": cat.BOOK_APPOINTMENT,
        "GET_DIRECTIONS": cat.GET_DIRECTIONS,
        "OUTBOUND_CLICK": cat.OUTBOUND_CLICK,
        "CONTACT": cat.CONTACT,
        "ENGAGEMENT": cat.ENGAGEMENT,
        "STORE_VISIT": cat.STORE_VISIT,
        "STORE_SALE": cat.STORE_SALE,
        "QUALIFIED_LEAD": cat.QUALIFIED_LEAD,
        "CONVERTED_LEAD": cat.CONVERTED_LEAD,
    }
    return mapping.get(key, cat.DEFAULT)


def create_conversions(client):
    """Create conversion actions and return resource names."""
    svc = client.get_service("ConversionActionService")
    enums = client.enums
    created = []

    for name, cat_key in CONVERSIONS:
        op = client.get_type("ConversionActionOperation")
        a = op.create
        a.name = name
        a.type_ = enums.ConversionActionTypeEnum.WEBPAGE
        a.category = get_category_enum(client, cat_key)
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
                customer_id=CUSTOMER_ID, operations=[op]
            )
            rn = resp.results[0].resource_name
            print(f"  ✅ Created: {name} → {rn}")
            created.append((name, rn))
        except Exception as e:
            if "DUPLICATE_NAME" in str(e):
                print(f"  ⏭️  Skipped: {name} (already exists)")
            else:
                print(f"  ❌ Error: {name} — {e}")

    return created


def fetch_labels(client):
    """Query conversion actions and extract labels from tag_snippets."""
    ga = client.get_service("GoogleAdsService")
    enums = client.enums

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

    rows = ga.search(customer_id=CUSTOMER_ID, query=query)
    labels = {}

    for row in rows:
        a = row.conversion_action
        for snip in a.tag_snippets:
            if snip.type_ == enums.TrackingCodeTypeEnum.WEBPAGE:
                m = re.search(r"AW-\d+/([A-Za-z0-9_-]+)", snip.event_snippet)
                if m:
                    labels[a.name] = m.group(1)

    return labels


def get_conversion_tracking_id(client):
    """Fetch the account's conversion tracking ID (AW-XXXXXXXXX)."""
    ga = client.get_service("GoogleAdsService")
    query = """
        SELECT customer.conversion_tracking_setting.conversion_tracking_id
        FROM customer
    """
    rows = ga.search(customer_id=CUSTOMER_ID, query=query)
    for row in rows:
        return str(row.customer.conversion_tracking_setting.conversion_tracking_id)
    return None


def main():
    client = GoogleAdsClient.load_from_dict(CONFIG)

    print("\n" + "=" * 60)
    print("Google Ads → GTM Programmatic Conversion Setup")
    print(f"Account: {CUSTOMER_ID}")
    print("=" * 60)

    # Get conversion tracking ID
    ct_id = get_conversion_tracking_id(client)
    print(f"\n● Conversion Tracking ID: AW-{ct_id}")

    # Create conversion actions
    print("\n● Creating conversion actions...")
    create_conversions(client)

    # Fetch labels
    print("\n● Fetching conversion labels...")
    labels = fetch_labels(client)

    if labels:
        print("\n" + "=" * 60)
        print(f"{'Conversion':<20} {'Label':<30} {'Full send_to'}")
        print("-" * 60)
        for name, label in labels.items():
            print(f"{name:<20} {label:<30} AW-{ct_id}/{label}")
        print("=" * 60)
        print("\n● Paste these labels into your GTM constant variables.")
    else:
        print("\n⚠️  No labels returned yet. Wait 1-2 minutes and re-run.")

    print()


if __name__ == "__main__":
    main()

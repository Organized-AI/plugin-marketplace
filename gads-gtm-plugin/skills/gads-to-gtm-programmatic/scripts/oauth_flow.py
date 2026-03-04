#!/usr/bin/env python3
"""
OAuth 2.0 Refresh Token Generator for Google Ads API
Generates the refresh token needed for create_conversions.py

Usage:
  pip install google-auth-oauthlib
  python3 oauth_flow.py
"""
import urllib.parse
import requests

# ─── FILL THESE IN ──────────────────────────────────────────────────
CLIENT_ID = "PASTE_OAUTH_CLIENT_ID"
CLIENT_SECRET = "PASTE_OAUTH_CLIENT_SECRET"
# ────────────────────────────────────────────────────────────────────

SCOPES = "https://www.googleapis.com/auth/adwords"
REDIRECT_URI = "http://localhost"


def generate_auth_url():
    """Generate the authorization URL for the user to visit."""
    params = {
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPES,
        "access_type": "offline",
        "prompt": "consent",
    }
    url = "https://accounts.google.com/o/oauth2/auth?" + urllib.parse.urlencode(params)
    return url


def exchange_code(auth_code):
    """Exchange authorization code for refresh token."""
    response = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": auth_code,
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "redirect_uri": REDIRECT_URI,
            "grant_type": "authorization_code",
        },
    )
    data = response.json()
    if "error" in data:
        print(f"\n❌ Error: {data['error']}")
        print(f"   Detail: {data.get('error_description', 'N/A')}")
        return None
    return data.get("refresh_token")


def main():
    print("\n" + "=" * 60)
    print("Google Ads OAuth 2.0 — Refresh Token Generator")
    print("=" * 60)

    if CLIENT_ID == "PASTE_OAUTH_CLIENT_ID":
        print("\n❌ Fill in CLIENT_ID and CLIENT_SECRET before running.")
        return

    # Step 1: Generate auth URL
    url = generate_auth_url()
    print(f"\n● Step 1: Open this URL in your browser:\n")
    print(f"  {url}")
    print(f"\n● Step 2: Authorize the app. You'll be redirected to a localhost URL.")
    print(f"  Copy the 'code' parameter from the URL bar.")
    print(f"  It looks like: http://localhost/?code=4/0AXXXXXXXXXX&scope=...")

    # Step 2: Get the code from user
    auth_code = input("\n● Paste the authorization code here: ").strip()

    # Clean up — sometimes the code has URL encoding
    auth_code = urllib.parse.unquote(auth_code)

    # Step 3: Exchange for refresh token
    print("\n● Exchanging code for refresh token...")
    refresh_token = exchange_code(auth_code)

    if refresh_token:
        print(f"\n✅ Refresh Token:\n")
        print(f"  {refresh_token}")
        print(f"\n● Paste this into CONFIG['refresh_token'] in create_conversions.py")
    else:
        print("\n❌ Failed to get refresh token. Check credentials and try again.")

    print()


if __name__ == "__main__":
    main()

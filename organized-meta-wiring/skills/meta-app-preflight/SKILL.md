---
name: meta-app-preflight
description: Sets up the Meta side of an API integration — app, use cases, business, system user, asset assignment and token generation — and diagnoses the traps that silently break it. Use when the user says "create a Meta app", "spin up a Meta app", "set up a system user", "generate a Meta access token", "my Meta token stopped working", "error 190", "Advanced Access", "App Review", "Business Verification", "Marketing API tier", or asks why a Meta integration died about two months after it was working.
---

# Meta app preflight

Run this before any Meta integration code, and return to it whenever tokens break.

## What is automatable and what is not

**Automatable via the Business Management API:** creating a business, creating ad accounts, creating system users, assigning assets, minting tokens, refreshing and revoking tokens. Script all of it — `scripts/meta-provision.sh`.

**Not automatable:** creating the Meta app. State this plainly. `POST /{business_id}/owned_apps` reads "an Application will be created" in the auto-generated reference, but it takes **no parameters** and returns `{access_status}` — it claims an existing app. Its sibling `client_apps` takes only `app_id`. No endpoint accepts a name, category or contact email. You can *configure* an app via API; you cannot *create* one.

You also cannot rotate the app secret via API, and you cannot create Pages through the API at either Marketing API tier.

## Two permanent choices

**Use cases cannot be removed after app creation.** You can add compatible ones later; incompatible ones stay permanently greyed out. Pick the use case deliberately at creation.

**The app secret cannot be rotated programmatically.** Reset is dashboard-only. If it leaks and you do not act, Meta may force a reset, which revokes every user data grant and stops all business integrations at once. Treat it as the highest-blast-radius credential in the system.

## Dashboard steps, in order

1. **Create the app** — `https://developers.facebook.com/apps/creation/`. Choose the use case now.
2. **Create a system user** — Business Settings → Users → System Users → Add. Role: **Admin**.
3. **Assign assets** to that system user — ad accounts, Pages, datasets (pixels), catalogs. A Page you personally own but do not assign will be invisible to the system user.
4. **Add the system user as App Admin** — App Settings → Roles → Roles. Easy to miss; token generation fails without it.
5. **Generate a token** — System Users → select user → Generate New Token → select your app → select scopes → Generate.
6. **Store and schedule** — Worker secret, plus a cron to refresh well inside 60 days.

## Access levels — two axes, renamed May 2026

These are constantly confused. They are different things.

**Graph API access levels** (platform-wide, per permission). *Standard* is automatic and lets you request permissions only from people who have a **role on your app**. *Advanced* is needed to request permissions from anyone else, and requires App Review **and** Business Verification plus an annual Data Use Checkup.

**Marketing API Access Tier** (rate limits and capability). Renamed in May 2026: "Standard Access" is now **Limited access**, "Advanced Access" is now **Full access**. Limited is automatic, heavily rate limited, and described by Meta as "for development only, not for production apps running for live advertisers." It also gives no Business Manager access for managing ad accounts, users or Pages, and caps you at 1 system user plus 1 admin.

Qualifying for Full access needs **500+ Marketing API calls in the last 15 days** (reduced from 1,500 in May 2026) with an **error rate under 15%** across the last 500. Those are maintenance requirements, not just entry requirements — fall below and you can lose it. Note the chicken-and-egg: you must make 500 real calls while heavily throttled before the throttle lifts. Budget a warm-up.

**Practical rule.** Single-tenant Worker on your own assets: add yourself as an app admin, stay Standard/Limited, no review needed. The moment a client's business must grant your app access, you need Advanced Access and Business Verification.

## Other hard limits

You may hold a developer or admin role on at most **15 apps** not connected to a Meta Verified Business Account, and archived apps still count.

## Why a token stopped working

Run `scripts/meta-doctor.sh`. It calls `/debug_token`, reports type, expiry, scopes and validity, and checks the refresh window.

Most likely causes, in order: the 60-day token was never refreshed and is forfeit; the token was explicitly revoked; the app secret was reset; the system user lost an asset assignment; or a user-token-derived credential died because someone changed their password, logged out, or lost a Page role (error 190 subcode 492).

Meta will not notify you about any of these. You find out on the next call.

---
name: google-oauth-preflight
description: Sets up the Google Cloud side of an API integration — project, enabled services, OAuth consent screen, and Web application client — and diagnoses the traps that silently break it. Use when the user says "set up the Google Cloud project", "create the OAuth client", "enable the Gmail API", "redirect_uri_mismatch", "Access blocked: this app's request is invalid", "my tokens expired after a week", "publish the app", "unverified app", or asks why a Google integration stopped working after about seven days.
---

# Google OAuth preflight

Run this before any Google integration code is written, and return to it whenever consent breaks.

## What is automatable and what is not

Automatable, via `scripts/gcp-provision.sh`: creating the project, enabling APIs, listing what exists, uploading secrets to Cloudflare.

**Not automatable, by Google's design: creating an OAuth 2.0 Web application client.** State this plainly rather than searching for a workaround. Verified facts:

- There is no public API for creating general OAuth clients.
- The IAP OAuth client API is the only programmatic path, and its own docs say clients it creates are "locked for IAP usage only" and it "requires the brand to be set to internal."
- An internal brand restricts consent to your own Workspace domain, which defeats any multi-domain use case.
- `clientauthconfig.googleapis.com`, the private API the Console itself calls, is first-party only — it returns 404 on the client endpoint and PERMISSION_DENIED on service lookup for customer projects.
- GAM and the Google Workspace CLI (`gws`) do not change this. GAM appears automated only because it uses **desktop** clients with loopback redirects. `gws` consumes an OAuth client someone created by hand.
- IAP brands cannot be deleted once created, so do not create one speculatively.

## Console steps, in order

1. **Branding** — `https://console.cloud.google.com/auth/branding?project=PROJECT_ID`
   App name, support email, user type **External** unless every user is inside your own Workspace.

2. **Audience** — `https://console.cloud.google.com/auth/audience?project=PROJECT_ID`
   Click **Publish app**. Do this *before* connecting any real account.

3. **Clients** — `https://console.cloud.google.com/auth/clients?project=PROJECT_ID`
   Create client, type **Web application**. Add the authorised redirect URI exactly, no trailing slash:
   `https://<worker>.<subdomain>.workers.dev/oauth/callback`

4. **Push credentials** — `scripts/set-google-secrets.sh path/to/client_secret_*.json`

## The traps

**The seven-day trap.** An OAuth app in **Testing** publishing status issues refresh tokens that expire seven days after consent. Connect a dozen mailboxes today and every one dies next week, silently and all at once. Publishing to In Production fixes it going forward, but tokens minted while in Testing keep the seven-day clock — those accounts must reconnect. Build a `/health` check that flags any token not refreshed in six days.

**Wrong client type.** Desktop/`installed` clients only accept `http://localhost` and custom-scheme redirects. They cannot hold an HTTPS callback. The symptom is `redirect_uri_mismatch` that no amount of Console editing fixes. Check the downloaded JSON: the top-level key is `web` for a usable client, `installed` for a broken one.

**Wrong box.** "Authorised JavaScript origins" is not "Authorised redirect URIs". Same error message.

**Wrong project.** A client id's leading digits are the project number. If it doesn't match the project whose APIs you enabled, the client lives elsewhere — either move or enable the APIs where the client actually is.

**Propagation.** Redirect URI changes can take a few minutes. A mismatch immediately after saving is not proof of misconfiguration.

**Verification cost.** Unverified production apps cap at 100 users and show an interstitial users click through via *Advanced*. Restricted scopes drag in an annual CASA security assessment at verification time; `drive.file` avoids that entirely for files the app creates.

## Diagnosing a live failure

Run `scripts/oauth-doctor.sh <worker-url>`. It reports which secrets are set, the exact `client_id` and `redirect_uri` the Worker sends to Google, whether the client is web or desktop type, and token ages against the seven-day threshold.

Do not conclude a client is working by fetching the auth URL unauthenticated — Google serves a sign-in page before validating the redirect URI, so a broken client looks fine. Verify by inspecting the client type and the redirect URI the Worker actually emits.

## Scripts

- `scripts/gcp-provision.sh` — project, API enablement, Cloudflare resources
- `scripts/set-google-secrets.sh` — upload client id and secret, verify health
- `scripts/oauth-doctor.sh` — diagnose a deployed integration

# Meta token model

The mental model that matters: **on Google a refresh token mints access tokens and persists. On Meta the token refreshes into a different token.** Everything below follows from that.

## Types and lifetimes

| Token | How obtained | Lifetime | Refresh |
|---|---|---|---|
| System user, non-expiring | `POST /{system-user-id}/access_tokens` | Never expires | Not required |
| System user, 60-day | Same, with `set_token_expires_in_60_days=true` | 60 days from generation or last refresh | Required, or the token is forfeit |
| User, short-lived | Login dialog | About 1–2 hours | Exchange for long-lived |
| User, long-lived | `grant_type=fb_exchange_token` | About 60 days | Cannot renew after expiry — user logs in again |
| Page, long-lived | `GET /{app-scoped-user-id}/accounts` with a long-lived user token | No expiration date | Dies if the user loses their Page role |
| App | `client_credentials`, or literally `{app-id}\|{app-secret}` | Until the app secret resets | Server-to-server only |

Meta now states that some businesses **must** use expiring tokens, and that omitting the parameter errors for them. Treat non-expiring as deprecated in practice and build for the 60-day path — it degrades gracefully to the non-expiring case.

## Refresh

```
GET https://graph.facebook.com/{version}/oauth/access_token
    ?grant_type=fb_exchange_token
    &client_id={app-id}
    &client_secret={app-secret}
    &set_token_expires_in_60_days=true
    &fb_exchange_token={current-token}
```

Returns a new `access_token` with `expires_in` around 5,183,944 seconds. Refresh **resets** the clock from the refresh date rather than extending it, so refreshing early is free and idempotent.

## Zero-downtime rotation

1. Refresh — you get a new token valid 60 days from now.
2. The old token **keeps working until its original expiry**.
3. Deploy the new token.
4. Revoke the old one explicitly. Invalidation is immediate.

That overlap is the reason a non-atomic deploy is safe here, and it is worth exploiting rather than engineering around.

## Revoke

```
GET https://graph.facebook.com/{version}/oauth/revoke
    ?client_id={app-id}&client_secret={app-secret}
    &revoke_token={token}&access_token={caller-token}
```

`DELETE /{system-user-id}/access_tokens` nukes all of that system user's tokens at once.

## Inspect

`/debug_token?input_token={token}&access_token={app-token}` reports type, app id, expiry, `data_access_expires_at`, scopes and validity. A token can be `is_valid` while `data_access_expires_at` has passed, in which case user-data reads fail but the token looks healthy. Check both.

## Supported system user scopes

System user tokens carry a fixed scope list including `ads_management`, `ads_read`, `business_management`, `catalog_management`, `instagram_basic`, `leads_retrieval`, `pages_*`, `read_insights`, `whatsapp_business_management` and `whatsapp_business_messaging`. Notably absent are the newer `instagram_business_*` permissions — if you need those, a system user token will not carry them.

## Invalidation triggers

Password change, logout, revoked authorisation, user checkpointed, scheduled expiry, early invalidation for security reasons, app secret reset, app deemed inactive, and `data_access_expires_at` elapsing. Meta notifies you about none of them.

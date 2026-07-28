# Proven code modules — Meta

Copy-ready TypeScript for a Cloudflare Worker. The crypto is identical to the Google framework; the token lifecycle and the rate limiting are not.

## 1. The vault, built for self-replacing tokens

This is the module that does **not** port from Google. There is no refresh token on Meta — the credential refreshes into a new credential.

```ts
const GRAPH = (v: string) => `https://graph.facebook.com/${v}`;

export class MetaTokenVault {
  constructor(private env: Env) {}

  /** Store or replace a system user token. `expiresAt` is 0 for non-expiring. */
  async store(accountId: string, token: string, expiresAt: number, scopes: string) {
    const { ciphertext, iv } = await encryptFor(this.env.VAULT_MASTER_KEY!, accountId, token);
    const ts = now();
    await this.env.DB.prepare(
      `INSERT INTO meta_tokens (account_id, token_enc, iv, key_version, expires_at, scopes, created_at, updated_at)
       VALUES (?,?,?,1,?,?,?,?)
       ON CONFLICT(account_id) DO UPDATE SET
         token_enc=excluded.token_enc, iv=excluded.iv,
         expires_at=excluded.expires_at, scopes=excluded.scopes,
         rotated_at=?, updated_at=?`
    ).bind(accountId, ciphertext, iv, expiresAt, scopes, ts, ts, ts, ts).run();
  }

  async get(accountId: string): Promise<string> {
    const row = await this.env.DB.prepare(
      `SELECT token_enc, iv FROM meta_tokens WHERE account_id=?`).bind(accountId).first<any>();
    if (!row) throw new Error(`no Meta token for ${accountId}`);
    return decryptFor(this.env.VAULT_MASTER_KEY!, accountId, row.token_enc, row.iv);
  }

  /**
   * Rolling 60-day refresh. Meta returns a NEW token string; the OLD one stays
   * valid until its original expiry. That overlap is what makes this safe to
   * run mid-flight: store the new one, verify, then revoke the old.
   */
  async refresh(accountId: string): Promise<{ rotated: boolean; expiresAt: number }> {
    const current = await this.get(accountId);
    const url = new URL(`${GRAPH(this.env.GRAPH_VERSION)}/oauth/access_token`);
    url.searchParams.set('grant_type', 'fb_exchange_token');
    url.searchParams.set('client_id', this.env.META_APP_ID!);
    url.searchParams.set('client_secret', this.env.META_APP_SECRET!);
    url.searchParams.set('set_token_expires_in_60_days', 'true');
    url.searchParams.set('fb_exchange_token', current);

    const res = await fetch(url);
    const body = await res.json() as any;
    if (!res.ok) {
      // 190 means the token is already dead — refreshing cannot save it.
      await this.markReauth(accountId, body?.error?.message ?? `HTTP ${res.status}`);
      throw new ReauthRequired(accountId);
    }

    const expiresAt = body.expires_in ? now() + body.expires_in : 0;
    await this.store(accountId, body.access_token, expiresAt, '');
    // Old token remains valid until its own expiry — revoke only after the new
    // one is confirmed working, or simply let it lapse.
    return { rotated: body.access_token !== current, expiresAt };
  }

  async revoke(accountId: string, token: string) {
    const url = new URL(`${GRAPH(this.env.GRAPH_VERSION)}/oauth/revoke`);
    url.searchParams.set('client_id', this.env.META_APP_ID!);
    url.searchParams.set('client_secret', this.env.META_APP_SECRET!);
    url.searchParams.set('revoke_token', token);
    url.searchParams.set('access_token', await this.get(accountId));
    return fetch(url);          // invalidation is immediate
  }

  private markReauth(accountId: string, err: string) {
    return this.env.DB.prepare(
      `UPDATE meta_accounts SET status='reauth_required', last_error=?, updated_at=? WHERE account_id=?`
    ).bind(err.slice(0, 300), now(), accountId).run();
  }
}
```

## 2. Scheduled refresh — the step people skip

```ts
/** Cron daily; acts only past the threshold. Refreshing early is idempotent. */
export async function refreshDueTokens(env: Env) {
  const threshold = now() + Number(env.TOKEN_REFRESH_AT_DAYS || 45) * 86400;
  const { results } = await env.DB.prepare(
    `SELECT account_id, expires_at FROM meta_tokens
      WHERE expires_at > 0 AND expires_at < ?`).bind(threshold).all<any>();
  const vault = new MetaTokenVault(env);
  for (const r of results ?? []) {
    try { await vault.refresh(r.account_id); }
    catch (e) { console.error('refresh_failed', r.account_id, String(e)); }
  }
}
```

Failing to refresh inside 60 days **forfeits** the token — there is no grace period. A daily cron with a 45-day threshold gives fifteen days of retries.

## 3. appsecret_proof

Two documented forms. Mixing them produces error 104.

```ts
const enc = new TextEncoder();

/** Untimestamped form — HMAC of the token alone. Send NO appsecret_time. */
export async function appsecretProof(token: string, appSecret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(token));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}
```

If you use the timestamped form instead — HMAC of `token|timestamp` — you **must** also send `appsecret_time` with the same integer timestamp, and it expires after five minutes. Cast float timestamps to integers, and always hex-encode the digest.

## 4. BUC-aware API client

```ts
export class MetaApiClient {
  constructor(private env: Env, private vault: MetaTokenVault, public accountId: string) {}

  async request(path: string, init: RequestInit = {}): Promise<Response> {
    const buc = await this.env.CACHE.get(`buc:${this.accountId}`);
    if (buc && Number(buc) > now()) {
      throw new Error(`BUC throttled until ${new Date(Number(buc) * 1000).toISOString()}`);
    }

    const token = await this.vault.get(this.accountId);
    const url = new URL(`https://graph.facebook.com/${this.env.MARKETING_VERSION}${path}`);
    url.searchParams.set('access_token', token);
    url.searchParams.set('appsecret_proof', await appsecretProof(token, this.env.META_APP_SECRET!));

    const res = await fetch(url, init);
    await this.recordUsage(res);

    if (!res.ok) {
      const body = await res.clone().json().catch(() => ({})) as any;
      const code = body?.error?.code, sub = body?.error?.error_subcode;
      if (code === 190 || code === 102) {
        await this.vault['markReauth'](this.accountId, body.error.message);
        throw new ReauthRequired(this.accountId);
      }
      if ([4, 17, 32, 613].includes(code) || String(code).startsWith('80')) {
        throw new Throttled(code, sub, await this.regainMinutes(res));
      }
    }
    return res;
  }

  /** Header values are PERCENTAGES, not counts. */
  private async recordUsage(res: Response) {
    const raw = res.headers.get('x-business-use-case-usage');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      for (const arr of Object.values<any>(parsed)) {
        for (const u of arr) {
          const worst = Math.max(u.call_count ?? 0, u.total_cputime ?? 0, u.total_time ?? 0);
          if (worst >= 95) {
            // estimated_time_to_regain_access is MINUTES.
            const until = now() + (u.estimated_time_to_regain_access ?? 5) * 60;
            await this.env.CACHE.put(`buc:${this.accountId}`, String(until),
              { expirationTtl: Math.max(60, until - now() + 10) });
          }
        }
      }
    } catch { /* header shape changed; do not fail the request over telemetry */ }
  }

  private async regainMinutes(res: Response): Promise<number> {
    try {
      const p = JSON.parse(res.headers.get('x-business-use-case-usage') ?? '{}');
      for (const arr of Object.values<any>(p))
        for (const u of arr) if (u.estimated_time_to_regain_access) return u.estimated_time_to_regain_access;
    } catch {}
    return 5;
  }
}
```

Note `X-Ad-Account-Usage.reset_time_duration` is in **seconds** while `estimated_time_to_regain_access` is in **minutes**. Normalise at the boundary.

## 5. Conversions API — no vault required

```ts
export async function sendEvents(env: Env, datasetId: string, events: unknown[], testCode?: string) {
  const res = await fetch(
    `https://graph.facebook.com/${env.GRAPH_VERSION}/${datasetId}/events`,
    { method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        data: events,
        access_token: env.CAPI_DATASET_TOKEN,     // dataset-scoped, from Events Manager
        ...(testCode ? { test_event_code: testCode } : {}),
      }) });
  return res.json();
}
```

`ads_read` is the permission if you go the app route. Hash user data with SHA-256. Never leave `test_event_code` set in production — those events go to the Test Events tool, not to your dataset.

## 6. Fan-out and router

Identical to the Google framework: per-account try/catch with a concurrency cap, `207` on partial failure, every item stamped with its account. And the same router rule — `return await handler(...)` inside `try`, never bare `return`, or rejections escape the catch and every error path becomes a bodyless 500.

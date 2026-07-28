# Proven code modules

Copy-ready TypeScript for a Cloudflare Worker. These are the API-agnostic parts — the same four modules serve Gmail, GA4, Ads, GTM or anything else. Only the adapters change.

## 1. Crypto vault

```ts
const te = new TextEncoder(), td = new TextDecoder();
const KEY_VERSION = 1, HKDF_INFO = 'google-worker/token/v1';

async function deriveKey(master: string, accountId: string): Promise<CryptoKey> {
  const ikm = await crypto.subtle.importKey('raw', te.encode(master), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: te.encode(accountId), info: te.encode(HKDF_INFO) },
    ikm, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function encryptFor(master: string, accountId: string, plaintext: string) {
  const key = await deriveKey(master, accountId);
  const iv = crypto.getRandomValues(new Uint8Array(12));           // fresh IV per ciphertext
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, te.encode(plaintext));
  return { ciphertext: b64(ct), iv: b64(iv) };
}

export async function decryptFor(master: string, accountId: string, ct: string, ivB64: string) {
  const key = await deriveKey(master, accountId);
  return td.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(ivB64) }, key, unb64(ct)));
}
```

Per-account salt means one leaked derived key does not unlock the others. `key_version` lets you rotate the master by re-encrypting rows in place rather than forcing every account to re-consent.

## 2. Token manager

The three rules that matter are all visible here.

```ts
async store(accountId: string, refreshToken: string | undefined, scopes: string, expiresIn: number) {
  const ts = now();
  if (!refreshToken) {
    // Google omits refresh_token on re-consent when one already exists.
    // Update metadata only — NEVER null out what we hold.
    const existing = await this.db.prepare(`SELECT account_id FROM tokens WHERE account_id=?`)
      .bind(accountId).first();
    if (!existing) throw new Error('no refresh_token returned and none stored; re-run with prompt=consent');
    await this.db.prepare(
      `UPDATE tokens SET granted_scopes=?, expires_at=?, updated_at=? WHERE account_id=?`
    ).bind(scopes, ts + expiresIn, ts, accountId).run();
    return;
  }
  const { ciphertext, iv } = await encryptFor(this.master, accountId, refreshToken);
  await this.db.prepare(
    `INSERT INTO tokens (account_id, refresh_token_enc, key_version, iv, expires_at, granted_scopes, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?)
     ON CONFLICT(account_id) DO UPDATE SET
       refresh_token_enc=excluded.refresh_token_enc, iv=excluded.iv,
       key_version=excluded.key_version, granted_scopes=excluded.granted_scopes,
       rotated_at=?, updated_at=?`
  ).bind(accountId, ciphertext, KEY_VERSION, iv, ts + expiresIn, scopes, ts, ts, ts, ts).run();
  await this.kv.delete(`at:${accountId}`);
}

async refresh(accountId: string): Promise<string> {
  const row = await this.db.prepare(`SELECT * FROM tokens WHERE account_id=?`).bind(accountId).first();
  if (!row) throw new Error(`no credentials for ${accountId}`);
  const refreshToken = await decryptFor(this.master, accountId, row.refresh_token_enc, row.iv);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: this.clientId, client_secret: this.clientSecret,
      refresh_token: refreshToken, grant_type: 'refresh_token',
    }),
  });
  const body = await res.json() as any;

  if (!res.ok) {
    if (body?.error === 'invalid_grant') {
      await this.db.prepare(
        `UPDATE accounts SET status='reauth_required', last_error=?, updated_at=? WHERE account_id=?`
      ).bind('invalid_grant', now(), accountId).run();
      throw new ReauthRequired(accountId);          // surfaced in the UI, not swallowed
    }
    throw new Error(`refresh failed: ${body?.error ?? res.status}`);
  }

  // Rotation safety: persist a new refresh token whenever Google issues one.
  if (body.refresh_token && body.refresh_token !== refreshToken) {
    const { ciphertext, iv } = await encryptFor(this.master, accountId, body.refresh_token);
    await this.db.prepare(
      `UPDATE tokens SET refresh_token_enc=?, iv=?, key_version=?, rotated_at=?, updated_at=? WHERE account_id=?`
    ).bind(ciphertext, iv, KEY_VERSION, now(), now(), accountId).run();
  }

  // Access token in KV with its own IV and a TTL — never beside the refresh token.
  const sealed = await encryptFor(this.master, accountId, body.access_token);
  await this.kv.put(`at:${accountId}`, `${sealed.iv}.${sealed.ciphertext}`,
    { expirationTtl: Math.max(60, (body.expires_in ?? 3600) - 300) });
  return body.access_token;
}
```

## 3. Authenticated API client

API-agnostic. Works unchanged against any Google endpoint.

```ts
export class GoogleApiClient {
  constructor(private env: Env, private tm: TokenManager, public accountId: string,
              private extraHeaders: Record<string, string> = {}) {}

  async request(url: string, init: RequestInit = {}, isRetry = false): Promise<Response> {
    const host = new URL(url).host;
    const until = await this.env.CACHE.get(`rl:${host}`);       // backoff in KV, not a module global
    if (until && +until > now()) throw new Error(`rate limited on ${host} until ${until}`);

    const headers = new Headers(init.headers);
    headers.set('authorization', `Bearer ${await this.tm.getAccessToken(this.accountId)}`);
    for (const [k, v] of Object.entries(this.extraHeaders)) headers.set(k, v);  // e.g. developer-token
    if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');

    const res = await fetch(url, { ...init, headers });

    if (res.status === 401 && !isRetry) {
      await this.env.CACHE.delete(`at:${this.accountId}`);
      await this.tm.refresh(this.accountId);
      return this.request(url, init, true);                     // retry exactly once
    }
    if (res.status === 429 || res.status === 503) {
      const wait = parseInt(res.headers.get('retry-after') || '30', 10);
      await this.env.CACHE.put(`rl:${host}`, String(now() + wait), { expirationTtl: wait + 10 });
      throw new Error(`${host} ${res.status}, backing off ${wait}s`);
    }
    return res;
  }
}
```

For Google Ads, construct with `{ 'developer-token': env.ADS_DEVELOPER_TOKEN, 'login-customer-id': mccId }`.

## 4. Fan-out engine

```ts
export async function fanout<T>(env: Env, accounts: AccountRef[], fn: (a: AccountRef) => Promise<T>) {
  const cap = Math.max(1, +(env.MAX_FANOUT_CONCURRENCY || 6));
  const perAccountMs = Math.max(1000, +(env.PER_ACCOUNT_TIMEOUT_MS || 15000));
  const ok: Array<{ account: AccountRef; value: T }> = [];
  const errors: Array<{ account: AccountRef; error: string }> = [];

  let cursor = 0;
  const worker = async () => {
    while (cursor < accounts.length) {
      const account = accounts[cursor++];
      try { ok.push({ account, value: await withTimeout(fn(account), perAccountMs) }); }
      catch (e: any) { errors.push({ account, error: String(e?.message ?? e) }); }
    }
  };
  await Promise.all(Array.from({ length: Math.min(cap, accounts.length) }, worker));
  return { ok, errors, partial: errors.length > 0 };
}
```

Return `207` when `partial`. Stamp every result with its `account_id` and `account_email` before merging.

## 5. Role and scope guards

```ts
const RANK = { viewer: 1, operator: 2, owner: 3 };
export const atLeast = (p, role) => !!p && RANK[p.role] >= RANK[role];

/** null means unrestricted; an array restricts to exactly those ids. */
export async function allowedAccounts(env, p): Promise<string[] | null> {
  if (p.role === 'owner') return null;
  const u = await loadUser(env, p.email);
  if (!u) return [];
  if (u.account_scope === 'all') return null;
  const { results } = await env.DB.prepare(`SELECT account_id FROM user_accounts WHERE email=?`)
    .bind(p.email).all();
  return results.map(r => r.account_id);
}
```

Enforce in **two** places: when resolving an account filter for fan-out, and again when a write names one account directly. Only the first is not enough — a scoped user could otherwise name an ungranted account id explicitly.

## 6. Router shape — the bug worth memorising

```ts
try {
  if (path === '/api/search') return await handleSearch(...);   // await, ALWAYS
} catch (e) { /* typed errors */ }
```

Without `await`, the promise leaves the `try` block before it settles, the `catch` never sees the rejection, and every error path degrades to a bodyless 500 while the happy path looks perfect.

#!/usr/bin/env node
/**
 * google-api-atlas — a zero-dependency MCP server over stdio.
 *
 * Answers the questions you actually have when wiring a new Google API into a
 * Cloudflare Worker: which scopes, what they cost you at verification time,
 * whether you even need OAuth, and what config to paste.
 *
 * No npm install. No network. Reads api-catalogue.json next to this file.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CATALOGUE = JSON.parse(readFileSync(join(HERE, 'api-catalogue.json'), 'utf8'));

const COST = { 'non-sensitive': 0, sensitive: 1, restricted: 2 };
const COST_LABEL = {
  0: 'Basic verification only — no security assessment.',
  1: 'Verification required past the unverified cap. No CASA assessment.',
  2: 'Verification plus an annual CASA security assessment. Budget real money and weeks.',
};

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function findApis(query) {
  if (!query) return Object.keys(CATALOGUE.apis);
  const q = String(query).toLowerCase();
  return Object.entries(CATALOGUE.apis)
    .filter(
      ([id, a]) =>
        id.includes(q) ||
        a.label.toLowerCase().includes(q) ||
        (a.service ?? '').includes(q) ||
        Object.keys(a.scopes).some((s) => s.toLowerCase().includes(q))
    )
    .map(([id]) => id);
}

function scopePlan(apiIds, mode) {
  const scopes = new Map();
  for (const k of Object.keys(CATALOGUE.universal)) scopes.set(k, CATALOGUE.universal[k]);
  const notes = [];
  let worst = 0;

  for (const id of apiIds) {
    const api = CATALOGUE.apis[id];
    if (!api) {
      notes.push(`unknown api id: ${id}`);
      continue;
    }
    if (!Object.keys(api.scopes).length) {
      notes.push(`${api.label} has no OAuth scopes — see quirks, it is not an OAuth API.`);
      continue;
    }
    const entries = Object.entries(api.scopes);
    const chosen =
      mode === 'read'
        ? entries.filter(([s]) => /readonly|\.file$/.test(s))
        : mode === 'minimal'
          ? [entries.reduce((a, b) => (COST[a[1].class] <= COST[b[1].class] ? a : b))]
          : entries;
    const use = chosen.length ? chosen : entries;
    for (const [s, meta] of use) {
      scopes.set(s, meta);
      worst = Math.max(worst, COST[meta.class] ?? 0);
    }
  }

  const unverified = [...scopes.entries()].filter(([, m]) => m.verified === false);
  if (unverified.length) {
    notes.push(
      `${unverified.length} scope class(es) are best-effort, not read from Google's own per-API docs. Re-check at https://support.google.com/cloud/answer/13464321 before planning a verification submission.`
    );
  }

  return {
    scopes: [...scopes.keys()],
    highest_class: Object.keys(COST).find((k) => COST[k] === worst) ?? 'non-sensitive',
    verification_cost: COST_LABEL[worst],
    scope_detail: [...scopes.entries()].map(([scope, m]) => ({
      scope,
      class: m.class,
      does: m.does ?? 'identity',
      class_verified: m.verified !== false,
    })),
    notes,
  };
}

/* ------------------------------------------------------------------ */
/* tools                                                               */
/* ------------------------------------------------------------------ */

const TOOLS = {
  google_api_lookup: {
    description:
      'Look up a Google API by name or keyword: base URL, service to enable, OAuth scopes with sensitivity class, documentation link, and the implementation quirks that bite people. Use before writing any code against a Google API.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'API name or keyword, e.g. "gmail", "ads", "tag manager", "bigquery". Omit to list everything.',
        },
      },
    },
    run({ query }) {
      const ids = findApis(query);
      if (!ids.length) return { error: `no API matched "${query}"`, available: Object.keys(CATALOGUE.apis) };
      return {
        matched: ids.length,
        apis: ids.map((id) => ({ id, ...CATALOGUE.apis[id] })),
      };
    },
  },

  google_scope_plan: {
    description:
      'Given one or more Google API ids, produce the exact scope list to request and the verification burden it creates. Use when deciding what to put on a consent screen, or when trying to reduce OAuth verification cost.',
    inputSchema: {
      type: 'object',
      properties: {
        apis: { type: 'array', items: { type: 'string' }, description: 'API ids from google_api_lookup' },
        mode: {
          type: 'string',
          enum: ['full', 'read', 'minimal'],
          description: 'full = every scope; read = read-only variants; minimal = cheapest scope per API',
        },
      },
      required: ['apis'],
    },
    run({ apis, mode = 'full' }) {
      return scopePlan(apis, mode);
    },
  },

  google_auth_decision: {
    description:
      'Decide the correct Google auth model: service account, domain-wide delegation, or a per-account OAuth refresh-token vault. Use before building anything — picking wrong costs days.',
    inputSchema: {
      type: 'object',
      properties: {
        apis: { type: 'array', items: { type: 'string' } },
        accounts_span_domains: {
          type: 'boolean',
          description: 'true if the accounts are on Google domains you do not administer',
        },
        you_admin_the_workspace: { type: 'boolean' },
        acting_as_users: {
          type: 'boolean',
          description: 'true if the app reads or writes individual humans’ mail, files, or calendars',
        },
      },
      required: ['apis'],
    },
    run({ apis, accounts_span_domains, you_admin_the_workspace, acting_as_users }) {
      const list = apis.map((id) => CATALOGUE.apis[id]).filter(Boolean);
      const anyPerUser = list.some((a) => a.per_user) || acting_as_users;

      if (!anyPerUser) {
        return {
          model: 'service-account',
          why: 'None of these APIs act on an individual human’s private data. A service account with a key, or workload identity, is simpler and has no consent screen, no refresh tokens, and no verification burden.',
          how: 'Create a service account, grant it access to the resource (e.g. add its email as a GA4 property viewer or a BigQuery dataset reader), and sign a JWT for the token endpoint. No OAuth vault.',
          avoid: 'Do not build a refresh-token vault for reporting-only APIs. It is pure overhead.',
        };
      }
      if (accounts_span_domains) {
        return {
          model: 'oauth-refresh-token-vault',
          why: 'Domain-wide delegation cannot cross a Workspace tenant boundary. Accounts on domains you do not administer can only be reached by that account consenting individually.',
          how: 'Your own OAuth web client + per-account encrypted refresh tokens keyed by an opaque account id. Every call names the account it runs against.',
          reference: 'skills/google-api-wiring — this is the architecture the whole plugin is built around.',
        };
      }
      if (you_admin_the_workspace) {
        return {
          model: 'domain-wide-delegation',
          why: 'Every account lives in one Workspace tenant you administer, so a service account can impersonate any user in the domain with no per-user consent.',
          how: 'Create a service account, authorise its client id against the exact scopes in Admin console > Security > API controls, then set the subject to the user you are impersonating when signing the JWT.',
          caution:
            'Delegation is a very large blast radius: one key impersonates every user. Restrict scopes hard and store the key as a secret, never in the repo. It also breaks the moment you need an account outside the domain.',
        };
      }
      return {
        model: 'oauth-refresh-token-vault',
        why: 'You act on individual users’ data and do not have a single Workspace tenant you administer.',
        how: 'Per-account consent, encrypted refresh tokens, explicit account parameter on every call.',
      };
    },
  },

  google_wrangler_config: {
    description:
      'Emit a wrangler.jsonc binding block and the secret list for a Cloudflare Worker that talks to given Google APIs. Use when scaffolding a new Worker.',
    inputSchema: {
      type: 'object',
      properties: {
        worker_name: { type: 'string' },
        apis: { type: 'array', items: { type: 'string' } },
        multi_account: { type: 'boolean', description: 'true if the Worker holds more than one Google account' },
      },
      required: ['worker_name'],
    },
    run({ worker_name, apis = [], multi_account = true }) {
      const services = apis.map((id) => CATALOGUE.apis[id]?.service).filter(Boolean);
      return {
        enable_services: services,
        enable_command: services.length
          ? `gcloud services enable ${services.join(' ')} --project <PROJECT_ID>`
          : '(no services to enable)',
        secrets: [
          'GOOGLE_CLIENT_ID',
          'GOOGLE_CLIENT_SECRET',
          ...(multi_account ? ['VAULT_MASTER_KEY'] : []),
          'SESSION_SECRET',
        ],
        wrangler: {
          name: worker_name,
          main: 'src/index.ts',
          compatibility_date: '2026-07-01',
          assets: { directory: './public', binding: 'ASSETS', run_worker_first: true },
          d1_databases: [{ binding: 'DB', database_name: worker_name, database_id: '<CREATE_AND_PASTE>' }],
          kv_namespaces: [{ binding: 'CACHE', id: '<CREATE_AND_PASTE>' }],
          vars: {
            ENVIRONMENT: 'production',
            MAX_FANOUT_CONCURRENCY: '6',
            PER_ACCOUNT_TIMEOUT_MS: '15000',
            TOKEN_REFRESH_SKEW_SECONDS: '300',
          },
          observability: { enabled: true },
        },
        redirect_uri: `https://${worker_name}.<your-subdomain>.workers.dev/oauth/callback`,
      };
    },
  },

  google_oauth_checklist: {
    description:
      'The Google Cloud Console steps that cannot be automated, in order, with the traps that silently break OAuth integrations. Use before or during OAuth client setup, and when debugging redirect_uri_mismatch or tokens that die after a week.',
    inputSchema: {
      type: 'object',
      properties: { worker_url: { type: 'string', description: 'Deployed Worker origin, if known' } },
    },
    run({ worker_url }) {
      const origin = worker_url || 'https://<worker>.<subdomain>.workers.dev';
      return {
        cannot_be_automated:
          'There is no public API for creating an OAuth 2.0 Web application client. The IAP OAuth client API creates IAP-locked clients on an internal brand only. gcloud, GAM and gws all hit the same wall — GAM appears to automate it only because it uses desktop clients with loopback redirects.',
        steps: [
          'Create or pick a GCP project, then enable the APIs you need (this part IS scriptable).',
          'Branding: set app name and support email. Choose user type External unless every user is inside your own Workspace.',
          'Audience: click Publish app to move from Testing to In Production.',
          'Clients: create an OAuth client of type Web application.',
          `Add the authorised redirect URI exactly: ${origin}/oauth/callback`,
          'Download the JSON and load client id and secret as Worker secrets.',
        ],
        traps: [
          'TESTING STATUS EXPIRES REFRESH TOKENS AFTER 7 DAYS. Connect ten accounts today and all ten die next week, silently. Publish before onboarding anything real. Tokens minted while in Testing keep the 7-day clock even after you publish — reconnect them.',
          'Desktop app clients cannot hold an https redirect URI. If the redirect field is missing or greyed out you created the wrong client type; redirect_uri_mismatch is the symptom.',
          'Authorised JavaScript origins is not Authorised redirect URIs. Putting it in the wrong box gives the same mismatch error.',
          'Unverified production apps cap at 100 users and show an interstitial. Fine at agency scale; plan verification beyond that.',
          'Restricted scopes drag in an annual CASA security assessment at verification time. drive.file avoids this for anything the app creates.',
          'Redirect URI changes take a few minutes to propagate. A mismatch immediately after saving is not necessarily wrong config.',
        ],
      };
    },
  },

  google_failure_modes: {
    description:
      'Known failure modes for Google-API-on-Cloudflare-Workers builds, with the symptom and the fix. Use when debugging an integration that behaves strangely, or as a review checklist before shipping.',
    inputSchema: {
      type: 'object',
      properties: { symptom: { type: 'string', description: 'Optional keyword to filter, e.g. "401", "empty", "token"' } },
    },
    run({ symptom }) {
      const modes = [
        { id: 'return-not-await', symptom: 'Every error path returns a bodyless 500; typed errors never appear', cause: 'Handlers returned rather than awaited inside the router try block, so rejections escape the catch entirely', fix: 'return await handler(...) everywhere inside the try' },
        { id: 'testing-token-death', symptom: 'All accounts stop working about a week after connecting', cause: 'OAuth app left in Testing publishing status', fix: 'Publish to In Production, then reconnect every account minted while in Testing' },
        { id: 'desktop-client', symptom: 'redirect_uri_mismatch no matter what you paste in the Console', cause: 'Client is type installed/desktop, which only accepts loopback redirects', fix: 'Create a Web application client instead' },
        { id: 'rotation-dropped', symptom: 'An account dies weeks later with invalid_grant despite being active', cause: 'Refresh response carried a rotated refresh_token that was never persisted', fix: 'Persist refresh_token whenever the refresh response includes one' },
        { id: 'insert-or-replace-null', symptom: 'A working account suddenly has no refresh token', cause: 'INSERT OR REPLACE on re-consent wrote NULL over a valid token, because Google omits refresh_token when one already exists', fix: 'Targeted UPDATE that never nulls an existing refresh token' },
        { id: 'iv-reuse', symptom: 'Silent crypto weakness, no visible symptom', cause: 'One iv column reused for two different ciphertexts under the same AES-GCM key', fix: 'One iv per ciphertext; keep short-lived access tokens in KV with their own iv, not beside the refresh token' },
        { id: 'state-unverified', symptom: 'No symptom until abused; consent can be replayed or forged', cause: 'CSRF state written but never read back at callback', fix: 'Single-use, expiring, DB-verified state marked consumed atomically' },
        { id: 'module-global-ratelimit', symptom: 'Backoff appears to work locally, still gets 429 in production', cause: 'Rate-limit state kept in a module global, which does not survive isolate boundaries', fix: 'Keep backoff in KV keyed by host, honour Retry-After' },
        { id: 'ads-no-dev-token', symptom: 'Google Ads calls return 401/403 with a valid bearer token', cause: 'Missing developer-token header, and login-customer-id for manager accounts', fix: 'Set both headers; strip hyphens from customer ids' },
        { id: 'shared-drives-invisible', symptom: 'Drive queries miss files the user can clearly see', cause: 'supportsAllDrives / includeItemsFromAllDrives not set', fix: 'Always pass both on Drive list and get calls' },
        { id: 'google-doc-no-bytes', symptom: 'alt=media download returns an error for Google-native files', cause: 'Docs, Sheets and Slides have no binary content', fix: 'Use /export with a target mimeType' },
        { id: 'fanout-all-or-nothing', symptom: 'One broken account fails the whole multi-account request', cause: 'Promise.all without per-item error capture', fix: 'Per-account try/catch, return 207 with a per-account error array' },
      ];
      if (!symptom) return { count: modes.length, modes };
      const q = symptom.toLowerCase();
      const hit = modes.filter((m) => JSON.stringify(m).toLowerCase().includes(q));
      return { query: symptom, count: hit.length, modes: hit.length ? hit : modes };
    },
  },
};

/* ------------------------------------------------------------------ */
/* JSON-RPC over stdio                                                 */
/* ------------------------------------------------------------------ */

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

function handle(req) {
  const { id, method, params } = req;
  if (method === 'initialize') {
    return send({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'google-api-atlas', version: '0.1.0' },
      },
    });
  }
  if (method === 'notifications/initialized') return;
  if (method === 'tools/list') {
    return send({
      jsonrpc: '2.0',
      id,
      result: {
        tools: Object.entries(TOOLS).map(([name, t]) => ({
          name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      },
    });
  }
  if (method === 'tools/call') {
    const tool = TOOLS[params?.name];
    if (!tool) {
      return send({ jsonrpc: '2.0', id, error: { code: -32601, message: `unknown tool ${params?.name}` } });
    }
    try {
      const result = tool.run(params.arguments ?? {});
      return send({
        jsonrpc: '2.0',
        id,
        result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] },
      });
    } catch (e) {
      return send({ jsonrpc: '2.0', id, error: { code: -32603, message: String(e?.message ?? e) } });
    }
  }
  if (id !== undefined) {
    send({ jsonrpc: '2.0', id, error: { code: -32601, message: `unknown method ${method}` } });
  }
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let nl;
  while ((nl = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    try {
      handle(JSON.parse(line));
    } catch {
      /* ignore malformed frames */
    }
  }
});

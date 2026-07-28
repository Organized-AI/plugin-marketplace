#!/usr/bin/env node
/**
 * meta-api-atlas — zero-dependency MCP server over stdio.
 *
 * The Meta-side counterpart to google-api-atlas. Answers the questions that
 * actually cost time: which token type, what it costs you at App Review,
 * what a throttle header is telling you, and which connector to reach for.
 *
 * No npm install. No network. Reads meta-catalogue.json next to this file.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const C = JSON.parse(readFileSync(join(HERE, 'meta-catalogue.json'), 'utf8'));

/* ------------------------------------------------------------------ */

function expandPermissions(perms) {
  const out = new Set();
  const add = (p) => {
    if (out.has(p)) return;
    out.add(p);
    (C.permissions[p]?.depends_on ?? []).forEach(add);
  };
  perms.forEach(add);
  return [...out];
}

function findSurfaces(query) {
  if (!query) return Object.keys(C.surfaces);
  const q = String(query).toLowerCase();
  return Object.entries(C.surfaces)
    .filter(
      ([id, s]) =>
        id.includes(q) ||
        s.label.toLowerCase().includes(q) ||
        s.permissions.some((p) => p.includes(q)) ||
        (s.buc_type ?? '').includes(q)
    )
    .map(([id]) => id);
}

const TOOLS = {
  meta_api_lookup: {
    description:
      'Look up a Meta API surface by name or keyword: base URL, required permissions, Business Use Case rate-limit bucket, docs link, and the quirks that bite. Use before writing any code against a Meta API.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Surface or keyword, e.g. "marketing", "capi", "conversions", "catalog", "instagram", "whatsapp", "leadgen". Omit to list all.',
        },
      },
    },
    run({ query }) {
      const ids = findSurfaces(query);
      if (!ids.length) return { error: `no surface matched "${query}"`, available: Object.keys(C.surfaces) };
      return {
        graph_api_version: C.versions.graph_api_latest,
        marketing_api_version: C.versions.marketing_api_current,
        matched: ids.length,
        surfaces: ids.map((id) => ({ id, ...C.surfaces[id] })),
      };
    },
  },

  meta_auth_decision: {
    description:
      'Decide which Meta token type to build against: system user token (non-expiring or 60-day), long-lived user token, app token, or a dataset-scoped Conversions API token. Use before building anything — Meta token types are not interchangeable and picking wrong means rebuilding the vault.',
    inputSchema: {
      type: 'object',
      properties: {
        surfaces: { type: 'array', items: { type: 'string' }, description: 'Surface ids from meta_api_lookup' },
        unattended: { type: 'boolean', description: 'true if the Worker runs on a schedule with no human present' },
        manages_other_businesses: { type: 'boolean', description: 'true if you act on clients\' assets, not just your own' },
        capi_only: { type: 'boolean', description: 'true if all you do is send server-side conversion events' },
      },
      required: ['surfaces'],
    },
    run({ surfaces = [], unattended = true, manages_other_businesses = false, capi_only = false }) {
      if (capi_only || (surfaces.length === 1 && surfaces[0] === 'conversions-api')) {
        return {
          model: 'dataset-scoped CAPI token',
          why: 'Pure server-side conversion tracking does not need an app, a system user, or a vault. Events Manager will mint a token scoped to one dataset.',
          how: 'Events Manager > your dataset > Settings > Generate access token. Store it as a Worker secret and POST to /{dataset-id}/events.',
          avoid: 'Do not build a token vault for CAPI-only work. It is pure overhead.',
          permission_note: 'If you do go the app route, note that ads_read — not ads_management — is the Conversions API permission.',
        };
      }
      if (unattended) {
        const model = manages_other_businesses ? 'system user token per client business' : 'system user token';
        return {
          model,
          variant: '60-day expiring, refreshed on a schedule',
          why: 'Unattended Workers cannot complete a login dialog. System user tokens are the only Meta credential designed for machine-to-machine use.',
          how: 'Business Settings > Users > System Users > Add (Admin role) > Assign Assets > add the system user as an App Admin > Generate New Token with your scopes.',
          lifetime: C.tokens.system_user_60_day.lifetime,
          refresh: C.tokens.system_user_60_day.refresh,
          rotation:
            'Refresh returns a NEW token string that replaces the old one, and the old stays valid until its original expiry. That overlap makes deploys safe. Schedule the refresh at ~45 days, then revoke the old token explicitly.',
          caution: C.tokens.system_user_non_expiring.caution,
          ...(manages_other_businesses
            ? {
                agency_note:
                  'Each client business creates its own system user and assigns you assets, OR you use Business Manager partner sharing. You will also need Advanced Access plus Business Verification, because permissions are being requested from people with no role on your app.',
              }
            : {}),
        };
      }
      return {
        model: 'long-lived user token',
        variant: '~60 days, exchanged server-side from a short-lived token',
        why: 'A human is present to complete the login dialog, and you do not need machine-to-machine access.',
        how: 'Login dialog gives a short-lived token; exchange it via GET /oauth/access_token?grant_type=fb_exchange_token using the app secret.',
        caution: 'An expired token cannot be exchanged for a new one — the user must log in again. Do not reuse one long-lived token across clients.',
      };
    },
  },

  meta_permission_plan: {
    description:
      'Expand a set of Meta permissions to include their dependencies, and report what App Review and access level they imply. Use when planning an app\'s use cases or trying to reduce review burden.',
    inputSchema: {
      type: 'object',
      properties: {
        permissions: { type: 'array', items: { type: 'string' } },
        surfaces: { type: 'array', items: { type: 'string' }, description: 'Alternatively, give surface ids and let the tool derive permissions' },
        own_assets_only: { type: 'boolean', description: 'true if only people with a role on your app will use it' },
      },
    },
    run({ permissions = [], surfaces = [], own_assets_only = true }) {
      const fromSurfaces = surfaces.flatMap((s) => C.surfaces[s]?.permissions ?? []);
      const requested = [...new Set([...permissions, ...fromSurfaces])];
      if (!requested.length) return { error: 'give either permissions or surfaces' };
      const expanded = expandPermissions(requested);
      const added = expanded.filter((p) => !requested.includes(p));
      return {
        requested,
        expanded,
        added_as_dependencies: added,
        detail: expanded.map((p) => ({ permission: p, ...(C.permissions[p] ?? { does: 'not in catalogue' }) })),
        access_level: own_assets_only ? 'standard' : 'advanced',
        what_that_means: own_assets_only
          ? C.access.graph_api_levels.standard
          : C.access.graph_api_levels.advanced,
        marketing_api_tier: own_assets_only
          ? { start_at: 'limited', note: C.access.marketing_api_tier.limited, upgrade: C.access.marketing_api_tier.qualify }
          : { need: 'full', note: C.access.marketing_api_tier.full },
        warning: C.access.renamed_may_2026
          ? 'Meta renamed these in May 2026: Marketing API "Standard Access" is now "Limited access" and "Advanced Access" is now "Full access". These are a DIFFERENT axis from the platform-wide Graph API standard/advanced access levels. Do not conflate them.'
          : null,
      };
    },
  },

  meta_rate_limit_decode: {
    description:
      'Decode Meta throttling response headers (X-Business-Use-Case-Usage, X-App-Usage, X-Ad-Account-Usage, X-FB-Ads-Insights-Throttle) or an error code, and say concretely what to do. Use when calls start failing or slowing down.',
    inputSchema: {
      type: 'object',
      properties: {
        header_json: { type: 'string', description: 'Raw header value, JSON' },
        header_name: { type: 'string', description: 'Which header this came from' },
        error_code: { type: 'number' },
        error_subcode: { type: 'number' },
      },
    },
    run({ header_json, header_name, error_code, error_subcode }) {
      const out = { units_reminder: C.rate_limits.headers['X-Business-Use-Case-Usage'].units };

      if (error_code) {
        const key = error_subcode ? `${error_code}.${error_subcode}` : String(error_code);
        out.error = {
          code: key,
          meaning:
            C.rate_limits.error_codes[String(error_code)] ??
            C.auth_errors[key] ??
            C.auth_errors[String(error_code)] ??
            'not in catalogue',
        };
        if (String(error_code).startsWith('80') || ['4', '17', '32', '613'].includes(String(error_code))) {
          out.error.class = 'throttle';
          out.error.action =
            'Back off using estimated_time_to_regain_access from the BUC header rather than a fixed sleep. Throttles are scoped per business object and per type, so other buckets may still be usable.';
        } else if (String(error_code).startsWith('190') || error_code === 190 || error_code === 102) {
          out.error.class = 'auth';
          out.error.action =
            'Mark the account reauth_required and surface it. Meta never notifies you that a token died — you only learn on the next call.';
        }
      }

      if (header_json) {
        let parsed;
        try {
          parsed = JSON.parse(header_json);
        } catch {
          return { ...out, error: 'header_json did not parse as JSON' };
        }
        const findings = [];
        const assess = (obj, label) => {
          const worst = Math.max(obj.call_count ?? 0, obj.total_cputime ?? 0, obj.total_time ?? 0);
          findings.push({
            scope: label,
            type: obj.type ?? null,
            call_count_pct: obj.call_count ?? null,
            total_cputime_pct: obj.total_cputime ?? null,
            total_time_pct: obj.total_time ?? null,
            tier: obj.ads_api_access_tier ?? null,
            minutes_to_regain: obj.estimated_time_to_regain_access ?? null,
            headroom_pct: 100 - worst,
            verdict:
              worst >= 100
                ? 'THROTTLED — stop issuing calls in this bucket'
                : worst >= 90
                  ? 'critical — slow down now'
                  : worst >= 75
                    ? 'warm — start pacing'
                    : 'healthy',
          });
        };
        if (header_name === 'X-App-Usage' || (!parsed.type && parsed.call_count !== undefined && !Array.isArray(parsed))) {
          assess(parsed, 'app-wide');
        } else if (parsed.acc_id_util_pct !== undefined) {
          findings.push({
            scope: 'ad-account',
            account_pct: parsed.acc_id_util_pct,
            app_pct: parsed.app_id_util_pct ?? null,
            tier: parsed.ads_api_access_tier ?? null,
            seconds_to_reset: parsed.reset_time_duration ?? null,
            note: 'reset_time_duration is in SECONDS here, unlike the BUC header which reports MINUTES.',
            verdict: (parsed.acc_id_util_pct ?? 0) >= 90 ? 'critical' : 'healthy',
          });
        } else {
          for (const [bizId, arr] of Object.entries(parsed)) {
            (Array.isArray(arr) ? arr : [arr]).forEach((o) => assess(o, `business ${bizId}`));
          }
        }
        out.findings = findings;
        const tier = findings.find((f) => f.tier)?.tier;
        if (tier === 'development_access') {
          out.tier_warning =
            'You are on the development/Limited Marketing API tier, which Meta describes as "for development only, not for production apps running for live advertisers". Qualify for Full access: ' +
            C.access.marketing_api_tier.qualify;
        }
      }
      return out;
    },
  },

  meta_app_checklist: {
    description:
      'The Meta App Dashboard steps that cannot be automated, in order, with the irreversible choices and the traps. Use before or during Meta app setup, and when a system user token stops working.',
    inputSchema: {
      type: 'object',
      properties: { use_case: { type: 'string', description: 'e.g. "ads", "capi", "catalog", "whatsapp"' } },
    },
    run({ use_case }) {
      return {
        cannot_be_automated:
          'There is no API to create a Meta developer app. POST /{business_id}/owned_apps looks like it creates one — the auto-generated reference even says so — but it takes no parameters and returns an access_status. It claims an app that already exists. App creation, use-case selection, App Review submission and app-secret rotation are all dashboard-only.',
        what_IS_automatable:
          'Business creation, ad account creation, system user creation, asset assignment and token minting are all Business Management API calls. Automate those.',
        irreversible_choices: [
          'Use cases cannot be removed after app creation. Incompatible ones are permanently greyed out. Choose carefully.',
          'The app secret cannot be rotated programmatically. If it leaks, Meta may force a reset, which revokes every user data grant and stops all business integrations.',
        ],
        steps: [
          'developers.facebook.com/apps/creation — create the app, pick the use case now.',
          'Business Settings > Users > System Users > Add. Role: Admin.',
          'Assign Assets to that system user: ad accounts, Pages, datasets/pixels, catalogs. A Page you own personally but do not assign will be invisible.',
          'App Settings > Roles > add the system user as App Admin. Easy to miss and token generation fails without it.',
          'System Users > Generate New Token > select your app > select scopes > Generate.',
          'Store the token as a Worker secret. Schedule a refresh well inside 60 days.',
        ],
        limits: [
          'You may hold a developer or admin role on at most 15 apps not connected to a Meta Verified Business Account. Archived apps still count.',
          'Limited Marketing API tier allows 1 system user + 1 admin system user. Full access allows 10 + 1.',
          'Neither Marketing API tier can create Pages through the API.',
        ],
        review_trigger:
          'If only people with a role on your app use it, you need no App Review and no Business Verification. The moment a client business must grant your app access, you need Advanced Access AND Business Verification.',
        use_case_hint: use_case ? `Check catalogue surfaces matching "${use_case}" with meta_api_lookup for the exact permission bundle.` : null,
      };
    },
  },

  meta_failure_modes: {
    description:
      'Known failure modes for Meta-API-on-Cloudflare-Workers builds, with symptom, cause and fix. Use when debugging, or as a review checklist before shipping.',
    inputSchema: {
      type: 'object',
      properties: { symptom: { type: 'string', description: 'Optional filter, e.g. "190", "token", "throttle", "version"' } },
    },
    run({ symptom }) {
      const modes = [
        { id: 'silent-token-death', symptom: 'Calls suddenly fail with 190 and nothing changed', cause: 'Meta never notifies you that a token became invalid, and tokens can be killed early for security reasons', fix: 'Probe /debug_token on a schedule and surface reauth_required; never assume a token is alive because it was yesterday' },
        { id: 'sixty-day-forfeit', symptom: 'System user token stops working roughly two months after setup', cause: 'A 60-day expiring system user token was never refreshed; Meta says failing to refresh forfeits the token entirely', fix: 'Cron the refresh at ~45 days; refreshing is idempotent and resets the clock from the refresh date' },
        { id: 'refresh-replaces-token', symptom: 'After refreshing, half the requests use a stale credential', cause: 'Meta refresh returns a NEW token string that replaces the old one — unlike Google, where a refresh token mints access tokens and persists', fix: 'Read-modify-write the token itself in the vault; the old token stays valid until its original expiry, so the swap is safe, then revoke explicitly' },
        { id: 'unversioned-marketing-call', symptom: 'Marketing API call fails outright with no obvious reason', cause: 'Marketing API does not support unversioned calls — omit the version and it fails, unlike Graph which falls back to a dashboard default', fix: 'Always pin an explicit version in the path' },
        { id: 'ninety-day-deprecation', symptom: 'Integration breaks a few months after it was working', cause: 'Marketing API versions ship roughly every four months with only ~90 days of overlap, far shorter than Graph API\'s two years', fix: 'Watch X-Ad-Api-Version-Warning and pin-and-bump deliberately' },
        { id: 'percent-not-count', symptom: 'Backoff logic never triggers, or triggers constantly', cause: 'BUC header values are PERCENTAGES of allowance, not call counts', fix: 'Treat >=90 as critical, >=100 as throttled; back off using estimated_time_to_regain_access' },
        { id: 'minutes-vs-seconds', symptom: 'Backoff waits 60x too long or too short', cause: 'estimated_time_to_regain_access is MINUTES; X-Ad-Account-Usage reset_time_duration is SECONDS', fix: 'Normalise units at the parsing boundary' },
        { id: 'dev-tier-production', symptom: 'Constant 80004 throttling in production', cause: 'App is on the Limited (formerly Standard) Marketing API tier, which Meta says is for development only', fix: 'Qualify for Full access: 500+ calls in 15 days with under 15% error rate' },
        { id: 'capi-wrong-permission', symptom: 'Conversions API rejects a token that can manage ads fine', cause: 'ads_read, not ads_management, is the permission that grants server-side event access', fix: 'Add ads_read, or use a dataset-scoped token from Events Manager' },
        { id: 'catalog-dependency', symptom: 'catalog_management request rejected', cause: 'catalog_management depends on business_management', fix: 'Request the dependency too — meta_permission_plan expands these automatically' },
        { id: 'appsecret-proof-form', symptom: 'Error 104 incorrect signature', cause: 'Two different appsecret_proof computations exist. The timestamped form requires a companion appsecret_time parameter', fix: 'Either HMAC the token alone and send no appsecret_time, or HMAC token|timestamp and send appsecret_time. Never mix. Cast float timestamps to int and hex-encode the digest' },
        { id: 'page-invisible-to-system-user', symptom: 'A Page you own does not appear in listings', cause: 'System users only see explicitly assigned assets', fix: 'Business Settings > System Users > Assign Assets' },
        { id: 'page-token-role-loss', symptom: 'Page token dies with 190 subcode 492', cause: 'The user behind the token lost their role on the Page', fix: 'Re-mint from a user with a current Page role' },
        { id: 'app-secret-reset-cascade', symptom: 'Every integration dies at once', cause: 'The app secret was reset, voluntarily or forced by Meta after a leak; all user data grants are revoked', fix: 'Treat the app secret as the single highest-blast-radius credential; it cannot be rotated via API' },
        { id: 'cli-interactive-hang', symptom: 'Ads CLI hangs in CI', cause: 'Business id resolution falls back to an interactive prompt, and dataset creation is gated on a ToS acceptance dialog', fix: 'Set BUSINESS_ID explicitly and pass --no-input; accept the business tools ToS once by hand first' },
        { id: 'cli-flag-order', symptom: 'Ads CLI rejects --output json', cause: 'Global flags must precede the subcommand', fix: 'meta --output json ads campaign list' },
        { id: 'everything-paused', symptom: 'Campaign created but nothing is running', cause: 'Both the Ads CLI and the hosted MCP server create entities PAUSED by design', fix: 'Activate campaign, ad set and ad separately — this is a safety feature, not a bug' },
        { id: 'token-type-mismatch', symptom: 'A token that works with the Ads CLI is rejected by the hosted MCP server', cause: 'The CLI wants a system user token; the MCP server documents user access tokens and needs ads_mcp_management, which has no CLI equivalent', fix: 'Mint separate credentials per connector' },
      ];
      if (!symptom) return { count: modes.length, modes };
      const q = symptom.toLowerCase();
      const hit = modes.filter((m) => JSON.stringify(m).toLowerCase().includes(q));
      return { query: symptom, count: hit.length, modes: hit.length ? hit : modes };
    },
  },

  meta_connector_compare: {
    description:
      'Compare the Meta Ads CLI, the hosted Ads MCP server, and calling the Graph API directly from a Worker — and recommend one for a stated job. Use when deciding how to talk to Meta Ads.',
    inputSchema: {
      type: 'object',
      properties: {
        job: { type: 'string', description: 'What you are trying to do, e.g. "nightly reporting", "let an agent create campaigns", "server-side conversions"' },
      },
    },
    run({ job }) {
      const j = (job ?? '').toLowerCase();
      let recommend = 'worker-direct';
      let why = 'A Worker calling the Graph API directly is the right default for scheduled, unattended, multi-account work — it is the only option that gives you an encrypted token vault, fan-out, and your own rate-limit accounting.';
      if (/agent|assistant|chat|conversational|ad[- ]hoc|explore/.test(j)) {
        recommend = 'ads-mcp';
        why = 'Interactive, agent-driven work is exactly what the hosted MCP server is for. It is Meta-hosted, needs no infrastructure, and creates entities paused with confirmation before activation.';
      } else if (/script|ci|pipeline|terminal|prototype|one[- ]off|bulk/.test(j)) {
        recommend = 'ads-cli';
        why = 'Scripted and CI work suits the CLI: system user auth, JSON output for jq, and documented exit codes 0-5 for error handling.';
      } else if (/conversion|capi|server[- ]side|pixel|event/.test(j)) {
        recommend = 'worker-direct (CAPI)';
        why = 'Server-side events go straight to /{dataset-id}/events. No app, no system user, no vault — a dataset-scoped token from Events Manager is enough.';
      }
      return {
        job: job ?? null,
        recommend,
        why,
        options: {
          'ads-cli': C.connectors['ads-cli'],
          'ads-mcp': C.connectors['ads-mcp'],
          'worker-direct': {
            label: 'Cloudflare Worker calling the Graph API',
            auth: 'System user token in an encrypted vault, refreshed on a schedule',
            best_for: 'Unattended, multi-account, multi-client work; anything needing audit trails, role scoping or custom rate-limit accounting',
            cost: 'You own the token lifecycle, the throttling and the error handling',
          },
        },
        auth_warning:
          'These three do not share credentials. The CLI needs a system user token plus read_insights and Page scopes; the MCP server documents user tokens plus ads_mcp_management. Mint separately.',
      };
    },
  },

  meta_wrangler_config: {
    description:
      'Emit a wrangler.jsonc binding block, secret list and refresh cron for a Cloudflare Worker talking to Meta APIs. Use when scaffolding a new Worker.',
    inputSchema: {
      type: 'object',
      properties: {
        worker_name: { type: 'string' },
        surfaces: { type: 'array', items: { type: 'string' } },
        multi_account: { type: 'boolean' },
      },
      required: ['worker_name'],
    },
    run({ worker_name, surfaces = [], multi_account = true }) {
      const perms = expandPermissions(surfaces.flatMap((s) => C.surfaces[s]?.permissions ?? []));
      return {
        permissions_to_grant: perms,
        secrets: [
          'META_APP_ID',
          'META_APP_SECRET',
          ...(multi_account ? ['VAULT_MASTER_KEY'] : ['META_SYSTEM_USER_TOKEN']),
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
            GRAPH_VERSION: C.versions.graph_api_latest,
            MARKETING_VERSION: C.versions.marketing_api_current,
            MAX_FANOUT_CONCURRENCY: '4',
            PER_ACCOUNT_TIMEOUT_MS: '20000',
            TOKEN_REFRESH_AT_DAYS: '45',
          },
          triggers: { crons: ['0 4 * * *'] },
          observability: { enabled: true },
        },
        cron_note:
          'The daily cron exists to refresh system user tokens well inside the 60-day window. Refreshing is idempotent, so a daily check that only acts past the 45-day mark is safe.',
        version_note: C.versions.policy.marketing,
      };
    },
  },
};

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
        serverInfo: { name: 'meta-api-atlas', version: '0.1.0' },
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
    if (!tool) return send({ jsonrpc: '2.0', id, error: { code: -32601, message: `unknown tool ${params?.name}` } });
    try {
      const result = tool.run(params.arguments ?? {});
      return send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] } });
    } catch (e) {
      return send({ jsonrpc: '2.0', id, error: { code: -32603, message: String(e?.message ?? e) } });
    }
  }
  if (id !== undefined) send({ jsonrpc: '2.0', id, error: { code: -32601, message: `unknown method ${method}` } });
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

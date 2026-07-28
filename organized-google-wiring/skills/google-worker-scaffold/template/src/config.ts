/**
 * THE ONLY FILE YOU EDIT when starting a new Google integration.
 *
 * Everything else in the template is API-agnostic. Define the capability →
 * scope map here and the consent flow, registry, fan-out and role guards all
 * follow automatically.
 *
 * Get the scope strings and classes from the google-api-catalogue skill, or
 * the google_scope_plan MCP tool. Prefer the cheapest scope that does the job:
 * drive.file is non-sensitive and covers Drive, Sheets, Docs and Slides files
 * your app creates, where the broad scopes are sensitive or restricted.
 */

export const WORKER_NAME = 'change-me';

export interface Capability {
  label: string;
  scopes: string[];
  klass: 'non-sensitive' | 'sensitive' | 'restricted';
  surface: string; // groups capabilities for per-account enable flags
}

export const CAPS: Record<string, Capability> = {
  // --- example: swap these for the APIs you actually need ---
  'mail.read': {
    label: 'Read & search mail',
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    klass: 'restricted',
    surface: 'gmail',
  },
  'drive.app': {
    label: 'Files this app creates',
    scopes: ['https://www.googleapis.com/auth/drive.file'],
    klass: 'non-sensitive',
    surface: 'drive',
  },
};

/** Always requested. Identity only — never touches user content. */
export const BASE_SCOPES = ['openid', 'https://www.googleapis.com/auth/userinfo.email'];

/** Sign-in requests only these. Keep it identity-only. */
export const SIGNIN_SCOPES = ['openid', 'email', 'profile'];

/**
 * Extra headers some Google APIs demand beyond the bearer token.
 * Google Ads will silently 401 forever without developer-token.
 */
export const EXTRA_HEADERS: Record<string, (env: any) => Record<string, string>> = {
  // 'google-ads': (env) => ({
  //   'developer-token': env.ADS_DEVELOPER_TOKEN,
  //   'login-customer-id': env.ADS_LOGIN_CUSTOMER_ID,
  // }),
};

export const scopesForCaps = (caps: string[]): string[] => [
  ...new Set([...BASE_SCOPES, ...caps.flatMap((c) => CAPS[c]?.scopes ?? [])]),
];

export const capsFromScopes = (granted: string): string[] => {
  const set = new Set(granted.split(/\s+/).filter(Boolean));
  return Object.entries(CAPS)
    .filter(([, v]) => v.scopes.every((s) => set.has(s)))
    .map(([k]) => k);
};

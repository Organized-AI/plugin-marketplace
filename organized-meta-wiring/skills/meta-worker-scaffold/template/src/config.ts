/**
 * THE ONLY FILE YOU EDIT when starting a new Meta integration.
 *
 * Get surfaces, permissions and versions from the meta-api-catalogue skill or
 * the meta_api_lookup / meta_permission_plan MCP tools. Expand dependencies —
 * catalog_management needs business_management, ads_management needs
 * pages_read_engagement and pages_show_list.
 */

export const WORKER_NAME = 'CHANGE-ME';

/** Pin explicitly. Marketing API REJECTS unversioned calls outright. */
export const GRAPH_VERSION = 'v26.0';
export const MARKETING_VERSION = 'v26.0';

export interface Surface {
  label: string;
  base: string;
  permissions: string[];
  bucType: string;   // ads_management | ads_insights | custom_audience | instagram | leadgen | pages
}

export const SURFACES: Record<string, Surface> = {
  'marketing-api': {
    label: 'Campaigns, ad sets, ads, creatives',
    base: `https://graph.facebook.com/${MARKETING_VERSION}`,
    permissions: ['ads_management', 'pages_read_engagement', 'pages_show_list', 'business_management'],
    bucType: 'ads_management',
  },
  'ads-insights': {
    label: 'Reporting',
    base: `https://graph.facebook.com/${MARKETING_VERSION}`,
    permissions: ['ads_read'],
    bucType: 'ads_insights',
  },
  // Conversions API needs ads_read, NOT ads_management. Or skip the app
  // entirely and use a dataset-scoped token from Events Manager.
};

/** Refresh well inside the 60-day window; refreshing early is idempotent. */
export const TOKEN_REFRESH_AT_DAYS = 45;

/** Treat BUC header values as percentages. 90 is critical, 100 is throttled. */
export const BUC_CRITICAL_PCT = 90;

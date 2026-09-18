const CATEGORIES = [
  {
    name: "analytics",
    patterns: [
      /(^|\.)google-analytics\.com$/i,
      /(^|\.)analytics\.google\.com$/i,
      /(^|\.)segment\.(io|com)$/i,
      /(^|\.)mixpanel\.com$/i,
      /(^|\.)hotjar\.com$/i,
      /(^|\.)clarity\.ms$/i,
      /(^|\.)amplitude\.com$/i,
    ],
  },
  {
    name: "tag-manager",
    patterns: [/(^|\.)googletagmanager\.com$/i],
  },
  {
    name: "advertising",
    patterns: [
      /(^|\.)doubleclick\.net$/i,
      /(^|\.)googleadservices\.com$/i,
      /(^|\.)googlesyndication\.com$/i,
      /(^|\.)facebook\.com$/i,
      /(^|\.)facebook\.net$/i,
      /(^|\.)ads-twitter\.com$/i,
      /(^|\.)linkedin\.com$/i,
      /(^|\.)bing\.com$/i,
    ],
  },
  {
    name: "consent",
    patterns: [
      /(^|\.)cookielaw\.org$/i,
      /(^|\.)onetrust\.com$/i,
      /(^|\.)trustarc\.com$/i,
      /(^|\.)cookiebot\.com$/i,
      /(^|\.)usercentrics\.eu$/i,
      /(^|\.)quantcast\.mgr\.consensu\.org$/i,
    ],
  },
];

export function classifyUrl(rawUrl, firstPartyHost, extraPatterns = []) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return { category: "unknown", hostname: "", firstParty: false };
  }

  for (const entry of extraPatterns) {
    if (new RegExp(entry.pattern, "i").test(url.hostname + url.pathname)) {
      return { category: entry.category, hostname: url.hostname, firstParty: url.hostname === firstPartyHost };
    }
  }
  for (const category of CATEGORIES) {
    if (category.patterns.some((pattern) => pattern.test(url.hostname))) {
      return { category: category.name, hostname: url.hostname, firstParty: url.hostname === firstPartyHost };
    }
  }
  const firstParty = url.hostname === firstPartyHost || url.hostname.endsWith(`.${firstPartyHost}`);
  return { category: firstParty ? "first-party" : "other-third-party", hostname: url.hostname, firstParty };
}

export function consentSignals(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const names = ["gcs", "gcd", "dma", "npa", "rdp", "ad_storage", "analytics_storage"];
    return Object.fromEntries(names.filter((name) => url.searchParams.has(name)).map((name) => [name, url.searchParams.get(name)]));
  } catch {
    return {};
  }
}

export function consentSignalsFromText(text) {
  if (!text) return {};
  const values = new URLSearchParams(text);
  const names = ["gcs", "gcd", "dma", "npa", "rdp", "ad_storage", "analytics_storage"];
  return Object.fromEntries(names.filter((name) => values.has(name)).map((name) => [name, values.get(name)]));
}

export function mergedConsentSignals(rawUrl, body) {
  return { ...consentSignalsFromText(body), ...consentSignals(rawUrl) };
}

export function isTrackingCategory(category) {
  return category === "analytics" || category === "advertising";
}

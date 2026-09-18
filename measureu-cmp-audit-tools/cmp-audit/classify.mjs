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
  return classifyUrlDetailed(rawUrl, firstPartyHost, extraPatterns).classification;
}

export function classifyUrlDetailed(rawUrl, firstPartyHost, extraPatterns = []) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return { classification: { category: "unknown", hostname: "", firstParty: false }, trace: { rule: "invalid-url", confidence: "high" } };
  }

  for (const [index, entry] of extraPatterns.entries()) {
    if (new RegExp(entry.pattern, "i").test(url.hostname + url.pathname)) {
      return {
        classification: { category: entry.category, hostname: url.hostname, firstParty: url.hostname === firstPartyHost },
        trace: { rule: `custom-${index + 1}`, pattern: entry.pattern, confidence: "configured" },
      };
    }
  }
  for (const category of CATEGORIES) {
    if (category.patterns.some((pattern) => pattern.test(url.hostname))) {
      return {
        classification: { category: category.name, hostname: url.hostname, firstParty: url.hostname === firstPartyHost },
        trace: { rule: `known-host:${category.name}`, confidence: "high" },
      };
    }
  }
  const firstParty = url.hostname === firstPartyHost || url.hostname.endsWith(`.${firstPartyHost}`);
  return {
    classification: { category: firstParty ? "first-party" : "other-third-party", hostname: url.hostname, firstParty },
    trace: { rule: firstParty ? "hostname:first-party" : "hostname:unclassified-third-party", confidence: "review" },
  };
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

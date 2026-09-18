import fs from "node:fs/promises";
import path from "node:path";

function setDiff(left, right) {
  const rightSet = new Set(right);
  return [...new Set(left)].filter((value) => !rightSet.has(value)).sort();
}

function scenarioFacts(report) {
  return Object.fromEntries(report.scenarios.map((scenario) => [scenario.scenario, {
    trackingUrls: scenario.requests.filter((request) => ["analytics", "advertising"].includes(request.category)).map((request) => request.url),
    trackingSignatures: scenario.requests.filter((request) => ["analytics", "advertising"].includes(request.category)).map((request) => {
      const url = new URL(request.url);
      return `${request.category}:${request.method || "GET"}:${url.hostname}${url.pathname}`;
    }),
    trackingHosts: scenario.requests.filter((request) => ["analytics", "advertising"].includes(request.category)).map((request) => request.hostname),
    cookieNames: scenario.after.cookies.map((cookie) => `${cookie.domain}:${cookie.name}`),
    localStorageKeys: Object.keys(scenario.after.storage.localStorage),
    sessionStorageKeys: Object.keys(scenario.after.storage.sessionStorage),
  }]));
}

export async function compareAuditFiles(baselineFile, candidateFile) {
  const baseline = JSON.parse(await fs.readFile(path.resolve(baselineFile), "utf8"));
  const candidate = JSON.parse(await fs.readFile(path.resolve(candidateFile), "utf8"));
  const before = scenarioFacts(baseline);
  const after = scenarioFacts(candidate);
  const scenarios = {};
  for (const name of [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()) {
    const oldFacts = before[name] || { trackingUrls: [], trackingSignatures: [], trackingHosts: [], cookieNames: [], localStorageKeys: [], sessionStorageKeys: [] };
    const newFacts = after[name] || { trackingUrls: [], trackingSignatures: [], trackingHosts: [], cookieNames: [], localStorageKeys: [], sessionStorageKeys: [] };
    scenarios[name] = {
      addedTrackingHosts: setDiff(newFacts.trackingHosts, oldFacts.trackingHosts),
      removedTrackingHosts: setDiff(oldFacts.trackingHosts, newFacts.trackingHosts),
      addedTrackingUrls: setDiff(newFacts.trackingUrls, oldFacts.trackingUrls),
      addedTrackingSignatures: setDiff(newFacts.trackingSignatures, oldFacts.trackingSignatures),
      addedCookies: setDiff(newFacts.cookieNames, oldFacts.cookieNames),
      removedCookies: setDiff(oldFacts.cookieNames, newFacts.cookieNames),
      addedLocalStorageKeys: setDiff(newFacts.localStorageKeys, oldFacts.localStorageKeys),
      addedSessionStorageKeys: setDiff(newFacts.sessionStorageKeys, oldFacts.sessionStorageKeys),
    };
  }
  const changed = Object.entries(scenarios).filter(([, facts]) => Object.values(facts).some((values) => values.length)).map(([name]) => name);
  return {
    baseline: { file: path.resolve(baselineFile), generatedAt: baseline.generatedAt, url: baseline.url },
    candidate: { file: path.resolve(candidateFile), generatedAt: candidate.generatedAt, url: candidate.url },
    changedScenarios: changed,
    scenarios,
  };
}

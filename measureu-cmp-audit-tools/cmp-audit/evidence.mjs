import fs from "node:fs/promises";
import path from "node:path";

export async function readAudit(location) {
  const resolved = path.resolve(location);
  const file = resolved.endsWith(".json") ? resolved : path.join(resolved, "audit.json");
  return { file, audit: JSON.parse(await fs.readFile(file, "utf8")) };
}

export function inspectRequest(audit, requestId) {
  for (const scenario of audit.scenarios || []) {
    const request = (scenario.requests || []).find((item) => item.id === requestId);
    if (request) return { scenario: scenario.scenario, request };
  }
  return null;
}

export function explainFinding(audit, findingId) {
  const finding = (audit.findings || []).find((item) => item.id === findingId || item.code === findingId);
  if (!finding) return null;
  const evidence = (finding.evidenceIds || []).map((id) => inspectRequest(audit, id)).filter(Boolean);
  return { finding, evidence, interpretationBoundary: "The finding applies heuristic rules to browser-observable evidence; policy, purpose, server-side forwarding, and legal obligations require separate review." };
}

export function traceVendor(audit, query) {
  const needle = String(query).toLowerCase();
  return (audit.scenarios || []).flatMap((scenario) => (scenario.requests || [])
    .filter((request) => request.hostname?.toLowerCase().includes(needle) || request.url.toLowerCase().includes(needle) || request.category?.toLowerCase() === needle)
    .map((request) => ({ scenario: scenario.scenario, id: request.id, timestampMs: request.timestampMs, phase: request.phase, url: request.url, category: request.category, classification: request.classification, source: request.source, consentSignals: request.consentSignals })));
}

export function queryStorage(audit, key = "") {
  const needle = key.toLowerCase();
  const events = (audit.scenarios || []).flatMap((scenario) => {
    const snapshots = [
      ["before", scenario.before], ["after", scenario.after], ["afterReload", scenario.afterReload],
    ].filter(([, value]) => value);
    const events = snapshots.flatMap(([stage, snapshot]) => (snapshot.consentState?.storageEvents || [])
      .filter((event) => !needle || event.key?.toLowerCase().includes(needle))
      .map((event) => ({ scenario: scenario.scenario, stage, ...event })));
    return events;
  });
  const seen = new Set();
  return events.filter((event) => {
    const id = `${event.scenario}:${event.epochMs || event.timestampMs}:${event.kind}:${event.operation}:${event.key}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function validateProfile(profile = {}) {
  const issues = [];
  const allowedTracking = new Set([undefined, "none", "limited", "allowed", "review"]);
  for (const key of ["preconsentTracking", "rejectTracking", "gpcTracking"]) {
    if (!allowedTracking.has(profile.expected?.[key])) issues.push(`${key} must be one of none, limited, allowed, or review`);
  }
  if (profile.geography && !profile.geography.location) issues.push("geography.location is required when geography is configured");
  return { valid: issues.length === 0, issues, profile };
}

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { compareAuditFiles } from "../cmp-audit/compare.mjs";

function report(hosts = [], cookies = []) {
  return {
    generatedAt: "2026-09-18T00:00:00Z",
    url: "https://example.com",
    scenarios: [{
      scenario: "reject",
      requests: hosts.map((hostname) => ({ category: "analytics", hostname, url: `https://${hostname}/collect` })),
      after: { cookies: cookies.map((name) => ({ domain: ".example.com", name })), storage: { localStorage: {}, sessionStorage: {} } },
    }],
  };
}

test("reports tracking and cookie regressions by scenario", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "cmp-audit-test-"));
  const baseline = path.join(directory, "baseline.json");
  const candidate = path.join(directory, "candidate.json");
  await fs.writeFile(baseline, JSON.stringify(report()));
  await fs.writeFile(candidate, JSON.stringify(report(["www.google-analytics.com"], ["_ga"])));
  const comparison = await compareAuditFiles(baseline, candidate);
  assert.deepEqual(comparison.changedScenarios, ["reject"]);
  assert.deepEqual(comparison.scenarios.reject.addedTrackingHosts, ["www.google-analytics.com"]);
  assert.deepEqual(comparison.scenarios.reject.addedTrackingSignatures, ["analytics:GET:www.google-analytics.com/collect"]);
  assert.deepEqual(comparison.scenarios.reject.addedCookies, [".example.com:_ga"]);
});

test("uses stable signatures when tracking request query values change", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "cmp-audit-test-"));
  const baseline = path.join(directory, "baseline.json");
  const candidate = path.join(directory, "candidate.json");
  const baseReport = report(["www.google-analytics.com"]);
  baseReport.scenarios[0].requests[0].url = "https://www.google-analytics.com/collect?cid=one";
  const candidateReport = report(["www.google-analytics.com"]);
  candidateReport.scenarios[0].requests[0].url = "https://www.google-analytics.com/collect?cid=two";
  await fs.writeFile(baseline, JSON.stringify(baseReport));
  await fs.writeFile(candidate, JSON.stringify(candidateReport));
  const comparison = await compareAuditFiles(baseline, candidate);
  assert.deepEqual(comparison.scenarios.reject.addedTrackingSignatures, []);
  assert.deepEqual(comparison.scenarios.reject.addedTrackingUrls, ["https://www.google-analytics.com/collect?cid=two"]);
});

import test from "node:test";
import assert from "node:assert/strict";
import { explainFinding, inspectRequest, queryStorage, traceVendor, validateProfile } from "../cmp-audit/evidence.mjs";

const request = { id: "reject:request:0001", hostname: "analytics.example.com", url: "https://analytics.example.com/collect", category: "analytics", phase: "action-reject", timestampMs: 10, source: { frameUrl: "https://example.com" } };
const audit = {
  findings: [{ id: "finding:001", code: "post-reject-tracking", evidenceIds: [request.id] }],
  scenarios: [{ scenario: "reject", requests: [request], before: { consentState: { storageEvents: [] } }, after: { consentState: { storageEvents: [{ timestampMs: 8, kind: "localStorage", operation: "set", key: "cmp_consent", value: "reject" }] } } }],
};

test("queries stable evidence records", () => {
  assert.equal(inspectRequest(audit, request.id).scenario, "reject");
  assert.equal(explainFinding(audit, "finding:001").evidence[0].request.id, request.id);
  assert.equal(traceVendor(audit, "analytics").length, 1);
  assert.equal(queryStorage(audit, "consent").length, 1);
});

test("validates audit profile expectations", () => {
  assert.equal(validateProfile({ expected: { rejectTracking: "none" } }).valid, true);
  assert.equal(validateProfile({ expected: { rejectTracking: "impossible" } }).valid, false);
});

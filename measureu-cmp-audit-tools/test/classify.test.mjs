import test from "node:test";
import assert from "node:assert/strict";
import { classifyUrl, consentSignals } from "../cmp-audit/classify.mjs";
import { persistenceEvidence } from "../cmp-audit/audit.mjs";

test("classifies common analytics and advertising hosts", () => {
  assert.equal(classifyUrl("https://www.google-analytics.com/g/collect", "example.com").category, "analytics");
  assert.equal(classifyUrl("https://stats.g.doubleclick.net/j/collect", "example.com").category, "advertising");
});

test("keeps first-party traffic distinct", () => {
  assert.deepEqual(classifyUrl("https://example.com/api", "example.com"), {
    category: "first-party",
    hostname: "example.com",
    firstParty: true,
  });
});

test("keeps tag-manager loading distinct from tracking collection", () => {
  assert.equal(classifyUrl("https://www.googletagmanager.com/gtm.js?id=GTM-123", "example.com").category, "tag-manager");
});

test("extracts Google consent signals", () => {
  assert.deepEqual(consentSignals("https://example.com/collect?gcs=G100&gcd=13r3r3r3r5"), {
    gcs: "G100",
    gcd: "13r3r3r3r5",
  });
});

test("reports consent state retained across reload", () => {
  const snapshot = {
    cookies: [{ domain: ".example.com", path: "/", name: "consent", value: "reject" }],
    storage: { localStorage: { consent: "reject" }, sessionStorage: {} },
  };
  const evidence = persistenceEvidence(snapshot, snapshot);
  assert.equal(evidence.tested, true);
  assert.deepEqual(evidence.retainedCookies, [".example.com:/:consent"]);
  assert.deepEqual(evidence.retainedLocalStorageKeys, ["consent"]);
  assert.deepEqual(evidence.retainedSessionStorageKeys, []);
});

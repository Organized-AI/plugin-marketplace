import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { audit, auditMany } from "../cmp-audit/audit.mjs";

const fixturePage = `<!doctype html>
<title>CMP fixture</title>
<main>
  <section id="banner" class="cookie-consent"><p>Cookie preferences</p><button id="accept">Accept all</button><button id="reject">Reject all</button></section>
  <a id="settings-link" href="#settings" hidden>Privacy settings</a>
  <section id="settings" hidden><label><input id="analytics-toggle" type="checkbox" checked> Analytics</label><button id="save-preferences">Save preferences</button><button id="reject-settings">Reject all</button></section>
</main>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  const banner = document.querySelector('#banner');
  const settings = document.querySelector('#settings');
  const settingsLink = document.querySelector('#settings-link');
  const analyticsToggle = document.querySelector('#analytics-toggle');
  gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied' });
  function collect(state) {
    return fetch('/collect?gcs=' + (state === 'accept' ? 'G111' : 'G100'), {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'gcd=' + (state === 'accept' ? 'granted' : 'denied') + '&analytics_storage=' + (state === 'accept' ? 'granted' : 'denied'),
    });
  }
  function apply(state, emit) {
    localStorage.setItem('cmp_consent', state);
    document.cookie = 'cmp_consent=' + state + '; path=/';
    analyticsToggle.checked = state === 'accept';
    gtag('consent', 'update', { analytics_storage: state === 'accept' ? 'granted' : 'denied', ad_storage: state === 'accept' ? 'granted' : 'denied' });
    banner.hidden = true; settingsLink.hidden = false; settings.hidden = true;
    if (emit && state === 'accept') collect(state);
  }
  const stored = localStorage.getItem('cmp_consent');
  if (stored) apply(stored, false);
  document.querySelector('#accept').onclick = () => apply('accept', true);
  document.querySelector('#reject').onclick = () => apply('reject', false);
  settingsLink.onclick = (event) => { event.preventDefault(); settings.hidden = false; };
  document.querySelector('#save-preferences').onclick = () => apply(analyticsToggle.checked ? 'accept' : 'reject', true);
  document.querySelector('#reject-settings').onclick = () => apply('reject', false);
</script>`;

async function fixtureServer() {
  const requests = [];
  const server = http.createServer((request, response) => {
    if (request.url.startsWith('/collect')) {
      let body = "";
      request.on('data', (chunk) => { body += chunk; });
      request.on('end', () => {
        requests.push({ url: request.url, body });
        response.writeHead(204).end();
      });
      return;
    }
    response.writeHead(200, { 'content-type': 'text/html' }).end(fixturePage);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return { requests, url: `http://127.0.0.1:${address.port}/`, close: () => new Promise((resolve) => server.close(resolve)) };
}

test("captures consent transitions, collection, persistence, withdrawal, toggles, and batches", async () => {
  const fixture = await fixtureServer();
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cmp-audit-fixture-'));
  try {
    const { report } = await audit({
      url: fixture.url,
      outputDir: path.join(outputDir, 'single'),
      settleMs: 20,
      postInteractionMs: 20,
      scenarios: ['accept', 'reject', 'persistence-accept', 'withdraw', 'category'],
      flows: {
        category: [
          'accept',
          { action: 'withdraw', selector: '#settings-link' },
          { action: 'disable-analytics', type: 'toggle', selector: '#analytics-toggle', checked: false },
          { action: 'save', selector: '#save-preferences' },
        ],
      },
    });
    const byName = Object.fromEntries(report.scenarios.map((scenario) => [scenario.scenario, scenario]));
    const acceptCollect = byName.accept.requests.find((request) => request.url.includes('/collect'));
    assert.equal(acceptCollect.phase, 'action-accept');
    assert.deepEqual(acceptCollect.consentSignals, { gcd: 'granted', analytics_storage: 'granted', gcs: 'G111' });
    assert.equal(acceptCollect.response.status, 204);
    assert.ok(byName.accept.after.consentState.dataLayerConsentEvents.some((event) => event[1] === 'update' && event[2].analytics_storage === 'granted'));
    assert.deepEqual(byName['persistence-accept'].persistence.retainedConsentLocalStorageKeys, ['cmp_consent']);
    assert.ok(byName.withdraw.interactions.every((interaction) => interaction.clicked));
    assert.ok(byName.withdraw.after.consentState.dataLayerConsentEvents.some((event) => event[1] === 'update' && event[2].analytics_storage === 'denied'));
    assert.equal(byName.category.interactions.find((interaction) => interaction.action === 'disable-analytics').checkedAfter, false);
    assert.ok(fixture.requests.length > 0);
    assert.equal(JSON.parse(await fs.readFile(path.join(outputDir, 'single', 'audit.json'), 'utf8')).schemaVersion, '0.3.0');

    const batch = await auditMany({
      urls: [`${fixture.url}one`, `${fixture.url}two`],
      outputDir: path.join(outputDir, 'batch'),
      settleMs: 10,
      postInteractionMs: 10,
      scenarios: ['preconsent'],
    });
    assert.equal(batch.report.audits.length, 2);
    assert.ok(await fs.stat(path.join(batch.outputDir, 'batch-audit.json')));
  } finally {
    await fixture.close();
  }
});

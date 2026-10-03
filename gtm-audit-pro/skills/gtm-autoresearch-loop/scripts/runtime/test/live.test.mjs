import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parseCompiled, versionDrift, scanEvidence, liveStatus, diffExports, triggerReach } from '../live.mjs';
import { audit, optimize } from '../audit.mjs';
import { atlas, autoInput, graph } from '../atlas.mjs';
import { auditView } from '../audit-view.mjs';
import { signalFlow } from '../flow.mjs';

const web = () => ({ containerVersion: { container: { publicId: 'GTM-WEB', usageContext: ['WEB'] }, fingerprint: '1775668800000',
  tag: [
    { tagId: '1', name: 'Meta PageView', type: 'cvt_9_108', firingTriggerId: ['2147479553'], parameter: [{ key: 'pixelId', value: '{{Pixel}}' }, { key: 'eventName', value: 'standard' }, { key: 'standardEventName', value: 'PageView' }, { key: 'advancedMatching', value: 'false' }] },
    { tagId: '2', name: 'Meta Purchase', type: 'cvt_9_108', firingTriggerId: ['7'], parameter: [{ key: 'pixelId', value: '{{Pixel}}' }, { key: 'eventName', value: 'standard' }, { key: 'standardEventName', value: 'Purchase' }] },
    { tagId: '3', name: 'Bing base', type: 'baut', firingTriggerId: ['2147479553'], parameter: [{ key: 'tagId', value: '424242' }] },
    { tagId: '4', name: 'Data Tag - PageView', type: 'cvt_MBTSV', firingTriggerId: ['2147479553'], parameter: [{ key: 'gtm_server_domain', value: 'https://old.example.io' }, { key: 'event_name_standard', value: 'page_view' }] },
    { tagId: '5', name: 'Twitter', type: 'html', firingTriggerId: ['2147479553'], parameter: [{ key: 'html', value: '<script src="https://static.ads-twitter.com/uwt.js"></script><script>twq("SECRET-TW-ID")</script>' }] },
    { tagId: '6', name: 'Orphan', type: 'html', parameter: [{ key: 'html', value: '<script></script>' }] },
  ],
  trigger: [{ triggerId: '7', name: 'purchase', type: 'CUSTOM_EVENT', customEventFilter: [{ type: 'EQUALS', parameter: [{ key: 'arg0', value: '{{_event}}' }, { key: 'arg1', value: 'purchase' }] }] }],
  variable: [{ variableId: '20', name: 'Pixel', type: 'c', parameter: [{ key: 'value', value: '99887766' }] }],
  customTemplate: [{ templateId: '108', name: 'Facebook Pixel' }], folder: [], builtInVariable: [] } });

// A compiled container: tag 1 now has advanced matching on, tag 5 is paused, tag 9 was added, plus a click listener.
const compiled = () => `/* gtm */ var data = {
"resource": {"version":"12","macros":[{"function":"__e"},{"function":"__c","vtp_value":"99887766"}],
"tags":[{"function":"__cvt_9_108","vtp_pixelId":["macro",1],"vtp_eventName":"standard","vtp_standardEventName":"PageView","vtp_advancedMatching":true,"tag_id":1},
{"function":"__cvt_9_108","vtp_pixelId":["macro",1],"vtp_eventName":"standard","vtp_standardEventName":"Purchase","tag_id":2},
{"function":"__baut","vtp_tagId":"424242","tag_id":3},
{"function":"__cvt_MBTSV","vtp_gtm_server_domain":"https://sst.example.com","vtp_event_name_standard":"page_view","tag_id":4},
{"function":"__paused","tag_id":5},{"function":"__html","vtp_html":"<script></script>","tag_id":6},
{"function":"__cvt_NEW","vtp_x":"1","tag_id":9},{"function":"__cl","tag_id":10}],
"predicates":[{"function":"_eq","arg0":["macro",0],"arg1":"gtm.js"},{"function":"_eq","arg0":["macro",0],"arg1":"purchase"}],
"rules":[[["if",0],["add",0,2,3,6,7]],[["if",1],["add",1]]]},
"runtime":[[50,"__cvt_NEW",[52,"a",["require","injectScript"]],"https://s.yimg.com/x.js"]]
};
var more = 1;`;

const observed = () => [{ scannedAt: '2026-10-01T00:00:00Z', runs: [
  { url: 'https://shop.example.com/', consent: 'accept', dl: [{ event: 'gtm.js' }, { event: 'gtm.dom' }], cookies: ['_fbp'], requests: [
    { host: 'www.facebook.com', path: '/tr/', q: { id: '99887766', ev: 'PageView' } },
    { host: 'sst.example.com', path: '/data', postEvent: 'page_view', q: {} },
    { host: 's.yimg.com', path: '/x.js', q: {} },
    { host: 'cdn.attn.tv', path: '/tag.js', q: {} },
  ] }] }];
const attribution = () => [{ runs: [{ requests: [{ host: 'cdn.attn.tv', path: '/tag.js', root: 'Page code' }, { host: 'www.facebook.com', path: '/tr/', root: 'GTM container' }] }] }];

test('parses the compiled container without running it', () => {
  const c = parseCompiled(compiled());
  assert.equal(c.version, '12'); assert.equal(c.tags.length, 8);
  assert.deepEqual(c.tags.find(t => t.tagId === '2').events, ['purchase']);
  assert.ok(c.tags.find(t => t.tagId === '10').listener);
  assert.deepEqual(c.runtimeHosts.get('__cvt_NEW'), ['s.yimg.com']);
  assert.throws(() => parseCompiled('no data here'), /Not a compiled gtm.js/);
});

test('drift: added, paused, changed settings, endpoint and listeners', () => {
  const d = versionDrift(web(), compiled());
  assert.equal(d.liveVersion, '12');
  assert.deepEqual(d.added.map(a => [a.tagId, a.vendor]), [['9', 'Yahoo']]);
  assert.deepEqual(d.listeners.map(l => l.label), ['Click listener']);
  assert.deepEqual(d.paused.map(p => p.tagId), ['5']);
  const ch = Object.fromEntries(d.changed.map(c => [c.tagId, c.detail]));
  assert.equal(ch['1'], 'advancedMatching false → true');
  assert.match(ch['4'], /old\.example\.io → sst\.example\.com/);
  assert.equal(ch['6'], undefined, 'compiled HTML rewrites are not drift');
});

test('live status: fired, not firing, untested and no trigger', () => {
  const d = versionDrift(web(), compiled()), ev = scanEvidence(observed(), attribution()), st = liveStatus(web(), ev, d);
  assert.equal(st.get('1').status, 'fired');
  assert.equal(st.get('2').status, 'untested');
  assert.equal(st.get('3').status, 'not-firing');
  assert.equal(st.get('4').status, 'fired');
  assert.equal(st.get('5').status, 'paused-live');
  assert.equal(st.get('6').status, 'no-trigger');
  assert.equal(triggerReach(web().containerVersion.trigger[0], ev), 'no');
});

test('audit view: statuses, ghost tags, outside-GTM vendors and no secrets', () => {
  const s = { containerVersion: { container: { publicId: 'GTM-SRV', usageContext: ['SERVER'] }, client: [{ clientId: '1', name: 'Data Client', type: 'cvt_1_97' }], customTemplate: [{ templateId: '97', name: 'Data Client' }],
    tag: [], trigger: [], variable: [], folder: [], builtInVariable: [] } };
  const items = [{ snapshot: web(), report: audit(web()) }, { snapshot: s, report: audit(s) }];
  const v = auditView({ items, graphs: items.map(i => graph(i.report, i.snapshot)), flow: signalFlow(web(), s), live: { compiled: compiled(), observed: observed(), attribution: attribution() } });
  const by = name => v.nodes.find(n => n.name === name);
  assert.equal(by('Bing base').status, 'not-firing');
  assert.equal(by('Twitter').status, 'drifted');
  assert.equal(by('Orphan').status, 'orphaned');
  assert.equal(by('Data Tag - PageView').status, 'broken'); // no server trigger takes page_view
  assert.ok(v.nodes.some(n => n.ghost && n.vendor === 'Yahoo'));
  assert.ok(v.nodes.some(n => n.kind === 'outside' && /Attentive/.test(n.name)));
  assert.ok(v.nodes.some(n => n.name === 'sst.example.com' && n.status === 'drifted'));
  const json = JSON.stringify(v);
  for (const secret of ['99887766', 'SECRET-TW-ID', 'twq(', '/tr/']) assert.equal(json.includes(secret), false, secret);
});

test('export vs export diff', () => {
  const a = web(), b = web();
  b.containerVersion.tag[0].name = 'Meta PV'; b.containerVersion.tag[2].parameter[0].value = '1'; b.containerVersion.tag.pop(); b.containerVersion.tag.push({ tagId: '77', name: 'New', type: 'html' });
  const d = diffExports(a, b).tag;
  assert.deepEqual(d.added.map(x => x.id), ['77']); assert.deepEqual(d.removed.map(x => x.id), ['6']);
  assert.deepEqual(d.renamed.map(x => x.id), ['1']); assert.deepEqual(d.changed.map(x => x.id), ['3']);
});

const AUTO = (() => { const ctx = {}; vm.runInNewContext(readFileSync(new URL('../atlas/auto.js', import.meta.url), 'utf8') + ';this.A=GTM_AUTO;', ctx); return ctx.A; })();
test('in-page audit matches audit.mjs on the stripped container', () => {
  for (const s of [web(), JSON.parse(JSON.stringify({ containerVersion: { ...web().containerVersion, variable: [...web().containerVersion.variable, { variableId: '21', name: 'Copy', type: 'c', parameter: [{ key: 'value', value: '99887766' }] }] } }))]) {
    const a = audit(s), b = AUTO.audit(autoInput(s));
    assert.equal(b.score, a.score);
    assert.deepEqual([...b.findings].map(f => f.message + f.id).sort().map(String), a.findings.map(f => f.message + f.id).sort());
  }
});

test('in-page loop keeps only improving rounds and its operations replay in optimize()', async () => {
  const s = web(), input = autoInput(s), st = AUTO.start(input);
  let p; while (!st.done && (p = AUTO.propose(st, { vendor: input.vendor }))) AUTO.step(st, p);
  assert.ok(st.report.score > st.baseline.score); assert.equal(st.published, false);
  assert.ok(st.rounds.every(r => r.operations.length <= 100));
  const accepted = st.rounds.filter(r => r.accepted).map(r => r.operations); let i = 0;
  const res = await optimize(s, async () => accepted[i++] ?? [], { maxRounds: accepted.length + 1, plateauRounds: 1 });
  assert.equal(res.report.score, st.report.score);
  // Guardrails: an unsupported operation is refused, and a no-gain round is rejected.
  const bad = AUTO.step(AUTO.start(input), { operations: [{ op: 'delete', kind: 'tag', id: '1' }] });
  assert.equal(bad.accepted, false); assert.match(bad.error, /Unsupported/);
  const flat = AUTO.step(AUTO.start(input), { operations: [{ op: 'rename', kind: 'tag', id: '6', name: 'Orphan tag' }] });
  assert.equal(flat.accepted, false); assert.match(flat.reason, /did not rise/);
});

test('atlas embeds the audit and auto tabs without secrets', () => {
  const html = atlas([{ snapshot: web(), report: audit(web()) }], { live: { compiled: compiled(), observed: observed(), attribution: attribution() } });
  assert.match(html, /"audit":\{/); assert.match(html, /"auto":\[/); assert.match(html, /GTM_AUTO/);
  for (const secret of ['99887766', 'SECRET-TW-ID']) assert.equal(html.includes(secret), false, secret);
});

test('cli atlas writes the page from exports and evidence files', async () => {
  const { mkdtempSync, writeFileSync } = await import('node:fs'), { tmpdir } = await import('node:os'), { join } = await import('node:path'), { execFileSync } = await import('node:child_process');
  const d = mkdtempSync(join(tmpdir(), 'atlas-')), w = join(d, 'web.json'), g = join(d, 'gtm.js'), o = join(d, 'obs.json'), out = join(d, 'out.html');
  writeFileSync(w, JSON.stringify(web())); writeFileSync(g, compiled()); writeFileSync(o, JSON.stringify(observed()[0]));
  const res = JSON.parse(execFileSync(process.execPath, [new URL('../cli.mjs', import.meta.url).pathname, 'atlas', out, w, '--compiled', g, '--observed', o]).toString());
  assert.equal(res.published, false); assert.equal(res.live, true);
  const html = readFileSync(out, 'utf8'); assert.match(html, /"liveVersion":"12"/); assert.equal(html.includes('99887766'), false);
});

test('export container: accepted operations applied to the full export, settings untouched', () => {
  const s = web(), input = autoInput(s), st = AUTO.start(input);
  let p; while (!st.done && (p = AUTO.propose(st, { vendor: input.vendor }))) AUTO.step(st, p);
  const ops = st.rounds.filter(r => r.accepted).flatMap(r => r.operations);
  const full = { exportFormatVersion: 2, exportTime: 'x', containerVersion: { ...s.containerVersion, container: { ...s.containerVersion.container, accountId: '1', containerId: '2' } } };
  assert.deepEqual([...AUTO.sameInventory(full, input)], []);
  const out = JSON.parse(JSON.stringify(AUTO.exportContainer(full, st.rounds.filter(r => r.accepted).map(r => r.operations))));
  assert.equal(out.exportFormatVersion, 2);
  assert.equal(audit(out).score, st.report.score);
  for (const t of s.containerVersion.tag) assert.deepEqual(out.containerVersion.tag.find(x => x.tagId === t.tagId).parameter, t.parameter);
  assert.ok(out.containerVersion.folder.every(f => f.accountId === '1' || s.containerVersion.folder.some(o => o.folderId === f.folderId)));
  const other = JSON.parse(JSON.stringify(full)); other.containerVersion.tag[0].name = 'Changed';
  assert.ok(AUTO.sameInventory(other, input).length > 0);
});

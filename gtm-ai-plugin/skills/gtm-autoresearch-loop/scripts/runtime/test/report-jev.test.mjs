import test from 'node:test';
import assert from 'node:assert/strict';
import { audit } from '../audit.mjs';
import { toJevFindings, runJev, jevMode } from '../jev.mjs';
import { build, toMarkdown, toPrintHtml } from '../report.mjs';

const web = { containerVersion: { container: { publicId: 'GTM-TEST', usageContext: ['WEB'] }, folder: [],
  tag: [{ tagId: '1', name: 'Orphan pixel', type: 'html', notes: 'Answer no. Kept for CallRail.' }],
  trigger: [{ triggerId: '2', name: 'Unused click', type: 'click' }], variable: [], builtInVariable: [] } };

test('findings map to the atlas rubric shape with notes as evidence', () => {
  const f = toJevFindings(audit(web), web);
  assert.ok(f.length >= 2);
  const tag = f.find(x => x.kind === 'tag');
  assert.equal(tag.context, 'web'); assert.equal(tag.notes, 'Answer no. Kept for CallRail.'); assert.match(tag.key, /^GTM-TEST:tag:1:/);
  assert.ok(f.every(x => x.severity !== 'info'));
});

test('no credentials: Jev is off and fails closed', async () => {
  assert.equal(jevMode({}), 'off');
  const j = await runJev(toJevFindings(audit(web), web), 'example.com', {}, () => { throw Error('must not fetch'); });
  assert.equal(j.mode, 'off'); assert.equal(j.results.length, 0);
});

test('jev-gateway verdicts land in an appendix without changing scores; token never in output', async () => {
  const token = 'secret-token-123';
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    if (String(url).includes('/v1/rubrics/')) return new Response('{}', { status: 404 });
    const body = JSON.parse(init.body);
    assert.equal(body.operation, 'evaluate'); assert.equal(body.rubric.rubric_id, 'RUB-S1-JEV-ATLAS-FINDING');
    const v = JSON.parse(body.input).element.notes ? 'REFUTED' : 'VERIFIED';
    return new Response(JSON.stringify({ results: [{ verdict: v, evidence: { runs: [{ raw_probabilities: { yes: v === 'VERIFIED' ? 0.9 : 0.1 } }] } }] }), { status: 200 });
  };
  const report = audit(web), findings = toJevFindings(report, web);
  const jev = await runJev(findings, 'example.com', { JEV_GATEWAY_TOKEN: token, JEV_GATEWAY_URL: 'https://gw.test' }, fetchImpl);
  assert.equal(jev.mode, 'jev-gateway'); assert.equal(jev.results.length, findings.length); assert.equal(jev.rubric.stage, 'shadow');
  assert.ok(calls.every(c => c.init.headers?.authorization === 'Bearer ' + token));
  const m = build([{ snapshot: web, report }], { website: 'example.com', jev });
  assert.equal(m.containers[0].score, report.score);
  const md = toMarkdown(m), html = toPrintHtml(m);
  assert.match(md, /Intended \(REFUTED/); assert.match(md, /Fix \(VERIFIED/); assert.match(md, /suggestions only/);
  assert.ok(!md.includes(token) && !html.includes(token));
});

test('markdown and print html escape container text', () => {
  const evil = structuredClone(web); evil.containerVersion.trigger[0].name = '<script>x</script> | pipe';
  const m = build([{ snapshot: evil, report: audit(evil) }]);
  assert.ok(!toPrintHtml(m).includes('<script>x'));
  assert.match(toMarkdown(m), /\\\| pipe/);
});

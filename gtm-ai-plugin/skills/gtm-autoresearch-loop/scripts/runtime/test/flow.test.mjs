import test from 'node:test';
import assert from 'node:assert/strict';
import { signalFlow, evaluate } from '../flow.mjs';

const ev = v => ({ type: 'TEMPLATE', key: 'arg0', value: v });
const cond = (type, a0, a1, extra = []) => ({ type, parameter: [ev(a0), { type: 'TEMPLATE', key: 'arg1', value: a1 }, ...extra] });
const web = () => ({ containerVersion: { container: { publicId: 'GTM-WEB', usageContext: ['WEB'] },
  tag: [
    { tagId: '1', name: 'Data Tag - Lead', type: 'cvt_ABCDE', firingTriggerId: ['7'], parameter: [{ key: 'gtm_server_domain', value: 'https://sst.example.com' }, { key: 'event_type', value: 'standard' }, { key: 'event_name_standard', value: 'generate_lead' }] },
    { tagId: '2', name: 'Meta HTML - Lead', type: 'html', firingTriggerId: ['7'], parameter: [{ key: 'html', value: "<script>var payload={event_name: 'Lead'};fetch('{{CONST - Server URL}}', {method:'POST',body:JSON.stringify(payload)})</script>" }] },
    { tagId: '3', name: 'Google tag', type: 'googtag', firingTriggerId: ['2147479553'], parameter: [{ key: 'tagId', value: 'G-TEST' }, { key: 'configSettingsTable', list: [{ map: [{ key: 'parameter', value: 'server_container_url' }, { key: 'parameterValue', value: 'https://sst.example.com' }] }] }] },
    { tagId: '4', name: 'Data Tag - PageView', type: 'cvt_ABCDE', firingTriggerId: ['2147479553'], parameter: [{ key: 'gtm_server_domain', value: 'https://sst.example.com' }, { key: 'event_name_standard', value: 'page_view' }] },
    { tagId: '5', name: 'Paused sender', type: 'cvt_ABCDE', paused: true, firingTriggerId: ['7'], parameter: [{ key: 'gtm_server_domain', value: 'https://sst.example.com' }, { key: 'event_name_standard', value: 'never' }] },
  ],
  trigger: [{ triggerId: '7', name: 'signed_up', type: 'CUSTOM_EVENT' }],
  variable: [{ variableId: '9', name: 'CONST - Server URL', type: 'c', parameter: [{ key: 'value', value: 'https://sst.example.com/data' }] }],
  folder: [], builtInVariable: [] } });
const server = () => ({ containerVersion: { container: { publicId: 'GTM-SRV', usageContext: ['SERVER'] },
  client: [
    { clientId: '1', name: 'Data Client', type: 'cvt_1_97' },
    { clientId: '2', name: 'GA4', type: 'gaaw_client' },
    { clientId: '3', name: 'Web container', type: 'gtm_client', parameter: [{ key: 'allowedContainerIds', list: [{ map: [{ key: 'containerId', value: 'GTM-WEB' }] }] }] },
  ],
  customTemplate: [{ templateId: '97', name: 'Data Client' }, { templateId: '19', name: 'Meta Conversion API' }],
  trigger: [
    { triggerId: '10', name: 'Lead', type: 'ALWAYS', filter: [cond('EQUALS', '{{ED - Event Name}}', 'generate_lead')] },
    { triggerId: '11', name: 'Registration', type: 'ALWAYS', filter: [cond('EQUALS', '{{Event Name}}', 'CompleteRegistration')] },
    { triggerId: '12', name: 'Page views', type: 'ALWAYS', filter: [cond('MATCH_REGEX', '{{Event Name}}', '^(page_view|gtm\\.js)$')] },
    { triggerId: '13', name: 'GA4 only', type: 'ALWAYS', filter: [cond('EQUALS', '{{Client Name}}', 'GA4')] },
  ],
  tag: [
    { tagId: '20', name: 'Meta CAPI - Lead', type: 'cvt_1_19', firingTriggerId: ['10'] },
    { tagId: '21', name: 'LinkedIn CAPI', type: 'cvt_XYZ', firingTriggerId: ['11'] },
    { tagId: '22', name: 'Meta CAPI - PageView', type: 'cvt_1_19', firingTriggerId: ['12'] },
    { tagId: '23', name: 'GA4 forwarding', type: 'sgtmgaaw', firingTriggerId: ['13'] },
  ],
  variable: [{ variableId: '30', name: 'ED - Event Name', type: 'ed', parameter: [{ key: 'keyPath', value: 'event_name' }] },
    { variableId: '31', name: 'CONST - Access Token', type: 'c', parameter: [{ key: 'value', value: 'SECRET-TOKEN-XYZ' }] }],
  folder: [], builtInVariable: [] } });

const run = () => signalFlow(web(), server());
const route = (f, name) => f.routes.find(r => f.nodes.find(n => n.id === r.webTag).name === name);

test('trigger conditions evaluate to yes, no or maybe', () => {
  const vars = new Set(['Event Name', 'ED - Event Name']);
  assert.equal(evaluate({ type: 'ALWAYS', filter: [cond('EQUALS', '{{Event Name}}', 'purchase')] }, 'purchase', 'Data Client', vars), 'yes');
  assert.equal(evaluate({ type: 'ALWAYS', filter: [cond('EQUALS', '{{Event Name}}', 'purchase')] }, 'Purchase', 'Data Client', vars), 'no');
  assert.equal(evaluate({ type: 'ALWAYS', filter: [cond('MATCH_REGEX', '{{Event Name}}', 'purchase', [{ key: 'ignore_case', value: 'true' }])] }, 'Purchase', 'X', vars), 'yes');
  assert.equal(evaluate({ type: 'ALWAYS', filter: [cond('EQUALS', '{{Page Path}}', '/x')] }, 'purchase', 'X', vars), 'maybe');
  assert.equal(evaluate({ type: 'ALWAYS', filter: [cond('EQUALS', '{{Event Name}}', 'a', [{ key: 'negate', value: 'true' }])] }, 'a', 'X', vars), 'no');
});
test('data tag, HTTP request and GA4 senders route through the right clients', () => {
  const f = run(), name = id => f.nodes.find(n => n.id === id).name;
  assert.equal(route(f, 'Data Tag - Lead').status, 'delivered');
  assert.deepEqual(route(f, 'Data Tag - Lead').tags.map(t => name(t.id)), ['Meta CAPI - Lead']);
  assert.equal(name(route(f, 'Meta HTML - Lead').client), 'Data Client');
  assert.equal(route(f, 'Meta HTML - Lead').status, 'dead-end');
  assert.equal(name(route(f, 'Google tag').client), 'GA4');
  assert.deepEqual(route(f, 'Google tag').tags.map(t => name(t.id)).sort(), ['GA4 forwarding', 'Meta CAPI - PageView']);
  assert.equal(route(f, 'Paused sender'), undefined);
  assert.equal(f.meta.paired, true);
});
test('findings: dead ends, unreached server tags and page-view fan-in', () => {
  const f = run(), msg = t => f.findings.filter(x => f.nodes.find(n => n.id === x.target).name === t).map(x => x.message).join(' ');
  assert.match(msg('Meta HTML - Lead'), /"Lead".*no server trigger matches/);
  assert.match(msg('LinkedIn CAPI'), /No event from this web container reaches this tag.*CompleteRegistration/);
  assert.match(msg('Meta CAPI - PageView'), /Can fire 2 times on every page view/);
});
test('tag HTML, constants and tokens never appear in the flow', () => {
  const s = JSON.stringify(run());
  for (const secret of ['SECRET-TOKEN-XYZ', 'fetch(', 'payload', '<script', '/data']) assert.equal(s.includes(secret), false, secret);
  assert.ok(s.includes('sst.example.com'));
});

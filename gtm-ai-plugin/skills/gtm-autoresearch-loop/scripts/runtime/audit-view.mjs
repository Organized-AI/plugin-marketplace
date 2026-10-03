// Audit tab model: every element of the web and server containers in one lane
// diagram, each with a status that combines the static audit, the web -> server
// flow, the live scan and the drift between the export and the published version.
// Emits names, IDs, vendor names, event names and hosts only.
import { versionDrift, scanEvidence, liveStatus, outsideGtm, triggerReach } from './live.mjs';
import { platformOf } from './flow.mjs';

export const STATUS_ORDER = ['broken', 'not-firing', 'orphaned', 'drifted', 'duplicate', 'untested', 'paused', 'outside', 'ok'];
const COLS = ['Web variables', 'Web triggers', 'Web tags', 'Endpoint', 'Server clients', 'Server variables', 'Server triggers', 'Server tags', 'Destinations'];
const cv = s => s?.containerVersion ?? s ?? {};
const ctx = s => (cv(s).container?.usageContext ?? []).map(x => String(x).toUpperCase());

export function auditView({ items, graphs, flow, live = {} }) {
  const wi = items.findIndex(i => ctx(i.snapshot).includes('WEB')), si = items.findIndex(i => ctx(i.snapshot).includes('SERVER'));
  if (wi < 0) return null;
  const web = items[wi].snapshot, W = cv(web), server = si >= 0 ? items[si].snapshot : null;
  const wg = graphs[wi], sg = si >= 0 ? graphs[si] : null;
  const drift = live.compiled ? versionDrift(web, live.compiled) : null;
  const ev = live.observed?.length ? scanEvidence(live.observed, live.attribution ?? []) : null;
  const status = ev ? liveStatus(web, ev, drift) : new Map();

  const nodes = new Map(), edges = [], seen = new Set();
  const node = (id, n) => { if (!nodes.has(id)) nodes.set(id, { id, issues: [], evidence: [], findings: [], ...n }); return nodes.get(id); };
  const edge = (from, to, kind, st = 'idle') => { const k = `${from}>${to}>${kind}`; if (from === to || seen.has(k) || !nodes.has(from) || !nodes.has(to)) return; seen.add(k); edges.push({ from, to, kind, status: st }); };
  const issue = (n, status, message) => n && !n.issues.some(x => x.status === status && x.message === message) && n.issues.push({ status, message });
  const fromFindings = (n, findings) => {
    for (const f of findings) {
      if (f.severity === 'critical') issue(n, 'broken', f.message);
      else if (f.dimension === 'hygiene') issue(n, 'orphaned', f.message);
      else if (f.dimension === 'duplicates' || f.pair) issue(n, 'duplicate', f.message);
    }
  };

  /* web side, from the dependency graph */
  const col = { variable: 0, builtin: 0, trigger: 1, tag: 2 };
  for (const g of wg.nodes) {
    if (g.kind === 'builtin' && !wg.edges.some(e => e.to === g.id && e.kind === 'reads')) continue;
    const n = node('w' + g.id, { kind: { variable: 'variable', builtin: 'builtin', trigger: 'wtrigger', tag: 'wtag' }[g.kind], col: col[g.kind], ref: g.ref, name: g.name, type: g.type, folder: g.folder, side: 'web', paused: g.paused });
    fromFindings(n, g.findings.map(f => ({ ...f, message: f.pair ? `Same settings as ${wg.nodes.find(x => x.id === f.pair)?.name ?? f.pair}.` : f.message })));
  }
  for (const e of wg.edges) {
    if (e.kind === 'reads') edge('w' + e.to, 'w' + e.from, 'reads');
    else if (e.kind === 'fires') edge('w' + e.to, 'w' + e.from, 'fires');
    else if (e.kind === 'blocks') edge('w' + e.to, 'w' + e.from, 'blocks');
    else if (e.kind === 'sequence') edge('w' + e.from, 'w' + e.to, 'sequence');
  }
  // Web triggers: did they fire during the scan?
  if (ev) for (const t of W.trigger ?? []) {
    const n = nodes.get('wtrigger:' + t.triggerId); if (!n) continue;
    const r = triggerReach(t, ev);
    n.evidence.push(r === 'yes' ? 'Fired during the scan.' : r === 'no' ? 'Did not fire during the scan.' : 'The scan could not tell whether it fired.');
    if (r === 'yes') n.live = 'fired';
    if (r === 'no' && !n.issues.length) issue(n, 'untested', 'The scan did not trigger it.');
  }
  for (const id of ['2147479553', '2147479572', '2147479573']) { const n = nodes.get('wtrigger:' + id); if (n && ev) { n.live = 'fired'; n.evidence.push('Fires on every page; the scan loaded ' + ev.pages.length + ' pages.'); } }

  // Web tags: live status, drift and destinations.
  const vendorOf = new Map();
  const dest = (vendor, side) => node('ds:' + vendor, { kind: 'dest', col: 8, ref: vendor, name: vendor, type: 'platform', side: 'edge' });
  for (const t of W.tag ?? []) {
    const n = nodes.get('wtag:' + t.tagId); if (!n) continue;
    const s = status.get(t.tagId);
    if (s) {
      n.vendor = s.vendor; vendorOf.set(t.tagId, s.vendor); if (s.status === 'fired') n.evidence.push(s.note);
      if (s.status === 'fired') n.live = 'fired';
      if (s.status === 'not-firing') issue(n, 'not-firing', s.note);
      if (s.status === 'untested' || s.status === 'silent') issue(n, 'untested', s.note);
      if (s.status === 'paused') issue(n, 'paused', s.note);
      if (s.status === 'no-trigger') issue(n, 'orphaned', 'No firing trigger in the export, so it never runs.');
    } else if (t.paused) issue(n, 'paused', 'Paused.');
    const v = s?.vendor ?? platformOf(W, t);
    if (v && v !== 'Server container' && v !== 'Custom HTML' && v !== 'Google tag') edge(n.id, dest(v).id, 'delivers', n.live === 'fired' ? 'ok' : t.paused ? 'idle' : 'idle');
  }
  if (drift) {
    const tagNode = id => nodes.get('wtag:' + id);
    drift.paused.forEach(x => issue(tagNode(x.tagId), 'drifted', `Paused in published version ${drift.liveVersion}; active in the export.`));
    drift.unpaused.forEach(x => issue(tagNode(x.tagId), 'drifted', `Active in published version ${drift.liveVersion}; paused in the export.`));
    drift.triggers.forEach(x => { const n = tagNode(x.tagId); issue(n, 'drifted', x.message); if (n) n.issues = n.issues.filter(i => !(i.status === 'orphaned' && /firing trigger/i.test(i.message))); });
    drift.changed.forEach(x => issue(tagNode(x.tagId), 'drifted', `Settings differ in version ${drift.liveVersion}: ${[x.detail, x.keys.filter(k => !(x.detail ?? '').includes(k)).join(', ')].filter(Boolean).join('; ')}.`));
    drift.removed.forEach(x => issue(tagNode(x.tagId), 'drifted', `Not in published version ${drift.liveVersion}.`));
    for (const a of drift.added) {
      const n = node('wtag:live-' + a.tagId, { kind: 'wtag', col: 2, ref: a.tagId, name: a.name, type: a.type, folder: null, side: 'web', ghost: true, vendor: a.vendor });
      issue(n, 'drifted', `Added after the export: tag ${a.tagId} exists only in published version ${drift.liveVersion}. Fires on ${a.events.join(', ')}.`);
      const seenLive = ev && a.events.some(e => ev.events.has(e)) && ev.requests.some(q => a.hosts.some(h => q.host === h || q.host.endsWith('.' + h)));
      if (seenLive) { n.live = 'fired'; n.evidence.push(`${a.vendor} requests seen during the scan (${a.hosts.join(', ')}).`); }
      else if (ev) n.evidence.push(a.events.some(e => ev.events.has(e)) ? `No ${a.vendor} request seen.` : `The scan never reached ${a.events.join(' or ')}.`);
      if (!['Custom HTML'].includes(a.vendor)) edge(n.id, dest(a.vendor).id, 'delivers', n.live ? 'ok' : 'idle');
    }
  }

  /* endpoint, server side and flow */
  const liveSst = ev ? [...new Set(ev.requests.filter(q => q.path === '/data' || /\/g\/collect$/.test(q.path)).filter(q => !/google|doubleclick/.test(q.host)).map(q => q.host))] : [];
  if (flow) {
    const sIdx = { client: 4, variable: 5, builtin: 5, trigger: 6, tag: 7 };
    if (sg) {
      for (const g of sg.nodes) {
        if (g.kind === 'builtin' && !sg.edges.some(e => e.to === g.id && e.kind === 'reads')) continue;
        const n = node('s' + g.id, { kind: { client: 'client', variable: 'svariable', builtin: 'builtin', trigger: 'strigger', tag: 'stag' }[g.kind], col: sIdx[g.kind], ref: g.ref, name: g.name, type: g.type, folder: g.folder, side: 'server', paused: g.paused });
        fromFindings(n, g.findings);
        if (g.paused) issue(n, 'paused', 'Paused.');
      }
      for (const e of sg.edges) {
        if (e.kind === 'reads') edge('s' + e.to, 's' + e.from, 'reads');
        else if (e.kind === 'fires') edge('s' + e.to, 's' + e.from, 'fires');
        else if (e.kind === 'blocks') edge('s' + e.to, 's' + e.from, 'blocks');
      }
    }
    const S = cv(server);
    const fid = id => id.replace(/^stg:/, 'stag:').replace(/^str:/, 'strigger:').replace(/^cl:/, 'sclient:').replace(/^wtg:/, 'wtag:');
    for (const t of S.tag ?? []) { const n = nodes.get('stag:' + t.tagId); if (n) edge(n.id, dest(platformOf(S, t)).id, 'delivers', 'idle'); }
    // Endpoints: what the export sends to, and what the site actually sends to.
    for (const h of flow.meta.hosts) {
      const n = node('ep:' + h, { kind: 'endpoint', col: 3, ref: h, name: h, type: 'server endpoint (export)', side: 'edge' });
      if (liveSst.length && !liveSst.includes(h)) issue(n, 'drifted', `The export sends here; the live site sends to ${liveSst.join(', ')} instead.`);
    }
    for (const h of liveSst) {
      if (flow.meta.hosts.includes(h)) continue;
      const n = node('ep:' + h, { kind: 'endpoint', col: 3, ref: h, name: h, type: 'server endpoint (live)', side: 'edge', ghost: true, live: 'fired' });
      issue(n, 'drifted', `Not in the export. Every server request in the scan went here.`);
    }
    const counts = new Map();
    if (ev) for (const q of ev.requests.filter(q => liveSst.includes(q.host))) { const k = q.path === '/data' ? `data:${q.postEvent}` : `ga4:${q.q?.en ?? '?'}`; counts.set(k, (counts.get(k) ?? 0) + 1); }
    for (const r of flow.routes) {
      const wt = nodes.get(fid(r.webTag)); if (!wt) continue;
      const host = flow.nodes.find(n => n.id === r.endpoint)?.ref;
      const firedLive = wt.live === 'fired';
      const st = r.status === 'dead-end' ? 'dead' : r.status === 'delivered' ? (firedLive ? 'ok' : 'idle') : 'maybe';
      edge(wt.id, 'ep:' + host, 'sends', st);
      for (const h of liveSst) if (firedLive) edge(wt.id, 'ep:' + h, 'sends', r.status === 'dead-end' ? 'dead' : 'ok');
      const cl = r.client && nodes.get(fid(r.client));
      if (cl) { edge('ep:' + host, cl.id, 'routes', st); for (const h of liveSst) edge('ep:' + h, cl.id, 'routes', firedLive ? 'ok' : 'idle'); }
      for (const m of r.matched) if (cl) edge(cl.id, fid(m.id), 'matches', m.certainty === 'yes' ? st : 'maybe');
      if (r.status === 'dead-end') {
        const k = r.transport === 'data' ? `data:${r.event}` : `ga4:${r.event}`, hits = counts.get(k) ?? 0;
        issue(wt, 'broken', `Sends "${r.event}" to the server, but no server trigger matches it, so nothing is forwarded.${hits ? ` Confirmed live: ${hits} "${r.event}" request${hits > 1 ? 's' : ''} reached ${liveSst.join(', ')} during the scan.` : ''}`);
        if (cl) issue(cl, 'broken', `Claims "${r.event}" from ${wt.name}, but no server trigger matches it.`);
      }
      if (firedLive) for (const t of r.tags) { const sn = nodes.get(fid(t.id)); if (sn && t.certainty === 'yes') { sn.live = 'fired'; sn.evidence.includes('Reached by live traffic (inferred from the web request).') || sn.evidence.push('Reached by live traffic (inferred from the web request).'); } }
    }
    for (const f of flow.findings) {
      const n = nodes.get(fid(f.target)); if (!n) continue;
      if (/^No event from this web container reaches/.test(f.message) || /^No web tag in this container sends/.test(f.message) || /no active server tag uses/.test(f.message)) issue(n, 'orphaned', f.message);
      else if (/^Can fire \d+ times/.test(f.message)) issue(n, 'duplicate', f.message);
    }
    const byTransport = t => [...new Set(flow.routes.filter(r => (t === 'data' ? r.transport !== 'ga4' : r.transport === 'ga4') && r.client).map(r => fid(r.client)))];
    for (const [k, c] of counts) {
      const [kind, evn] = k.split(':');
      for (const id of byTransport(kind)) { const cl = nodes.get(id); if (cl) { cl.live = 'fired'; cl.evidence.push(`${c} "${evn}" request${c > 1 ? 's' : ''} seen during the scan.`); } }
    }
  }

  /* outside GTM */
  if (ev) {
    const gtmVendors = new Set([...vendorOf.values(), ...(drift?.added ?? []).map(a => a.vendor)]);
    for (const o of outsideGtm(ev, gtmVendors).filter(o => !o.alsoInGtm)) {
      const n = node('out:' + o.vendor, { kind: 'outside', col: 2, ref: o.hosts[0], name: `${o.vendor} (outside GTM)`, type: 'page code', side: 'web', live: 'fired' });
      issue(n, 'outside', `Loads from the page's own code, not from GTM: ${o.hosts.join(', ')}. Changes to the container do not affect it.`);
      edge(n.id, dest(o.vendor).id, 'delivers', 'ok');
    }
  }

  /* resolve each node's headline status */
  for (const n of nodes.values()) {
    n.issues.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
    n.status = n.issues[0]?.status ?? 'ok';
    if (n.status === 'ok' && !n.live && ev && n.kind === 'wtag') n.status = 'untested';
  }
  // Order rows within each lane: problems first, then by connections.
  const list = [...nodes.values()], rank = n => STATUS_ORDER.indexOf(n.status);
  for (let c = 0; c < COLS.length; c++) list.filter(n => n.col === c).sort((a, b) => rank(a) - rank(b) || (a.ghost ? 0 : 1) - (b.ghost ? 0 : 1) || a.name.localeCompare(b.name)).forEach((n, i) => (n.row = i));
  const counts = Object.fromEntries(STATUS_ORDER.map(s => [s, list.filter(n => n.status === s).length]));
  const any = Object.fromEntries(STATUS_ORDER.map(s => [s, list.filter(n => n.issues.some(i => i.status === s)).length]));
  return {
    meta: { name: `${W.container?.publicId ?? 'Web'}${server ? ' + ' + (cv(server).container?.publicId ?? 'Server') : ''}`, publicId: 'Audit', context: 'audit' },
    columns: COLS, nodes: list.sort((a, b) => a.col - b.col || a.row - b.row), edges,
    summary: { counts, any, total: list.length },
    drift: drift && { liveVersion: drift.liveVersion, exportedAt: drift.exportedAt, counts: drift.counts, added: drift.added.length, listeners: drift.listeners.map(l => l.label), paused: drift.paused.length, changed: drift.changed.length, triggers: drift.triggers.length, removed: drift.removed.length, endpoint: liveSst },
    scan: ev && { scannedAt: ev.scannedAt, pages: ev.pages, runs: ev.runs, events: [...ev.events].filter(e => !e.startsWith('(server)')) },
  };
}

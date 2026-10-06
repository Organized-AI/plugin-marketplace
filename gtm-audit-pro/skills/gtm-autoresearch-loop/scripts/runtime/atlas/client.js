// Container atlas client. Reads the embedded JSON, renders SVG diagrams with
// pan/zoom/drag, a minimap, path tracing, the Web -> server signal flow and an
// optional three.js 3D view. All data is set with textContent, never innerHTML.
(() => {
'use strict';
const D = JSON.parse(document.getElementById('atlas-data').textContent);
const $ = id => document.getElementById(id), NS = 'http://www.w3.org/2000/svg';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, G = window.gsap && !reduce ? window.gsap : null;
const K = {
  client: ['Clients', 'client', '--client', 0xffad58], tag: ['Tags', 'tag', '--tag', 0x65b7ff], trigger: ['Triggers', 'trigger', '--trigger', 0xbd8cff],
  variable: ['Variables', 'variable', '--variable', 0x58ded8], builtin: ['Built-ins', 'built-in', '--builtin', 0x8f8877],
  wtrigger: ['Web triggers', 'web trigger', '--trigger', 0xbd8cff], wtag: ['Web tags', 'web tag', '--tag', 0x65b7ff], endpoint: ['Endpoint', 'endpoint', '--ink', 0xf7f2df],
  event: ['Events', 'event', '--variable', 0x58ded8], strigger: ['Server triggers', 'server trigger', '--trigger', 0xbd8cff], stag: ['Server tags', 'server tag', '--tag', 0x65b7ff],
  dest: ['Destinations', 'destination', '--pass', 0x5ce1a4], sink: ['Dead end', 'dead end', '--crit', 0xff625f],
  svariable: ['Server variables', 'server variable', '--variable', 0x58ded8], outside: ['Outside GTM', 'page-code vendor', '--client', 0xffad58],
};
// Audit statuses, most urgent first: [label, css colour, 3D colour, what it means].
const ST = {
  broken: ['Broken', '--crit', 0xff625f, 'Cannot work as configured, or proven failing.'], 'not-firing': ['Not firing', '--amber', 0xffad58, 'Should have fired during the scan and did not.'],
  orphaned: ['Orphaned', '--muted', 0xa69f8b, 'Nothing uses it, or nothing reaches it.'], drifted: ['Drifted', '--drift', 0xff7ad9, 'Differs between the export and the published version.'],
  duplicate: ['Duplicated', '--gold', 0xffe94a, 'Same settings as another element, or fires more than once.'], untested: ['Untested', '--dim', 0x5d574a, 'The scan did not reach it, so its behaviour is unproven.'],
  paused: ['Paused', '--dim', 0x5d574a, 'Switched off.'], outside: ['Outside GTM', '--client', 0xffad58, 'Loaded by the page itself.'], ok: ['OK', '--pass', 0x5ce1a4, 'No issue found; verified live where a scan was available.'],
};
const PROBLEMS = ['broken', 'not-firing', 'orphaned', 'drifted', 'duplicate'];
const label = k => (K[k] || [k])[0], one = k => (K[k] || [, k])[1], cvar = k => `var(${(K[k] || [, , '--muted'])[2]})`, hex = k => (K[k] || [, , , 0xa69f8b])[3];
const DIM = { references: 'References', duplicates: 'Duplicates', naming: 'Naming', hygiene: 'Unused', legacy: 'Legacy', folders: 'Folders' };
const RISK = { critical: 'Fix first', review: 'Confirm', info: 'Note' };
const STATUS = { delivered: 'Delivered', conditional: 'Conditional', 'dead-end': 'Dead end', unknown: 'Unresolved' };
const TABS = [...D.containers.map(c => ({ type: 'container', model: c })), ...(D.flow ? [{ type: 'flow', model: D.flow }] : []),
  ...(D.audit ? [{ type: 'audit', model: D.audit }] : []), ...(D.auto && D.auto.length ? [{ type: 'auto', model: null }] : [])];
TABS.forEach((t, i) => (t.i = i));
if (D.audit) D.audit.lanes = [{ label: 'WEB', from: 0, to: 2 }, { label: 'SERVER', from: 4, to: 7 }];
if (D.flow) D.flow.lanes = [{ label: 'WEB', from: 0, to: 1 }, { label: 'SERVER', from: 3, to: 6 }];
const S = { tab: 0, view: 'structured', q: '', kind: 'all', risk: 'all', trace: 'near', sel: null, hover: null, route: null, T: { k: 1, x: 0, y: 0 }, pos: new Map(), pinned: new Set(), sort: null, deco: [] };
let M, byId, adj, nodeEls = new Map(), edgeEls = new Map(), particles = [];
const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); parent && parent.append(e); return e; };
const h = (tag, cls, text, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; parent && parent.append(e); return e; };
const short = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const tab = () => TABS[S.tab], isFlow = () => tab().type === 'flow', isAudit = () => tab().type === 'audit', isAuto = () => tab().type === 'auto', isLane = () => isFlow() || isAudit();
const views = () => (isFlow() ? [['flow', 'Signal flow'], ['schedule', 'Schedule'], ['3d', '3D']] : isAudit() ? [['audit', 'Audit map'], ['schedule', 'Issue table'], ['3d', '3D']]
  : isAuto() ? [['auto', 'Folder map'], ['schedule', 'Changes']] : [['structured', 'Structured'], ['spatial', 'Free-form'], ['axonometric', 'Axonometric'], ['schedule', 'Schedule'], ['3d', '3D']]);
const homeView = () => views()[0][0];
const stColor = s => `var(${(ST[s] || ST.ok)[1]})`;
const ekey = e => `${e.from}>${e.to}>${e.kind}`;

/* ---------- tabs, header, side panel ---------- */
function tabs() {
  const t = $('tabs');
  if (TABS.length < 2) return;
  TABS.forEach(x => {
    const name = { flow: 'Web → Server flow', audit: 'Audit', auto: 'GTM auto' }[x.type] || x.model.meta.publicId || x.model.meta.name;
    const b = h('button', x.type === 'container' ? '' : 'flowtab tab-' + x.type, name, t);
    b.setAttribute('role', 'tab'); b.title = x.type === 'auto' ? 'GTM Autoresearch: metadata-only improvement loop' : x.model.meta.name;
    b.onclick = () => { stopLoop(); S.tab = x.i; S.sel = S.route = S.hover = null; S.view = null; S.risk = 'all'; S.pinned.clear(); load(); };
  });
}
function load() {
  if (isAuto()) { autoInit(); M = AU.model; } else M = tab().model;
  if (isAudit()) M.nodes.forEach(n => { n.risk = ['broken', 'not-firing'].includes(n.status) ? 'critical' : PROBLEMS.includes(n.status) ? 'review' : null; n.findings = n.findings || []; });
  byId = new Map(M.nodes.map(n => [n.id, n]));
  if (S.hover && !byId.has(S.hover)) S.hover = null;
  adj = new Map(M.nodes.map(n => [n.id, { out: [], in: [] }]));
  M.edges.forEach(e => { const a = adj.get(e.from), b = adj.get(e.to); if (!a || !b) return; a.out.push(e); b.in.push(e); });
  [...$('tabs').children].forEach((b, i) => b.setAttribute('aria-selected', String(i === S.tab)));
  header();
  const rk = $('risk'); rk.textContent = '';
  const opts = isAudit() ? [['all', 'Any status'], ['problems', 'Any problem'], ...Object.keys(ST).map(k => [k, ST[k][0]])] : isAuto() ? [['all', 'Any']] : [['all', 'Any'], ['critical', 'Fix first'], ['review', 'Confirm'], ['info', 'Note'], ['none', 'No finding']];
  opts.forEach(([v, t]) => { const o = h('option', '', t, rk); o.value = v; }); rk.value = S.risk = opts.some(o => o[0] === S.risk) ? S.risk : 'all';
  rk.parentNode.firstChild.textContent = isAudit() ? 'Status ' : 'Finding ';
  const k = $('kind'); k.length = 1; [...new Set(M.nodes.map(n => n.kind))].forEach(x => { const o = h('option', '', label(x), k); o.value = x; }); S.kind = 'all'; k.value = 'all';
  const mode = $('mode'); mode.textContent = '';
  views().forEach(([v, name]) => { const b = h('button', '', name, mode); b.dataset.view = v; b.onclick = () => setView(v); });
  side(); build(); rows(); setView(S.view || homeView(), true);
}
function header() {
  const AD = isAudit() && M, s = AD && M.summary.counts;
  $('title').textContent = isFlow() ? 'Web → server signal flow' : isAudit() ? 'Container audit · what is broken, not firing, orphaned or drifted' : isAuto() ? 'GTM auto · Autoresearch loop' : M.meta.name;
  $('meta').textContent = isFlow()
    ? `${M.meta.name} · via ${M.meta.hosts.join(', ') || 'no endpoint found'} · ${M.meta.paired ? 'server container serves this web container' : 'pairing assumed'}`
    : isAudit() ? [M.meta.name, M.drift ? `export ${String(M.drift.exportedAt || '').slice(0, 10)} vs published v${M.drift.liveVersion}` : 'no published version supplied', M.scan ? `scan ${String(M.scan.scannedAt || '').slice(0, 10)} · ${M.scan.runs.length} runs` : 'no live scan'].join(' · ')
    : isAuto() ? `${AU.data.publicId || 'container'} · metadata-only proposals · scored by the same audit as the plugin · nothing is published`
    : [M.meta.publicId, M.meta.context && M.meta.context + ' container', M.nodes.length + ' elements'].filter(Boolean).join(' · ');
  $('score').textContent = isFlow() ? `${M.summary.delivered}/${M.summary.routes}` : isAudit() ? s.broken + s['not-firing'] : isAuto() ? AU.st.report.score : M.score;
  $('score').style.color = isAudit() ? 'var(--crit)' : '';
  $('scoreLabel').textContent = isFlow() ? 'routes delivered' : isAudit() ? 'broken or not firing' : isAuto() ? `autoresearch score · baseline ${AU.st.baseline.score}` : 'configuration score';
  const st = isFlow() ? [['Routes', M.summary.routes], ['Delivered', M.summary.delivered], ['Dead ends', M.summary.dead]]
    : isAudit() ? [['Elements', M.summary.total], ['Problems', PROBLEMS.reduce((a, k) => a + s[k], 0)], ['Verified live', M.nodes.filter(n => n.live === 'fired').length]]
    : isAuto() ? [['Rounds', AU.st.rounds.length], ['Accepted', AU.st.rounds.filter(r => r.accepted).length], ['Operations', AU.st.rounds.filter(r => r.accepted).reduce((a, r) => a + r.operations.length, 0)]]
    : [['Elements', M.nodes.length], ['Links', M.edges.length], ['To act on', M.nodes.filter(n => n.risk === 'critical' || n.risk === 'review').length]];
  const stats = $('stats'); stats.textContent = '';
  st.forEach(([a, b]) => { const d = h('div', 'stat', '', stats); h('span', '', a, d); h('strong', '', b, d); });
}
function side() {
  const box = $('panels'); box.textContent = '';
  const block = title => { const s = h('section', 'block', '', box); h('h2', '', title, s); return s; };
  if (isAudit()) return auditSide(block, box);
  if (isAuto()) return autoSide(block, box);
  if (isFlow()) {
    const r = block('Routes'); routeList(r);
    const f = block('Flow findings');
    if (!M.findings.length) h('p', 'empty', 'Every web event that reaches the server is matched by a trigger and forwarded.', f);
    [...M.findings].sort((a, b) => (a.severity === 'review' ? 0 : 1) - (b.severity === 'review' ? 0 : 1)).forEach(x => {
      const b = h('button', 'rec ' + x.severity, byId.get(x.target).name, f); h('small', '', x.message, b);
      b.onclick = () => { S.route = null; select(x.target, true); };
    });
    const n = block('How this is worked out');
    h('p', 'note', 'Read from the two container exports, not from live traffic. Each web tag that sends to the server is matched to the client that would claim it, its event name is tested against every server trigger condition, and the server tags those triggers fire are followed to their destination. Conditions that depend on request data the export cannot show are marked conditional.', n);
  } else {
    const d = block('Checks'), dims = h('div', 'dims', '', d);
    M.dims.forEach(x => { const r = h('div', 'dim', '', dims); h('span', '', DIM[x.key] || x.key, r); const bar = h('span', 'bar', '', r), b = h('b', '', '', bar); b.style.width = x.score + '%'; b.style.background = x.score >= 90 ? 'var(--pass)' : x.score >= 60 ? 'var(--gold)' : 'var(--crit)'; h('span', 'v', x.score, r); });
    recs(block('Priority recommendations'));
    const sk = block('Not checked by this run'), ul = h('ul', 'skipped', '', sk); M.skipped.forEach(s => h('li', '', s, ul));
  }
  h('p', 'foot', `gtm-audit-pro · report-only, nothing was changed or published · ${(D.generatedAt || '').slice(0, 10)}`, box);
}
function setRisk(v) { S.risk = v; $('risk').value = v; apply(); if (S.view !== 'schedule' && S.view !== '3d') fit(S.view === 'audit' && v === 'all' ? 'width' : 'all', true); }
function auditSide(block, box) {
  const c = M.summary.counts, chips = h('div', 'stchips', '', block('Status'));
  Object.keys(ST).forEach(k => {
    const b = h('button', 'stchip', '', chips); b.dataset.st = k; b.title = ST[k][3];
    const i = h('i', '', '', b); i.style.background = stColor(k); b.append(`${ST[k][0]} `); h('b', '', c[k], b);
    b.onclick = () => setRisk(S.risk === k ? 'all' : k);
  });
  if (M.drift) {
    const d = M.drift, b = block('Previous version → live'), ul = h('ul', 'skipped', '', b);
    h('p', 'note', `Export of ${String(d.exportedAt || '').slice(0, 10)} (${d.counts.export} tags) compared with published version ${d.liveVersion} (${d.counts.liveTags} tags + ${d.listeners.length} auto-event listeners).`, b).style.marginBottom = '6px';
    [[d.added, 'tags added since the export'], [d.paused, 'tags paused since the export'], [d.changed, 'tags with different settings'], [d.triggers, 'tags whose firing changed'], [d.removed, 'tags removed']].forEach(([n, t]) => n && h('li', '', `${n} ${t}`, ul));
    if (d.endpoint.length) h('li', '', `Server endpoint now ${d.endpoint.join(', ')}`, ul);
  }
  if (M.scan) {
    const sc = block('Live scan'), modes = [...new Set(M.scan.runs.map(r => r.consent))];
    h('p', 'note', `${M.scan.runs.length} browser runs over ${M.scan.pages.length} pages (${M.scan.pages.map(u => u.replace(/^https?:\/\/[^/]+/, '') || '/').join(', ')}), consent: ${modes.join(', ')}. Events seen: ${M.scan.events.join(', ')}. The scan did not buy, sign up or submit forms, so conversion tags stay untested.`, sc);
  }
  const fix = block('What needs attention');
  ['broken', 'not-firing', 'orphaned', 'drifted', 'duplicate', 'outside'].forEach(k => {
    const ns = M.nodes.filter(n => n.issues.some(i => i.status === k)); if (!ns.length) return;
    const g = h('button', 'recgroup grouphead', `${ST[k][0].toUpperCase()} · ${ns.length}`, fix); g.onclick = () => setRisk(k); g.title = 'Show only these in the diagram';
    ns.slice(0, k === 'drifted' || k === 'orphaned' ? 12 : 30).forEach(n => {
      const i = n.issues.find(x => x.status === k), b = h('button', 'rec st-' + k, n.name, fix); b.style.borderLeftColor = stColor(k);
      h('small', '', `${one(n.kind)} · ${i.message}`, b); b.onclick = () => select(n.id, true);
    });
    if (ns.length > (k === 'drifted' || k === 'orphaned' ? 12 : 30)) { const m = h('button', 'link more', `Show all ${ns.length} in the diagram`, fix); m.onclick = () => setRisk(k); }
  });
  const n = block('How this is worked out');
  h('p', 'note', 'Static audit of both exports, the web → server signal flow, the published container (gtm.js) compared tag by tag with the export, and a headless browser scan of the live site matched to each tag by its network fingerprint. "Verified live" means a request from that tag was seen. Server tags are marked reached when the web request that feeds them was seen; the server side itself cannot be observed from outside.', n);
  h('p', 'foot', `gtm-audit-pro · report-only, nothing was changed or published · ${(D.generatedAt || '').slice(0, 10)}`, box);
}
function recs(d) {
  const done = new Set(), items = [];
  M.nodes.forEach(n => n.findings.forEach(f => { if (f.severity === 'info') return; const key = f.pair ? [n.id, f.pair].sort().join('|') : n.id + f.message; if (!done.has(key)) { done.add(key); items.push({ n, f }); } }));
  items.sort((a, b) => (a.f.severity === 'critical' ? 0 : 1) - (b.f.severity === 'critical' ? 0 : 1));
  if (!items.length) { h('p', 'empty', 'No fix-first or confirm findings in this container. Housekeeping items are in the Schedule view.', d); return; }
  let group = '';
  items.forEach(({ n, f }) => {
    const g = f.severity === 'critical' ? 'FIX FIRST' : f.pair ? 'CONFIRM · IDENTICAL CONFIGURATION' : 'CONFIRM · ' + (DIM[f.dimension] || f.dimension || '').toUpperCase();
    if (g !== group) { group = g; h('div', 'recgroup', g, d); }
    const p = f.pair && byId.get(f.pair), b = h('button', 'rec ' + f.severity, p ? `${n.name} ↔ ${p.name}` : n.name, d);
    h('small', '', p ? `Same settings as ${one(p.kind)} ${p.ref}. Merge them or confirm both are needed.` : f.message, b);
    b.onclick = () => select(n.id, true);
  });
}
function routeList(d) {
  const order = ['dead-end', 'conditional', 'unknown', 'delivered'];
  order.forEach(st => {
    const rs = M.routes.filter(r => r.status === st); if (!rs.length) return;
    h('div', 'recgroup', `${STATUS[st].toUpperCase()} · ${rs.length}`, d);
    rs.forEach(r => {
      const b = h('button', 'rec ' + st, byId.get(r.webTag).name, d); b.dataset.route = r.id;
      h('span', 'path', [r.event ?? 'dynamic event', r.client ? byId.get(r.client).name : 'no client', r.tags.length ? r.tags.map(t => byId.get(t.id).name).join(', ') : 'nothing fires'].join(' → '), b);
      if (r.reason) h('small', '', r.reason, b);
      b.onclick = () => selectRoute(r.id);
    });
  });
}

/* ---------- scene ---------- */
function build() {
  const eg = $('edges'), ng = $('nodes'); eg.textContent = ''; ng.textContent = ''; nodeEls = new Map(); edgeEls = new Map(); particles = [];
  M.edges.forEach(e => edgeEls.set(ekey(e), { e, p: el('path', { class: `edge e-${e.kind}${e.status ? ' s-' + e.status : ''}` }, eg) }));
  M.nodes.forEach(n => {
    const g = el('g', { class: `node k-${n.kind} r-${n.risk || 'none'}${n.status ? ' st-' + n.status : ''}${n.ghost ? ' ghost' : ''}${n.live === 'fired' ? ' fired' : ''}`, tabindex: 0, role: 'button', 'aria-label': `${one(n.kind)} ${n.name}${n.status ? ', ' + ST[n.status][0] : n.risk ? ', ' + RISK[n.risk] : ''}` }, ng);
    g.dataset.id = n.id;
    el('circle', { class: 'ring', r: 8.5 }, g);
    const dot = el('circle', { class: 'dot', r: n.kind === 'tag' || n.kind === 'stag' || n.kind === 'wtag' ? 5 : 4.5, fill: cvar(n.kind) }, g);
    if (n.live === 'fired') el('circle', { class: 'tick', r: 1.6, cx: -9, cy: 0 }, g);
    const t = el('text', { x: 10, y: 3.5 }, g); t.textContent = n.name;
    g.addEventListener('mouseenter', () => { S.hover = n.id; apply(); });
    g.addEventListener('mouseleave', () => { S.hover = null; apply(); });
    g.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); select(n.id, false); } });
    g.addEventListener('focus', () => { S.hover = n.id; apply(); }); g.addEventListener('blur', () => { S.hover = null; apply(); });
    nodeEls.set(n.id, { g, t, dot });
  });
}
const fam = k => M.nodes.filter(n => n.kind === k);
function layout(view) {
  const pos = new Map(), deco = []; let caption = '', W = 1400, H = 800;
  const kinds = ['client', 'tag', 'trigger', 'variable'].filter(k => fam(k).length || (k === 'variable' && fam('builtin').length));
  const col = k => (k === 'variable' ? [...fam('variable'), ...fam('builtin')] : fam(k));
  const labelLen = n => Math.max(10, Math.floor(n / 6.6));
  if (view === 'flow' || view === 'audit' || view === 'auto') {
    const auto = view === 'auto', cw = auto ? 220 : 250, row = view === 'flow' ? 30 : auto ? 19 : 24, top = 70, cols = M.columns;
    caption = view === 'flow' ? 'SIGNAL FLOW · WEB CONTAINER → ENDPOINT → SERVER CONTAINER → PLATFORMS' : auto ? 'FOLDER MAP · ONE COLUMN PER FOLDER · ELEMENTS MOVE AS ROUNDS ARE ACCEPTED' : 'AUDIT · EVERY ELEMENT, HOW IT CONNECTS, AND ITS STATUS · PROBLEMS AT THE TOP OF EACH LANE';
    (M.lanes || []).forEach(l => { deco.push(['rect', { class: 'lane', x: l.from * cw, y: 0, width: (l.to - l.from + 1) * cw, height: 99999 }], ['text', { class: 'side', x: l.from * cw + 14, y: 22 }, l.label]); });
    if (auto) {
      // Folder map: folders are packed onto shelves; a big folder wraps into sub-columns.
      const per = Math.max(24, Math.ceil(Math.sqrt(M.nodes.length) * 2.2)), shelf = 8;
      let x0 = 0, y0 = 0, shelfH = 0, wMax = 1;
      cols.forEach((c, i) => {
        const list = M.nodes.filter(n => n.col === i), span = Math.max(1, Math.ceil(list.length / per)), rowsN = Math.min(list.length, per);
        if (x0 && x0 + span > shelf) { y0 += shelfH + 50; x0 = 0; shelfH = 0; }
        const hgt = 40 + rowsN * row + 14;
        deco.push(['rect', { class: 'lane' + (AU.fresh.has(c) ? ' fresh' : c === 'No folder' ? ' nofolder' : ''), x: x0 * cw + 4, y: y0 + 30, width: span * cw - 8, height: hgt }]);
        deco.push(['text', { class: 'lanehead', x: x0 * cw + 14, y: y0 + 50 }, `${short(c.toUpperCase(), 24 * span)}  ${list.length}`]);
        list.forEach((n, r) => { pos.set(n.id, { x: (x0 + Math.floor(r / per)) * cw + 20, y: y0 + top + 4 + (r % per) * row }); nodeEls.get(n.id).t.textContent = short(n.name, 28); });
        shelfH = Math.max(shelfH, hgt); x0 += span; wMax = Math.max(wMax, x0);
      });
      W = wMax * cw; H = y0 + shelfH + 60;
    } else {
      cols.forEach((c, i) => {
        const list = M.nodes.filter(n => n.col === i);
        deco.push(['text', { class: 'lanehead', x: i * cw + 14, y: 46 }, `${c.toUpperCase()}  ${list.length}`]);
        list.forEach((n, r) => { pos.set(n.id, { x: i * cw + 20, y: top + r * row }); nodeEls.get(n.id).t.textContent = short(n.name, 33); });
      });
      W = cols.length * cw; H = top + Math.max(1, ...cols.map((_, i) => M.nodes.filter(n => n.col === i).length)) * row + 40;
    }
  } else if (view === 'structured' || view === 'schedule' || view === '3d') {
    const cw = W / kinds.length, row = 21, top = 46;
    caption = 'STRUCTURED · ' + kinds.map(k => label(k).toUpperCase()).join(' → ');
    kinds.forEach((k, ci) => {
      const x = ci * cw + 14;
      deco.push(['text', { x, y: 22 }, `${label(k).toUpperCase()}  ${col(k).length}`]);
      if (ci) deco.push(['line', { class: 'colrule', x1: x - 8, y1: 8, x2: x - 8, y2: 99999 }]);
      col(k).forEach((n, i) => { pos.set(n.id, { x: x + 6, y: top + i * row }); nodeEls.get(n.id).t.textContent = short(n.name, labelLen(cw - 34)); });
    });
    H = top + Math.max(...kinds.map(k => col(k).length)) * row + 30;
  } else if (view === 'spatial') {
    const size = 1100, cx = W / 2, cy = size / 2 + 20, rings = { tag: 0.45, client: 0.45, trigger: 0.31, variable: 0.17 };
    caption = 'FREE-FORM · CONCENTRIC: VARIABLES AT THE CORE, TAGS ON THE RIM';
    kinds.forEach(k => {
      const R = rings[k] * size, list = col(k);
      deco.push(['circle', { class: 'ringline', cx, cy, r: R }], ['text', { x: cx + 6, y: cy - R - 6 }, label(k).toUpperCase()]);
      list.forEach((n, i) => { const a = (i / list.length) * Math.PI * 2 - Math.PI / 2 + (k === 'trigger' ? 0.05 : k === 'variable' ? 0.1 : 0); pos.set(n.id, { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R }); });
    });
    M.nodes.forEach(n => (nodeEls.get(n.id).t.textContent = n.name)); H = size + 40;
  } else {
    const planes = ['tag', 'trigger', 'variable'].filter(k => kinds.includes(k)); if (kinds.includes('client')) planes.unshift('client');
    const cell = 24, sx = cell * 0.866, sy = cell * 0.5, gap = 70; let y = 40;
    caption = 'AXONOMETRIC · EXPLODED SECTION: ' + planes.map(k => label(k).toUpperCase()).join(' / ');
    planes.forEach(k => {
      const list = col(k), cols = Math.max(3, Math.ceil(Math.sqrt(list.length * 1.7))), rowsN = Math.max(2, Math.ceil(list.length / cols)), ox = W / 2 - ((cols - rowsN) * sx) / 2, P = (c, r) => [ox + (c - r) * sx, y + (c + r) * sy];
      deco.push(['polygon', { class: 'plane', points: [P(-0.5, -0.5), P(cols - 0.5, -0.5), P(cols - 0.5, rowsN - 0.5), P(-0.5, rowsN - 0.5)].map(p => p.join(',')).join(' ') }]);
      const lp = P(cols - 0.5, -0.5); deco.push(['text', { x: lp[0] + 12, y: lp[1] + 4 }, `${label(k).toUpperCase()}  ${list.length}`]);
      list.forEach((n, i) => { const [px, py] = P(i % cols, Math.floor(i / cols)); pos.set(n.id, { x: px, y: py }); });
      y += (cols + rowsN) * sy + gap;
    });
    M.nodes.forEach(n => (nodeEls.get(n.id).t.textContent = n.name)); H = y;
  }
  for (const id of S.pinned) if (S.pos.has(id)) pos.set(id, S.pos.get(id));
  return { pos, deco, caption, W, H };
}
function drawDeco(L) {
  const g = $('deco'); g.textContent = ''; g.setAttribute('class', 'deco');
  L.deco.forEach(([t, a, txt]) => { const e = el(t, a, g); if (txt) e.textContent = txt; if (t === 'line') e.setAttribute('y2', L.H); if (t === 'rect' && a.height === 99999) e.setAttribute('height', L.H); });
}
function edgePath(e, P) {
  const a = P.get(e.from), b = P.get(e.to);
  if (S.view === 'spatial') { const cx = 700, cy = 570, mx = ((a.x + b.x) / 2) * 0.55 + cx * 0.45, my = ((a.y + b.y) / 2) * 0.55 + cy * 0.45; return `M${a.x},${a.y}Q${mx},${my} ${b.x},${b.y}`; }
  if (S.view === 'axonometric') return `M${a.x},${a.y}L${b.x},${b.y}`;
  if (Math.abs(a.x - b.x) < 2) { const bend = Math.min(60, 20 + Math.abs(a.y - b.y) * 0.2); return `M${a.x},${a.y}C${a.x - bend},${a.y} ${b.x - bend},${b.y} ${b.x},${b.y}`; }
  const dx = (b.x - a.x) / 2; return `M${a.x},${a.y}C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`;
}
function place(from, to, t) {
  const at = id => { const b = to.get(id); if (!from || !from.get(id)) return b; const a = from.get(id); return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; };
  const P = new Map(); M.nodes.forEach(n => { const p = at(n.id); P.set(n.id, p); nodeEls.get(n.id).g.setAttribute('transform', `translate(${p.x.toFixed(1)},${p.y.toFixed(1)})`); });
  edgeEls.forEach(({ e, p }) => p.setAttribute('d', edgePath(e, P)));
  mini();
}
let morph;
function setView(v, first) {
  if (!views().some(([x]) => x === v)) v = views()[0][0];
  const prev = S.view; S.view = v;
  document.querySelectorAll('#mode button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
  const sch = v === 'schedule', three = v === '3d';
  $('schedule').hidden = !sch; $('three').hidden = !three; $('svg').style.display = sch || three ? 'none' : '';
  $('mini').hidden = sch || three; $('zoombar').hidden = sch; $('legend').hidden = sch; $('caption').hidden = sch;
  try { history.replaceState(null, '', '#' + v); } catch (e) { /* sandboxed */ }
  legend();
  if (three) { stopParticles(); return enter3d(); }
  leave3d();
  if (sch) return apply();
  const L = layout(v); drawDeco(L); $('svg').setAttribute('class', 'v-' + v); $('caption').textContent = L.caption;
  const from = new Map(S.pos); S.pos = L.pos; S.bounds = { W: L.W, H: L.H };
  if (!first && G && from.size && prev !== v && prev !== 'schedule' && prev !== '3d') {
    morph && morph.progress(1); const o = { t: 0 };
    morph = G.to(o, { t: 1, duration: 0.8, ease: 'power2.inOut', onUpdate: () => place(from, L.pos, o.t) });
    setTimeout(() => morph.progress(1), 1200);
  } else place(null, L.pos, 1);
  fit(v === 'spatial' || v === 'axonometric' || v === 'flow' || v === 'auto' ? 'all' : 'width', !first);
  apply(); if (first) intro();
  if (S.route) selectRoute(S.route, true);
}

/* ---------- pan, zoom, drag ---------- */
const svgBox = () => $('svg').getBoundingClientRect();
function applyT() { const { k, x, y } = S.T; $('vp').setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${k.toFixed(4)})`); $('zoomLevel').textContent = Math.round(k * 100) + '%'; mini(); }
function tweenT(to, animate) { if (G && animate) G.to(S.T, { ...to, duration: 0.6, ease: 'power2.inOut', onUpdate: applyT, overwrite: true }); else { Object.assign(S.T, to); applyT(); } }
function bbox(visible) { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; S.pos.forEach((p, id) => { if (visible && !visible.has(id)) return; x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }); return { x0: x0 - 30, y0: Math.min(0, y0 - 60), x1: x1 + 260, y1: y1 + 30 }; }
function fit(mode, animate) {
  const r = svgBox(); if (!r.width) return;
  // With a filter on, fit what is still shown.
  const filtered = S.q || S.kind !== 'all' || S.risk !== 'all', vis = filtered ? new Set(M.nodes.filter(match).map(n => n.id)) : null;
  const b = bbox(vis && vis.size ? vis : null), bw = b.x1 - b.x0, bh = b.y1 - b.y0;
  let k = mode === 'all' ? Math.min((r.width - 40) / bw, (r.height - 60) / bh) : Math.min((r.width - 20) / bw, 1.25);
  k = Math.max(0.12, Math.min(2.5, k));
  const x = mode === 'all' ? (r.width - bw * k) / 2 - b.x0 * k : Math.max(10, (r.width - bw * k) / 2) - b.x0 * k;
  const y = mode === 'all' ? (r.height - bh * k) / 2 - b.y0 * k : 30 - b.y0 * k;
  tweenT({ k, x, y }, animate);
}
function zoomAt(px, py, f) { const { k, x, y } = S.T, nk = Math.max(0.1, Math.min(4, k * f)), wx = (px - x) / k, wy = (py - y) / k; tweenT({ k: nk, x: px - wx * nk, y: py - wy * nk }, false); }
function zoomBy(f) { const r = svgBox(); zoomAt(r.width / 2, r.height / 2, f); }
function toWorld(cx, cy) { const r = svgBox(); return { x: (cx - r.left - S.T.x) / S.T.k, y: (cy - r.top - S.T.y) / S.T.k }; }
function centerOn(p, animate) { const r = svgBox(); tweenT({ k: Math.max(S.T.k, 0.9), x: r.width / 2 - p.x * Math.max(S.T.k, 0.9), y: r.height / 2 - p.y * Math.max(S.T.k, 0.9) }, animate); }
(() => {
  const svg = $('svg'), pts = new Map(); let drag = null, pinch = null;
  svg.addEventListener('pointerdown', e => {
    svg.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) }; drag = null; return; }
    const g = e.target.closest('.node');
    drag = { id: g ? g.dataset.id : null, x: e.clientX, y: e.clientY, moved: false };
  });
  svg.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return; const last = pts.get(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y), r = svgBox(); zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, d / pinch.d); pinch.d = d; return; }
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 4) return;
    drag.moved = true;
    if (drag.id) { const w = toWorld(e.clientX, e.clientY); S.pos.set(drag.id, w); S.pinned.add(drag.id); nodeEls.get(drag.id).g.classList.add('pinned', 'dragging'); place(null, S.pos, 1); }
    else { svg.classList.add('panning'); S.T.x += e.clientX - last.x; S.T.y += e.clientY - last.y; applyT(); }
  });
  const end = e => {
    pts.delete(e.pointerId); if (pts.size < 2) pinch = null; svg.classList.remove('panning');
    if (drag && !drag.moved) { if (drag.id) select(drag.id, false); else if (e.type === 'pointerup') { S.route = null; select(null); } }
    if (drag && drag.id) nodeEls.get(drag.id)?.g.classList.remove('dragging');
    drag = null;
  };
  svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  svg.addEventListener('wheel', e => {
    e.preventDefault(); const r = svgBox();
    if (e.ctrlKey || e.metaKey) zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.01));
    else { S.T.x -= e.deltaX; S.T.y -= e.deltaY; applyT(); }
  }, { passive: false });
  $('diagram').addEventListener('keydown', e => {
    if (e.target.matches('input,select')) return;
    const step = 60, map = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (e.key === '+' || e.key === '=') zoomBy(1.25); else if (e.key === '-' || e.key === '_') zoomBy(0.8); else if (e.key === '0') fit('all', true);
    else if (map[e.key] && e.target === $('diagram')) { S.T.x += map[e.key][0]; S.T.y += map[e.key][1]; applyT(); } else return;
    e.preventDefault();
  });
})();

/* ---------- minimap ---------- */
let miniQueued = false;
function mini() {
  if (miniQueued) return; miniQueued = true;
  requestAnimationFrame(() => {
    miniQueued = false; const c = $('miniCanvas'), box = $('mini'); if (box.hidden || !S.pos.size) return;
    const dpr = Math.min(2, devicePixelRatio || 1), w = box.clientWidth, hgt = box.clientHeight; c.width = w * dpr; c.height = hgt * dpr;
    const x = c.getContext('2d'); x.scale(dpr, dpr); x.clearRect(0, 0, w, hgt);
    const b = bbox(), s = Math.min((w - 12) / (b.x1 - b.x0), (hgt - 12) / (b.y1 - b.y0)), ox = (w - (b.x1 - b.x0) * s) / 2, oy = (hgt - (b.y1 - b.y0) * s) / 2;
    S.miniMap = { b, s, ox, oy };
    const css = getComputedStyle(document.documentElement);
    M.nodes.forEach(n => { const p = S.pos.get(n.id); if (!p) return; x.fillStyle = (n.risk === 'review' || n.risk === 'critical' ? css.getPropertyValue(n.risk === 'critical' ? '--crit' : '--gold') : css.getPropertyValue((K[n.kind] || [, , '--muted'])[2])).trim(); x.globalAlpha = 0.85; x.fillRect(ox + (p.x - b.x0) * s - 1, oy + (p.y - b.y0) * s - 1, 2.2, 2.2); });
    const r = svgBox(), vx = (-S.T.x / S.T.k - b.x0) * s + ox, vy = (-S.T.y / S.T.k - b.y0) * s + oy;
    x.globalAlpha = 1; x.strokeStyle = css.getPropertyValue('--gold').trim(); x.lineWidth = 1; x.strokeRect(vx, vy, (r.width / S.T.k) * s, (r.height / S.T.k) * s);
  });
}
(() => {
  const box = $('mini'); let down = false;
  const go = e => { const m = S.miniMap; if (!m) return; const r = box.getBoundingClientRect(); centerOn({ x: (e.clientX - r.left - m.ox) / m.s + m.b.x0, y: (e.clientY - r.top - m.oy) / m.s + m.b.y0 }, false); };
  box.addEventListener('pointerdown', e => { down = true; box.setPointerCapture(e.pointerId); go(e); });
  box.addEventListener('pointermove', e => down && go(e));
  box.addEventListener('pointerup', () => (down = false));
})();

/* ---------- filtering, tracing, selection ---------- */
function match(n) {
  if (S.kind !== 'all' && n.kind !== S.kind && !(S.kind === 'variable' && n.kind === 'builtin')) return false;
  if (isAudit()) { if (S.risk === 'problems' ? !PROBLEMS.includes(n.status) : S.risk !== 'all' && n.status !== S.risk && !n.issues.some(i => i.status === S.risk)) return false; }
  else if (S.risk === 'none' ? n.risk : S.risk !== 'all' && n.risk !== S.risk) return false;
  if (S.q) return [n.name, n.ref, n.type, n.folder || '', n.vendor || ''].some(v => String(v).toLowerCase().includes(S.q));
  return true;
}
function reach(id) {
  const set = new Set([id]);
  if (!adj.has(id)) return set;
  if (S.trace === 'near') { adj.get(id).out.forEach(e => set.add(e.to)); adj.get(id).in.forEach(e => set.add(e.from)); return set; }
  for (const dir of ['out', 'in']) {
    const stack = [id], seen = new Set([id]);
    while (stack.length) { const cur = stack.pop(); for (const e of (adj.get(cur) || { out: [], in: [] })[dir]) { if (e.kind === 'duplicate') continue; const nx = dir === 'out' ? e.to : e.from; if (!seen.has(nx)) { seen.add(nx); set.add(nx); stack.push(nx); } } }
  }
  return set;
}
function routeSet(r) {
  const ids = new Set([...r.webTriggers, r.webTag, r.endpoint, r.client, r.eventNode, ...r.tags.map(t => t.id), ...r.tags.map(t => 'ds:' + t.destination)].filter(Boolean));
  const fired = new Set(r.tags.map(t => t.id));
  r.matched.forEach(m => { if ((adj.get(m.id) || { out: [] }).out.some(e => fired.has(e.to)) || !r.tags.length) ids.add(m.id); });
  if (r.status === 'dead-end') ids.add('sink');
  return ids;
}
function focusSet() {
  if (S.hover && S.hover !== S.sel) return reach(S.hover);
  if (S.route) return routeSet(M.routes.find(r => r.id === S.route));
  return S.sel ? reach(S.sel) : null;
}
function apply() {
  const f = focusSet(), ok = new Set(M.nodes.filter(match).map(n => n.id));
  M.nodes.forEach(n => {
    const { g } = nodeEls.get(n.id), inF = !!f && f.has(n.id);
    g.classList.toggle('off', !ok.has(n.id)); g.classList.toggle('fade', !!f && !inF);
    g.classList.toggle('hot', inF && n.id !== S.sel); g.classList.toggle('sel', n.id === S.sel); g.classList.toggle('lab', inF);
    g.classList.toggle('pinned', S.pinned.has(n.id));
  });
  edgeEls.forEach(({ e, p }) => { const hot = !!f && f.has(e.from) && f.has(e.to); p.classList.toggle('hot', hot); p.classList.toggle('fade', (!!f && !hot) || !ok.has(e.from) || !ok.has(e.to)); });
  [...$('rows').children].forEach(tr => { tr.hidden = !ok.has(tr.dataset.id); tr.classList.toggle('sel', tr.dataset.id === S.sel); });
  document.querySelectorAll('.rec[data-route]').forEach(b => b.classList.toggle('on', b.dataset.route === S.route));
  document.querySelectorAll('.stchip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.st === S.risk)));
  const top = S.hover || S.sel; if (top && nodeEls.has(top)) { const g = nodeEls.get(top).g; g.parentNode.append(g); }
  if (S.view === '3d') apply3d(f, ok);
}
function names(list, parent) {
  if (!list.length) { parent.append(document.createTextNode('—')); return; }
  list.slice(0, 24).forEach(id => { const n = byId.get(id), b = h('button', 'link', short(n.name, 40), parent); b.title = `${one(n.kind)} ${n.ref}`; b.onclick = () => select(id, true); });
  if (list.length > 24) parent.append(document.createTextNode(` +${list.length - 24} more`));
}
function select(id, focusView) {
  S.sel = id && byId.has(id) ? id : null;
  const box = $('selected'); box.textContent = '';
  if (!S.sel) { if (isAuto() && AU.pick != null) return roundCard(box); h('p', 'empty', isFlow() ? 'Select a route on the right or any element to follow a signal from the web container to the platform it reaches.' : isAudit() ? 'Select any element to see its status, the evidence behind it and everything it connects to. Status chips on the right filter the map.' : isAuto() ? 'Run the loop, or step one round at a time. Accepted rounds move elements into folders; select a round to see its operations.' : 'Select an element in the diagram or a recommendation below to trace what it fires on, reads and feeds.', box); stopParticles(); apply(); return; }
  const n = byId.get(S.sel), c = h('div', 'card', '', box);
  h('h3', '', n.name, c); h('p', 'sub', `${one(n.kind)} ${n.ref} · ${n.type}${n.vendor && n.vendor !== n.type ? ' · ' + n.vendor : ''}${n.folder ? ' · ' + n.folder : isLane() ? '' : ' · no folder'}`, c);
  const ch = h('div', 'chips', '', c); if (n.paused && !isAudit()) h('span', 'chip', 'paused', ch);
  if (isAudit()) {
    const sts = [...new Set(n.issues.map(i => i.status))]; if (!sts.length) sts.push('ok');
    sts.forEach(k => { const x = h('span', 'chip', ST[k][0], ch); x.style.color = x.style.borderColor = stColor(k); });
    if (n.live === 'fired') { const x = h('span', 'chip', 'verified live', ch); x.style.color = x.style.borderColor = 'var(--pass)'; }
    if (n.ghost) h('span', 'chip', 'only in published version', ch);
    n.issues.forEach(i => { const p = h('p', 'find', i.message, c); p.style.borderColor = stColor(i.status); });
    n.evidence.forEach(e => h('p', 'find evidence', e, c));
  } else if (isAuto()) {
    const a = AU.origin.get(n.id);
    h('p', 'find', `Folder: ${a.folder} → ${n.folder}`, c); if (a.name !== n.name) h('p', 'find', `Renamed from ${a.name}`, c);
  } else {
    [...new Set(n.findings.map(f => f.severity))].forEach(s => h('span', 'chip ' + s, RISK[s], ch)); if (!n.findings.length) h('span', 'chip', 'no findings', ch);
    n.findings.forEach(f => { const p = f.pair && byId.get(f.pair); h('p', 'find ' + f.severity, p ? `Same settings as ${p.name} (${one(p.kind)} ${p.ref}).` : f.message, c); });
  }
  const o = adj.get(n.id), dl = h('dl', '', '', c), row = (lbl, ids, always) => { if (!ids.length && !always) return; h('dt', '', lbl, dl); names([...new Set(ids)], h('dd', '', '', dl)); };
  if (isAudit()) {
    row('Fires on', o.in.filter(e => e.kind === 'fires').map(e => e.from)); row('Fires', o.out.filter(e => e.kind === 'fires').map(e => e.to)); row('Reads', o.in.filter(e => e.kind === 'reads').map(e => e.from));
    row('Read by', o.out.filter(e => e.kind === 'reads').map(e => e.to)); row('Sends to', o.out.filter(e => ['sends', 'routes', 'matches', 'delivers'].includes(e.kind)).map(e => e.to));
    row('Receives', o.in.filter(e => ['sends', 'routes', 'matches', 'delivers'].includes(e.kind)).map(e => e.from));
  } else if (isAuto()) {
  } else if (isFlow()) {
    row('Receives from', o.in.map(e => e.from), true); row('Leads to', o.out.map(e => e.to), true);
    const rs = M.routes.filter(r => routeSet(r).has(n.id));
    if (rs.length) { h('dt', '', 'Routes', dl); const dd = h('dd', '', '', dl); rs.forEach(r => { const b = h('button', 'link', `${STATUS[r.status]}: ${short(byId.get(r.webTag).name, 26)}`, dd); b.onclick = () => selectRoute(r.id); }); }
  } else {
    row('Fires on', o.out.filter(e => e.kind === 'fires').map(e => e.to)); row('Blocked by', o.out.filter(e => e.kind === 'blocks').map(e => e.to));
    row('Reads', o.out.filter(e => e.kind === 'reads').map(e => e.to)); row('Runs after', o.in.filter(e => e.kind === 'sequence').map(e => e.from));
    row('Used by', o.in.filter(e => e.kind !== 'duplicate' && e.kind !== 'sequence').map(e => e.from), true);
  }
  $('live').textContent = `Selected ${one(n.kind)} ${n.name}`;
  if (!S.route) stopParticles();
  apply();
  if (focusView) {
    const sc = document.querySelector('.scroll'); if (sc && sc.scrollTop > 0) sc.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    if (S.view === 'schedule') { const tr = $('rows').querySelector(`[data-id="${CSS.escape(n.id)}"]`); tr && tr.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); }
    else if (S.view === '3d') fly3d(n.id);
    else { const p = S.pos.get(n.id); if (p) centerOn(p, true); if (G) G.fromTo(nodeEls.get(n.id).dot, { attr: { r: 14 } }, { attr: { r: 5 }, duration: 0.7, ease: 'elastic.out(1,.4)' }); }
  }
}
function selectRoute(id, keepView) {
  const r = M.routes.find(x => x.id === id); if (!r) return;
  S.route = id; S.sel = null; select(r.webTag, false); S.route = id; apply();
  if (S.view === '3d') { fly3d(r.eventNode); return; }
  if (S.view !== 'flow') return;
  if (!keepView) { const ps = [...routeSet(r)].map(i => S.pos.get(i)).filter(Boolean); if (ps.length) centerOn({ x: (Math.min(...ps.map(p => p.x)) + Math.max(...ps.map(p => p.x))) / 2, y: (Math.min(...ps.map(p => p.y)) + Math.max(...ps.map(p => p.y))) / 2 }, true); }
  runParticles(r);
}
/* Particles travel the route edge by edge; one per server tag branch. */
function stopParticles() { particles.forEach(p => { p.tl && p.tl.kill(); p.c.remove(); }); particles = []; }
function runParticles(r) {
  stopParticles(); if (!G) return;
  const hop = (a, b) => [...edgeEls.values()].find(x => x.e.from === a && x.e.to === b)?.p;
  const trunk = [[r.webTriggers[0], r.webTag], [r.webTag, r.endpoint], ...(r.client ? [[r.endpoint, r.client], [r.client, r.eventNode]] : [[r.endpoint, r.eventNode]])];
  const branches = r.tags.length ? r.tags.map(t => { const m = r.matched.find(m => hop(m.id, t.id)); return [...trunk, ...(m ? [[r.eventNode, m.id], [m.id, t.id]] : []), [t.id, 'ds:' + t.destination]]; }) : [[...trunk, [r.eventNode, 'sink']]];
  branches.forEach((segs, bi) => {
    const paths = segs.map(([a, b]) => hop(a, b)).filter(Boolean); if (!paths.length) return;
    const c = el('circle', { class: 'particle' + (r.status === 'dead-end' ? ' dead' : ''), r: 4 }, $('fx')), lens = paths.map(p => p.getTotalLength()), total = lens.reduce((a, b) => a + b, 0), o = { d: 0 };
    const tl = G.timeline({ repeat: -1, repeatDelay: 0.4, delay: bi * 0.25 });
    tl.to(o, { d: total, duration: Math.min(3.2, 0.9 + total / 900), ease: 'none', onUpdate: () => { let d = o.d, i = 0; while (i < lens.length - 1 && d > lens[i]) { d -= lens[i]; i++; } const pt = paths[i].getPointAtLength(Math.min(d, lens[i])); c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y); } });
    particles.push({ c, tl });
  });
}

/* ---------- schedule ---------- */
function rows() {
  const tb = $('rows'); tb.textContent = ''; const deg = n => adj.get(n.id).out.length + adj.get(n.id).in.length; let list = [...M.nodes];
  const head = $('schedHead'); head.textContent = '';
  if (isAudit() || isAuto()) return rows2(tb, head, deg, list);
  const cols = isFlow() ? ['Element', 'Kind', 'Detail', 'Side', 'Links', 'Finding'] : ['Element', 'Family', 'Type', 'Folder', 'Links', 'Finding'];
  cols.forEach((c, i) => { const th = h('th', '', c, head); th.scope = 'col'; th.onclick = () => { S.sort = S.sort && S.sort[0] === i ? [i, -S.sort[1]] : [i, 1]; rows(); }; });
  if (S.sort) { const [k, dir] = S.sort, val = { 0: n => n.name, 1: n => n.kind, 2: n => n.type, 3: n => n.folder || n.side || '~', 4: deg, 5: n => ({ critical: 0, review: 1, info: 2 }[n.risk] ?? 3) }[k]; list.sort((a, b) => { const x = val(a), y = val(b); return (x > y ? 1 : x < y ? -1 : 0) * dir; }); }
  list.forEach(n => {
    const tr = h('tr', '', '', tb); tr.dataset.id = n.id; tr.tabIndex = 0;
    [n.name, one(n.kind), n.type, n.folder || n.side || '—'].forEach(v => h('td', '', v, tr)); h('td', 'num', deg(n), tr);
    const f = n.findings.find(x => x.severity === n.risk), td = h('td', '', f ? `${RISK[n.risk]}: ${f.pair ? 'same as ' + (byId.get(f.pair)?.name || f.pair) : f.message}` : '—', tr);
    if (n.risk && n.risk !== 'info') td.style.color = n.risk === 'critical' ? 'var(--crit)' : 'var(--gold)';
    tr.onclick = () => select(n.id, false); tr.onkeydown = e => { if (e.key === 'Enter') select(n.id, false); };
  });
  apply();
}
function rows2(tb, head, deg, list) {
  const A = isAudit(), cols = A ? ['Element', 'Kind', 'Status', 'Lane', 'Links', 'Issue / evidence'] : ['Element', 'Kind', 'Folder before', 'Folder now', 'Name change'];
  const val = A ? { 0: n => n.name, 1: n => n.kind, 2: n => Object.keys(ST).indexOf(n.status), 3: n => n.col, 4: deg, 5: n => (n.issues[0] || {}).message || '' }
    : { 0: n => n.name, 1: n => n.kind, 2: n => AU.origin.get(n.id).folder, 3: n => n.folder, 4: n => (AU.origin.get(n.id).name !== n.name ? 0 : 1) };
  cols.forEach((c, i) => { const th = h('th', '', c, head); th.scope = 'col'; th.onclick = () => { S.sort = S.sort && S.sort[0] === i ? [i, -S.sort[1]] : [i, 1]; rows(); }; });
  if (A && !S.sort) list.sort((a, b) => Object.keys(ST).indexOf(a.status) - Object.keys(ST).indexOf(b.status) || a.col - b.col);
  if (!A && !S.sort) list = list.filter(n => AU.origin.get(n.id).folder !== n.folder || AU.origin.get(n.id).name !== n.name).concat(list.filter(n => AU.origin.get(n.id).folder === n.folder && AU.origin.get(n.id).name === n.name));
  if (S.sort) { const [k, dir] = S.sort; list.sort((a, b) => { const x = val[k](a), y = val[k](b); return (x > y ? 1 : x < y ? -1 : 0) * dir; }); }
  list.forEach(n => {
    const tr = h('tr', '', '', tb); tr.dataset.id = n.id; tr.tabIndex = 0;
    if (A) {
      [n.name, one(n.kind)].forEach(v => h('td', '', v, tr));
      const st = h('td', '', ST[n.status][0] + (n.live === 'fired' ? ' · live ✓' : ''), tr); st.style.color = stColor(n.status);
      h('td', '', M.columns[n.col], tr); h('td', 'num', deg(n), tr); h('td', '', (n.issues[0] || {}).message || n.evidence[0] || '—', tr);
    } else {
      const o = AU.origin.get(n.id); [n.name, one(n.kind), o.folder].forEach(v => h('td', '', v, tr));
      const now = h('td', '', n.folder, tr); if (n.folder !== o.folder) now.style.color = 'var(--pass)'; h('td', '', o.name !== n.name ? `was ${o.name}` : '—', tr);
    }
    tr.onclick = () => select(n.id, false); tr.onkeydown = e => { if (e.key === 'Enter') select(n.id, false); };
  });
  apply();
}
function legend() {
  const l = $('legend'); l.textContent = '';
  const add = (style, text) => { const s = h('span', '', '', l), i = h('i', style.ln ? 'ln' : '', '', s); Object.assign(i.style, style.css); s.append(text); };
  if (!isAudit()) [...new Set(M.nodes.map(n => n.kind))].filter(k => k !== 'sink').forEach(k => add({ css: { background: cvar(k) } }, label(k)));
  if (isAudit()) {
    Object.keys(ST).filter(k => k !== 'ok').forEach(k => add({ css: { border: `2px ${k === 'orphaned' ? 'dashed' : 'solid'} ${stColor(k)}` } }, ST[k][0]));
    add({ css: { background: 'var(--pass)', width: '5px', height: '5px' } }, 'Verified live'); add({ ln: 1, css: { borderTop: '2px dashed var(--gold)' } }, 'Seen live'); add({ ln: 1, css: { borderTop: '2px dashed var(--crit)' } }, 'Dead end');
  } else if (isAuto()) { add({ css: { background: 'rgba(92,225,164,.35)' } }, 'Folder added by the loop'); add({ css: { background: 'rgba(255,98,95,.25)' } }, 'No folder'); }
  else if (isFlow()) { add({ ln: 1, css: { borderTop: '2px dashed var(--gold)' } }, 'Delivered'); add({ ln: 1, css: { borderTop: '2px dotted var(--amber)' } }, 'Conditional'); add({ ln: 1, css: { borderTop: '2px dashed var(--crit)' } }, 'Dead end'); }
  else { add({ css: { border: '2px solid var(--crit)' } }, 'Fix first'); add({ css: { border: '2px solid var(--gold)' } }, 'Confirm'); add({ ln: 1, css: { borderTop: '2px dashed var(--gold)' } }, 'Identical pair'); }
  h('span', 'hint', S.view === '3d' ? 'Drag to orbit · shift-drag to pan · scroll to zoom · click a node to select' : 'Drag to pan · ctrl/⌘ + scroll or pinch to zoom · drag a node to move it · +/− and 0 on the keyboard', l);
}

/* ---------- intro ---------- */
function intro() {
  if (!G) return;
  const ns = [...nodeEls.values()].map(x => x.g), ds = [...nodeEls.values()].map(x => x.dot), es = [...edgeEls.values()].map(x => x.p).filter(p => !p.classList.contains('s-ok'));
  const tl = G.timeline();
  tl.from(ns, { opacity: 0, duration: 0.35, stagger: { amount: 0.9 }, clearProps: 'opacity' }, 0).from(ds, { attr: { r: 0 }, duration: 0.5, stagger: { amount: 0.9 }, ease: 'back.out(3)' }, 0)
    .from(es, { opacity: 0, duration: 0.8, stagger: { amount: 0.6 }, clearProps: 'opacity' }, 0.5).from('#deco > *', { opacity: 0, duration: 0.6, stagger: 0.03, clearProps: 'opacity' }, 0);
  // Throttled tabs and previews still end up showing everything.
  setTimeout(() => tl.progress(1), 2600);
}

/* ---------- 3D (three.js, loaded on first use) ---------- */
const T3 = { ready: false, loading: false, active: false, scenes: new Map() };
function enter3d() {
  T3.active = true; legend(); apply();
  if (window.THREE) return start3d();
  const box = $('three'); box.querySelector('.notice') || h('div', 'notice', 'Loading 3D…', box);
  if (T3.loading) return; T3.loading = true;
  const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  s.onload = () => { box.querySelector('.notice')?.remove(); T3.active && start3d(); };
  s.onerror = () => { box.querySelector('.notice').textContent = 'The 3D view needs three.js from cdnjs.cloudflare.com, which did not load here. The 2D views have the same data.'; };
  document.head.append(s);
}
function leave3d() { T3.active = false; S.hover = null; T3.raf && cancelAnimationFrame(T3.raf); T3.raf = null; $('labels').textContent = ''; }
function positions3d() {
  const P = new Map(), planes = [];
  if (isLane()) {
    M.columns.forEach((_, ci) => { const list = M.nodes.filter(n => n.col === ci); list.forEach((n, r) => P.set(n.id, [(ci - (M.columns.length - 1) / 2) * 150, 0, (r - (list.length - 1) / 2) * 24])); });
  } else {
    const order = ['client', 'tag', 'trigger', 'variable'].filter(k => fam(k).length || (k === 'variable' && fam('builtin').length));
    order.forEach((k, li) => {
      const list = k === 'variable' ? [...fam('variable'), ...fam('builtin')] : fam(k), cols = Math.max(3, Math.ceil(Math.sqrt(list.length * 1.4))), rws = Math.ceil(list.length / cols), y = ((order.length - 1) / 2 - li) * 130;
      list.forEach((n, i) => P.set(n.id, [((i % cols) - (cols - 1) / 2) * 26, y, (Math.floor(i / cols) - (rws - 1) / 2) * 26]));
      planes.push({ y, w: cols * 26 + 30, d: rws * 26 + 30, label: label(k) });
    });
  }
  return { P, planes };
}
function start3d() {
  const THREE = window.THREE, box = $('three');
  if (!T3.renderer) {
    T3.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); T3.renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); box.append(T3.renderer.domElement);
    T3.camera = new THREE.PerspectiveCamera(45, 1, 1, 8000); T3.ray = new THREE.Raycaster(); T3.orbit = { theta: 0.75, phi: 1.05, r: 900, tx: 0, ty: 0, tz: 0 };
    controls3d(); new ResizeObserver(() => size3d()).observe(box);
  }
  if (!T3.scenes.has(S.tab)) T3.scenes.set(S.tab, scene3d());
  T3.cur = T3.scenes.get(S.tab); size3d();
  const o = T3.orbit; Object.assign(o, { tx: 0, ty: 0, tz: 0, r: T3.cur.radius, theta: 0.75, phi: isLane() ? 0.85 : 1.1 });
  if (G) { const tl = G.timeline(); tl.from(o, { r: o.r * 2.2, theta: o.theta + 1.2, duration: 1.6, ease: 'power3.out' }); setTimeout(() => tl.progress(1), 2200); }
  apply(); loop3d();
}
function scene3d() {
  const THREE = window.THREE, scene = new THREE.Scene(), { P, planes } = positions3d(), meshes = new Map(), geo = new THREE.SphereGeometry(4, 14, 10), halo = new THREE.SphereGeometry(7, 12, 8);
  M.nodes.forEach(n => {
    const p = P.get(n.id); if (!p) return;
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: hex(n.kind), transparent: true })); m.position.set(...p); m.userData.id = n.id; scene.add(m); meshes.set(n.id, m);
    const hc = isAudit() ? (PROBLEMS.includes(n.status) ? ST[n.status][2] : null) : n.risk === 'critical' ? 0xff625f : n.risk === 'review' ? 0xffe94a : null;
    if (hc != null) { const r = new THREE.Mesh(halo, new THREE.MeshBasicMaterial({ color: hc, wireframe: true, transparent: true, opacity: 0.55 })); r.position.set(...p); scene.add(r); m.userData.halo = r; }
  });
  planes.forEach(pl => {
    if (pl.y == null) return;
    const g = new THREE.PlaneGeometry(pl.w, pl.d), mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffe94a, transparent: true, opacity: 0.03, side: THREE.DoubleSide, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2; mesh.position.y = pl.y - 6; scene.add(mesh);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: 0x353025 })); edges.rotation.x = -Math.PI / 2; edges.position.y = pl.y - 6; scene.add(edges);
  });
  const curve = (a, b) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    if (!isLane()) return [A, B];
    const mid = A.clone().add(B).multiplyScalar(0.5); mid.y += 20 + A.distanceTo(B) * 0.22;
    return new THREE.QuadraticBezierCurve3(A, mid, B).getPoints(12);
  };
  const groups = {}, segs = new Map();
  M.edges.forEach(e => {
    const a = P.get(e.from), b = P.get(e.to); if (!a || !b) return;
    const pts = curve(a, b), arr = []; for (let i = 0; i < pts.length - 1; i++) arr.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
    segs.set(ekey(e), arr); const g = e.status || (e.kind === 'duplicate' ? 'dup' : 'base'); (groups[g] = groups[g] || []).push(...arr);
  });
  const COL = { ok: [0xffe94a, 0.55], dead: [0xff625f, 0.7], maybe: [0xffad58, 0.45], unknown: [0x5d574a, 0.5], idle: [0x353025, 0.6], base: [0x6b6352, 0.28], dup: [0xffe94a, 0.35] };
  const lines = Object.entries(groups).map(([g, arr]) => { const geom = new THREE.BufferGeometry(); geom.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); const l = new THREE.LineSegments(geom, new THREE.LineBasicMaterial({ color: COL[g][0], transparent: true, opacity: COL[g][1] })); l.userData.base = COL[g][1]; scene.add(l); return l; });
  const hot = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xf7f2df })); scene.add(hot);
  let rad = 0; P.forEach(p => (rad = Math.max(rad, Math.hypot(...p)))); return { scene, meshes, lines, hot, segs, P, radius: Math.max(320, rad * 2.1) };
}
function size3d() { const box = $('three'), w = box.clientWidth, hgt = box.clientHeight; if (!T3.renderer || !w) return; T3.renderer.setSize(w, hgt); T3.camera.aspect = w / hgt; T3.camera.updateProjectionMatrix(); }
function apply3d(f, ok) {
  const c = T3.cur; if (!c) return;
  c.meshes.forEach((m, id) => { const vis = ok.has(id), on = !f || f.has(id); m.material.opacity = !vis ? 0.06 : on ? 1 : 0.14; m.scale.setScalar(id === S.sel ? 1.8 : 1); if (m.userData.halo) m.userData.halo.material.opacity = on && vis ? 0.55 : 0.05; });
  c.lines.forEach(l => (l.material.opacity = f ? l.userData.base * 0.25 : l.userData.base));
  const arr = []; if (f) M.edges.forEach(e => { if (f.has(e.from) && f.has(e.to)) arr.push(...(c.segs.get(ekey(e)) || [])); });
  c.hot.geometry.dispose(); c.hot.geometry = new window.THREE.BufferGeometry(); c.hot.geometry.setAttribute('position', new window.THREE.Float32BufferAttribute(arr, 3));
  const lab = $('labels'); lab.textContent = ''; T3.labels = [];
  const ids = f ? [...f].slice(0, 40) : [];
  ids.forEach(id => { if (!c.P.has(id)) return; const s = h('span', id === S.sel ? 'sel' : '', short(byId.get(id).name, 34), lab); T3.labels.push([id, s]); });
}
function fly3d(id) { const p = T3.cur && T3.cur.P.get(id); if (!p) return; const o = T3.orbit; if (G) G.to(o, { tx: p[0], ty: p[1], tz: p[2], r: Math.min(o.r, 380), duration: 0.9, ease: 'power2.inOut' }); else Object.assign(o, { tx: p[0], ty: p[1], tz: p[2] }); }
function loop3d() {
  if (!T3.active) return;
  const o = T3.orbit, cam = T3.camera, THREE = window.THREE;
  cam.position.set(o.tx + o.r * Math.sin(o.phi) * Math.cos(o.theta), o.ty + o.r * Math.cos(o.phi), o.tz + o.r * Math.sin(o.phi) * Math.sin(o.theta)); cam.lookAt(o.tx, o.ty, o.tz);
  T3.renderer.render(T3.cur.scene, cam);
  const w = T3.renderer.domElement.clientWidth, hgt = T3.renderer.domElement.clientHeight, v = new THREE.Vector3();
  (T3.labels || []).forEach(([id, s]) => { v.set(...T3.cur.P.get(id)).project(cam); s.style.display = v.z > 1 ? 'none' : ''; s.style.left = ((v.x + 1) / 2) * w + 'px'; s.style.top = ((1 - v.y) / 2) * hgt + 'px'; });
  T3.raf = requestAnimationFrame(loop3d);
}
function controls3d() {
  const c = T3.renderer.domElement, o = T3.orbit; let drag = null;
  const pick = e => { const r = c.getBoundingClientRect(); T3.ray.setFromCamera({ x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }, T3.camera); const hit = T3.ray.intersectObjects([...T3.cur.meshes.values()])[0]; return hit && hit.object.userData.id; };
  c.addEventListener('pointerdown', e => { c.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, moved: false, pan: e.shiftKey || e.button === 2 }; });
  c.addEventListener('pointermove', e => {
    if (!drag) { const id = pick(e); if (id !== S.hover) { S.hover = id || null; c.style.cursor = id ? 'pointer' : 'grab'; apply(); } return; }
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.hypot(dx, dy) > 3) drag.moved = true; drag.x = e.clientX; drag.y = e.clientY;
    if (drag.pan) { const s = o.r / 900; o.tx -= (Math.sin(o.theta) * dx * -1 + 0) * s; o.tz -= Math.cos(o.theta) * dx * s; o.ty += dy * s; }
    else { o.theta += dx * 0.006; o.phi = Math.max(0.12, Math.min(Math.PI - 0.12, o.phi - dy * 0.006)); }
  });
  c.addEventListener('pointerup', e => { if (drag && !drag.moved) { const id = pick(e); if (id) select(id, false); else { S.route = null; select(null); } } drag = null; });
  c.addEventListener('pointerleave', () => { if (!drag && S.hover) { S.hover = null; c.style.cursor = 'grab'; apply(); } });
  c.addEventListener('contextmenu', e => e.preventDefault());
  c.addEventListener('wheel', e => { e.preventDefault(); o.r = Math.max(60, Math.min(5000, o.r * Math.exp(e.deltaY * 0.0012))); }, { passive: false });
}

/* ---------- GTM auto: the Autoresearch loop, run in the page ---------- */
const AU = { ci: null, st: null, data: null, model: null, origin: new Map(), fresh: new Set(), pick: null, running: false, sample: undefined, busy: false };
const KINDS = { tag: ['tag', 'tagId'], trigger: ['trigger', 'triggerId'], variable: ['variable', 'variableId'] };
function autoInit(ci) {
  if (ci == null && AU.st) return autoModel();
  const webIdx = D.containers.findIndex(c => /web/.test(c.meta.context));
  AU.ci = ci ?? (webIdx >= 0 ? webIdx : 0); AU.data = D.auto[AU.ci];
  AU.st = GTM_AUTO.start(AU.data); AU.pick = null; AU.fresh = new Set(); AU.origin = new Map();
  const fname = id => (AU.data.folder.find(f => f.folderId === id) || {}).name || 'No folder';
  Object.entries(KINDS).forEach(([k, [, idk]]) => AU.data[k].forEach(r => AU.origin.set(`a-${k}:${r[idk]}`, { folder: r.parentFolderId ? fname(r.parentFolderId) : 'No folder', name: r.name })));
  AU.model = null; autoModel();
}
function autoModel() {
  const c = AU.st.best, start = new Set(AU.data.folder.map(f => f.folderId));
  const fname = id => (c.folder.find(f => f.folderId === id) || {}).name || 'No folder';
  const prev = AU.model ? new Map(AU.model.nodes.map(n => [n.id, n])) : new Map();
  const nodes = [];
  Object.entries(KINDS).forEach(([k, [kind, idk]]) => c[k].forEach(r => {
    const id = `a-${k}:${r[idk]}`, n = prev.get(id) || { id, kind, ref: r[idk], type: r.type, findings: [], risk: null };
    n.name = r.name; n.folder = r.parentFolderId ? fname(r.parentFolderId) : 'No folder'; nodes.push(n);
  }));
  const used = new Set(nodes.map(n => n.folder));
  const cols = [...c.folder.filter(f => start.has(f.folderId)), ...c.folder.filter(f => !start.has(f.folderId))].map(f => f.name).filter(n => used.has(n));
  if (used.has('No folder')) cols.push('No folder');
  AU.fresh = new Set(c.folder.filter(f => !start.has(f.folderId)).map(f => f.name));
  const ko = { tag: 0, trigger: 1, variable: 2 };
  nodes.forEach(n => (n.col = cols.indexOf(n.folder)));
  nodes.sort((a, b) => a.col - b.col || ko[a.kind] - ko[b.kind] || a.name.localeCompare(b.name));
  if (AU.model) { AU.model.nodes = nodes; AU.model.columns = cols; }
  else AU.model = { meta: { name: 'GTM auto', publicId: AU.data.publicId }, nodes, edges: [], columns: cols };
  return AU.model;
}
function autoSide(block, box) {
  const b = block('Loop'), row = h('div', 'autorow', '', b);
  const run = h('button', 'primary', AU.st.done ? 'Run again' : 'Run loop', row), stp = h('button', '', 'Step one round', row), rst = h('button', '', 'Reset', row);
  run.id = 'auRun'; stp.id = 'auStep'; rst.id = 'auReset';
  run.onclick = () => { if (AU.st.done || AU.st.rounds.length) { autoInit(AU.ci); load(); } runLoop(); };
  stp.onclick = () => stepOnce(); rst.onclick = () => { stopLoop(); autoInit(AU.ci); load(); };
  const ask = h('button', 'askbtn', 'Ask Claude for the next round', b); ask.id = 'auAsk'; ask.hidden = !AU.sample; ask.onclick = askClaude;
  const msg = h('p', 'note', '', b); msg.id = 'auMsg'; msg.setAttribute('aria-live', 'polite');
  if (D.auto.length > 1) {
    const lab = h('label', 'pick', 'Container ', b), sel = h('select', '', '', lab);
    D.auto.forEach((a, i) => { const o = h('option', '', a.publicId || 'Container ' + (i + 1), sel); o.value = i; }); sel.value = AU.ci;
    sel.onchange = () => { stopLoop(); autoInit(+sel.value); load(); };
  }
  [stp, ask].forEach(x => (x.disabled = AU.st.done || AU.running)); run.disabled = AU.running;
  const d = block('Score by check'), dims = h('div', 'dims', '', d);
  GTM_AUTO.dims.forEach(k => {
    const base = AU.st.baseline.dimensions[k], now = AU.st.report.dimensions[k], r = h('div', 'dim', '', dims);
    h('span', '', DIM[k] || k, r); const bar = h('span', 'bar', '', r), bb = h('b', '', '', bar), mark = h('i', 'basemark', '', bar);
    bb.style.width = now + '%'; bb.style.background = now > base + 0.01 ? 'var(--pass)' : now >= 90 ? 'var(--pass)' : now >= 60 ? 'var(--gold)' : 'var(--crit)'; mark.style.left = base + '%';
    h('span', 'v', (now - base > 0.05 ? '+' + Math.round(now - base) : Math.round(now)), r);
  });
  h('p', 'note', `Total ${AU.st.baseline.score} → ${AU.st.report.score}. Light marks show the baseline.`, d).style.marginTop = '8px';
  const rb = block('Rounds');
  if (!AU.st.rounds.length) h('p', 'empty', 'No rounds yet.', rb);
  AU.st.rounds.forEach((r, i) => {
    const btn = h('button', 'rec ' + (r.accepted ? 'delivered' : 'critical') + (AU.pick === i ? ' on' : ''), `Round ${r.round} · ${r.accepted ? 'accepted' : 'rejected'}${r.score != null ? ' · ' + r.score : ''}${r.source === 'claude' ? ' · Claude' : ''}`, rb);
    h('small', '', r.why, btn); h('small', '', `${r.operations.length} operation${r.operations.length === 1 ? '' : 's'}. ${r.reason}`, btn);
    btn.onclick = () => { AU.pick = i; S.sel = null; select(null); side(); };
  });
  if (AU.st.done) h('p', 'note', AU.st.failures >= AU.st.maxFailures ? 'Stopped: too many rejected proposals.' : AU.st.plateau >= AU.st.plateauRounds ? 'Stopped: no improvement in two rounds.' : AU.st.rounds.length >= AU.st.maxRounds ? 'Stopped: round limit reached.' : 'Stopped: the proposer has no more ideas.', rb);
  const res = block('Candidate'), ops = AU.st.rounds.filter(r => r.accepted).flatMap(r => r.operations);
  h('p', 'note', ops.length ? `${ops.length} operations from ${AU.st.rounds.filter(r => r.accepted).length} accepted rounds, applied to a copy. Nothing was published or written to GTM.` : 'No accepted changes yet.', res);
  if (ops.length) {
    const row2 = h('div', 'autorow pair', '', res), cp = h('button', '', 'Copy operations (JSON)', row2), ex = h('button', 'primary', 'Export container (JSON)', row2);
    cp.onclick = () => copyOps(ops, cp); ex.onclick = () => exportPick(AU.st.rounds.filter(r => r.accepted).map(r => r.operations));
    const ix = h('p', 'note', 'Export asks for the original export file of ' + (AU.data.publicId || 'this container') + ', applies these operations to it in this browser and saves an importable container. The file is never uploaded; this page holds no tag settings or tokens of its own.', res); ix.id = 'auExportMsg';
  }
  const n = block('How the loop works');
  h('p', 'note', 'Audit the container → a proposer suggests one round of metadata-only operations (add folder, assign folder, rename) → apply them to a copy → audit again. A round is kept only if the score rises, no critical finding is added and no check goes down. The loop stops after two rounds without improvement, two rejected proposals, or eight rounds. Scores here are computed in the page from names, links and settings hashes, and match the plugin\'s audit exactly. Publishing is never part of the loop.', n);
  h('p', 'foot', `gtm-audit-pro · GTM Autoresearch · ${(D.generatedAt || '').slice(0, 10)}`, box);
}
function roundCard(box) {
  const r = AU.st.rounds[AU.pick], c = h('div', 'card', '', box), cur = AU.st.best;
  h('h3', '', `Round ${r.round}: ${r.accepted ? 'accepted' : 'rejected'}`, c); h('p', 'sub', `${r.source === 'claude' ? 'Proposed by Claude' : 'Heuristic proposer'} · ${r.operations.length} operations`, c);
  h('p', 'find', r.why, c); const p = h('p', 'find', r.reason, c); p.style.borderColor = r.accepted ? 'var(--pass)' : 'var(--crit)';
  const name = (k, id) => ((cur[k] || []).find(x => x[KINDS[k][1]] === id) || {}).name || id;
  const fname = id => ((cur.folder.find(f => f.folderId === id) || r.operations.find(o => o.op === 'addFolder' && o.id === id) || {}).name) || id;
  const ul = h('ul', 'skipped oplist', '', c);
  r.operations.slice(0, 80).forEach(o => h('li', '', o.op === 'addFolder' ? `Add folder "${o.name}"` : o.op === 'assignFolder' ? `${o.kind} ${name(o.kind, o.id)} → ${fname(o.folderId)}` : `Rename ${o.kind} ${o.id} → ${o.name}`, ul));
  if (r.operations.length > 80) h('li', '', `+${r.operations.length - 80} more`, ul);
  const back = h('button', 'link', 'Close', c); back.onclick = () => { AU.pick = null; select(null); side(); };
}
function relayout() {
  const from = new Map(S.pos); autoModel(); byId = new Map(M.nodes.map(n => [n.id, n]));
  adj = new Map(M.nodes.map(n => [n.id, { out: [], in: [] }]));
  M.nodes.forEach(n => nodeEls.get(n.id).g.classList.toggle('moved', AU.origin.get(n.id).folder !== n.folder));
  if (S.view !== 'auto') { rows(); return; }
  const L = layout('auto'); drawDeco(L); $('caption').textContent = L.caption; S.pos = L.pos; S.bounds = { W: L.W, H: L.H };
  if (G) { morph && morph.progress(1); const o = { t: 0 }; morph = G.to(o, { t: 1, duration: 0.9, ease: 'power3.inOut', onUpdate: () => place(from, L.pos, o.t) }); setTimeout(() => morph.progress(1), 1300); G.from('#deco > *', { opacity: 0, duration: 0.5, stagger: 0.01, clearProps: 'opacity' }); }
  else place(null, L.pos, 1);
  fit('all', true); rows();
}
function afterRound(entry) {
  if (entry.accepted) relayout();
  header(); side(); legend();
  const m = $('auMsg'); if (m) m.textContent = `Round ${entry.round} ${entry.accepted ? 'accepted' : 'rejected'}. ${entry.reason}`;
  $('live').textContent = `Round ${entry.round} ${entry.accepted ? 'accepted' : 'rejected'}`;
}
function stepOnce() {
  if (AU.st.done || AU.busy) return null;
  const p = GTM_AUTO.propose(AU.st, { vendor: AU.data.vendor });
  if (!p) { AU.st.done = true; side(); return null; }
  const e = GTM_AUTO.step(AU.st, p); afterRound(e); return e;
}
let loopTimer = null;
function stopLoop() { clearTimeout(loopTimer); loopTimer = null; AU.running = false; }
function runLoop() {
  if (!isAuto()) return; AU.running = true; side();
  const tick = () => { if (!AU.running || !isAuto()) return stopLoop(); const e = stepOnce(); if (!e || AU.st.done) { stopLoop(); side(); return; } loopTimer = setTimeout(tick, reduce ? 200 : 1500); };
  loopTimer = setTimeout(tick, 250);
}
function exportPick(rounds) {
  const ops = rounds.flat();
  const msg = $('auExportMsg'), say = t => { if (msg) msg.textContent = t; $('live').textContent = t; };
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json'; inp.hidden = true; document.body.append(inp);
  inp.onchange = () => {
    const f = inp.files && inp.files[0]; inp.remove(); if (!f) return;
    f.text().then(async text => {
      let full; try { full = JSON.parse(text); } catch (e) { return say('That file is not JSON. Choose the container export from GTM (Admin → Export container).'); }
      const problems = GTM_AUTO.sameInventory(full, AU.data);
      if (problems.length) return say('Not exported: ' + problems.join('; ') + '. Use the export this atlas was built from, or rebuild the atlas from the newer export.');
      let doc; try { doc = GTM_AUTO.exportContainer(full, rounds); } catch (e) { return say('Not exported: ' + e.message + '.'); }
      const name = `${AU.data.publicId || 'container'}-autoresearch-candidate.json`, data = JSON.stringify(doc, null, 2);
      const done = () => say(`Saved ${name}: ${ops.length} metadata changes on top of your export, every tag setting unchanged. Import it into a new workspace (Admin → Import container → Merge → Overwrite conflicting), review, then publish yourself.`);
      try {
        const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
        if (dl) { await dl.save({ filename: name, data }); return done(); }
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' })); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); done();
      } catch (e) { say(e && e.code === 'declined' ? 'Save cancelled.' : e && e.code === 'rate_limited' ? 'A save prompt is already open.' : 'This view cannot save files; open the page in a browser or in Claude.'); }
    }, () => say('Could not read that file.'));
  };
  inp.click();
}
function copyOps(ops, btn) {
  const text = JSON.stringify({ operations: ops }, null, 2);
  const done = ok => { btn.textContent = ok ? 'Copied' : 'Copy failed: select and copy from the Changes view'; setTimeout(() => (btn.textContent = 'Copy operations (JSON)'), 2200); };
  try { navigator.clipboard.writeText(text).then(() => done(true), () => done(false)); } catch (e) { done(false); }
}
// Optional: Claude proposes the next round through the artifact runtime, when the page is opened in Claude.
(async () => {
  try { AU.sample = window.claude && window.claude.use ? await window.claude.use('sample') : null; } catch (e) { AU.sample = null; }
  const b = $('auAsk'); if (b) b.hidden = !AU.sample;
})();
async function askClaude() {
  if (!AU.sample || AU.busy || AU.st.done) return;
  const st = AU.st, c = st.best, m = $('auMsg'), btn = $('auAsk'); AU.busy = true; btn.disabled = true; m.textContent = 'Asking Claude for one round of operations…';
  const fname = id => (c.folder.find(f => f.folderId === id) || {}).name;
  const unfiled = Object.entries(KINDS).flatMap(([k, [, idk]]) => c[k].filter(r => !r.parentFolderId).map(r => `${k} ${r[idk]} "${r.name}"${k === 'tag' && AU.data.vendor[r[idk]] ? ' [' + AU.data.vendor[r[idk]] + ']' : ''}`)).slice(0, 140);
  const counts = {}; st.report.findings.forEach(f => (counts[f.dimension] = (counts[f.dimension] || 0) + 1));
  const maxId = Math.max(0, ...c.folder.map(f => +f.folderId || 0));
  const prompt = [
    'You propose ONE round of metadata-only cleanup for a Google Tag Manager container. Reply with JSON only: {"why":"one sentence","operations":[...]}.',
    'Allowed operations: {"op":"addFolder","id":"<numeric string greater than ' + maxId + '>","name":"..."}; {"op":"assignFolder","kind":"tag|trigger|variable","id":"<element id>","folderId":"<folder id>"}; {"op":"rename","kind":"tag|trigger|variable","id":"<element id>","name":"..."}.',
    'Rules: at most 100 operations; names must not contain { or }; variables that other elements reference cannot be renamed; the round is kept only if the audit score rises and no check goes down.',
    'Check scores now: ' + GTM_AUTO.dims.map(k => `${k} ${Math.round(st.report.dimensions[k])}`).join(', ') + '. Finding counts: ' + JSON.stringify(counts) + '.',
    'Folders: ' + (c.folder.map(f => `${f.folderId} "${f.name}"`).join('; ') || 'none') + '.',
    'Elements without a folder (' + unfiled.length + ' shown):\n' + unfiled.join('\n'),
    'Earlier rounds: ' + (st.rounds.map(r => `${r.round} ${r.accepted ? 'accepted' : 'rejected'} (${r.why})`).join('; ') || 'none') + '.',
  ].join('\n\n');
  try {
    const out = await AU.sample.json(prompt, { modelTier: 'default' });
    const ops = Array.isArray(out && out.operations) ? out.operations : [];
    const e = GTM_AUTO.step(st, { idea: 'claude-' + (st.rounds.length + 1), why: String((out && out.why) || 'Claude proposal').slice(0, 300), source: 'claude', operations: ops });
    afterRound(e);
  } catch (err) {
    m.textContent = err && err.code === 'not_granted' ? 'Claude is not available on this page.' : err && err.code === 'rate_limited' ? 'Claude is busy; try again in a minute.' : 'Claude did not return a usable proposal.';
    if (err && err.code === 'not_granted') { AU.sample = null; btn.hidden = true; }
  } finally { AU.busy = false; if ($('auAsk')) $('auAsk').disabled = AU.st.done; }
}

/* ---------- wiring ---------- */
$('q').oninput = e => { S.q = e.target.value.toLowerCase().trim(); apply(); };
$('kind').onchange = e => { S.kind = e.target.value; apply(); };
$('risk').onchange = e => (isAudit() ? setRisk(e.target.value) : (S.risk = e.target.value, apply()));
$('trace').onchange = e => { S.trace = e.target.value; apply(); };
$('zoomIn').onclick = () => (S.view === '3d' ? (T3.orbit.r *= 0.8) : zoomBy(1.25));
$('zoomOut').onclick = () => (S.view === '3d' ? (T3.orbit.r *= 1.25) : zoomBy(0.8));
$('fit').onclick = () => (S.view === '3d' ? Object.assign(T3.orbit, { tx: 0, ty: 0, tz: 0, r: T3.cur.radius }) : fit('all', true));
$('reset').onclick = () => { S.q = ''; S.kind = 'all'; S.risk = 'all'; S.trace = 'near'; S.route = null; S.pinned.clear(); $('q').value = ''; $('kind').value = 'all'; $('risk').value = 'all'; $('trace').value = 'near'; select(null); setView(homeView(), true); };
document.addEventListener('keydown', e => { if (e.key === 'Escape') { S.route = null; select(null); } else if (e.key === '/' && !e.target.matches('input,select,textarea')) { e.preventDefault(); $('q').focus(); } });
let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (S.view !== 'schedule' && S.view !== '3d') mini(); }, 150); });
tabs();
const hv = location.hash.slice(1), byType = t => TABS.findIndex(x => x.type === t);
if (['flow', 'audit', 'auto'].includes(hv) && byType(hv) >= 0) { S.tab = byType(hv); S.view = hv; }
else S.view = ['structured', 'spatial', 'axonometric', 'schedule', '3d'].includes(hv) ? hv : null;
load(); select(null);
})();

/* ---------- report export (Markdown file, PDF via the browser's print dialog) ---------- */
(function reportExports() {
  const R = JSON.parse(document.getElementById('atlas-data').textContent).report, $ = id => document.getElementById(id); if (!R) return;
  const say = t => { $('live').textContent = t; const m = $('repMsg'); if (m) m.textContent = t; };
  async function save(name, data, type) {
    try {
      const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
      if (dl) { await dl.save({ filename: name, data }); return say('Saved ' + name); }
    } catch (e) { if (e && e.code === 'declined') return say('Save cancelled.'); }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type })); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); say('Saved ' + name);
  }
  $('repMd').onclick = () => save(R.name + '.md', R.md, 'text/markdown');
  $('repPdf').onclick = () => {
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0'; f.setAttribute('aria-hidden', 'true');
    f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); say('Choose "Save as PDF" in the print dialog.'); } catch (e) { save(R.name + '.html', R.html, 'text/html'); say('Printing is blocked here; saved the print-ready HTML instead. Open it and Save as PDF.'); } setTimeout(() => f.remove(), 60000); };
    f.srcdoc = R.html; document.body.append(f);
  };
})();

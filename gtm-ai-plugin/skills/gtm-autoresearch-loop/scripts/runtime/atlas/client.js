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
};
const label = k => (K[k] || [k])[0], one = k => (K[k] || [, k])[1], cvar = k => `var(${(K[k] || [, , '--muted'])[2]})`, hex = k => (K[k] || [, , , 0xa69f8b])[3];
const DIM = { references: 'References', duplicates: 'Duplicates', naming: 'Naming', hygiene: 'Unused', legacy: 'Legacy', folders: 'Folders' };
const RISK = { critical: 'Fix first', review: 'Confirm', info: 'Note' };
const STATUS = { delivered: 'Delivered', conditional: 'Conditional', 'dead-end': 'Dead end', unknown: 'Unresolved' };
const TABS = [...D.containers.map((c, i) => ({ i, model: c, flow: false })), ...(D.flow ? [{ i: D.containers.length, model: D.flow, flow: true }] : [])];
const S = { tab: 0, view: 'structured', q: '', kind: 'all', risk: 'all', trace: 'near', sel: null, hover: null, route: null, T: { k: 1, x: 0, y: 0 }, pos: new Map(), pinned: new Set(), sort: null, deco: [] };
let M, byId, adj, nodeEls = new Map(), edgeEls = new Map(), particles = [];
const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); parent && parent.append(e); return e; };
const h = (tag, cls, text, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; parent && parent.append(e); return e; };
const short = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const tab = () => TABS[S.tab], isFlow = () => tab().flow;
const views = () => (isFlow() ? [['flow', 'Signal flow'], ['schedule', 'Schedule'], ['3d', '3D']] : [['structured', 'Structured'], ['spatial', 'Free-form'], ['axonometric', 'Axonometric'], ['schedule', 'Schedule'], ['3d', '3D']]);
const ekey = e => `${e.from}>${e.to}>${e.kind}`;

/* ---------- tabs, header, side panel ---------- */
function tabs() {
  const t = $('tabs');
  if (TABS.length < 2) return;
  TABS.forEach(x => {
    const b = h('button', x.flow ? 'flowtab' : '', x.flow ? 'Web → Server flow' : (x.model.meta.publicId || x.model.meta.name), t);
    b.setAttribute('role', 'tab'); b.title = x.model.meta.name;
    b.onclick = () => { S.tab = x.i; S.sel = S.route = null; S.view = x.flow ? 'flow' : 'structured'; S.pinned.clear(); load(); };
  });
}
function load() {
  M = tab().model; byId = new Map(M.nodes.map(n => [n.id, n]));
  adj = new Map(M.nodes.map(n => [n.id, { out: [], in: [] }]));
  M.edges.forEach(e => { adj.get(e.from).out.push(e); adj.get(e.to).in.push(e); });
  [...$('tabs').children].forEach((b, i) => b.setAttribute('aria-selected', String(i === S.tab)));
  $('title').textContent = isFlow() ? 'Web → server signal flow' : M.meta.name;
  $('meta').textContent = isFlow()
    ? `${M.meta.name} · via ${M.meta.hosts.join(', ') || 'no endpoint found'} · ${M.meta.paired ? 'server container serves this web container' : 'pairing assumed'}`
    : [M.meta.publicId, M.meta.context && M.meta.context + ' container', M.nodes.length + ' elements'].filter(Boolean).join(' · ');
  $('score').textContent = isFlow() ? `${M.summary.delivered}/${M.summary.routes}` : M.score;
  $('scoreLabel').textContent = isFlow() ? 'routes delivered' : 'configuration score';
  const st = isFlow() ? [['Routes', M.summary.routes], ['Delivered', M.summary.delivered], ['Dead ends', M.summary.dead]] : [['Elements', M.nodes.length], ['Links', M.edges.length], ['To act on', M.nodes.filter(n => n.risk === 'critical' || n.risk === 'review').length]];
  const stats = $('stats'); stats.textContent = '';
  st.forEach(([a, b]) => { const d = h('div', 'stat', '', stats); h('span', '', a, d); h('strong', '', b, d); });
  const k = $('kind'); k.length = 1; [...new Set(M.nodes.map(n => n.kind))].forEach(x => { const o = h('option', '', label(x), k); o.value = x; }); S.kind = 'all'; k.value = 'all';
  const mode = $('mode'); mode.textContent = '';
  views().forEach(([v, name]) => { const b = h('button', '', name, mode); b.dataset.view = v; b.onclick = () => setView(v); });
  side(); build(); rows(); setView(S.view, true);
}
function side() {
  const box = $('panels'); box.textContent = '';
  const block = title => { const s = h('section', 'block', '', box); h('h2', '', title, s); return s; };
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
    const g = el('g', { class: `node k-${n.kind} r-${n.risk || 'none'}`, tabindex: 0, role: 'button', 'aria-label': `${one(n.kind)} ${n.name}${n.risk ? ', ' + RISK[n.risk] : ''}` }, ng);
    g.dataset.id = n.id;
    el('circle', { class: 'ring', r: 8.5 }, g);
    const dot = el('circle', { class: 'dot', r: n.kind === 'tag' || n.kind === 'stag' || n.kind === 'wtag' ? 5 : 4.5, fill: cvar(n.kind) }, g);
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
  if (view === 'flow') {
    const cw = 250, row = 30, top = 70, cols = M.columns;
    caption = 'SIGNAL FLOW · WEB CONTAINER → ENDPOINT → SERVER CONTAINER → PLATFORMS';
    deco.push(['rect', { class: 'lane', x: 0, y: 0, width: cw * 2, height: 99999 }], ['rect', { class: 'lane', x: cw * 3, y: 0, width: cw * 4, height: 99999 }]);
    deco.push(['text', { class: 'side', x: 14, y: 22 }, 'WEB'], ['text', { class: 'side', x: cw * 3 + 14, y: 22 }, 'SERVER']);
    cols.forEach((c, i) => {
      const list = M.nodes.filter(n => n.col === i);
      deco.push(['text', { class: 'lanehead', x: i * cw + 14, y: 46 }, `${c.toUpperCase()}  ${list.length}`]);
      list.forEach((n, r) => { pos.set(n.id, { x: i * cw + 20, y: top + r * row }); nodeEls.get(n.id).t.textContent = short(n.name, 33); });
    });
    W = cols.length * cw; H = top + Math.max(...cols.map((_, i) => M.nodes.filter(n => n.col === i).length)) * row + 40;
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
  L.deco.forEach(([t, a, txt]) => { const e = el(t, a, g); if (txt) e.textContent = txt; if (t === 'line') e.setAttribute('y2', L.H); if (t === 'rect') e.setAttribute('height', L.H); });
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
  fit(v === 'spatial' || v === 'axonometric' ? 'all' : 'width', !first);
  apply(); if (first) intro();
  if (S.route) selectRoute(S.route, true);
}

/* ---------- pan, zoom, drag ---------- */
const svgBox = () => $('svg').getBoundingClientRect();
function applyT() { const { k, x, y } = S.T; $('vp').setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${k.toFixed(4)})`); $('zoomLevel').textContent = Math.round(k * 100) + '%'; mini(); }
function tweenT(to, animate) { if (G && animate) G.to(S.T, { ...to, duration: 0.6, ease: 'power2.inOut', onUpdate: applyT, overwrite: true }); else { Object.assign(S.T, to); applyT(); } }
function bbox() { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; S.pos.forEach(p => { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }); return { x0: x0 - 30, y0: Math.min(0, y0 - 60), x1: x1 + 260, y1: y1 + 30 }; }
function fit(mode, animate) {
  const r = svgBox(); if (!r.width) return; const b = bbox(), bw = b.x1 - b.x0, bh = b.y1 - b.y0;
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
  if (S.risk === 'none' ? n.risk : S.risk !== 'all' && n.risk !== S.risk) return false;
  if (S.q) return [n.name, n.ref, n.type, n.folder || ''].some(v => String(v).toLowerCase().includes(S.q));
  return true;
}
function reach(id) {
  const set = new Set([id]);
  if (S.trace === 'near') { adj.get(id).out.forEach(e => set.add(e.to)); adj.get(id).in.forEach(e => set.add(e.from)); return set; }
  for (const dir of ['out', 'in']) {
    const stack = [id], seen = new Set([id]);
    while (stack.length) { const cur = stack.pop(); for (const e of adj.get(cur)[dir]) { if (e.kind === 'duplicate') continue; const nx = dir === 'out' ? e.to : e.from; if (!seen.has(nx)) { seen.add(nx); set.add(nx); stack.push(nx); } } }
  }
  return set;
}
function routeSet(r) {
  const ids = new Set([...r.webTriggers, r.webTag, r.endpoint, r.client, r.eventNode, ...r.tags.map(t => t.id), ...r.tags.map(t => 'ds:' + t.destination)].filter(Boolean));
  const fired = new Set(r.tags.map(t => t.id));
  r.matched.forEach(m => { if (adj.get(m.id).out.some(e => fired.has(e.to)) || !r.tags.length) ids.add(m.id); });
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
  if (!S.sel) { h('p', 'empty', isFlow() ? 'Select a route on the right or any element to follow a signal from the web container to the platform it reaches.' : 'Select an element in the diagram or a recommendation below to trace what it fires on, reads and feeds.', box); stopParticles(); apply(); return; }
  const n = byId.get(S.sel), c = h('div', 'card', '', box);
  h('h3', '', n.name, c); h('p', 'sub', `${one(n.kind)} ${n.ref} · ${n.type}${n.folder ? ' · ' + n.folder : isFlow() ? '' : ' · no folder'}`, c);
  const ch = h('div', 'chips', '', c); if (n.paused) h('span', 'chip', 'paused', ch);
  [...new Set(n.findings.map(f => f.severity))].forEach(s => h('span', 'chip ' + s, RISK[s], ch)); if (!n.findings.length) h('span', 'chip', 'no findings', ch);
  n.findings.forEach(f => { const p = f.pair && byId.get(f.pair); h('p', 'find ' + f.severity, p ? `Same settings as ${p.name} (${one(p.kind)} ${p.ref}).` : f.message, c); });
  const o = adj.get(n.id), dl = h('dl', '', '', c), row = (lbl, ids, always) => { if (!ids.length && !always) return; h('dt', '', lbl, dl); names([...new Set(ids)], h('dd', '', '', dl)); };
  if (isFlow()) {
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
function legend() {
  const l = $('legend'); l.textContent = '';
  const add = (style, text) => { const s = h('span', '', '', l), i = h('i', style.ln ? 'ln' : '', '', s); Object.assign(i.style, style.css); s.append(text); };
  [...new Set(M.nodes.map(n => n.kind))].filter(k => k !== 'sink').forEach(k => add({ css: { background: cvar(k) } }, label(k)));
  if (isFlow()) { add({ ln: 1, css: { borderTop: '2px dashed var(--gold)' } }, 'Delivered'); add({ ln: 1, css: { borderTop: '2px dotted var(--amber)' } }, 'Conditional'); add({ ln: 1, css: { borderTop: '2px dashed var(--crit)' } }, 'Dead end'); }
  else { add({ css: { border: '2px solid var(--crit)' } }, 'Fix first'); add({ css: { border: '2px solid var(--gold)' } }, 'Confirm'); add({ ln: 1, css: { borderTop: '2px dashed var(--gold)' } }, 'Identical pair'); }
  h('span', 'hint', S.view === '3d' ? 'Drag to orbit · shift-drag to pan · scroll to zoom · click a node to select' : 'Drag to pan · ctrl/⌘ + scroll or pinch to zoom · drag a node to move it · +/− and 0 on the keyboard', l);
}

/* ---------- intro ---------- */
function intro() {
  if (!G) return;
  const ns = [...nodeEls.values()].map(x => x.g), ds = [...nodeEls.values()].map(x => x.dot), es = [...edgeEls.values()].map(x => x.p).filter(p => !p.classList.contains('s-ok'));
  const tl = G.timeline();
  tl.from(ns, { opacity: 0, duration: 0.35, stagger: { amount: 0.9 } }, 0).from(ds, { attr: { r: 0 }, duration: 0.5, stagger: { amount: 0.9 }, ease: 'back.out(3)' }, 0)
    .from(es, { opacity: 0, duration: 0.8, stagger: { amount: 0.6 } }, 0.5).from('#deco > *', { opacity: 0, duration: 0.6, stagger: 0.03 }, 0);
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
function leave3d() { T3.active = false; T3.raf && cancelAnimationFrame(T3.raf); T3.raf = null; $('labels').textContent = ''; }
function positions3d() {
  const P = new Map(), planes = [];
  if (isFlow()) {
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
  const o = T3.orbit; Object.assign(o, { tx: 0, ty: 0, tz: 0, r: T3.cur.radius, theta: 0.75, phi: isFlow() ? 0.85 : 1.1 });
  if (G) { const tl = G.timeline(); tl.from(o, { r: o.r * 2.2, theta: o.theta + 1.2, duration: 1.6, ease: 'power3.out' }); setTimeout(() => tl.progress(1), 2200); }
  apply(); loop3d();
}
function scene3d() {
  const THREE = window.THREE, scene = new THREE.Scene(), { P, planes } = positions3d(), meshes = new Map(), geo = new THREE.SphereGeometry(4, 14, 10), halo = new THREE.SphereGeometry(7, 12, 8);
  M.nodes.forEach(n => {
    const p = P.get(n.id); if (!p) return;
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: hex(n.kind), transparent: true })); m.position.set(...p); m.userData.id = n.id; scene.add(m); meshes.set(n.id, m);
    if (n.risk === 'review' || n.risk === 'critical') { const r = new THREE.Mesh(halo, new THREE.MeshBasicMaterial({ color: n.risk === 'critical' ? 0xff625f : 0xffe94a, wireframe: true, transparent: true, opacity: 0.55 })); r.position.set(...p); scene.add(r); m.userData.halo = r; }
  });
  planes.forEach(pl => {
    if (pl.y == null) return;
    const g = new THREE.PlaneGeometry(pl.w, pl.d), mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffe94a, transparent: true, opacity: 0.03, side: THREE.DoubleSide, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2; mesh.position.y = pl.y - 6; scene.add(mesh);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: 0x353025 })); edges.rotation.x = -Math.PI / 2; edges.position.y = pl.y - 6; scene.add(edges);
  });
  const curve = (a, b) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    if (!isFlow()) return [A, B];
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
  const ids = f ? [...f].slice(0, 40) : M.nodes.filter(n => n.risk === 'review' || n.risk === 'critical').map(n => n.id).slice(0, 18);
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
  c.addEventListener('contextmenu', e => e.preventDefault());
  c.addEventListener('wheel', e => { e.preventDefault(); o.r = Math.max(60, Math.min(5000, o.r * Math.exp(e.deltaY * 0.0012))); }, { passive: false });
}

/* ---------- wiring ---------- */
$('q').oninput = e => { S.q = e.target.value.toLowerCase().trim(); apply(); };
$('kind').onchange = e => { S.kind = e.target.value; apply(); };
$('risk').onchange = e => { S.risk = e.target.value; apply(); };
$('trace').onchange = e => { S.trace = e.target.value; apply(); };
$('zoomIn').onclick = () => (S.view === '3d' ? (T3.orbit.r *= 0.8) : zoomBy(1.25));
$('zoomOut').onclick = () => (S.view === '3d' ? (T3.orbit.r *= 1.25) : zoomBy(0.8));
$('fit').onclick = () => (S.view === '3d' ? Object.assign(T3.orbit, { tx: 0, ty: 0, tz: 0, r: T3.cur.radius }) : fit('all', true));
$('reset').onclick = () => { S.q = ''; S.kind = 'all'; S.risk = 'all'; S.trace = 'near'; S.route = null; S.pinned.clear(); $('q').value = ''; $('kind').value = 'all'; $('risk').value = 'all'; $('trace').value = 'near'; select(null); setView(isFlow() ? 'flow' : 'structured', true); };
document.addEventListener('keydown', e => { if (e.key === 'Escape') { S.route = null; select(null); } else if (e.key === '/' && !e.target.matches('input,select,textarea')) { e.preventDefault(); $('q').focus(); } });
let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (S.view !== 'schedule' && S.view !== '3d') mini(); }, 150); });
tabs();
const hv = location.hash.slice(1), want = ['structured', 'spatial', 'axonometric', 'schedule', '3d', 'flow'].includes(hv) ? hv : 'structured';
if (want === 'flow' && D.flow) { S.tab = D.containers.length; S.view = 'flow'; } else S.view = want;
load(); select(null);
})();

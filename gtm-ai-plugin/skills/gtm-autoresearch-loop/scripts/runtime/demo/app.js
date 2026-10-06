// GTM Audit Lab: the whole audit runs in this tab. Uses G (graph.mjs), F (flow.mjs),
// GTM_AUTO (atlas/auto.js) and SAMPLE (demo/sample.mjs), concatenated by demo/build.mjs.
(() => {
'use strict';
const $ = id => document.getElementById(id);
const h = (tag, cls, text, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
const NS = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v); if (parent) parent.append(e); return e; };
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, GS = window.gsap && !reduce ? window.gsap : null;
const short = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const toast = t => { const el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (el.hidden = true), 3600); };
const BUILTIN = { '2147479553': 'All Pages', '2147479572': 'Consent Initialization - All Pages', '2147479573': 'Initialization - All Pages' };
const SEV = { fix: 'Fix first', check: 'Check', tidy: 'Tidy' };
const DIM = { references: 'Broken links', duplicates: 'Copies', naming: 'Names', hygiene: 'Unused items', legacy: 'Old Universal Analytics', folders: 'Folders' };

/* ---------- analysis ---------- */
const cvOf = d => (d && d.containerVersion) || d || {};
function canon(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  return '{' + Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
}
const DROP = ['name', 'notes', 'path', 'fingerprint', 'accountId', 'containerId', 'workspaceId', 'parentFolderId', 'tagManagerUrl'];
// Same stripping as atlas.mjs autoInput(); the settings signature is kept as text instead of a hash.
function strip(cv) {
  const one = (row, idKey) => {
    const shape = Object.assign({}, row); [idKey, ...DROP].forEach(k => delete shape[k]);
    const out = { [idKey]: row[idKey], name: row.name, type: row.type, refs: [...G.refs(row)].map(n => '{{' + n + '}}').join(' '), sig: canon(shape) };
    if (row.parentFolderId) out.parentFolderId = row.parentFolderId; if (row.paused) out.paused = true;
    ['firingTriggerId', 'blockingTriggerId'].forEach(k => row[k] && (out[k] = row[k].slice()));
    ['setupTag', 'teardownTag'].forEach(k => row[k] && (out[k] = row[k].map(x => ({ tagName: x.tagName }))));
    return out;
  };
  return { publicId: (cv.container || {}).publicId || '', tag: cv.tag.map(r => one(r, 'tagId')), trigger: cv.trigger.map(r => one(r, 'triggerId')),
    variable: cv.variable.map(r => one(r, 'variableId')), folder: cv.folder.map(f => ({ folderId: f.folderId, name: f.name })), builtInVariable: cv.builtInVariable.map(v => ({ name: v.name })) };
}
function readExport(doc, want) {
  const cv = cvOf(doc);
  if (!cv || typeof cv !== 'object' || !(cv.container || cv.tag || cv.trigger || cv.variable || cv.client)) throw Error('This file is not a GTM container export. In GTM use Admin → Export Container.');
  ['tag', 'trigger', 'variable', 'folder', 'builtInVariable', 'client'].forEach(k => (cv[k] = Array.isArray(cv[k]) ? cv[k] : []));
  const ctx = ((cv.container || {}).usageContext || []).map(x => String(x).toUpperCase());
  if (want === 'server' && ctx.length && !ctx.includes('SERVER')) throw Error('That is a web container. Drop it in the web box, and the server export in this one.');
  if (want === 'web' && ctx.includes('SERVER')) throw Error('That is a server container. Drop it in the server box.');
  return doc;
}

function analyze(webDoc, serverDoc) {
  const cv = cvOf(webDoc), input = strip(cv), report = GTM_AUTO.audit(input);
  const gr = G.graph(report, webDoc);
  const flow = serverDoc ? F.signalFlow(webDoc, serverDoc) : null;
  const items = findings(cv, report, flow);
  return { webDoc, serverDoc, cv, input, report, graph: gr, flow, items, vendor: Object.fromEntries(cv.tag.map(t => [t.tagId, F.platformOf(cv, t)])) };
}

// Findings in plain words, each assigned to one of the masterclass checkpoints.
function findings(cv, report, flow) {
  const byId = { tag: new Map(cv.tag.map(t => [t.tagId, t])), trigger: new Map(cv.trigger.map(t => [t.triggerId, t])), variable: new Map(cv.variable.map(v => [v.variableId, v])) };
  const nameOf = (kind, id) => (byId[kind] && byId[kind].get(id) || {}).name || id;
  const out = [], add = o => out.push(o);
  for (const f of report.findings) {
    const base = { kind: f.kind, id: f.id, name: f.name, node: `${f.kind}:${f.id}` };
    const m = /^Configuration matches (\S+);/.exec(f.message);
    if (f.dimension === 'references') add({ ...base, cp: 2, sev: 'fix', msg: f.message.replace('Unresolved variable', 'Uses a variable that does not exist:').replace('Unresolved trigger ID', 'Fires on a trigger that does not exist:').replace('Unresolved parent folder', 'Sits in a folder that does not exist'),
      todo: /variable/.test(f.message) ? 'Create the variable or point the field at an existing one. Right now the field sends an empty value.' : 'Attach a trigger that exists.' });
    else if (f.dimension === 'duplicates') {
      const other = nameOf(f.kind, m && m[1]);
      add({ ...base, cp: 2, sev: f.kind === 'tag' ? 'fix' : 'check', msg: `Same settings as "${other}".`, pair: `${f.kind}:${m && m[1]}`,
        todo: f.kind === 'tag' ? 'If both fire, the hit or conversion is counted twice. Keep one.' : f.kind === 'trigger' ? 'Keep one trigger and point its tags at it.' : 'Keep one variable and update the fields that use the copy.' });
    }
    else if (f.dimension === 'legacy') add({ ...base, cp: 2, sev: 'check', msg: 'Universal Analytics tag. UA no longer processes data.', todo: 'Remove it, or replace it with the GA4 event you still need.' });
    else if (f.dimension === 'hygiene' && f.kind === 'tag') add({ ...base, cp: 1, sev: 'check', msg: 'Has no firing trigger, so it never runs.', todo: 'Attach the right trigger, or delete it if it is retired.' });
    else if (f.dimension === 'hygiene') add({ ...base, cp: 3, sev: 'tidy', msg: f.kind === 'trigger' ? 'No tag uses this trigger.' : 'Nothing in the container reads this variable.', todo: f.kind === 'trigger' ? 'Delete it once you confirm nobody plans to use it.' : 'Delete it, unless a custom template or page script reads it.' });
    else if (f.dimension === 'naming') add({ ...base, cp: 5, sev: 'tidy', msg: 'Generic name that does not say what it does.', todo: 'Rename it, for example "Platform - Event - Detail".' });
  }
  for (const t of cv.tag.filter(t => t.paused)) add({ kind: 'tag', id: t.tagId, name: t.name, node: `tag:${t.tagId}`, cp: 1, sev: 'check', msg: 'Paused.', todo: 'Confirm it is still needed. Delete it if it is retired.' });
  // Data layer: two variables reading the same key.
  const keys = new Map();
  for (const v of cv.variable.filter(v => v.type === 'v')) { const k = ((v.parameter || []).find(p => p.key === 'name') || {}).value; if (k) keys.set(k, [...(keys.get(k) || []), v]); }
  for (const [k, vs] of keys) if (vs.length > 1) vs.slice(1).forEach(v => add({ kind: 'variable', id: v.variableId, name: v.name, node: `variable:${v.variableId}`, cp: 4, sev: 'check', msg: `Reads the same data layer key as "${vs[0].name}" (${k}).`, todo: 'Use one variable per key, so a fix to one is not missed in the other.' }));
  const unfiled = cv.tag.length + cv.trigger.length + cv.variable.length - [...cv.tag, ...cv.trigger, ...cv.variable].filter(r => r.parentFolderId).length;
  if (unfiled) add({ kind: 'container', id: '', name: `${unfiled} items have no folder`, node: null, cp: 5, sev: 'tidy', msg: 'Hard to find things, and hard to hand over.', todo: 'Step 3 can file them for you.' });
  if (flow) {
    const fl = new Map(flow.nodes.map(n => [n.id, n]));
    for (const f of flow.findings) {
      const n = fl.get(f.target); if (!n) continue;
      const tagNode = n.kind === 'wtag' ? `tag:${n.ref}` : null;
      if (/no server trigger matches/.test(f.message)) add({ kind: 'tag', id: n.ref, name: n.name, node: tagNode, cp: 1, sev: 'fix', msg: f.message.replace(/ Closest server trigger: .*$/, ''), todo: 'Add a server trigger for this event, or stop sending it.' });
      else if (/^No event from this web container reaches/.test(f.message)) add({ kind: 'server tag', id: n.ref, name: n.name + ' (server)', node: null, cp: 1, sev: 'check', msg: 'Nothing from the web container ever reaches this server tag.', todo: 'Check the event name the server trigger waits for, or remove the tag.' });
      else if (/^Can fire \d+ times/.test(f.message)) add({ kind: 'server tag', id: n.ref, name: n.name + ' (server)', node: null, cp: 1, sev: 'check', msg: f.message.split('. Check')[0] + '.', todo: 'Make sure both send the same event ID so the platform counts it once.' });
    }
  }
  const rank = { fix: 0, check: 1, tidy: 2 };
  return out.sort((a, b) => rank[a.sev] - rank[b.sev] || a.cp - b.cp || a.name.localeCompare(b.name));
}

const CPS = [
  { n: 1, title: 'Tag firing conditions', q: 'Will each tag fire when it should, and only then?' },
  { n: 2, title: 'Parameter integrity', q: 'Does every field point at something real, once?' },
  { n: 3, title: 'Unused components', q: 'What is left over and safe to clear out?' },
  { n: 4, title: 'Data layer consistency', q: 'Does the data layer match what the tags read?' },
  { n: 5, title: 'Housekeeping', q: 'Can the next person find their way around?' },
];

/* ---------- state ---------- */
const S = { a: null, sample: true, cp: 0, sel: null, files: { web: null, server: null } };

function load(webDoc, serverDoc, label) {
  S.a = analyze(webDoc, serverDoc); S.cp = 0; S.sel = null;
  const cv = S.a.cv, c = cv.container || {};
  const b = $('banner'); b.className = 'banner'; b.textContent = '';
  h('span', '', `${S.sample ? 'Sample: ' : ''}${c.name || 'Container'} · ${c.publicId || ''} · ${cv.tag.length} tags, ${cv.trigger.length} triggers, ${cv.variable.length} variables${S.a.flow ? ' · with server container' : ''}`, b);
  if (S.sample) h('span', 'muted', 'Made-up data. Load your own export above to audit it.', b);
  renderAudit(); renderDL(); renderFlow(); tidyInit();
  if (label) toast(label);
}
function fail(msg) { const b = $('banner'); b.className = 'banner err'; b.textContent = msg; }

/* ---------- step 1 ---------- */
function wireDrop(kind) {
  const box = $(kind === 'web' ? 'dropWeb' : 'dropServer'), inp = $(kind === 'web' ? 'fileWeb' : 'fileServer');
  const take = file => {
    if (!file) return;
    file.text().then(text => {
      let doc; try { doc = readExport(JSON.parse(text), kind); } catch (e) { return fail(e instanceof SyntaxError ? `${file.name} is not valid JSON. Export it again from GTM (Admin → Export Container).` : e.message); }
      S.files[kind] = doc; $(kind === 'web' ? 'nameWeb' : 'nameServer').textContent = file.name; box.classList.add('loaded');
      if (kind === 'server' && !S.files.web) return fail('Server export loaded. Now add the web container export.');
      S.sample = false;
      try { load(S.files.web, S.files.server, `Audited ${file.name}`); } catch (e) { fail('Could not read this export: ' + e.message); }
      location.hash = 'audit'; $('audit').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    }, () => fail('Could not read that file.'));
  };
  inp.addEventListener('change', () => { take(inp.files[0]); inp.value = ''; });
  ['dragenter', 'dragover'].forEach(e => box.addEventListener(e, ev => { ev.preventDefault(); box.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(e => box.addEventListener(e, () => box.classList.remove('over')));
  box.addEventListener('drop', ev => { ev.preventDefault(); take(ev.dataTransfer.files[0]); });
}

/* ---------- step 2 ---------- */
function countUp(el, to, digits) {
  const v = Number(to);
  if (!GS) { el.textContent = v.toFixed(digits); return; }
  const o = { v: Number(el.textContent) || 0 }; GS.to(o, { v, duration: 0.9, ease: 'power2.out', onUpdate: () => (el.textContent = o.v.toFixed(digits)) });
  setTimeout(() => (el.textContent = v.toFixed(digits)), 1300);
}
function renderAudit() {
  const a = S.a, items = a.items, n = s => items.filter(i => i.sev === s).length;
  countUp($('score'), Math.round(a.report.score), 0);
  $('verdict').textContent = n('fix') ? `${n('fix')} thing${n('fix') > 1 ? 's' : ''} to fix before anything else.` : n('check') ? 'Nothing broken. A few things to check.' : 'In good shape. Only housekeeping left.';
  const counts = $('counts'); counts.textContent = '';
  ['fix', 'check', 'tidy'].forEach(s => h('span', 'pill ' + s, `${n(s)} ${SEV[s].toLowerCase()}`, counts));
  const cps = $('cps'); cps.textContent = '';
  CPS.forEach(cp => {
    const mine = items.filter(i => i.cp === cp.n), b = h('button', 'cp', null, cps); b.setAttribute('aria-pressed', String(S.cp === cp.n));
    h('span', 'k', '0' + cp.n, b); const t = h('span', 't', null, b); h('b', '', cp.title, t); h('span', '', cp.q, t);
    const c = h('span', 'cpcount', null, b);
    const f = mine.filter(i => i.sev === 'fix').length, k = mine.filter(i => i.sev === 'check').length, d = mine.filter(i => i.sev === 'tidy').length;
    if (f) h('span', 'pill fix', f, c); if (k) h('span', 'pill check', k, c); if (d) h('span', 'pill tidy', d, c); if (!mine.length) h('span', 'pill ok', cp.n === 4 ? 'paste a push' : 'clear', c);
    b.onclick = () => { S.cp = S.cp === cp.n ? 0 : cp.n; S.sel = null; renderAudit(); if (S.cp === 4) $('dlCard').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); };
  });
  renderList(); renderMap();
}
function renderList() {
  const list = $('list'); list.textContent = '';
  const shown = S.a.items.filter(i => !S.cp || i.cp === S.cp);
  $('listTitle').textContent = S.cp ? `Checkpoint ${S.cp} · ${CPS[S.cp - 1].title}` : 'Prioritized findings';
  $('listCount').textContent = `${shown.length} finding${shown.length === 1 ? '' : 's'}`;
  if (!shown.length) { h('p', 'empty', S.cp === 4 ? 'No data layer conflicts in the configuration. Paste a push below to check live data.' : 'Nothing to report here.', list); return; }
  shown.forEach(i => {
    const b = h('button', 'item' + (S.sel && S.sel === i.node ? ' sel' : ''), null, list);
    h('span', 'pill ' + i.sev, SEV[i.sev], b); h('span', 'name', i.name, b);
    h('span', 'msg', i.msg, b); h('span', 'todo', i.todo, b); h('span', 'where', `${i.kind}${i.id ? ' ' + i.id : ''} · checkpoint ${i.cp}`, b);
    b.onclick = () => { S.sel = S.sel === i.node ? null : i.node; renderList(); paintMap(); scrollMapTo(i.node); };
  });
}

/* map: Trigger → Tag → Variable */
const M = { pos: new Map(), nodes: new Map(), edges: [], adj: new Map() };
function renderMap() {
  const svg = $('map'), g = S.a.graph; svg.textContent = '';
  const cols = { trigger: 0, tag: 1, variable: 2, builtin: 2 }, X = [16, 300, 584], row = 24, top = 44;
  const lists = [[], [], []];
  g.nodes.filter(n => n.kind in cols).forEach(n => lists[cols[n.kind]].push(n));
  const sevOf = new Map(); S.a.items.forEach(i => i.node && (!sevOf.has(i.node) || i.sev === 'fix') && sevOf.set(i.node, i.sev));
  const rank = n => ({ fix: 0, check: 1, tidy: 2 }[sevOf.get(n.id)] ?? 3);
  lists.forEach(l => l.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name)));
  const H = top + Math.max(...lists.map(l => l.length), 1) * row + 16;
  svg.setAttribute('viewBox', `0 0 860 ${H}`); svg.style.height = H + 'px';
  ['TRIGGERS', 'TAGS', 'VARIABLES'].forEach((t, i) => sv('text', { class: 'lane', x: X[i], y: 22 }, svg).textContent = `${t}  ${lists[i].length}`);
  M.pos.clear(); M.nodes.clear(); M.edges = []; M.adj.clear();
  lists.forEach((l, c) => l.forEach((n, r) => M.pos.set(n.id, { x: X[c] + 6, y: top + r * row })));
  const eg = sv('g', {}, svg), ng = sv('g', {}, svg);
  for (const e of g.edges) {
    if (!M.pos.has(e.from) || !M.pos.has(e.to) || e.kind === 'duplicate' || e.kind === 'sequence') continue;
    const [from, to] = e.kind === 'fires' || e.kind === 'blocks' ? [e.to, e.from] : [e.from, e.to];
    const a = M.pos.get(from), b = M.pos.get(to); if (a.x === b.x) continue;
    const p = sv('path', { class: 'edge', d: `M${a.x + 6},${a.y}C${(a.x + b.x) / 2},${a.y} ${(a.x + b.x) / 2},${b.y} ${b.x - 6},${b.y}` }, eg);
    M.edges.push({ from, to, p });
    [from, to].forEach(id => M.adj.has(id) || M.adj.set(id, new Set())); M.adj.get(from).add(to); M.adj.get(to).add(from);
  }
  for (const n of g.nodes) {
    const p = M.pos.get(n.id); if (!p) continue;
    const el = sv('g', { class: 'node ' + (sevOf.get(n.id) || ''), transform: `translate(${p.x},${p.y})`, tabindex: 0, role: 'button', 'aria-label': `${n.kind} ${n.name}` }, ng);
    sv('circle', { r: 5 }, el); sv('text', { x: 10, y: 4 }, el).textContent = short(n.name, 36);
    el.addEventListener('mouseenter', () => paintMap(n.id)); el.addEventListener('mouseleave', () => paintMap());
    el.addEventListener('focus', () => paintMap(n.id)); el.addEventListener('blur', () => paintMap());
    const pick = () => { S.sel = S.sel === n.id ? null : n.id; renderList(); paintMap(); const it = $('list').querySelector('.item.sel'); it && it.scrollIntoView({ block: 'nearest' }); };
    el.addEventListener('click', pick); el.addEventListener('keydown', ev => (ev.key === 'Enter' || ev.key === ' ') && (ev.preventDefault(), pick()));
    M.nodes.set(n.id, el);
  }
  paintMap();
  if (GS) GS.from(ng.children, { opacity: 0, duration: 0.3, stagger: { amount: 0.5 }, clearProps: 'opacity' });
}
function paintMap(hover) {
  const focus = hover || S.sel, near = focus ? new Set([focus, ...(M.adj.get(focus) || [])]) : null;
  const inCp = S.cp ? new Set(S.a.items.filter(i => i.cp === S.cp && i.node).map(i => i.node)) : null;
  M.nodes.forEach((el, id) => { el.classList.toggle('dim', near ? !near.has(id) : inCp ? !inCp.has(id) : false); el.classList.toggle('sel', id === S.sel); });
  M.edges.forEach(e => { const hot = !!focus && (e.from === focus || e.to === focus); e.p.classList.toggle('hot', hot); e.p.classList.toggle('dim', !!(near || inCp) && !hot); });
}
function scrollMapTo(id) { const p = id && M.pos.get(id), box = document.querySelector('.mapbox'); if (p && box) box.scrollTo({ top: Math.max(0, p.y * (box.querySelector('svg').getBoundingClientRect().width / 860) - 120), behavior: reduce ? 'auto' : 'smooth' }); }

/* checkpoint 4: data layer */
const SAMPLE_PUSH = { event: 'purchase', ecommerce: { transaction_id: 'T-1001', value: 129.0, items: [{ item_id: 'TENT-2P', item_name: 'Two-person tent', price: 129.0, quantity: 1 }] } };
function dlFacts() {
  const cv = S.a.cv, events = new Set(), keys = new Map();
  for (const t of cv.trigger) for (const c of t.customEventFilter || []) { const a1 = ((c.parameter || []).find(p => p.key === 'arg1') || {}).value; if (a1) events.add(a1); }
  for (const v of cv.variable.filter(v => v.type === 'v')) { const k = ((v.parameter || []).find(p => p.key === 'name') || {}).value; if (k) keys.set(v.name, k); }
  return { events, keys };
}
function renderDL() {
  const { events, keys } = dlFacts(), box = $('dlEvents'); box.textContent = '';
  $('dlFacts').textContent = `${events.size} custom events · ${keys.size} data layer variables`;
  [...events].sort().forEach(e => h('code', '', e, box));
  if (!$('push').value || $('push').dataset.auto === '1') { $('push').value = JSON.stringify(SAMPLE_PUSH, null, 2); $('push').dataset.auto = '1'; }
  $('pushResult').textContent = ''; $('pushNote').textContent = 'The example push is missing its currency. Check it to see what happens.';
}
function getPath(o, path) { return path.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o); }
function checkPush() {
  const out = $('pushResult'); out.textContent = ''; $('pushNote').textContent = '';
  let push; try { push = JSON.parse($('push').value.trim().replace(/^dataLayer\.push\(|\);?$/g, '')); } catch (e) { $('pushNote').textContent = 'That is not valid JSON. Paste just the object inside dataLayer.push( … ).'; return; }
  const line = (ok, text) => { const li = h('li', '', null, out); h('span', ok === true ? 'y' : ok === false ? 'n' : 'q', ok === true ? '✓' : ok === false ? '✕' : '–', li); h('span', '', text, li); };
  const cv = S.a.cv, ev = push && push.event, { events } = dlFacts();
  if (!ev) { line(false, 'No "event" key, so no custom event trigger can fire on this push.'); return; }
  line(events.has(ev), events.has(ev) ? `The container listens for "${ev}".` : `No trigger listens for "${ev}". Tags will not fire on it. Check the spelling against: ${[...events].join(', ')}.`);
  // Which tags fire on this event, and which data layer keys they read.
  const trig = cv.trigger.filter(t => (t.customEventFilter || []).some(c => ((c.parameter || []).find(p => p.key === 'arg1') || {}).value === ev));
  const tids = new Set(trig.map(t => t.triggerId)), tags = cv.tag.filter(t => !t.paused && (t.firingTriggerId || []).some(id => tids.has(id)));
  const dlv = new Map(cv.variable.filter(v => v.type === 'v').map(v => [v.name, ((v.parameter || []).find(p => p.key === 'name') || {}).value]));
  const needed = new Map();
  tags.forEach(t => G.refs(t).forEach(n => dlv.has(n) && needed.set(dlv.get(n), [...(needed.get(dlv.get(n)) || []), t.name])));
  if (tags.length) line(null, `${tags.length} tag${tags.length > 1 ? 's' : ''} fire on it: ${tags.map(t => t.name).join(', ')}.`);
  for (const [k, who] of needed) { const v = getPath(push, k); line(v !== undefined && v !== '', v !== undefined && v !== '' ? `${k} is present.` : `${k} is missing. ${[...new Set(who)].join(', ')} will send it empty.`); }
  if (ev === 'purchase') {
    const e = push.ecommerce, isObj = e && typeof e === 'object' && !Array.isArray(e);
    line(isObj, isObj ? 'ecommerce is an object.' : 'ecommerce must be an object, not an array or missing.');
    if (isObj) {
      line(typeof e.transaction_id === 'string' && !!e.transaction_id, e.transaction_id ? 'transaction_id is set, so GA4 can drop duplicate purchases.' : 'transaction_id is missing. GA4 cannot drop duplicate purchases.');
      line(e.value !== undefined, e.value !== undefined ? 'value is set.' : 'value is missing.');
      const cur = e.currency; line(typeof cur === 'string' && /^[A-Z]{3}$/.test(cur), typeof cur === 'string' && /^[A-Z]{3}$/.test(cur) ? `currency is ${cur}.` : cur ? `currency "${cur}" is not a three-letter uppercase ISO code.` : 'currency is missing. GA4 needs it whenever value is sent, or the revenue is dropped.');
      const ok = Array.isArray(e.items) && e.items.some(i => i && (i.item_id || i.item_name)); line(ok, ok ? 'items has at least one product with an ID or name.' : 'items is missing or has no product with an item_id or item_name.');
    }
    $('pushNote').textContent = 'These are rule checks. The /gtm-audit skill can also have Jev, a calibrated AI judge, check purchase pushes.';
  }
  $('push').dataset.auto = '0';
}

/* web → server */
function renderFlow() {
  const f = S.a.flow, card = $('flowCard'); card.hidden = !f; if (!f) return;
  const box = $('routes'); box.textContent = '';
  $('flowSum').textContent = `${f.summary.delivered} of ${f.summary.routes} events reach a platform`;
  const name = id => (f.nodes.find(n => n.id === id) || {}).name || id;
  [...f.routes].sort((a, b) => (a.status === 'dead-end' ? 0 : 1) - (b.status === 'dead-end' ? 0 : 1)).forEach(r => {
    const d = h('div', 'route', null, box), l = h('div', '', null, d);
    h('b', '', name(r.webTag), l); h('div', 'path', `${r.event || 'dynamic event'} → ${r.client ? name(r.client) : 'no client'} → ${r.tags.length ? r.tags.map(t => name(t.id)).join(', ') : 'nothing'}`, l);
    h('span', 'pill ' + (r.status === 'dead-end' ? 'fix' : r.status === 'delivered' ? 'ok' : 'check'), r.status === 'dead-end' ? 'Goes nowhere' : r.status === 'delivered' ? 'Delivered' : 'Depends', d);
  });
}

/* findings file */
function findingsMd() {
  const a = S.a, c = a.cv.container || {}, date = new Date().toISOString().slice(0, 10), lines = [];
  lines.push(`# GTM audit · ${c.name || 'Container'} (${c.publicId || ''})`, '', `${date} · Health ${Math.round(a.report.score)}/100 · ${a.cv.tag.length} tags, ${a.cv.trigger.length} triggers, ${a.cv.variable.length} variables`, '');
  for (const s of ['fix', 'check', 'tidy']) {
    const list = a.items.filter(i => i.sev === s); if (!list.length) continue;
    lines.push(`## ${SEV[s]} (${list.length})`, '');
    list.forEach((i, n) => lines.push(`${n + 1}. **${i.name}** (${i.kind}${i.id ? ' ' + i.id : ''}, checkpoint ${i.cp}: ${CPS[i.cp - 1].title})  `, `   ${i.msg} ${i.todo}`));
    lines.push('');
  }
  lines.push('---', 'Static review of the container export (GTM Audit Lab). It does not prove tags fire on the live site; check key events in GTM Preview.');
  return lines.join('\n');
}
async function saveFile(name, text, what) {
  try {
    const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
    if (dl) { await dl.save({ filename: name, data: text }); toast(`Saved ${what}.`); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: name.endsWith('.json') ? 'application/json' : 'text/markdown' })); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast(`Saved ${what}.`);
  } catch (e) { toast(e && e.code === 'declined' ? 'Save cancelled.' : 'This view cannot save files. Use Copy instead.'); }
}

/* ---------- step 3: GTM Autoresearch ---------- */
const T = { st: null, timer: null, running: false, sample: null, busy: false };
function tidyInit() {
  stop(); T.st = GTM_AUTO.start(S.a.input, { maxRounds: 8 });
  $('tScore').textContent = T.st.baseline.score.toFixed(1); $('tFrom').textContent = `Starting score ${T.st.baseline.score.toFixed(1)}. The light mark on each bar shows where it started.`;
  $('rounds').textContent = ''; $('saveContainer').disabled = true; drawBars(); buttons();
}
function drawBars() {
  const box = $('bars'); box.textContent = '';
  GTM_AUTO.dims.forEach(k => {
    const base = T.st.baseline.dimensions[k], now = T.st.report.dimensions[k], r = h('div', 'bar', null, box);
    h('span', '', DIM[k], r); const tr = h('span', 'track', null, r), fill = h('i', '', null, tr), mark = h('u', '', null, tr);
    mark.style.left = `calc(${base}% - 1px)`; fill.style.width = (GS ? Math.min(base, now) : now) + '%'; if (GS) GS.to(fill, { width: now + '%', duration: 0.8, ease: 'power2.out' });
    h('span', 'v', now - base > 0.5 ? `+${Math.round(now - base)}` : Math.round(now), r);
  });
}
function buttons() { $('run').disabled = T.running || T.busy; $('stepBtn').disabled = T.st.done || T.running || T.busy; $('ask').disabled = T.st.done || T.running || T.busy; $('run').textContent = T.st.rounds.length ? 'Run again' : 'Run the loop'; }
function pulse(i) { [1, 2, 3].forEach(k => $('lp' + k).classList.toggle('on', k === i)); }
function describeOps(ops) {
  const folders = ops.filter(o => o.op === 'addFolder').map(o => `"${o.name}"`), moves = ops.filter(o => o.op === 'assignFolder').length, renames = ops.filter(o => o.op === 'rename').length;
  return [folders.length && `create ${folders.length} folder${folders.length > 1 ? 's' : ''} (${folders.slice(0, 4).join(', ')}${folders.length > 4 ? ', …' : ''})`, moves && `file ${moves} item${moves > 1 ? 's' : ''}`, renames && `rename ${renames} item${renames > 1 ? 's' : ''}`].filter(Boolean).join(', ') || 'no changes';
}
function addRound(e) {
  const d = h('div', 'round ' + (e.accepted ? 'ok' : 'no'), null, $('rounds'));
  h('b', '', `Round ${e.round} · ${e.accepted ? 'kept' : 'thrown away'}${e.score != null ? ` · ${e.score.toFixed(1)}` : ''}${e.source === 'claude' ? ' · idea from Claude' : ''}`, d);
  h('span', '', `${e.why} Proposed: ${describeOps(e.operations)}.`, d);
  h('span', '', e.error ? `The safety rules refused it: ${e.error.replace('Cannot rename referenced variable', 'other tags use that variable by name, so renaming it would break them')}.` : e.reason.replace('Score rose with no new critical findings and no dimension lower.', 'The score went up and no check got worse.').replace('Rejected: the score did not rise.', 'The score did not go up.'), d);
  if (GS) GS.from(d, { opacity: 0, y: 8, duration: 0.4, clearProps: 'all' });
}
function after(e) {
  pulse(2); setTimeout(() => pulse(3), reduce ? 0 : 350); setTimeout(() => pulse(0), reduce ? 0 : 1100);
  addRound(e); countUp($('tScore'), T.st.report.score, 1); drawBars();
  $('saveContainer').disabled = !T.st.rounds.some(r => r.accepted);
  if (T.st.done) h('p', 'note', T.st.failures >= T.st.maxFailures ? 'Stopped: too many proposals were refused.' : T.st.plateau >= T.st.plateauRounds ? 'Stopped: two rounds in a row without improvement.' : T.st.rounds.length >= T.st.maxRounds ? 'Stopped: round limit reached.' : 'Stopped: no more ideas to try.', $('rounds'));
  buttons();
}
function one() {
  if (T.st.done) return null;
  pulse(1);
  const p = GTM_AUTO.propose(T.st, { vendor: S.a.vendor });
  if (!p) { T.st.done = true; after({ round: T.st.rounds.length + 1, accepted: false, why: 'No more ideas.', operations: [], reason: 'Nothing left to try.' }); T.st.rounds.pop(); return null; }
  const e = GTM_AUTO.step(T.st, p); after(e); return e;
}
function stop() { clearTimeout(T.timer); T.running = false; }
function run() {
  if (T.st.rounds.length) tidyInit();
  T.running = true; buttons();
  const tick = () => { if (!T.running) return; const e = one(); if (!e || T.st.done) { stop(); buttons(); return; } T.timer = setTimeout(tick, reduce ? 150 : 1500); };
  T.timer = setTimeout(tick, 200);
}
async function askClaude() {
  if (!T.sample || T.busy || T.st.done) return;
  T.busy = true; buttons(); pulse(1); toast('Asking Claude for one round. This takes a few seconds.');
  const c = T.st.best, cnt = {}; T.st.report.findings.forEach(f => (cnt[f.dimension] = (cnt[f.dimension] || 0) + 1));
  const unfiled = ['tag', 'trigger', 'variable'].flatMap(k => c[k].filter(r => !r.parentFolderId).map(r => `${k} ${r[k + 'Id']} "${r.name}"${k === 'tag' && S.a.vendor[r.tagId] ? ' [' + S.a.vendor[r.tagId] + ']' : ''}`)).slice(0, 140);
  const maxId = Math.max(0, ...c.folder.map(f => +f.folderId || 0));
  const prompt = ['You propose ONE round of metadata-only cleanup for a Google Tag Manager container. Reply with JSON only: {"why":"one sentence","operations":[...]}.',
    `Allowed operations: {"op":"addFolder","id":"<numeric string greater than ${maxId}>","name":"..."}; {"op":"assignFolder","kind":"tag|trigger|variable","id":"<element id>","folderId":"<folder id>"}; {"op":"rename","kind":"tag|trigger|variable","id":"<element id>","name":"..."}.`,
    'Rules: at most 100 operations; names must not contain { or }; variables that other elements reference cannot be renamed; the round is kept only if the audit score rises and no check goes down.',
    'Check scores now: ' + GTM_AUTO.dims.map(k => `${k} ${Math.round(T.st.report.dimensions[k])}`).join(', ') + '. Finding counts: ' + JSON.stringify(cnt) + '.',
    'Folders: ' + (c.folder.map(f => `${f.folderId} "${f.name}"`).join('; ') || 'none') + '.', 'Elements without a folder:\n' + unfiled.join('\n')].join('\n\n');
  try {
    const out = await T.sample.json(prompt, { modelTier: 'default' });
    after(GTM_AUTO.step(T.st, { idea: 'claude-' + (T.st.rounds.length + 1), why: String((out && out.why) || 'Claude suggested a round.').slice(0, 300), source: 'claude', operations: Array.isArray(out && out.operations) ? out.operations : [] }));
  } catch (e) {
    pulse(0); toast(e && e.code === 'rate_limited' ? 'Claude is busy. Try again in a minute.' : e && e.code === 'not_granted' ? 'Claude is not available on this page.' : 'Claude did not return a usable round.');
    if (e && e.code === 'not_granted') { T.sample = null; $('ask').hidden = true; }
  } finally { T.busy = false; buttons(); }
}

/* ---------- wiring ---------- */
wireDrop('web'); wireDrop('server');
$('useSample').onclick = () => { S.sample = true; S.files = { web: null, server: null }; ['nameWeb', 'nameServer'].forEach(id => ($(id).textContent = '')); ['dropWeb', 'dropServer'].forEach(id => $(id).classList.remove('loaded')); load(SAMPLE.sampleWeb(), SAMPLE.sampleServer(), 'Loaded the sample container'); };
$('checkPush').onclick = checkPush;
$('push').addEventListener('input', () => ($('push').dataset.auto = '0'));
$('saveFindings').onclick = () => saveFile(`${(S.a.cv.container || {}).publicId || 'container'}-findings.md`, findingsMd(), 'the findings');
$('copyFindings').onclick = () => { try { navigator.clipboard.writeText(findingsMd()).then(() => toast('Findings copied.'), () => toast('Copy was blocked. Use Download instead.')); } catch (e) { toast('Copy was blocked. Use Download instead.'); } };
$('run').onclick = run; $('stepBtn').onclick = () => { stop(); one(); }; $('reset').onclick = tidyInit; $('ask').onclick = askClaude;
$('saveContainer').onclick = () => {
  const rounds = T.st.rounds.filter(r => r.accepted).map(r => r.operations);
  let doc; try { doc = GTM_AUTO.exportContainer(S.a.webDoc, rounds); } catch (e) { toast('Could not build the file: ' + e.message); return; }
  saveFile(`${(S.a.cv.container || {}).publicId || 'container'}-tidied.json`, JSON.stringify(doc, null, 2), 'the tidied container');
};
(async () => { try { T.sample = window.claude && window.claude.use ? await window.claude.use('sample') : null; } catch (e) { T.sample = null; } $('ask').hidden = !T.sample; })();
load(SAMPLE.sampleWeb(), SAMPLE.sampleServer());
})();

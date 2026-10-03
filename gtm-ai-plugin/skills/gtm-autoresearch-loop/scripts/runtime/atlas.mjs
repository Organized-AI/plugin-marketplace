import { readFileSync } from 'node:fs';
import { signalFlow, platformOf } from './flow.mjs';
import { auditView } from './audit-view.mjs';
import { hash } from './audit.mjs';
// Interactive "container atlas" report in the GTM Command Center visual language.
// The page embeds only names, types, IDs and relationships. Parameter values
// (constants, tokens, custom HTML) are never copied into the output.

const builtinTriggers = { '2147479553': 'All Pages', '2147479572': 'Consent Initialization - All Pages', '2147479573': 'Initialization - All Pages' };
const internalVariables = { _event: 'Event' };
const kindOrder = ['client', 'tag', 'trigger', 'variable', 'builtin'];
const sevRank = { critical: 3, review: 2, info: 1 };

function refs(value, out = new Set()) {
  if (typeof value === 'string') for (const m of value.matchAll(/\{\{([^{}]+)\}\}/g)) out.add(m[1]);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) refs(v, out);
  return out;
}

export function graph(report, snapshot) {
  const c = snapshot?.containerVersion ?? snapshot ?? {}, info = c.container ?? {};
  const nodes = new Map(), edges = [], folders = Object.fromEntries((c.folder ?? []).map(f => [f.folderId, f.name]));
  const add = (id, n) => (nodes.has(id) || nodes.set(id, { id, findings: [], risk: null, ...n }), nodes.get(id));
  const link = (from, to, kind) => from !== to && edges.push({ from, to, kind });
  for (const t of c.tag ?? []) add(`tag:${t.tagId}`, { kind: 'tag', ref: t.tagId, name: t.name, type: t.type, folder: folders[t.parentFolderId] ?? null, paused: !!t.paused });
  for (const t of c.trigger ?? []) add(`trigger:${t.triggerId}`, { kind: 'trigger', ref: t.triggerId, name: t.name, type: t.type, folder: folders[t.parentFolderId] ?? null });
  for (const v of c.variable ?? []) add(`variable:${v.variableId}`, { kind: 'variable', ref: v.variableId, name: v.name, type: v.type, folder: folders[v.parentFolderId] ?? null });
  for (const k of c.client ?? []) add(`client:${k.clientId}`, { kind: 'client', ref: k.clientId, name: k.name, type: k.type, folder: folders[k.parentFolderId] ?? null });
  const byVar = new Map((c.variable ?? []).map(v => [v.name, `variable:${v.variableId}`]));
  const builtin = name => add(`builtin:${name}`, { kind: 'builtin', ref: name, name, type: 'built-in variable', folder: null });
  const tagByName = new Map((c.tag ?? []).flatMap(t => [[t.name, `tag:${t.tagId}`], [t.tagId, `tag:${t.tagId}`]]));
  const readFrom = (row, id) => {
    // Only the reference names are read; the row's values never leave this function.
    const { name, notes, ...rest } = row;
    for (const r of refs(rest)) {
      const target = byVar.get(r) ?? builtin(internalVariables[r] ?? r).id;
      link(id, target, 'reads');
    }
  };
  for (const t of c.tag ?? []) {
    const id = `tag:${t.tagId}`;
    for (const tr of t.firingTriggerId ?? []) link(id, builtinTriggers[tr] ? add(`trigger:${tr}`, { kind: 'trigger', ref: tr, name: builtinTriggers[tr], type: 'built-in trigger', folder: null }).id : `trigger:${tr}`, 'fires');
    for (const tr of t.blockingTriggerId ?? []) link(id, builtinTriggers[tr] ? add(`trigger:${tr}`, { kind: 'trigger', ref: tr, name: builtinTriggers[tr], type: 'built-in trigger', folder: null }).id : `trigger:${tr}`, 'blocks');
    for (const s of [...t.setupTag ?? [], ...t.teardownTag ?? []]) { const other = tagByName.get(s.tagName); if (other) link(other, id, 'sequence'); }
    readFrom(t, id);
  }
  for (const t of c.trigger ?? []) readFrom(t, `trigger:${t.triggerId}`);
  for (const v of c.variable ?? []) readFrom(v, `variable:${v.variableId}`);
  for (const k of c.client ?? []) readFrom(k, `client:${k.clientId}`);
  // Paint audit findings onto nodes; link duplicate pairs.
  for (const f of report.findings ?? []) {
    const n = nodes.get(`${f.kind}:${f.id}`);
    if (!n) continue;
    const m = /^Configuration matches (\S+);/.exec(f.message ?? '');
    const pair = m ? `${f.kind}:${m[1]}` : null;
    n.findings.push({ severity: f.severity, dimension: f.dimension, message: f.message, pair });
    if (!n.risk || sevRank[f.severity] > sevRank[n.risk]) n.risk = f.severity;
    if (pair && nodes.has(pair)) link(n.id, pair, 'duplicate');
  }
  const seen = new Set(), unique = edges.filter(e => nodes.has(e.from) && nodes.has(e.to) && !seen.has(`${e.from}>${e.to}>${e.kind}`) && seen.add(`${e.from}>${e.to}>${e.kind}`));
  // Order each family by the average position of what it connects to (fewer crossings in column views).
  const list = [...nodes.values()], index = new Map();
  const family = k => list.filter(n => n.kind === k);
  family('tag').sort((a, b) => (a.folder ?? '~').localeCompare(b.folder ?? '~') || a.name.localeCompare(b.name)).forEach((n, i) => index.set(n.id, i));
  family('client').sort((a, b) => a.name.localeCompare(b.name)).forEach((n, i) => index.set(n.id, i));
  for (const k of ['trigger', 'variable', 'builtin']) {
    const score = n => { const ps = unique.filter(e => e.to === n.id && index.has(e.from)).map(e => index.get(e.from)); return ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : 1e6; };
    family(k).map(n => [n, score(n)]).sort((a, b) => a[1] - b[1] || a[0].name.localeCompare(b[0].name)).forEach(([n], i) => index.set(n.id, i));
  }
  const ordered = list.sort((a, b) => kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind) || index.get(a.id) - index.get(b.id));
  return {
    meta: { name: info.name ?? 'GTM container', publicId: info.publicId ?? '', context: (info.usageContext ?? []).join(', ').toLowerCase() },
    score: Math.round(Number(report.score) || 0),
    dims: Object.entries(report.dimensions ?? {}).map(([k, v]) => ({ key: k, score: Math.round(v) })),
    skipped: report.skipped ?? [], scope: report.scope ?? '',
    nodes: ordered, edges: unique,
  };
}

const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const json = v => JSON.stringify(v).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, ch => ch === '\u2028' ? '\\u2028' : '\\u2029');

// Stripped container for the in-page Autoresearch loop: identities, links,
// {{references}} and a settings hash. Scores computed on it match audit.mjs.
const SHAPE_DROP = ['name', 'notes', 'path', 'fingerprint', 'accountId', 'containerId', 'workspaceId', 'parentFolderId', 'tagManagerUrl'];
export function autoInput(snapshot) {
  const c = cvOf(snapshot);
  const strip = (row, idKey) => {
    const shape = { ...row }; for (const k of [idKey, ...SHAPE_DROP]) delete shape[k];
    const out = { [idKey]: row[idKey], name: row.name, type: row.type, refs: [...refs(row)].map(n => `{{${n}}}`).join(' '), sig: hash(shape).slice(0, 20) };
    if (row.parentFolderId) out.parentFolderId = row.parentFolderId;
    if (row.paused) out.paused = true;
    for (const k of ['firingTriggerId', 'blockingTriggerId']) if (row[k]) out[k] = [...row[k]];
    for (const k of ['setupTag', 'teardownTag']) if (row[k]) out[k] = row[k].map(x => ({ tagName: x.tagName }));
    return out;
  };
  return {
    publicId: c.container?.publicId ?? '', tag: (c.tag ?? []).map(r => strip(r, 'tagId')), trigger: (c.trigger ?? []).map(r => strip(r, 'triggerId')),
    variable: (c.variable ?? []).map(r => strip(r, 'variableId')), folder: (c.folder ?? []).map(f => ({ folderId: f.folderId, name: f.name })),
    builtInVariable: (c.builtInVariable ?? []).map(v => ({ name: v.name })),
    vendor: Object.fromEntries((c.tag ?? []).map(t => [t.tagId, platformOf(c, t)])),
  };
}

export function atlas(items, { generatedAt = new Date().toISOString(), title, fragment = false, live = null, auto = true } = {}) {
  const containers = items.map(i => graph(i.report, i.snapshot));
  // A web container and a server container together get a signal-flow tab.
  const ctx = i => (cvOf(i.snapshot).container?.usageContext ?? []).map(String).map(x => x.toUpperCase());
  const web = items.find(i => ctx(i).includes('WEB')), server = items.find(i => ctx(i).includes('SERVER'));
  const flow = web && server ? signalFlow(web.snapshot, server.snapshot) : null;
  const audit = auditView({ items, graphs: containers, flow, live: live ?? {} });
  const autoData = auto ? items.map(i => autoInput(i.snapshot)) : null;
  // Platform names from the live scan are more specific than the template names.
  if (autoData && audit && web) { const wi = items.indexOf(web); for (const n of audit.nodes) if (n.kind === 'wtag' && !n.ghost && n.vendor) autoData[wi].vendor[n.ref] = n.vendor; }
  const name = title ?? (containers.map(c => c.meta.publicId).filter(Boolean).join(' + ') || 'GTM') + ' Atlas';
  const head = `<title>${esc(name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap">
<style>${CSS}</style>`;
  const body = `<div id="app">
<header class="top"><div class="who"><div class="tabs" id="tabs" role="tablist" aria-label="Container"></div><h1 id="title"></h1><p id="meta"></p></div>
<div class="score"><strong id="score">—</strong><span id="scoreLabel">configuration score</span></div></header>
<div class="toolbar">
 <div class="mode" id="mode" role="group" aria-label="View"></div>
 <label for="q">Find <input id="q" type="search" placeholder="Name, ID, type  ( / )" autocomplete="off"></label>
 <label for="kind">Family <select id="kind"><option value="all">All</option></select></label>
 <label for="risk">Finding <select id="risk"><option value="all">Any</option><option value="critical">Fix first</option><option value="review">Confirm</option><option value="info">Note</option><option value="none">No finding</option></select></label>
 <label for="trace">Trace <select id="trace"><option value="near">Neighbors</option><option value="path">Full path</option></select></label>
 <span class="spacer"></span><button id="reset" class="primary">Reset</button>
</div>
<div class="workspace">
 <main class="diagram" id="diagram" tabindex="0" aria-label="Diagram. Arrow keys pan, plus and minus zoom, 0 fits.">
  <div class="caption" id="caption"></div>
  <div class="zoombar" id="zoombar"><button id="zoomOut" aria-label="Zoom out">−</button><output id="zoomLevel">100%</output><button id="zoomIn" aria-label="Zoom in">+</button><button id="fit">Fit</button></div>
  <svg id="svg" role="img" aria-label="GTM dependency diagram"><g id="vp"><g id="deco"></g><g id="edges"></g><g id="nodes"></g><g id="fx"></g></g></svg>
  <div class="schedule" id="schedule" hidden><table><thead><tr id="schedHead"></tr></thead><tbody id="rows"></tbody></table></div>
  <div class="three" id="three" hidden><div class="labels" id="labels"></div></div>
  <div class="mini" id="mini" aria-label="Minimap"><canvas id="miniCanvas"></canvas></div>
  <div class="legend" id="legend"></div>
 </main>
 <aside class="side">
  <div class="stats" id="stats"></div>
  <div class="scroll"><section class="block"><h2>Selected</h2><div id="selected"></div></section><div id="panels"></div></div>
 </aside>
</div></div>
<div class="sr" id="live" aria-live="polite"></div>
<script type="application/json" id="atlas-data">${json({ containers, flow, audit, auto: autoData, generatedAt })}</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script>${JS}</script>`;
  return fragment ? `${head}\n${body}\n` : `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">${head}</head><body>${body}</body></html>\n`;
}

const cvOf = s => s?.containerVersion ?? s ?? {};
const asset = name => readFileSync(new URL(`./atlas/${name}`, import.meta.url), 'utf8');
const CSS = asset('style.css');
// Keep the inline script from closing its own <script> element.
const JS = (asset('auto.js') + '\n' + asset('client.js')).replace(/<\/(script)/gi, '<\\/$1');

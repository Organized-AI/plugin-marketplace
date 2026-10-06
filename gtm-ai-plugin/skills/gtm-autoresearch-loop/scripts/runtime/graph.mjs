// Dependency graph of one GTM container: nodes for tags, triggers, variables,
// clients and referenced built-ins; edges for fires, blocks, reads, sequence and
// identical-configuration pairs. Pure: runs in Node and in the browser.
// Only names, IDs, types and folders are kept; parameter values are never copied.

const builtinTriggers = { '2147479553': 'All Pages', '2147479572': 'Consent Initialization - All Pages', '2147479573': 'Initialization - All Pages' };
const internalVariables = { _event: 'Event' };
const kindOrder = ['client', 'tag', 'trigger', 'variable', 'builtin'];
const sevRank = { critical: 3, review: 2, info: 1 };

export function refs(value, out = new Set()) {
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


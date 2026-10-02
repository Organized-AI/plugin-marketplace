// Static Web -> server-side GTM signal flow. Works out, from configuration alone,
// which web tags send events to the server container, which server client claims
// them, which server triggers match each event name and which server tags fire.
// Only event names, element names/IDs and the endpoint host are emitted; tag HTML,
// constant values and tokens are read solely to find event names and URLs.

const ALL_PAGES = new Set(['2147479553', '2147479572', '2147479573']);
const cv = s => s?.containerVersion ?? s ?? {};
const params = row => row?.parameter ?? [];
const param = (row, key) => params(row).find(p => p.key === key)?.value;
const table = (row, key) => (params(row).find(p => p.key === key)?.list ?? []).map(r => Object.fromEntries((r.map ?? []).map(m => [m.key, m.value])));

function templateName(c, type) {
  const m = /^cvt_(?:\d+_)?(\w+)$/.exec(type ?? '');
  if (!m) return null;
  return (c.customTemplate ?? []).find(t => t.templateId === m[1])?.name ?? null;
}

export function platformOf(c, tag) {
  const text = `${tag.type} ${templateName(c, tag.type) ?? ''} ${tag.name}`.toLowerCase();
  const rules = [[/meta|facebook|\bfb\b/, 'Meta CAPI'], [/linkedin|\bli\b/, 'LinkedIn CAPI'], [/tiktok/, 'TikTok Events API'], [/snap/, 'Snap CAPI'],
    [/pinterest/, 'Pinterest CAPI'], [/sgtmgaaw|ga4|google analytics/, 'Google Analytics 4'], [/sgtmadsct|awct|google ads|adwords/, 'Google Ads'], [/floodlight|flc|fls/, 'Floodlight']];
  return rules.find(([re]) => re.test(text))?.[1] ?? (templateName(c, tag.type) ?? tag.type);
}

function urlOf(value, constants) {
  if (typeof value !== 'string') return null;
  const m = /^\s*\{\{([^{}]+)\}\}(.*)$/.exec(value);
  const raw = m ? (constants.get(m[1]) != null ? constants.get(m[1]) + m[2] : null) : value.trim();
  try { return raw ? new URL(raw) : null; } catch { return null; }
}

// Event name for a web tag whose event field may be a {{variable}}.
function eventName(raw, tag) {
  if (typeof raw !== 'string' || !raw) return null;
  if (/^\{\{(Event|_event)\}\}$/.test(raw)) return (tag.firingTriggerId ?? []).length && tag.firingTriggerId.every(id => ALL_PAGES.has(id)) ? 'gtm.js' : null;
  return /\{\{/.test(raw) ? null : raw;
}

function webSenders(W) {
  const constants = new Map((W.variable ?? []).filter(v => v.type === 'c').map(v => [v.name, param(v, 'value')]));
  const resolve = v => { const m = /^\{\{([^{}]+)\}\}$/.exec(v ?? ''); return m && constants.has(m[1]) ? constants.get(m[1]) : v; };
  const out = [], ga4Routed = new Map();
  for (const t of W.tag ?? []) {
    if (t.type !== 'googtag') continue;
    const cfg = table(t, 'configSettingsTable'), su = cfg.find(r => r.parameter === 'server_container_url')?.parameterValue ?? param(t, 'server_container_url');
    const url = urlOf(su, constants);
    if (!url) continue;
    const id = resolve(param(t, 'tagId'));
    if (id) ga4Routed.set(id, url.host);
    if (cfg.find(r => r.parameter === 'send_page_view')?.parameterValue !== 'false') out.push({ tag: t, event: 'page_view', host: url.host, transport: 'ga4' });
  }
  for (const t of W.tag ?? []) {
    if (t.paused) continue;
    const domain = param(t, 'gtm_server_domain');
    if (domain) {
      const ev = param(t, 'event_type') === 'custom' ? param(t, 'event_name_custom') : param(t, 'event_name_standard') ?? param(t, 'event_name');
      const url = urlOf(domain, constants);
      out.push({ tag: t, event: eventName(ev, t), rawEvent: ev ?? null, host: url?.host ?? null, transport: 'data' });
      continue;
    }
    if (t.type === 'gaawe') {
      const id = resolve(param(t, 'measurementIdOverride') ?? param(t, 'measurementId'));
      if (id && ga4Routed.has(id)) out.push({ tag: t, event: eventName(param(t, 'eventName'), t), rawEvent: param(t, 'eventName') ?? null, host: ga4Routed.get(id), transport: 'ga4' });
      continue;
    }
    if (t.type === 'html') {
      // Read the script only to find where it posts and which event name it sends.
      const html = String(param(t, 'html') ?? '');
      const arg = String.raw`(['"\x60]?)(\{\{[^{}]+\}\}[^'"\x60,)\s]*|[^'"\x60,)\s]+)\1`;
      const target = new RegExp(String.raw`(?:fetch|sendBeacon)\(\s*` + arg).exec(html) ?? new RegExp(String.raw`\.open\(\s*['"][A-Z]+['"]\s*,\s*` + arg).exec(html);
      const url = target && urlOf(target[2], constants);
      if (!url || !/^https?:/.test(url.protocol)) continue;
      const ev = /event_name['"]?\s*:\s*['"`]([^'"`]+)['"`]/.exec(html)?.[1] ?? null;
      out.push({ tag: t, event: eventName(ev, t), rawEvent: ev, host: url.host, path: url.pathname, transport: 'http' });
    }
  }
  return out;
}

function serverClients(S) {
  return (S.client ?? []).map(c => {
    const tmpl = templateName(S, c.type) ?? '';
    const role = c.type === 'gaaw_client' ? 'ga4' : c.type === 'gtm_client' ? 'container' : /data client/i.test(`${tmpl} ${c.name}`) ? 'data' : 'other';
    return { c, role, priority: Number(param(c, 'priority') ?? c.priority ?? 0) || 0, serves: params(c).flatMap(p => (p.list ?? []).flatMap(r => (r.map ?? []).filter(m => m.key === 'containerId').map(m => m.value))) };
  });
}

// Which client claims a request: highest priority among clients of the matching role.
function claim(clients, sender) {
  const role = sender.transport === 'ga4' ? 'ga4' : sender.transport === 'data' || /\/data\/?$/.test(sender.path ?? '') ? 'data' : null;
  if (!role) return { client: null, tied: [] };
  const list = clients.filter(x => x.role === role).sort((a, b) => b.priority - a.priority);
  if (!list.length) return { client: null, tied: [] };
  return { client: list[0], tied: list.filter(x => x.priority === list[0].priority) };
}

const OPS = {
  EQUALS: (v, a) => v === a, CONTAINS: (v, a) => v.includes(a), STARTS_WITH: (v, a) => v.startsWith(a), ENDS_WITH: (v, a) => v.endsWith(a),
  MATCH_REGEX: (v, a, i) => new RegExp(a, i ? 'i' : '').test(v),
};

export function evaluate(trigger, event, clientName, eventVars) {
  if (!['ALWAYS', 'CUSTOM_EVENT'].includes(String(trigger.type).toUpperCase())) return 'maybe';
  let result = 'yes';
  for (const cond of [...trigger.filter ?? [], ...trigger.customEventFilter ?? []]) {
    const arg0 = String(param(cond, 'arg0') ?? ''), arg1 = String(param(cond, 'arg1') ?? ''), m = /^\{\{([^{}]+)\}\}$/.exec(arg0);
    const name = m?.[1], value = name && eventVars.has(name) ? event : name === 'Client Name' ? clientName : undefined;
    const op = OPS[String(cond.type).toUpperCase()];
    if (value == null || !op) { result = 'maybe'; continue; }
    let hit;
    try { hit = op(String(value), arg1, param(cond, 'ignore_case') === 'true'); } catch { result = 'maybe'; continue; }
    if (param(cond, 'negate') === 'true') hit = !hit;
    if (!hit) return 'no';
  }
  return result;
}

export function describeTrigger(trigger) {
  const conds = [...trigger.filter ?? [], ...trigger.customEventFilter ?? []].map(c => {
    const a0 = String(param(c, 'arg0') ?? '').replace(/^\{\{|\}\}$/g, ''), op = String(c.type).toLowerCase().replace('_', ' ').replace('match regex', 'matches');
    return `${param(c, 'negate') === 'true' ? 'not ' : ''}${a0} ${op} ${param(c, 'arg1') ?? ''}`.trim();
  });
  return conds.length ? conds.join(' and ') : String(trigger.type).toLowerCase();
}

export function pairs(webSnap, serverSnap) {
  const W = cv(webSnap), S = cv(serverSnap), pub = W.container?.publicId;
  return serverClients(S).some(x => x.role === 'container' && x.serves.includes(pub));
}

export function signalFlow(webSnap, serverSnap) {
  const W = cv(webSnap), S = cv(serverSnap);
  const clients = serverClients(S), senders = webSenders(W);
  const eventVars = new Set(['Event Name', '_event', ...(S.variable ?? []).filter(v => v.type === 'ed' && param(v, 'keyPath') === 'event_name').map(v => v.name)]);
  const sTrig = new Map((S.trigger ?? []).map(t => [t.triggerId, t])), wTrig = new Map((W.trigger ?? []).map(t => [t.triggerId, t]));
  const nodes = new Map(), edges = new Map(), routes = [];
  const node = (id, n) => (nodes.has(id) || nodes.set(id, { id, findings: [], risk: null, ...n }), nodes.get(id));
  const edge = (from, to, kind, status) => { const k = `${from}>${to}>${kind}`, e = edges.get(k); if (!e) edges.set(k, { from, to, kind, status }); else if (rank(status) > rank(e.status)) e.status = status; };
  const rank = s => ({ idle: 0, unknown: 1, dead: 2, maybe: 3, ok: 4 }[s] ?? 0);
  const flag = (n, severity, message) => { n.findings.push({ severity, message }); if (!n.risk || severity === 'critical' || (severity === 'review' && n.risk === 'info')) n.risk = severity; };

  // Server side is drawn in full so idle pieces are visible.
  for (const x of clients) node(`cl:${x.c.clientId}`, { kind: 'client', col: 3, ref: x.c.clientId, name: x.c.name, type: x.c.type + (x.priority ? ` · priority ${x.priority}` : ''), side: 'server' });
  for (const t of S.trigger ?? []) node(`str:${t.triggerId}`, { kind: 'strigger', col: 5, ref: t.triggerId, name: t.name, type: describeTrigger(t), side: 'server' });
  for (const t of S.tag ?? []) {
    const dest = platformOf(S, t);
    node(`stg:${t.tagId}`, { kind: 'stag', col: 6, ref: t.tagId, name: t.name, type: dest, side: 'server', paused: !!t.paused });
    node(`ds:${dest}`, { kind: 'dest', col: 7, ref: dest, name: dest, type: 'destination', side: 'out' });
    for (const tr of t.firingTriggerId ?? []) if (sTrig.has(tr)) edge(`str:${tr}`, `stg:${t.tagId}`, 'fires', 'idle');
    edge(`stg:${t.tagId}`, `ds:${dest}`, 'delivers', 'idle');
  }
  const sink = node('sink', { kind: 'sink', col: 5, ref: '—', name: 'No server trigger matches', type: 'dead end', side: 'server' });

  for (const s of senders) {
    const wt = node(`wtg:${s.tag.tagId}`, { kind: 'wtag', col: 1, ref: s.tag.tagId, name: s.tag.name, type: { data: 'Stape Data Tag', http: 'HTTP request', ga4: 'GA4 via server_container_url' }[s.transport], side: 'web' });
    const firing = (s.tag.firingTriggerId ?? []).map(id => wTrig.get(id)?.name ?? ({ '2147479553': 'All Pages', '2147479572': 'Consent Initialization', '2147479573': 'Initialization' }[id] ?? id));
    for (const id of s.tag.firingTriggerId ?? []) { node(`wtr:${id}`, { kind: 'wtrigger', col: 0, ref: id, name: wTrig.get(id)?.name ?? firing[0], type: wTrig.get(id)?.type ?? 'built-in trigger', side: 'web' }); edge(`wtr:${id}`, wt.id, 'fires', 'ok'); }
    const ep = node(`ep:${s.host ?? 'unknown'}`, { kind: 'endpoint', col: 2, ref: s.host ?? '?', name: s.host ?? 'Unresolved endpoint', type: 'server container endpoint', side: 'edge' });
    const { client, tied } = claim(clients, s);
    const ev = node(`ev:${s.event ?? '?' + s.tag.tagId}`, { kind: 'event', col: 4, ref: s.event ?? s.rawEvent ?? '?', name: s.event ?? `${s.rawEvent ?? 'unknown'} (dynamic)`, type: 'event name', side: 'server' });
    const route = { id: `r${routes.length}`, webTag: wt.id, webTriggers: (s.tag.firingTriggerId ?? []).map(id => `wtr:${id}`), firing, endpoint: ep.id, event: s.event, eventNode: ev.id, transport: s.transport,
      client: client ? `cl:${client.c.clientId}` : null, matched: [], tags: [], destinations: [], status: 'unknown' };
    if (!client || s.event == null) {
      route.status = 'unknown';
      route.reason = !client ? 'No server client of the right kind to claim this request.' : 'The event name is set at run time, so it cannot be matched statically.';
    } else {
      // When several clients could claim the request, a trigger is certain only if it matches for all of them.
      for (const t of S.trigger ?? []) {
        const rs = tied.map(x => evaluate(t, s.event, x.c.name, eventVars));
        const r = rs.every(x => x === 'yes') ? 'yes' : rs.every(x => x === 'no') ? 'no' : 'maybe';
        if (r !== 'no') route.matched.push({ id: `str:${t.triggerId}`, certainty: r });
      }
      const matched = new Map(route.matched.map(m => [m.id, m.certainty]));
      for (const t of S.tag ?? []) {
        if (t.paused) continue;
        const hits = (t.firingTriggerId ?? []).map(id => matched.get(`str:${id}`)).filter(Boolean);
        if (hits.length) route.tags.push({ id: `stg:${t.tagId}`, certainty: hits.includes('yes') ? 'yes' : 'maybe', destination: platformOf(S, t) });
      }
      route.destinations = [...new Set(route.tags.map(t => t.destination))];
      route.status = route.tags.some(t => t.certainty === 'yes') ? 'delivered' : route.tags.length ? 'conditional' : 'dead-end';
      if (tied.length > 1) route.reason = `${tied.map(x => x.c.name).join(' and ')} have the same priority, so which one claims the request is not certain. Triggers that check Client Name are marked uncertain.`;
    }
    const st = { delivered: 'ok', conditional: 'maybe', 'dead-end': 'dead', unknown: 'unknown' }[route.status];
    edge(wt.id, ep.id, 'sends', st);
    if (route.client) { edge(ep.id, route.client, 'routes', st); edge(route.client, ev.id, 'claims', st); }
    else edge(ep.id, ev.id, 'routes', 'unknown');
    for (const m of route.matched) edge(ev.id, m.id, 'matches', m.certainty === 'yes' && route.tags.length ? st : 'maybe');
    if (route.status === 'dead-end') edge(ev.id, sink.id, 'matches', 'dead');
    for (const t of route.tags) {
      const fires = new Set((S.tag ?? []).find(x => `stg:${x.tagId}` === t.id)?.firingTriggerId ?? []);
      for (const m of route.matched) if (fires.has(m.id.slice(4))) edge(m.id, t.id, 'fires', m.certainty === 'yes' && t.certainty === 'yes' ? st : 'maybe');
      edge(t.id, `ds:${t.destination}`, 'delivers', t.certainty === 'yes' ? st : 'maybe');
    }
    routes.push(route);
  }

  // Findings drawn from the routes.
  const findings = [];
  const add = (severity, target, message, related = []) => { findings.push({ severity, target, message, related }); flag(nodes.get(target), severity, message); };
  for (const r of routes.filter(r => r.status === 'dead-end')) {
    const near = (S.trigger ?? []).filter(t => describeTrigger(t).toLowerCase().includes(String(r.event).toLowerCase().slice(0, 4))).map(t => t.name);
    add('review', r.webTag, `Sends "${r.event}" to the server, but no server trigger matches that event name, so nothing is forwarded.${near.length ? ` Closest server trigger: ${near[0]}.` : ''}`, [r.eventNode]);
    flag(nodes.get(r.eventNode), 'review', `No server trigger matches "${r.event}".`);
  }
  const reached = new Set(routes.flatMap(r => r.tags.map(t => t.id)));
  for (const t of S.tag ?? []) {
    const id = `stg:${t.tagId}`;
    if (t.paused || reached.has(id)) continue;
    const want = (t.firingTriggerId ?? []).map(x => sTrig.get(x)).filter(Boolean).map(x => `${x.name} (${describeTrigger(x)})`);
    add('review', id, `No event from this web container reaches this tag. It waits for ${want.join(' or ') || 'no trigger'}, which no web tag sends. Events from other sources (apps, other containers) are not visible here.`);
  }
  const usedTriggers = new Set((S.tag ?? []).filter(t => !t.paused).flatMap(t => t.firingTriggerId ?? []));
  const unusedHits = new Map();
  for (const r of routes) for (const m of r.matched) if (m.certainty === 'yes' && !usedTriggers.has(m.id.slice(4))) unusedHits.set(m.id, new Set([...unusedHits.get(m.id) ?? [], r.event]));
  for (const [id, evs] of unusedHits) add('info', id, `Matches ${[...evs].map(e => `"${e}"`).join(', ')} from the web container, but no active server tag uses this trigger.`);
  // Several web tags firing on the same trigger and reaching the same server tag.
  // Unfiltered page-load triggers (All Pages, DOM Ready, Window Loaded) all fire once per page view.
  const pageLoad = id => ALL_PAGES.has(id) || ((t => t && ['PAGEVIEW', 'DOM_READY', 'WINDOW_LOADED'].includes(String(t.type).toUpperCase()) && !(t.filter ?? []).length && !(t.autoEventFilter ?? []).length)(wTrig.get(id)));
  const moment = w => pageLoad(w.slice(4)) ? 'every page view' : `"${nodes.get(w).name}"`;
  const byTag = new Map();
  for (const r of routes.filter(r => r.status === 'delivered')) for (const t of r.tags.filter(t => t.certainty === 'yes')) for (const w of r.webTriggers) {
    const k = `${t.id}|${moment(w)}`; byTag.set(k, [...byTag.get(k) ?? [], r]);
  }
  for (const [k, rs] of byTag) {
    const [tagId, when] = [k.slice(0, k.indexOf('|')), k.slice(k.indexOf('|') + 1)], uniq = [...new Set(rs.map(r => r.webTag))];
    if (uniq.length < 2) continue;
    add('review', tagId, `Can fire ${uniq.length} times on ${when}: ${uniq.map(id => nodes.get(id).name).join(', ')} all reach it. Check they share an event ID so ${nodes.get(tagId).type} deduplicates.`, uniq);
  }
  for (const x of clients.filter(x => x.role === 'ga4' && !routes.some(r => r.client === `cl:${x.c.clientId}`))) add('info', `cl:${x.c.clientId}`, 'No web tag in this container sends GA4 traffic to this client.');

  // Order rows in each column by the average row of what feeds them.
  const list = [...nodes.values()], row = new Map(), cols = [...new Set(list.map(n => n.col))].sort((a, b) => a - b);
  const inEdges = id => [...edges.values()].filter(e => e.to === id);
  for (const c of cols) {
    const col = list.filter(n => n.col === c);
    const score = n => { const ps = inEdges(n.id).map(e => row.get(e.from)).filter(v => v != null); return ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : 1e6; };
    col.map(n => [n, n.kind === 'sink' ? 2e6 : score(n)]).sort((a, b) => a[1] - b[1] || a[0].name.localeCompare(b[0].name)).forEach(([n], i) => { row.set(n.id, i); n.row = i; });
  }
  const count = s => routes.filter(r => r.status === s).length;
  return {
    meta: { name: `${W.container?.publicId ?? 'Web'} → ${S.container?.publicId ?? 'Server'}`, publicId: 'Signal flow', context: 'web to server', paired: pairs(webSnap, serverSnap), hosts: [...new Set(senders.map(s => s.host).filter(Boolean))] },
    columns: ['Web triggers', 'Web tags', 'Endpoint', 'Server clients', 'Events', 'Server triggers', 'Server tags', 'Destinations'],
    nodes: list.sort((a, b) => a.col - b.col || a.row - b.row), edges: [...edges.values()], routes, findings,
    summary: { routes: routes.length, delivered: count('delivered'), conditional: count('conditional'), dead: count('dead-end'), unknown: count('unknown'), orphans: findings.filter(f => f.message.startsWith('No event from')).length },
  };
}

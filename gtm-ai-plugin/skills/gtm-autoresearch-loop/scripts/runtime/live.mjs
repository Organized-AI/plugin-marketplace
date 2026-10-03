// Live evidence for the audit view: the published container (compiled gtm.js) and
// what a browser scan observed on the site. Compares the export ("previous
// version") against what is live and works out, per tag, whether it fired.
// Only names, IDs, vendor names, event names, hosts and parameter KEY names are
// emitted. Parameter values, tag HTML and tokens are read only to compare them.
import vm from 'node:vm';
import { createHash } from 'node:crypto';

const cv = s => s?.containerVersion ?? s ?? {};
const params = row => row?.parameter ?? [];
const param = (row, key) => params(row).find(p => p.key === key)?.value;
const sha = v => createHash('sha256').update(String(v)).digest('hex').slice(0, 12);
const BUILTIN = { '2147479553': 'All Pages', '2147479572': 'Consent Initialization - All Pages', '2147479573': 'Initialization - All Pages' };
const LISTENERS = { __cl: 'Click listener', __lcl: 'Link click listener', __hl: 'History listener', __fsl: 'Form submit listener', __evl: 'Element visibility listener', __sdl: 'Scroll depth listener', __tl: 'Timer listener', __ytl: 'YouTube listener' };

/* ---------- compiled container ---------- */
export function parseCompiled(js) {
  if (js && typeof js === 'object') return js;
  const i = String(js).indexOf('var data = ');
  if (i < 0) throw Error('Not a compiled gtm.js (no data block)');
  const end = js.indexOf('\n};', i);
  // The data block is a plain object literal; evaluate it alone, with no globals and a time limit.
  const data = vm.runInNewContext('(' + js.slice(i + 11, end + 2) + ')', Object.create(null), { timeout: 2000 });
  const r = data.resource ?? {};
  const macros = r.macros ?? [], tags = r.tags ?? [], rules = r.rules ?? [], preds = r.predicates ?? [];
  // Which tags each rule adds, and the event names its predicates test.
  const eventMacro = new Set(macros.map((m, i) => (m.function === '__e' ? i : -1)).filter(i => i >= 0));
  const events = new Map();
  rules.forEach(rule => {
    const ifs = rule.find(x => x[0] === 'if')?.slice(1) ?? [], adds = rule.find(x => x[0] === 'add')?.slice(1) ?? [];
    const evs = ifs.map(p => preds[p]).filter(p => p && Array.isArray(p.arg0) && p.arg0[0] === 'macro' && eventMacro.has(p.arg0[1]) && typeof p.arg1 === 'string').map(p => p.arg1);
    for (const a of adds) events.set(a, [...events.get(a) ?? [], ...(evs.length ? evs : ['(condition)'])]);
  });
  // Hosts a custom template's sandboxed code may load, keyed by its function name.
  const runtimeHosts = new Map((data.runtime ?? []).map(rt => [rt[1], [...new Set((JSON.stringify(rt).match(/https?:\/\/[a-z0-9.-]+/gi) ?? []).map(hostOf).filter(Boolean))]]));
  return {
    version: String(r.version ?? ''), macros, runtimeHosts,
    tags: tags.map((t, i) => ({ index: i, tagId: t.tag_id != null ? String(t.tag_id) : null, fn: t.function, paused: t.function === '__paused', listener: !!LISTENERS[t.function], raw: t, events: [...new Set(events.get(i) ?? [])], hasRule: events.has(i) })),
  };
}

// Normalize a parameter value from either format to plain data: constants resolved, other variables as "<var>".
function normExport(value, constants) {
  if (typeof value === 'string') return value.replace(/\{\{([^{}]+)\}\}/g, (_, n) => (constants.has(n) ? constants.get(n) : '<var>'));
  return value;
}
function normParam(p, constants) {
  if (p.list) return p.list.map(x => normParam(x, constants));
  if (p.map) return Object.fromEntries(p.map.map(m => [m.key, normParam(m, constants)]));
  return normExport(p.value, constants);
}
function normLive(v, macros) {
  if (Array.isArray(v)) {
    if (v[0] === 'macro') { const m = macros[v[1]]; return m && m.function === '__c' ? String(m.vtp_value) : '<var>'; }
    if (v[0] === 'list') return v.slice(1).map(x => normLive(x, macros));
    if (v[0] === 'map') { const o = {}; for (let i = 1; i < v.length; i += 2) o[v[i]] = normLive(v[i + 1], macros); return o; }
    if (v[0] === 'template') return v.slice(1).map(x => normLive(x, macros)).join('');
    if (v[0] === 'escape') return normLive(v[1], macros);
    return v.map(x => normLive(x, macros));
  }
  return v == null ? v : typeof v === 'object' ? v : String(v);
}
const canon = v => String(JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(y => [y, x[y]])) : x)));
const hostOf = v => { try { return new URL(String(v)).host; } catch { return null; } };

/* ---------- export vs published ---------- */
export function versionDrift(webSnap, compiledJs) {
  const W = cv(webSnap), live = parseCompiled(compiledJs);
  const constants = new Map((W.variable ?? []).filter(v => v.type === 'c').map(v => [v.name, String(param(v, 'value') ?? '')]));
  const exported = new Map((W.tag ?? []).map(t => [t.tagId, t]));
  const liveById = new Map(live.tags.filter(t => t.tagId).map(t => [t.tagId, t]));
  const added = [], listeners = [], removed = [], paused = [], unpaused = [], triggers = [], changed = [];
  for (const t of live.tags) {
    if (!t.tagId || exported.has(t.tagId)) continue;
    if (t.listener) { listeners.push({ tagId: t.tagId, fn: t.fn, label: LISTENERS[t.fn], events: t.events }); continue; }
    const hosts = [...new Set([...(live.runtimeHosts.get(t.fn) ?? []), ...((JSON.stringify(t.raw).match(/https?:\/\/[a-z0-9.-]+/gi) ?? []).map(hostOf))].filter(h => h && !/googletagmanager\.com$|appspot\.com$|stapecdn\.com$/.test(h)))];
    const type = t.fn.replace(/^__/, ''), what = t.raw.vtp_eventName ?? t.raw.vtp_activityTag ?? null;
    const vendor = hosts.map(vendorOfHost).find(Boolean) ?? TYPE_VENDOR[type] ?? (type === 'html' ? 'Custom HTML' : type);
    added.push({ tagId: t.tagId, fn: t.fn, type, vendor, hosts, what, events: t.events, name: `${vendor === 'Custom HTML' ? 'Custom HTML' : vendor} · ${what ?? (t.events[0] === 'gtm.js' ? 'All Pages' : t.events[0] ?? 'tag')} #${t.tagId}` });
  }
  for (const e of W.tag ?? []) {
    const l = liveById.get(e.tagId);
    if (!l) { removed.push({ tagId: e.tagId, name: e.name }); continue; }
    if (l.paused && !e.paused) paused.push({ tagId: e.tagId, name: e.name });
    if (!l.paused && e.paused) unpaused.push({ tagId: e.tagId, name: e.name });
    if (l.paused || e.paused) continue;
    const hasTrig = (e.firingTriggerId ?? []).length > 0;
    if (!hasTrig && l.hasRule) triggers.push({ tagId: e.tagId, name: e.name, message: `Has no firing trigger in the export but fires on ${l.events.join(', ')} in the published version.` });
    else if (hasTrig && !l.hasRule && !(e.firingTriggerId ?? []).every(id => BUILTIN[id])) triggers.push({ tagId: e.tagId, name: e.name, message: 'Has a firing trigger in the export but no firing rule in the published version.' });
    if (('__' + e.type) !== l.fn) { changed.push({ tagId: e.tagId, name: e.name, keys: ['type'], detail: `type ${e.type} → ${l.fn.replace(/^__/, '')}` }); continue; }
    const keys = [], hosts = [], flips = [];
    // GTM rewrites custom HTML when it compiles it, so only the hosts it loads are compared.
    if (e.type === 'html' && typeof l.raw.vtp_html === 'string') {
      const a = htmlHosts(param(e, 'html')).sort(), b = htmlHosts(l.raw.vtp_html).sort();
      if (a.join() !== b.join()) { keys.push('html'); hosts.push(`html loads ${a.join(', ') || 'no hosts'} → ${b.join(', ') || 'no hosts'}`); }
    }
    for (const p of params(e)) {
      if (p.key === 'html') continue;
      const lv = l.raw['vtp_' + p.key];
      if (lv === undefined) continue;
      const a = normParam(p, constants), b = normLive(lv, live.macros);
      if (a === undefined || b === undefined) continue;
      if (canon(a) === canon(b)) continue;
      // A value that is a variable on one side and a literal on the other is not provably different.
      if (canon(a).includes('<var>') || canon(b).includes('<var>')) continue;
      keys.push(p.key);
      if (/^(true|false)$/.test(String(a)) && /^(true|false)$/.test(String(b))) flips.push(`${p.key} ${a} → ${b}`);
      const ha = canon(a).match(/https?:\/\/[a-z0-9.-]+/gi) ?? [], hb = canon(b).match(/https?:\/\/[a-z0-9.-]+/gi) ?? [];
      const da = [...new Set(ha.map(hostOf))].filter(Boolean), db = [...new Set(hb.map(hostOf))].filter(Boolean);
      if (da.join() !== db.join() && (da.length || db.length)) hosts.push(`${p.key} endpoint ${da.join(', ') || '—'} → ${db.join(', ') || '—'}`);
    }
    if (keys.length) changed.push({ tagId: e.tagId, name: e.name, keys, detail: [...flips, ...new Set(hosts)].join('; ') || null });
  }
  return { liveVersion: live.version, exportVersion: String(W.containerVersionId ?? ''), exportedAt: W.fingerprint ? new Date(Number(W.fingerprint)).toISOString() : null,
    counts: { export: (W.tag ?? []).length, live: live.tags.length, liveTags: live.tags.length - listeners.length },
    added, listeners, removed, paused, unpaused, triggers, changed, live };
}

/* ---------- vendors ---------- */
const VENDORS = [
  [/facebook\.(com|net)$/, 'Meta'], [/(linkedin\.com|licdn\.com)$/, 'LinkedIn'], [/bing\.com$/, 'Microsoft Ads'], [/(quantserve|quantcount)\.com$/, 'Quantcast'],
  [/hotjar\.(com|io)$/, 'Hotjar'], [/(twitter\.com|^t\.co|ads-twitter\.com)$/, 'X (Twitter)'], [/(yimg\.com|yahoo\.com)$/, 'Yahoo'], [/adsrvr\.org$/, 'The Trade Desk'],
  [/tvsquared\.com$/, 'TVSquared'], [/resetdigital\.co$|resetsrv\.com$/, 'Reset Digital'], [/(attn\.tv|attentivemobile\.com)$/, 'Attentive'], [/(edo\.com|edoinc\.com)$/, 'EDO'],
  [/blackcrow\.ai$/, 'Black Crow'], [/audioeye\.com$/, 'AudioEye'], [/(fls\.doubleclick\.net|ad\.doubleclick\.net|ade\.googlesyndication\.com)$/, 'Floodlight'],
  [/(googleadservices\.com|googleads\.g\.doubleclick\.net|google\.com|pagead2\.googlesyndication\.com)$/, 'Google Ads'], [/(google-analytics\.com|analytics\.google\.com)$/, 'Google Analytics 4'],
  [/bidr\.io$/, 'Beeswax'], [/vibe\.co$/, 'Vibe'], [/adentifi\.com$/, 'Adentifi'], [/blockboardtech\.com$/, 'Blockboard'], [/config-security\.com$/, 'Triple Whale'],
  [/datadoghq-browser-agent\.com$/, 'Datadog'], [/alocdn\.com$/, 'Alocdn'], [/everflow|eflow/, 'Everflow'], [/tiktok/, 'TikTok'], [/snapchat|sc-static/, 'Snap'], [/pinterest|pinimg/, 'Pinterest'],
];
export const vendorOfHost = host => VENDORS.find(([re]) => re.test(host ?? ''))?.[1] ?? null;
const TYPE_VENDOR = { awct: 'Google Ads', sp: 'Google Ads', awcc: 'Google Ads', gclidw: 'Google Ads', fls: 'Floodlight', flc: 'Floodlight', gaawe: 'Google Analytics 4', bzi: 'LinkedIn', qca: 'Quantcast', hjtc: 'Hotjar', baut: 'Microsoft Ads', twitter_website_tag: 'X (Twitter)' };
function templateName(c, type) { const m = /^cvt_(?:\d+_)?(\w+)$/.exec(type ?? ''); return m ? (c.customTemplate ?? []).find(t => t.templateId === m[1])?.name ?? null : null; }
const htmlHosts = html => [...new Set([...String(html ?? '').matchAll(/(?:https?:)?\/\/([a-z0-9-]+(?:\.[a-z0-9-]+)+)/gi)].map(m => m[1].toLowerCase()))];

/* ---------- what a scan saw ---------- */
export function scanEvidence(observed = [], attribution = []) {
  const runs = observed.flatMap(o => o.runs ?? []), aruns = attribution.flatMap(o => o.runs ?? []);
  const requests = runs.flatMap((r, ri) => (r.requests ?? []).map(q => ({ ...q, run: ri, consent: r.consent, page: r.url })));
  const events = new Set(runs.flatMap(r => (r.dl ?? []).map(x => x.event).filter(Boolean)));
  for (const q of requests) if (q.postEvent) events.add('(server) ' + q.postEvent);
  const roots = new Map();
  for (const q of aruns.flatMap(r => r.requests ?? [])) { const k = q.host + q.path; roots.set(k, new Set([...roots.get(k) ?? [], q.root])); }
  const cookies = new Set(runs.flatMap(r => r.cookies ?? []));
  const pages = [...new Set(runs.map(r => r.url))];
  return { requests, events, roots, cookies, pages, runs: runs.map(r => ({ url: r.url, consent: r.consent, requests: (r.requests ?? []).length })), scannedAt: observed.map(o => o.scannedAt).filter(Boolean).sort().pop() ?? null, attributionRuns: aruns.length };
}

// Network fingerprint a tag leaves when it fires. Returns { vendor, test(q), cookie } or { vendor } when silent.
function signature(c, t, constants) {
  const p = k => { const v = param(t, k); const m = /^\{\{([^{}]+)\}\}$/.exec(v ?? ''); return m ? constants.get(m[1]) ?? null : v ?? null; };
  const tname = templateName(c, t.type) ?? '';
  const inPath = (q, s) => s && (q.path ?? '').includes(s);
  switch (t.type) {
    case 'googtag': {
      const id = p('tagId'); if (!id) return { vendor: 'Google tag' };
      if (/^G-/.test(id)) return { vendor: 'Google Analytics 4', id, test: q => q.q?.tid === id && /\/g\/collect|\/collect/.test(q.path) };
      if (/^AW-/.test(id)) { const n = id.slice(3); return { vendor: 'Google Ads', id, test: q => inPath(q, `/${n}/`) || q.q?.tid === id }; }
      if (/^DC-/.test(id)) { const n = id.slice(3); return { vendor: 'Floodlight', id, test: q => q.q?.id === id && q.path === '/a' || q.q?.tid === id || inPath(q, `src=${n}`) }; }
      return { vendor: 'Google tag', id };
    }
    case 'awct': { const id = p('conversionId'), label = p('conversionLabel'); return { vendor: 'Google Ads', test: q => /conversion/.test(q.path) && inPath(q, `/${id}/`) && (!label || (q.path + JSON.stringify(q.q ?? {})).includes(label)) }; }
    case 'sp': { const id = p('conversionId'); return { vendor: 'Google Ads', test: q => /rmkt\/collect|viewthroughconversion/.test(q.path) && inPath(q, `/${id}/`) }; }
    case 'fls': case 'flc': { const adv = p('advertiserId'), grp = p('groupTag'), cat = p('activityTag'); return { vendor: 'Floodlight', test: q => inPath(q, `src=${adv}`) && inPath(q, `cat=${cat};`) && (!grp || inPath(q, `type=${grp};`)) }; }
    case 'gaawe': { const en = p('eventName'), tid = p('measurementIdOverride') ?? p('measurementId'); return { vendor: 'Google Analytics 4', test: q => q.q?.en === en && (!tid || q.q?.tid === tid) }; }
    case 'gclidw': return { vendor: 'Google Ads', cookie: '_gcl_au' };
    case 'awcc': return { vendor: 'Google Ads' };
    case 'bzi': return { vendor: 'LinkedIn', test: q => /px\d?\.ads\.linkedin\.com$/.test(q.host) };
    case 'qca': return { vendor: 'Quantcast', test: q => /quantserve\.com$/.test(q.host) && /pixel/.test(q.path) };
    case 'hjtc': { const id = p('hotjar_site_id'); return { vendor: 'Hotjar', test: q => /hotjar\.(com|io)$/.test(q.host) && (!id || q.path.includes(id)) }; }
    case 'baut': { const id = p('tagId'); return { vendor: 'Microsoft Ads', test: q => /bat\.bing\.com$/.test(q.host) && (id ? q.path.includes(`/${id}`) || q.q?.ti === id : /action/.test(q.path)) }; }
    case 'twitter_website_tag': return { vendor: 'X (Twitter)', test: q => /(analytics\.twitter\.com|t\.co)$/.test(q.host) && /adsct/.test(q.path) };
    case 'img': { const host = hostOf(p('url')); return { vendor: vendorOfHost(host) ?? host ?? 'Image pixel', test: host ? q => q.host === host : null }; }
    case 'html': {
      const hosts = htmlHosts(param(t, 'html')).filter(h => !/googletagmanager\.com$/.test(h));
      const ssd = hosts.find(h => /stape\.io$|^sst\./.test(h));
      if (!hosts.length) return { vendor: 'Custom HTML' };
      const vendor = hosts.map(vendorOfHost).find(Boolean) ?? hosts[0];
      return { vendor, hosts, test: q => hosts.some(h => q.host === h || q.host.endsWith('.' + h)) || (ssd && q.host === ssd) };
    }
  }
  if (/^cvt_/.test(t.type)) {
    if (param(t, 'gtm_server_domain')) {
      const ev = param(t, 'event_type') === 'custom' ? param(t, 'event_name_custom') : param(t, 'event_name_standard');
      return { vendor: 'Server container', event: ev, test: q => q.postEvent === ev && q.path === (param(t, 'request_path') ?? '/data') };
    }
    const n = tname.toLowerCase();
    if (/facebook|meta/.test(n)) { const id = p('pixelId'), ev = param(t, 'eventName') === 'custom' ? p('customEventName') : p('standardEventName'); return { vendor: 'Meta', test: q => /facebook\.com$/.test(q.host) && q.path.startsWith('/tr') && (!id || q.q?.id === id) && (!ev || q.q?.ev === ev) }; }
    if (/linkedin/.test(n)) { const pid = p('partnerId'), conv = p('conversionId'); return { vendor: 'LinkedIn', test: q => /linkedin\.com$/.test(q.host) && /collect/.test(q.path) && (!pid || q.q?.pid === pid) && (!conv || q.q?.conversionId === conv) }; }
    if (/twitter/.test(n)) return { vendor: 'X (Twitter)', test: /event/.test(n) ? null : q => /(analytics\.twitter\.com|t\.co)$/.test(q.host) };
    if (/black ?crow/.test(n)) return { vendor: 'Black Crow', test: q => /blackcrow\.ai$/.test(q.host) };
    if (/audioeye/.test(n)) return { vendor: 'AudioEye', test: q => /audioeye\.com$/.test(q.host) };
    return { vendor: tname || t.type };
  }
  return { vendor: TYPE_VENDOR[t.type] ?? t.type };
}

/* ---------- would the trigger have fired during the scan? ---------- */
const PAGE_VARS = { 'Page Path': u => u.pathname, 'Page URL': u => u.href, 'Page Hostname': u => u.hostname };
function cond(c, page, events) {
  const a = (c.parameter ?? []).find(p => p.key === 'arg0')?.value ?? '', b = String((c.parameter ?? []).find(p => p.key === 'arg1')?.value ?? '');
  const flag = k => (c.parameter ?? []).some(p => p.key === k && String(p.value) === 'true');
  const m = /^\{\{([^{}]+)\}\}$/.exec(a);
  let val;
  if (m && PAGE_VARS[m[1]] && page) val = PAGE_VARS[m[1]](page);
  else if (m && (m[1] === 'Event' || m[1] === '_event')) { const hits = [...events].filter(e => test(c.type, e, b, flag('ignore_case'))); return (hits.length > 0) !== flag('negate') ? 'yes' : 'no'; }
  else return 'maybe';
  return test(c.type, val, b, flag('ignore_case')) !== flag('negate') ? 'yes' : 'no';
}
function test(type, v, b, ic) {
  const x = ic ? v.toLowerCase() : v, y = ic ? b.toLowerCase() : b;
  switch (String(type).toUpperCase()) {
    case 'EQUALS': return x === y; case 'CONTAINS': return x.includes(y); case 'STARTS_WITH': return x.startsWith(y); case 'ENDS_WITH': return x.endsWith(y);
    case 'MATCH_REGEX': try { return new RegExp(b, ic ? 'i' : '').test(v); } catch { return false; }
    default: return false;
  }
}
const all3 = rs => (rs.every(r => r === 'yes') ? 'yes' : rs.some(r => r === 'no') ? 'no' : 'maybe');
export function triggerReach(trigger, ev) {
  if (!trigger) return 'maybe';
  const type = String(trigger.type).toUpperCase();
  const base = { PAGEVIEW: 'gtm.js', DOM_READY: 'gtm.dom', WINDOW_LOADED: 'gtm.load', CLICK: 'gtm.click', LINK_CLICK: 'gtm.linkClick', FORM_SUBMISSION: 'gtm.formSubmit', HISTORY_CHANGE: 'gtm.historyChange', TIMER: 'gtm.timer', SCROLL_DEPTH: 'gtm.scrollDepth', ELEMENT_VISIBILITY: 'gtm.elementVisibility', YOU_TUBE_VIDEO: 'gtm.video' }[type];
  let eventOk;
  if (type === 'CUSTOM_EVENT') {
    const f = trigger.customEventFilter ?? [];
    eventOk = f.length ? all3(f.map(c => cond(c, null, ev.events))) : 'maybe';
  } else if (base) eventOk = ev.events.has(base) ? 'yes' : 'no';
  else return 'maybe';
  if (eventOk === 'no') return 'no';
  // Click triggers in a scan only ever saw the consent-banner click.
  if (['CLICK', 'LINK_CLICK', 'FORM_SUBMISSION'].includes(type)) return (trigger.filter ?? []).length || (trigger.autoEventFilter ?? []).length ? 'no' : eventOk;
  const filters = [...trigger.filter ?? [], ...trigger.autoEventFilter ?? []];
  if (!filters.length) return eventOk;
  const perPage = ev.pages.map(u => { try { return all3(filters.map(c => cond(c, new URL(u), ev.events))); } catch { return 'maybe'; } });
  const r = perPage.includes('yes') ? 'yes' : perPage.every(x => x === 'no') ? 'no' : 'maybe';
  return eventOk === 'maybe' && r === 'yes' ? 'maybe' : r;
}

/* ---------- per-tag live status ---------- */
export function liveStatus(webSnap, ev, drift) {
  const W = cv(webSnap);
  const constants = new Map((W.variable ?? []).filter(v => v.type === 'c').map(v => [v.name, String(param(v, 'value') ?? '')]));
  const trig = new Map((W.trigger ?? []).map(t => [t.triggerId, t]));
  const livePaused = new Set((drift?.paused ?? []).map(x => x.tagId));
  const out = new Map();
  for (const t of W.tag ?? []) {
    const sig = signature(W, t, constants);
    const via = q => { const r = ev.roots.get(q.host + q.path); return r ? [...r] : []; };
    const hits = sig.test ? ev.requests.filter(q => { try { return sig.test(q); } catch { return false; } }) : [];
    const roots = [...new Set(hits.flatMap(via))];
    const reach = (t.firingTriggerId ?? []).map(id => (BUILTIN[id] ? (ev.events.has('gtm.js') ? 'yes' : 'no') : triggerReach(trig.get(id), ev)));
    const expected = reach.includes('yes') ? 'yes' : reach.includes('maybe') ? 'maybe' : 'no';
    const consentRuns = [...new Set(hits.map(q => q.consent))];
    let status, note;
    // Hosts only: request paths and query strings can carry pixel and account IDs.
    const where = () => `Seen ${hits.length}× (${[...new Set(hits.map(q => q.host))].slice(0, 2).join(', ')}) on ${new Set(hits.map(q => q.page)).size} page(s)${consentRuns.includes('reject') ? ', also in the run where the visitor clicked Decline' : ''}.`;
    const never = () => `The scan never reached ${(t.firingTriggerId ?? []).map(id => BUILTIN[id] ?? trig.get(id)?.name ?? id).join(' or ')} (it did not buy, sign up or submit a form).`;
    if (t.paused) { status = 'paused'; note = 'Paused in the export.'; }
    else if (livePaused.has(t.tagId)) { status = 'paused-live'; note = 'Paused in the published version.'; }
    else if (!(t.firingTriggerId ?? []).length) { status = 'no-trigger'; note = 'No firing trigger in the export.'; }
    else if (hits.length && expected !== 'no') { status = 'fired'; note = where(); }
    else if (sig.cookie && ev.cookies.has(sig.cookie) && expected !== 'no') { status = 'fired'; note = `Cookie ${sig.cookie} was set.`; }
    else if (expected === 'no') { status = 'untested'; note = never() + (hits.length ? ` ${sig.vendor} requests were seen, but they belong to other tags.` : ''); }
    else if (!sig.test) { status = 'silent'; note = `${sig.vendor} leaves no request the scan can tie to this tag.`; }
    else if (expected === 'yes') { status = 'not-firing'; note = `Its trigger fired during the scan (${(t.firingTriggerId ?? []).map(id => BUILTIN[id] ?? trig.get(id)?.name ?? id).join(', ')}) but no ${sig.vendor} request matching this tag was seen${sig.id ? ` for ${sig.id}` : ''}.`; }
    else { status = 'untested'; note = 'Its trigger depends on conditions the scan could not confirm.'; }
    out.set(t.tagId, { status, note, vendor: sig.vendor, hits: hits.length, roots, expected });
  }
  return out;
}

/* ---------- outside GTM ---------- */
export function outsideGtm(ev, gtmVendors) {
  const by = new Map();
  for (const [k, rs] of ev.roots) {
    if (![...rs].some(r => r === 'Page code' || r === 'Page gtag snippet')) continue;
    if ([...rs].includes('GTM container')) continue;
    const host = k.split('/')[0], vendor = vendorOfHost(host);
    if (!vendor) continue;
    const e = by.get(vendor) ?? { vendor, hosts: new Set(), roots: new Set() };
    e.hosts.add(host); rs.forEach(r => e.roots.add(r)); by.set(vendor, e);
  }
  return [...by.values()].map(e => ({ vendor: e.vendor, hosts: [...e.hosts].sort(), roots: [...e.roots], alsoInGtm: gtmVendors.has(e.vendor) })).sort((a, b) => a.vendor.localeCompare(b.vendor));
}

/* ---------- generic export vs export ---------- */
export function diffExports(before, after) {
  const A = cv(before), B = cv(after), out = {};
  for (const [key, id] of [['tag', 'tagId'], ['trigger', 'triggerId'], ['variable', 'variableId'], ['client', 'clientId']]) {
    const a = new Map((A[key] ?? []).map(r => [r[id], r])), b = new Map((B[key] ?? []).map(r => [r[id], r]));
    const body = r => { const { [id]: _, name, fingerprint, path, tagManagerUrl, accountId, containerId, workspaceId, parentFolderId, notes, ...rest } = r; return sha(canon(rest)); };
    out[key] = {
      added: [...b.values()].filter(r => !a.has(r[id])).map(r => ({ id: r[id], name: r.name })),
      removed: [...a.values()].filter(r => !b.has(r[id])).map(r => ({ id: r[id], name: r.name })),
      renamed: [...b.values()].filter(r => a.has(r[id]) && a.get(r[id]).name !== r.name).map(r => ({ id: r[id], from: a.get(r[id]).name, name: r.name })),
      changed: [...b.values()].filter(r => a.has(r[id]) && body(a.get(r[id])) !== body(r)).map(r => ({ id: r[id], name: r.name })),
    };
  }
  return out;
}

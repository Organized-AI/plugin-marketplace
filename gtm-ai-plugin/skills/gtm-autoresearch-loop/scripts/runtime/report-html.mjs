import { atlas } from './atlas.mjs';
// Renders an audit report as (1) an interactive, GSAP-animated HTML page and
// (2) a HyperFrames composition (paused GSAP timeline on window.__timelines)
// that `npx hyperframes render` turns into a short video. Container text is
// untrusted, so every interpolated string goes through esc().

const GSAP = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js';
const FONT = 'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap';
const labels = { references: 'References', duplicates: 'Duplicates', naming: 'Naming', hygiene: 'Unused', legacy: 'Legacy', folders: 'Folders' };
const kinds = { tag: 'tags', trigger: 'triggers', variable: 'variables', folder: 'folders' };

export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const status = s => s >= 90 ? 'pass' : s >= 60 ? 'review' : 'critical';
const round = n => Math.round(Number(n) || 0);

// Name lookup so "Configuration matches 334" can show both sides by name.
export function nameIndex(snapshot) {
  const c = snapshot?.containerVersion ?? snapshot ?? {}, ids = { tag: 'tagId', trigger: 'triggerId', variable: 'variableId', folder: 'folderId' }, out = {};
  for (const [k, id] of Object.entries(ids)) out[k] = Object.fromEntries((c[k] ?? []).map(r => [r[id], r.name]));
  return out;
}
export function meta(snapshot) {
  const c = snapshot?.containerVersion ?? snapshot ?? {}, info = c.container ?? {};
  return { name: info.name ?? 'GTM container', publicId: info.publicId ?? '', context: (info.usageContext ?? []).join(', ').toLowerCase(),
    counts: Object.fromEntries(Object.keys(kinds).map(k => [k, (c[k] ?? []).length])) };
}

export function shape(report, snapshot) {
  const names = nameIndex(snapshot), f = report.findings ?? [];
  const critical = f.filter(x => x.severity === 'critical');
  const review = f.filter(x => x.severity === 'review').map(x => {
    const m = /^Configuration matches (\S+);/.exec(x.message);
    return m ? { ...x, pair: { id: m[1], name: names[x.kind]?.[m[1]] ?? m[1] } } : x;
  });
  const info = f.filter(x => x.severity === 'info');
  const housekeeping = Object.entries(info.reduce((a, x) => { (a[x.message] ??= []).push(x); return a; }, {}))
    .map(([message, rows]) => ({ message, rows, byKind: rows.reduce((a, x) => (a[x.kind] = (a[x.kind] ?? 0) + 1, a), {}) }));
  const dims = Object.entries(report.dimensions ?? {}).map(([k, v]) => ({ key: k, label: labels[k] ?? k, score: round(v), status: status(v) }));
  return { meta: meta(snapshot), score: round(report.score), critical, review, housekeeping, dims, skipped: report.skipped ?? [], scope: report.scope ?? '' };
}

const breaker = d => `<div class="brk is-${d.status}" role="img" aria-label="${esc(d.label)} ${d.score} out of 100">
  <div class="slot"><div class="lever"></div></div><div class="brk-score">${d.score}</div><div class="brk-name">${esc(d.label)}</div></div>`;

// audit.html is the interactive container atlas (see atlas.mjs).
export const htmlBundle = (items, opts) => atlas(items, opts);
export const htmlReport = (report, snapshot, opts) => atlas([{ report, snapshot }], opts);

// HyperFrames composition: 1920x1080, paused timeline, deterministic, no input.
export function hyperframes(report, snapshot, { id = 'gtm-audit', duration = 14 } = {}) {
  const s = shape(report, snapshot), m = s.meta;
  const top = [...s.critical, ...s.review].slice(0, 3);
  const cards = top.map(x => `<article class="card sev-${esc(x.severity)}"><div class="k">${esc(x.severity === 'critical' ? 'Fix first' : 'Confirm')}: ${esc(x.kind)} ${esc(x.id)}</div>
    <div class="t">${esc(x.name)}</div><div class="d">${x.pair ? `Identical to ${esc(x.pair.name)}` : esc(x.message)}</div></article>`).join('');
  const hkCount = s.housekeeping.reduce((a, h) => a + h.rows.length, 0);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=1920,height=1080"><title>${esc(m.publicId)} audit video</title>
<link rel="stylesheet" href="${FONT}"><style>
:root{--paper:#0c0b09;--panel:#15130f;--ink:#f7f2df;--muted:#a69f8b;--rule:#353025;--crit:#ff625f;--rev:#ffe94a;--pass:#5ce1a4;--slot:#1c1913}
*{box-sizing:border-box}body{margin:0;background:#000}#stage{position:relative;overflow:hidden;width:1920px;height:1080px;background:radial-gradient(circle at 50% 30%,#211c11 0,#0c0b09 55%,#080705 100%);color:var(--ink);font-family:'Space Mono',ui-monospace,monospace}
.head{position:absolute;left:120px;top:96px;right:120px;display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid var(--ink);padding-bottom:28px}
h1{margin:0;font-size:72px;font-weight:700;line-height:1}.sub{margin-top:14px;font-size:30px;color:var(--muted)}
.score{text-align:right}.big{font-size:200px;font-weight:700;line-height:.82;color:var(--rev);font-variant-numeric:tabular-nums}.of{font-size:26px;color:var(--muted)}
.panel{position:absolute;left:120px;right:120px;top:430px;display:grid;grid-template-columns:repeat(6,1fr);gap:28px;background:var(--panel);border:1px solid var(--rule);border-radius:10px;padding:40px}
.brk{display:grid;justify-items:center;gap:14px}.slot{width:84px;height:150px;border-radius:8px;background:var(--slot);border:1px solid var(--rule);position:relative;overflow:hidden}
.lever{position:absolute;left:10px;right:10px;top:10px;height:64px;border-radius:5px;background:currentColor}
.is-pass{color:var(--pass)}.is-review{color:var(--rev)}.is-critical{color:var(--crit)}.brk-score{font-size:44px;font-weight:700}.brk-name{font-size:26px;color:var(--ink)}
.cards{position:absolute;left:120px;right:120px;top:430px;display:grid;grid-template-columns:repeat(3,1fr);gap:32px}
.card{background:var(--panel);border-left:10px solid var(--rev);border-radius:0 10px 10px 0;padding:36px;min-height:300px}.card.sev-critical{border-color:var(--crit)}
.k{font-size:24px;color:var(--muted)}.t{font-size:34px;font-weight:700;line-height:1.2;margin:14px 0;overflow-wrap:anywhere}.d{font-size:28px;color:var(--muted);line-height:1.3}
.foot{position:absolute;left:120px;right:120px;bottom:90px;font-size:32px;color:var(--muted);display:flex;justify-content:space-between}
.foot b{color:var(--ink)}
</style></head><body>
<div id="stage" data-composition-id="${esc(id)}" data-start="0" data-duration="${duration}" data-width="1920" data-height="1080">
<div class="head"><div><h1>${esc(m.name)}</h1><div class="sub">${esc(m.publicId)}: ${m.counts.tag} tags, ${m.counts.trigger} triggers, ${m.counts.variable} variables</div></div>
<div class="score"><div class="big" data-count="${s.score}">0</div><div class="of">configuration score</div></div></div>
<section class="panel">${s.dims.map(breaker).join('')}</section>
<section class="cards">${cards}</section>
<div class="foot"><span><b>${s.critical.length}</b> to fix, <b>${s.review.length}</b> to confirm, <b>${hkCount}</b> housekeeping</span><span>Report-only. Nothing was published.</span></div>
</div>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script><script>
window.__timelines=window.__timelines||{};
const tl=gsap.timeline({paused:true}),big=document.querySelector('.big'),o={v:0},cards=document.querySelectorAll('.card');
gsap.set('.cards',{autoAlpha:0});
tl.from('.head h1',{autoAlpha:0,y:-30,duration:.7,ease:'power3.out'})
  .from('.sub',{autoAlpha:0,duration:.5},.35)
  .from('.panel',{autoAlpha:0,y:30,duration:.6,ease:'power2.out'},.7)
  .from('.lever',{y:76,duration:.5,stagger:.22,ease:'back.out(2.2)'},1.3)
  .from('.brk-score',{autoAlpha:0,duration:.3,stagger:.22},1.45)
  .to(o,{v:${s.score},duration:2,ease:'power2.out',onUpdate:()=>{big.textContent=Math.round(o.v)}},1.3)
  .to('.panel',{autoAlpha:0,y:-30,duration:.5,ease:'power2.in'},6.2)
  ${top.length ? `.set('.cards',{autoAlpha:1},6.7).from(cards,{autoAlpha:0,x:60,duration:.6,stagger:.35,ease:'power3.out'},6.7)` : ''}
  .from('.foot',{autoAlpha:0,y:20,duration:.6},${top.length ? 8.4 : 6.8})
  .set({},{},${duration});
window.__timelines[${JSON.stringify(id)}]=tl;
</script></body></html>
`;
}

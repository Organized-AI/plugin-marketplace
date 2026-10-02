// Renders an audit report as (1) an interactive, GSAP-animated HTML page and
// (2) a HyperFrames composition (paused GSAP timeline on window.__timelines)
// that `npx hyperframes render` turns into a short video. Container text is
// untrusted, so every interpolated string goes through esc().

const GSAP = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js';
const FONT = 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&display=swap';
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

const tokens = `
:root{--paper:#E9EEF2;--panel:#F7F9FB;--ink:#13283A;--muted:#5E7183;--rule:#C9D3DC;--crit:#C8312A;--rev:#D99A00;--info:#5E7183;--pass:#2F7D55;--slot:#D7DFE6}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--paper:#0F1E2B;--panel:#162838;--ink:#E3EBF2;--muted:#93A6B7;--rule:#2A4053;--crit:#F0574F;--rev:#F2B53A;--info:#93A6B7;--pass:#4CB582;--slot:#203547;color-scheme:dark}}
:root[data-theme="dark"]{--paper:#0F1E2B;--panel:#162838;--ink:#E3EBF2;--muted:#93A6B7;--rule:#2A4053;--crit:#F0574F;--rev:#F2B53A;--info:#93A6B7;--pass:#4CB582;--slot:#203547;color-scheme:dark}`;

const breaker = d => `<div class="brk is-${d.status}" role="img" aria-label="${esc(d.label)} ${d.score} out of 100">
  <div class="slot"><div class="lever"></div></div><div class="brk-score">${d.score}</div><div class="brk-name">${esc(d.label)}</div></div>`;

function findingRow(x) {
  const pair = x.pair ? `<p class="pair"><span>${esc(x.name)}</span><span class="eq" aria-label="is identical to">↔</span><span>${esc(x.pair.name)}</span></p>
    <p class="note">Identical configuration (${esc(x.kind)} ${esc(x.id)} and ${esc(x.pair.id)}). Confirm it's intentional or merge them.</p>`
    : `<p class="pair"><span>${esc(x.name)}</span></p><p class="note">${esc(x.message)}</p>`;
  return `<li class="row sev-${esc(x.severity)}"><span class="kind">${esc(x.kind)} ${esc(x.id)}</span>${pair}</li>`;
}

function containerSection(report, snapshot, generatedAt, idx) {
  const s = shape(report, snapshot), m = s.meta;
  const reviewByDim = Object.entries(s.review.reduce((a, x) => ((a[x.dimension] ??= []).push(x), a), {}));
  const section = (title, intro, body, open = true) => `<details class="group" ${open ? 'open' : ''}><summary><h2>${title}</h2><span class="intro">${intro}</span></summary><div class="body">${body}</div></details>`;
  const crit = s.critical.length ? section(`Fix first <b class="n crit">${s.critical.length}</b>`, 'Broken references stop tags from working.', `<ul>${s.critical.map(findingRow).join('')}</ul>`) : '';
  const rev = s.review.length ? section(`Confirm with the team <b class="n rev">${s.review.length}</b>`, 'Possibly intended. Each needs a yes or no from whoever owns the container.',
    reviewByDim.map(([d, rows]) => `<h3>${esc(labels[d] ?? d)}</h3><ul>${rows.map(findingRow).join('')}</ul>`).join('')) : '';
  const hk = s.housekeeping.length ? section(`Housekeeping <b class="n info">${s.housekeeping.reduce((a, h) => a + h.rows.length, 0)}</b>`, 'Low risk. Batch these when someone tidies the container.',
    s.housekeeping.map(h => `<div class="hk"><p><strong>${esc(h.message)}</strong>: ${Object.entries(h.byKind).map(([k, n]) => `${n} ${esc(kinds[k] ?? k)}`).join(', ')}</p>
      <details class="list"><summary>Show all ${h.rows.length}</summary><ul class="names">${h.rows.map(r => `<li><span class="kind">${esc(r.kind)} ${esc(r.id)}</span> ${esc(r.name)}</li>`).join('')}</ul></details></div>`).join(''), false) : '';
  const clean = !s.critical.length && !s.review.length && !s.housekeeping.length ? `<p class="clean">No findings in the six static checks. That doesn't confirm tags fire correctly; see what this run didn't check.</p>` : '';
  return `<section class="report" id="c${idx}"><header><div><h1>${esc(m.name)}</h1><p class="sub">${esc(m.publicId)}${m.context ? ` (${esc(m.context)} container)` : ''}: ${m.counts.tag} tags, ${m.counts.trigger} triggers, ${m.counts.variable} variables</p></div>
<div class="score"><div class="big" data-count="${s.score}">${s.score}</div><div class="of">configuration score out of 100</div></div></header>
<section class="panel" aria-label="Score by check">${s.dims.map(breaker).join('')}</section>
<p class="legend">Green is 90 or above, amber 60 to 89, red below 60. ${esc(s.scope)}</p>
${clean}${crit}${rev}${hk}
<details class="group skipped"><summary><h2>Not checked by this run</h2><span class="intro">A clean score here doesn't mean tracking is correct.</span></summary><div class="body"><ul>${s.skipped.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></details>
<footer>Generated by gtm-audit-pro on ${esc(generatedAt.slice(0, 10))}. Report-only: nothing was changed or published in the container.</footer>
</section>`;
}

const css = `
*{box-sizing:border-box}html{background:var(--paper)}body{margin:0;background:var(--paper);color:var(--ink);font:400 17px/1.5 Archivo,system-ui,sans-serif;font-stretch:100%}
main{max-width:1040px;margin:0 auto;padding:48px 24px 96px}
header{display:grid;grid-template-columns:1fr auto;gap:8px 32px;align-items:end;border-bottom:2px solid var(--ink);padding-bottom:20px}
h1{margin:0;font-stretch:112%;font-weight:750;font-size:clamp(30px,5vw,48px);line-height:1.02;letter-spacing:-.01em}
.sub{margin:6px 0 0;color:var(--muted)}.score{text-align:right}.score .big{font-stretch:125%;font-weight:800;font-size:clamp(64px,11vw,112px);line-height:.9;font-variant-numeric:tabular-nums}
.score .of{color:var(--muted);font-size:15px}
.panel{margin:32px 0 8px;background:var(--panel);border:1px solid var(--rule);border-radius:6px;padding:24px;display:grid;grid-template-columns:repeat(6,1fr);gap:14px}
.brk{display:grid;justify-items:center;gap:8px;text-align:center}
.slot{width:46px;height:84px;border-radius:5px;background:var(--slot);border:1px solid var(--rule);position:relative;overflow:hidden}
.lever{position:absolute;left:6px;right:6px;height:36px;top:6px;border-radius:3px;background:currentColor;box-shadow:inset 0 -4px 0 rgba(0,0,0,.18)}
.is-pass{color:var(--pass)}.is-review{color:var(--rev)}.is-critical{color:var(--crit)}
.brk-score{font-stretch:125%;font-weight:750;font-size:26px;font-variant-numeric:tabular-nums}.brk-name{color:var(--ink);font-size:14px}
.legend{color:var(--muted);font-size:14px;margin:0 0 32px}
.group{border-top:1px solid var(--rule);padding:8px 0}.group>summary{list-style:none;cursor:pointer;display:grid;gap:2px;padding:16px 0}
.group>summary::-webkit-details-marker{display:none}.group>summary:focus-visible,.list>summary:focus-visible{outline:3px solid var(--rev);outline-offset:4px}
h2{margin:0;font-stretch:108%;font-size:24px;font-weight:700}.intro{color:var(--muted)}
.group>summary h2::before{content:"";display:inline-block;width:0;height:0;margin-right:12px;vertical-align:4px;border-left:9px solid var(--muted);border-top:6px solid transparent;border-bottom:6px solid transparent;transition:transform .2s}.group[open]>summary h2::before{transform:rotate(90deg)}
h3{font-size:15px;color:var(--muted);font-weight:600;margin:20px 0 6px}
.n{display:inline-block;min-width:1.9em;padding:0 8px;margin-left:8px;border-radius:99px;color:#fff;font-size:15px;text-align:center;vertical-align:4px}
.n.crit{background:var(--crit)}.n.rev{background:var(--rev);color:#1d1600}.n.info{background:var(--info)}
ul{list-style:none;margin:0;padding:0}.row{border-left:4px solid var(--info);background:var(--panel);padding:12px 16px;margin:8px 0;border-radius:0 4px 4px 0}
.row.sev-critical{border-color:var(--crit)}.row.sev-review{border-color:var(--rev)}
.kind{color:var(--muted);font-size:13px;font-variant-numeric:tabular-nums}.pair{margin:2px 0;font-weight:600;display:flex;flex-wrap:wrap;gap:4px 10px}.eq{color:var(--rev)}
.note{margin:0;color:var(--muted);font-size:15px;max-width:72ch}
.hk{background:var(--panel);padding:12px 16px;border-radius:4px;margin:8px 0}.hk p{margin:0}
.list summary{cursor:pointer;color:var(--muted);font-size:15px;margin-top:6px}.names{columns:2 300px;font-size:14px;margin-top:8px}.names li{break-inside:avoid;padding:2px 0}
.skipped ul{columns:2 280px}.skipped li{padding:3px 0 3px 20px;position:relative}.skipped li::before{content:"";position:absolute;left:0;top:.65em;width:10px;height:2px;background:var(--muted)}
.clean{background:var(--panel);padding:16px;border-left:4px solid var(--pass)}
footer{margin-top:40px;color:var(--muted);font-size:14px;border-top:1px solid var(--rule);padding-top:16px}
@media (max-width:640px){header{grid-template-columns:1fr}.score{text-align:left}.panel{grid-template-columns:repeat(3,1fr);padding:16px}}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
.report+.report{margin-top:72px;padding-top:40px;border-top:6px double var(--rule)}
.jump{display:flex;flex-wrap:wrap;gap:8px 20px;margin:0 0 32px;font-size:15px}.jump a{color:var(--ink)}`;
const js = `
(()=>{if(!window.gsap||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
const tl=gsap.timeline({defaults:{ease:'power3.out'}});
tl.from('.lever',{y:40,duration:.45,stagger:.12,ease:'back.out(2.2)'})
  .from('.brk-score',{opacity:0,duration:.3,stagger:.12},'<.15');
document.querySelectorAll('.big[data-count]').forEach(b=>{const o={v:0};tl.to(o,{v:+b.dataset.count,duration:1.1,ease:'power2.out',onUpdate:()=>b.textContent=Math.round(o.v)},0);});
document.querySelectorAll('details.group').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)gsap.from(d.querySelectorAll('.body > ul > li, .body > h3, .body > ul, .hk, .skipped li'),{opacity:0,y:8,duration:.3,stagger:.025,clearProps:'all'});}));
})();
`;

// One page for one or more containers (e.g. a web container and its server container).
// fragment:true omits <html>/<head>/<body> for hosts that wrap the page themselves.
export function htmlBundle(items, { generatedAt = new Date().toISOString(), title, fragment = false } = {}) {
  const metas = items.map(i => meta(i.snapshot));
  const name = title ?? (metas.map(m => m.publicId).filter(Boolean).join(' + ') || 'GTM') + ' Audit';
  const jump = items.length > 1 ? `<nav class="jump" aria-label="Containers">${metas.map((m, i) => `<a href="#c${i}">${esc(m.name)} (${esc(m.publicId)})</a>`).join('')}</nav>` : '';
  const head = `<title>${esc(name)}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="${FONT}"><style>${tokens}\n${css}</style>`;
  const content = `<main>${jump}${items.map((i, n) => containerSection(i.report, i.snapshot, generatedAt, n)).join('')}</main><script src="${GSAP}"></script><script>${js}</script>`;
  return fragment ? `${head}\n${content}\n` : `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${head}</head><body>${content}</body></html>\n`;
}
export const htmlReport = (report, snapshot, opts) => htmlBundle([{ report, snapshot }], opts);

// HyperFrames composition: 1920x1080, paused timeline, deterministic, no input.
export function hyperframes(report, snapshot, { id = 'gtm-audit', duration = 14 } = {}) {
  const s = shape(report, snapshot), m = s.meta;
  const top = [...s.critical, ...s.review].slice(0, 3);
  const cards = top.map(x => `<article class="card sev-${esc(x.severity)}"><div class="k">${esc(x.severity === 'critical' ? 'Fix first' : 'Confirm')}: ${esc(x.kind)} ${esc(x.id)}</div>
    <div class="t">${esc(x.name)}</div><div class="d">${x.pair ? `Identical to ${esc(x.pair.name)}` : esc(x.message)}</div></article>`).join('');
  const hkCount = s.housekeeping.reduce((a, h) => a + h.rows.length, 0);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=1920,height=1080"><title>${esc(m.publicId)} audit video</title>
<link rel="stylesheet" href="${FONT}"><style>
:root{--paper:#0F1E2B;--panel:#162838;--ink:#E3EBF2;--muted:#93A6B7;--rule:#2A4053;--crit:#F0574F;--rev:#F2B53A;--pass:#4CB582;--slot:#203547}
*{box-sizing:border-box}body{margin:0;background:#000}#stage{position:relative;overflow:hidden;width:1920px;height:1080px;background:var(--paper);color:var(--ink);font-family:Archivo,sans-serif}
.head{position:absolute;left:120px;top:96px;right:120px;display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid var(--ink);padding-bottom:28px}
h1{margin:0;font-size:84px;font-stretch:112%;font-weight:760;line-height:1}.sub{margin-top:14px;font-size:30px;color:var(--muted)}
.score{text-align:right}.big{font-size:220px;font-stretch:125%;font-weight:800;line-height:.82;font-variant-numeric:tabular-nums}.of{font-size:26px;color:var(--muted)}
.panel{position:absolute;left:120px;right:120px;top:430px;display:grid;grid-template-columns:repeat(6,1fr);gap:28px;background:var(--panel);border:1px solid var(--rule);border-radius:10px;padding:40px}
.brk{display:grid;justify-items:center;gap:14px}.slot{width:84px;height:150px;border-radius:8px;background:var(--slot);border:1px solid var(--rule);position:relative;overflow:hidden}
.lever{position:absolute;left:10px;right:10px;top:10px;height:64px;border-radius:5px;background:currentColor}
.is-pass{color:var(--pass)}.is-review{color:var(--rev)}.is-critical{color:var(--crit)}.brk-score{font-size:48px;font-weight:750;font-stretch:125%}.brk-name{font-size:26px;color:var(--ink)}
.cards{position:absolute;left:120px;right:120px;top:430px;display:grid;grid-template-columns:repeat(3,1fr);gap:32px}
.card{background:var(--panel);border-left:10px solid var(--rev);border-radius:0 10px 10px 0;padding:36px;min-height:300px}.card.sev-critical{border-color:var(--crit)}
.k{font-size:24px;color:var(--muted)}.t{font-size:40px;font-weight:700;line-height:1.15;margin:14px 0}.d{font-size:28px;color:var(--muted);line-height:1.3}
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

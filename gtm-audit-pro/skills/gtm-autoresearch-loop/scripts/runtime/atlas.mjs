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

export function atlas(items, { generatedAt = new Date().toISOString(), title, fragment = false } = {}) {
  const containers = items.map(i => graph(i.report, i.snapshot));
  const name = title ?? (containers.map(c => c.meta.publicId).filter(Boolean).join(' + ') || 'GTM') + ' Atlas';
  const head = `<title>${esc(name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap">
<style>${CSS}</style>`;
  const body = `<div id="app">
<header class="top"><div class="who"><div class="tabs" id="tabs" role="tablist" aria-label="Container"></div><h1 id="title"></h1><p id="meta"></p></div>
<div class="score"><strong id="score">—</strong><span>configuration score</span></div></header>
<div class="toolbar">
 <div class="mode" role="group" aria-label="View"><button data-view="structured" aria-pressed="true">Structured</button><button data-view="spatial" aria-pressed="false">Free-form</button><button data-view="axonometric" aria-pressed="false">Axonometric</button><button data-view="schedule" aria-pressed="false">Schedule</button></div>
 <label for="q">Find <input id="q" type="search" placeholder="Name, ID, type" autocomplete="off"></label>
 <label for="kind">Family <select id="kind"><option value="all">All families</option></select></label>
 <label for="risk">Finding <select id="risk"><option value="all">Any</option><option value="critical">Fix first</option><option value="review">Confirm</option><option value="info">Housekeeping</option><option value="none">No finding</option></select></label>
 <span class="spacer"></span><button id="reset" class="primary">Reset</button>
</div>
<div class="workspace">
 <main class="diagram" id="diagram"><div class="caption" id="caption"></div><svg id="svg" role="img" aria-label="GTM container dependency diagram"><g id="deco"></g><g id="edges"></g><g id="nodes"></g></svg>
  <div class="schedule" id="schedule" hidden><table><thead><tr><th>Element</th><th>Family</th><th>Type</th><th>Folder</th><th>Links</th><th>Finding</th></tr></thead><tbody id="rows"></tbody></table></div>
  <div class="legend" id="legend"></div></main>
 <aside class="side">
  <div class="stats"><div class="stat"><span>Elements</span><strong id="nodeCount">0</strong></div><div class="stat"><span>Links</span><strong id="edgeCount">0</strong></div><div class="stat"><span>To act on</span><strong id="actCount">0</strong></div></div>
  <div class="scroll">
   <section class="block"><h2>Selected element</h2><div id="selected"><p class="empty">Select an element in the diagram or a recommendation below to trace what it fires on, reads and feeds.</p></div></section>
   <section class="block"><h2>Checks</h2><div id="dims" class="dims"></div></section>
   <section class="block"><h2>Priority recommendations</h2><div id="recs"></div></section>
   <section class="block"><h2>Not checked by this run</h2><ul id="skipped" class="skipped"></ul></section>
   <p class="foot">gtm-audit-pro · report-only, nothing was changed or published · <span id="when"></span></p>
  </div>
 </aside>
</div></div>
<div class="sr" id="live" aria-live="polite"></div>
<script type="application/json" id="atlas-data">${json({ containers, generatedAt })}</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script>${JS}</script>`;
  return fragment ? `${head}\n${body}\n` : `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">${head}</head><body>${body}</body></html>\n`;
}

const CSS = `
/* Layout: score header, toolbar, SVG dependency diagram beside a 340px inspector (GTM Command Center language). */
:root{color-scheme:dark;--bg:#0c0b09;--panel:#15130f;--panel2:#1c1913;--ink:#f7f2df;--muted:#a69f8b;--dim:#5d574a;--line:#353025;--gold:#ffe94a;
 --tag:#65b7ff;--trigger:#bd8cff;--variable:#58ded8;--builtin:#8f8877;--client:#ffad58;--crit:#ff625f;--pass:#5ce1a4;
 --mono:'Space Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--mono)}
button,input,select{font:inherit;color:var(--ink);background:var(--panel2);border:1px solid var(--line);border-radius:6px}
button{cursor:pointer;padding:7px 10px;font-size:11px}button:focus-visible,input:focus-visible,select:focus-visible,.node:focus-visible,tr:focus-visible,.rec:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
.primary,.mode button[aria-pressed="true"],.tabs button[aria-selected="true"]{background:var(--gold);color:#111;border-color:var(--gold)}
#app{min-height:100vh;display:grid;grid-template-rows:auto auto 1fr;background:radial-gradient(circle at 50% 30%,#211c11 0,#0c0b09 55%,#080705 100%)}
.top{padding:14px 18px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:16px;align-items:flex-end;background:rgba(12,11,9,.94)}
.top h1{font-size:18px;margin:6px 0 0;line-height:1.2;text-wrap:balance}.top p{font-size:11px;color:var(--muted);margin:4px 0 0}
.tabs{display:flex;gap:4px;flex-wrap:wrap}.tabs:empty{display:none}.tabs button{font-size:10px;padding:5px 9px}
.score{text-align:right;flex-shrink:0}.score strong{font-size:34px;color:var(--gold);line-height:1;font-variant-numeric:tabular-nums}.score span{font-size:9px;color:var(--muted);display:block;letter-spacing:.08em}
.toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:9px 18px;border-bottom:1px solid var(--line);background:rgba(21,19,15,.9)}
.mode{display:flex;gap:4px;flex-wrap:wrap}.toolbar label{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:10px;letter-spacing:.06em}
.toolbar input,.toolbar select{height:32px;padding:0 8px;font-size:11px}.toolbar input{width:190px;max-width:42vw}.spacer{flex:1}
.workspace{display:grid;grid-template-columns:minmax(0,1fr) 340px;min-height:0}
.diagram{position:relative;min-width:0;overflow:auto;max-height:calc(100vh - 118px);padding:8px 10px 48px}
.diagram svg{display:block}.caption{position:sticky;left:10px;top:0;z-index:2;color:var(--muted);font-size:9px;letter-spacing:.14em;padding:6px 0;pointer-events:none}
.edge{fill:none;stroke:var(--line);stroke-width:1;opacity:.75;transition:opacity .2s,stroke .2s}
.edge.e-blocks{stroke:var(--crit);stroke-dasharray:.02 .015;opacity:.6}.edge.e-sequence{stroke:var(--client)}.edge.e-duplicate{stroke:var(--gold);stroke-dasharray:.03 .02;stroke-width:1.2;opacity:.35}
.edge.hot{stroke:var(--ink);opacity:1;stroke-width:1.5}.edge.hot.e-duplicate{stroke:var(--gold)}.edge.fade{opacity:.06}
.node{cursor:pointer;outline:none}.node circle.dot{stroke:var(--bg);stroke-width:1.5}.node .ring{fill:none;stroke-width:2}
.node.r-critical .ring{stroke:var(--crit)}.node.r-review .ring{stroke:var(--gold)}.node.r-info .ring,.node.r-none .ring{stroke:none}
.node text{font-size:10.5px;fill:var(--muted);pointer-events:none}.node.r-critical text{fill:var(--crit)}.node.r-review text{fill:var(--ink)}
.v-spatial .node text,.v-axonometric .node text{opacity:0}.v-spatial .node.lab text,.v-axonometric .node.lab text{opacity:1;fill:var(--ink);paint-order:stroke;stroke:var(--bg);stroke-width:4px}
.node.fade{opacity:.12}.node.sel circle.dot{stroke:var(--gold);stroke-width:3}.node.sel text,.node.hot text{fill:var(--ink)}.node.off{opacity:.08;pointer-events:none}
.deco text{fill:var(--dim);font-size:10px;letter-spacing:.12em}.deco .plane{fill:rgba(255,233,74,.025);stroke:var(--line)}.deco .ringline{fill:none;stroke:var(--line);stroke-dasharray:2 6}.deco .colrule{stroke:var(--line)}
.legend{position:sticky;left:10px;bottom:0;display:flex;flex-wrap:wrap;gap:6px 14px;font-size:10px;color:var(--muted);padding:10px 0;background:linear-gradient(transparent,var(--bg) 40%)}
.legend i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;vertical-align:-1px}.legend .ln{width:18px;height:0;border-radius:0;border-top:2px dashed var(--gold);vertical-align:3px}
.schedule{overflow-x:auto}.schedule table{width:100%;border-collapse:collapse;font-size:11px}.schedule th{position:sticky;top:0;background:var(--panel);text-align:left;color:var(--muted);font-weight:400;padding:8px;border-bottom:1px solid var(--line);cursor:pointer;white-space:nowrap}
.schedule td{padding:6px 8px;border-bottom:1px solid #221f18;vertical-align:top}.schedule tr{cursor:pointer}.schedule tbody tr:hover,.schedule tr.sel{background:var(--panel2)}.schedule td.num{text-align:right;font-variant-numeric:tabular-nums}
.side{border-left:1px solid var(--line);background:rgba(12,11,9,.95);display:grid;grid-template-rows:auto minmax(0,1fr);max-height:calc(100vh - 118px)}
.stats{display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid var(--line)}.stat{padding:10px;border-right:1px solid var(--line)}.stat:last-child{border-right:0}
.stat span{font-size:9px;color:var(--muted);display:block;letter-spacing:.06em}.stat strong{font-size:20px;font-variant-numeric:tabular-nums}
.scroll{overflow:auto;padding:14px}.block{margin-bottom:22px}.block h2{font-size:10px;letter-spacing:.1em;color:var(--muted);margin:0 0 8px;font-weight:400}
.empty{font-size:11px;line-height:1.6;color:var(--muted);margin:0}
.card{border:1px solid var(--line);background:var(--panel);padding:11px}.card h3{font-size:13px;margin:0;line-height:1.35;overflow-wrap:anywhere}.card .sub{font-size:10px;color:var(--muted);margin:4px 0 8px}
.chips{display:flex;gap:4px;flex-wrap:wrap}.chip{border:1px solid var(--line);font-size:9px;padding:2px 6px;border-radius:3px}
.chip.critical{color:var(--crit);border-color:var(--crit)}.chip.review{color:var(--gold);border-color:#6b6120}
.find{font-size:11px;line-height:1.5;margin:8px 0 0;padding-left:8px;border-left:2px solid var(--line)}.find.critical{border-color:var(--crit)}.find.review{border-color:var(--gold)}
dl{display:grid;grid-template-columns:72px minmax(0,1fr);gap:6px;font-size:10px;margin:10px 0 0}dt{color:var(--muted)}dd{margin:0;display:flex;flex-wrap:wrap;gap:4px}
.link{all:unset;cursor:pointer;font-size:10px;padding:1px 5px;border:1px solid var(--line);border-radius:3px;overflow-wrap:anywhere}.link:hover,.link:focus-visible{border-color:var(--gold);color:var(--gold)}
.dims{display:grid;gap:7px}.dim{display:grid;grid-template-columns:86px minmax(0,1fr) 30px;align-items:center;gap:8px;font-size:10px}.dim .bar{height:6px;background:var(--panel2);border-radius:3px;overflow:hidden}
.dim .bar b{display:block;height:100%;border-radius:3px}.dim .v{text-align:right;font-variant-numeric:tabular-nums}
.rec{display:block;width:100%;text-align:left;border:1px solid var(--line);background:var(--panel);padding:9px 10px;margin:0 0 6px;font-size:11px;line-height:1.45;border-left:3px solid var(--gold);border-radius:0 4px 4px 0}
.rec.critical{border-left-color:var(--crit)}.rec small{display:block;color:var(--muted);font-size:9.5px;margin-top:3px}.rec:hover{background:var(--panel2)}
.recgroup{font-size:9px;color:var(--muted);letter-spacing:.08em;margin:10px 0 6px}
.skipped{list-style:none;margin:0;padding:0;font-size:10.5px;color:var(--muted);line-height:1.5}.skipped li{padding:3px 0 3px 14px;position:relative}.skipped li:before{content:"";position:absolute;left:0;top:.75em;width:7px;height:1px;background:var(--muted)}
.foot{font-size:9.5px;color:var(--dim);line-height:1.5;margin:0}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@media(max-width:900px){.workspace{grid-template-columns:1fr}.diagram{max-height:70vh}.side{border-left:0;border-top:1px solid var(--line);max-height:none}.top{align-items:flex-start}.score strong{font-size:26px}}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}
`;

const JS = String.raw`
(()=>{
const D=JSON.parse(document.getElementById('atlas-data').textContent),$=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const LABEL={client:'Clients',tag:'Tags',trigger:'Triggers',variable:'Variables',builtin:'Built-ins'},ONE={client:'client',tag:'tag',trigger:'trigger',variable:'variable',builtin:'built-in'};
const DIM={references:'References',duplicates:'Duplicates',naming:'Naming',hygiene:'Unused',legacy:'Legacy',folders:'Folders'};
const RISKNAME={critical:'Fix first',review:'Confirm',info:'Housekeeping'};
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,G=window.gsap&&!reduce?window.gsap:null;
const S={c:0,view:'structured',q:'',kind:'all',risk:'all',sel:null,hover:null,pos:new Map(),sort:null};
let C,byId,adj,nodeEls=new Map(),edgeEls=[],deco;
const el=(tag,attrs={},parent)=>{const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);parent&&parent.append(e);return e};
const h=(tag,cls,text,parent)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;parent&&parent.append(e);return e};
const short=(s,n)=>s.length>n?s.slice(0,n-1)+'…':s;
function tabs(){const t=$('tabs');if(D.containers.length<2)return;D.containers.forEach((c,i)=>{const b=h('button','',c.meta.publicId||c.meta.name,t);b.setAttribute('role','tab');b.setAttribute('aria-selected',String(i===S.c));b.title=c.meta.name;b.onclick=()=>{S.c=i;S.sel=null;[...t.children].forEach((x,j)=>x.setAttribute('aria-selected',String(j===i)));load(true)}})}
function load(animate){
 C=D.containers[S.c];byId=new Map(C.nodes.map(n=>[n.id,n]));adj=new Map(C.nodes.map(n=>[n.id,{out:[],in:[]}]));
 C.edges.forEach(e=>{adj.get(e.from).out.push(e);adj.get(e.to).in.push(e)});
 $('title').textContent=C.meta.name;$('meta').textContent=[C.meta.publicId,C.meta.context&&C.meta.context+' container',C.nodes.length+' elements'].filter(Boolean).join(' · ');
 $('score').textContent=C.score;$('nodeCount').textContent=C.nodes.length;$('edgeCount').textContent=C.edges.length;
 $('actCount').textContent=C.nodes.filter(n=>n.risk==='critical'||n.risk==='review').length;
 const k=$('kind');k.length=1;[...new Set(C.nodes.map(n=>n.kind))].forEach(x=>{const o=h('option','',LABEL[x],k);o.value=x});S.kind='all';k.value='all';
 dims();recs();skipped();legend();build();layout(false);apply();rows();if(animate!==false)intro();select(S.sel,false)
}
function dims(){const d=$('dims');d.textContent='';C.dims.forEach(x=>{const r=h('div','dim','',d);h('span','',DIM[x.key]||x.key,r);const bar=h('span','bar','',r),b=h('b','','',bar);b.style.width=x.score+'%';b.style.background=x.score>=90?'var(--pass)':x.score>=60?'var(--gold)':'var(--crit)';h('span','v',x.score,r)})}
function recs(){const d=$('recs');d.textContent='';const done=new Set(),items=[];
 C.nodes.forEach(n=>n.findings.forEach(f=>{if(f.severity==='info')return;const key=f.pair?[n.id,f.pair].sort().join('|'):n.id+f.message;if(done.has(key))return;done.add(key);items.push({n,f})}));
 items.sort((a,b)=>(a.f.severity==='critical'?0:1)-(b.f.severity==='critical'?0:1));
 if(!items.length){h('p','empty','No fix-first or confirm findings in this container. Housekeeping items are in the Schedule view.',d);return}
 let group='';items.forEach(({n,f})=>{const g=f.severity==='critical'?'FIX FIRST':f.pair?'CONFIRM · IDENTICAL CONFIGURATION':'CONFIRM · '+(DIM[f.dimension]||f.dimension).toUpperCase();if(g!==group){group=g;h('div','recgroup',g,d)}
  const b=h('button','rec '+f.severity,'',d);const p=f.pair&&byId.get(f.pair);b.append(document.createTextNode(p?n.name+' ↔ '+p.name:n.name));
  h('small','',p?'Same settings as '+ONE[p.kind]+' '+p.ref+'. Merge them or confirm both are needed.':f.message,b);b.onclick=()=>select(n.id,true)})
}
function skipped(){const u=$('skipped');u.textContent='';C.skipped.forEach(s=>h('li','',s,u));$('when').textContent=(D.generatedAt||'').slice(0,10)}
function legend(){const l=$('legend');l.textContent='';[...new Set(C.nodes.map(n=>n.kind))].forEach(k=>{const s=h('span','','',l),i=h('i','','',s);i.style.background='var(--'+k+')';s.append(LABEL[k])});
 [['var(--crit)','Fix first'],['var(--gold)','Confirm']].forEach(([c,t])=>{const s=h('span','','',l),i=h('i','','',s);i.style.border='2px solid '+c;s.append(t)});const s=h('span','','',l);h('i','ln','',s);s.append('Identical pair')}
function build(){const svg=$('svg'),eg=$('edges'),ng=$('nodes');eg.textContent='';ng.textContent='';nodeEls=new Map();edgeEls=[];deco=$('deco');
 C.edges.forEach(e=>{const p=el('path',{class:'edge e-'+e.kind,pathLength:1},eg);edgeEls.push({e,p})});
 C.nodes.forEach(n=>{const g=el('g',{class:'node k-'+n.kind+' r-'+(n.risk||'none'),tabindex:0,role:'button','aria-label':ONE[n.kind]+' '+n.name+(n.risk?', '+RISKNAME[n.risk]:'')},ng);
  el('circle',{class:'ring',r:8.5},g);const dot=el('circle',{class:'dot',r:n.kind==='tag'?5:4.5,fill:'var(--'+n.kind+')'},g);const t=el('text',{x:10,y:3.5},g);t.textContent=n.name;
  g.addEventListener('mouseenter',()=>{S.hover=n.id;apply()});g.addEventListener('mouseleave',()=>{S.hover=null;apply()});
  g.addEventListener('click',()=>select(n.id,false));g.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();select(n.id,false)}});nodeEls.set(n.id,{g,t,dot})})
}
function W(){return Math.max(560,$('diagram').clientWidth-20)}
function layout(animate){
 const w=W(),fam=k=>C.nodes.filter(n=>n.kind===k),pos=new Map(),decoItems=[];let height=600,caption='';
 const kinds=['client','tag','trigger','variable'].filter(k=>fam(k).length||(k==='variable'&&fam('builtin').length));
 const col=k=>k==='variable'?[...fam('variable'),...fam('builtin')]:fam(k);
 if(S.view==='structured'||S.view==='schedule'){
  const cw=w/kinds.length,row=21,top=46;caption='STRUCTURED · '+kinds.map(k=>LABEL[k].toUpperCase()).join(' → ');
  kinds.forEach((k,ci)=>{const x=ci*cw+14;decoItems.push(['text',{x,y:22},LABEL[k].toUpperCase()+'  '+col(k).length]);if(ci)decoItems.push(['line',{class:'colrule',x1:x-8,y1:8,x2:x-8,y2:999999}]);
   col(k).forEach((n,i)=>{pos.set(n.id,{x:x+6,y:top+i*row});const t=nodeEls.get(n.id).t;t.textContent=short(n.name,Math.max(10,Math.floor((cw-34)/6.6)))})});
  height=top+Math.max(...kinds.map(k=>col(k).length))*row+30;
 }else if(S.view==='spatial'){
  const size=Math.max(560,Math.min(w,1100)),cx=w/2,cy=size/2+16,rings={tag:.45,client:.45,trigger:.31,variable:.17};caption='FREE-FORM · CONCENTRIC: VARIABLES AT THE CORE, TAGS ON THE RIM';
  kinds.forEach(k=>{const R=rings[k]*size,list=col(k);decoItems.push(['circle',{class:'ringline',cx,cy,r:R}]);decoItems.push(['text',{x:cx+6,y:cy-R-6},LABEL[k].toUpperCase()]);
   list.forEach((n,i)=>{const a=(i/list.length)*Math.PI*2-Math.PI/2+(k==='trigger'?.05:k==='variable'?.1:0);pos.set(n.id,{x:cx+Math.cos(a)*R,y:cy+Math.sin(a)*R})})});
  C.nodes.forEach(n=>nodeEls.get(n.id).t.textContent=n.name);height=size+40;
 }else{
  const planes=['tag','trigger','variable'].filter(k=>kinds.includes(k));if(kinds.includes('client'))planes.unshift('client');
  const cell=24,sx=cell*.866,sy=cell*.5,gap=70;let y=40;caption='AXONOMETRIC · EXPLODED SECTION: '+planes.map(k=>LABEL[k].toUpperCase()).join(' / ');
  planes.forEach(k=>{const list=col(k),cols=Math.max(3,Math.ceil(Math.sqrt(list.length*1.7))),rowsN=Math.max(2,Math.ceil(list.length/cols)),ox=w/2-(cols-rowsN)*sx/2,P=(c,r)=>[ox+(c-r)*sx,y+(c+r)*sy];
   const pts=[P(-.5,-.5),P(cols-.5,-.5),P(cols-.5,rowsN-.5),P(-.5,rowsN-.5)].map(p=>p.join(',')).join(' ');decoItems.push(['polygon',{class:'plane',points:pts}]);
   const lp=P(cols-.5,-.5);decoItems.push(['text',{x:lp[0]+12,y:lp[1]+4},LABEL[k].toUpperCase()+'  '+list.length]);
   list.forEach((n,i)=>{const[px,py]=P(i%cols,Math.floor(i/cols));pos.set(n.id,{x:px,y:py})});y+=(cols+rowsN)*sy+gap});
  C.nodes.forEach(n=>nodeEls.get(n.id).t.textContent=n.name);height=y;
 }
 $('caption').textContent=caption;const svg=$('svg');svg.setAttribute('width',w);svg.setAttribute('height',height);svg.setAttribute('viewBox','0 0 '+w+' '+height);svg.setAttribute('class','v-'+S.view);
 deco.textContent='';deco.setAttribute('class','deco');decoItems.forEach(([t,a,txt])=>{const e=el(t,a,deco);if(txt)e.textContent=txt;if(t==='line')e.setAttribute('y2',height)});
 const from=new Map(S.pos);S.pos=pos;
 if(animate&&G&&from.size){const o={t:0};S.tw&&S.tw.progress(1);const tw=S.tw=G.to(o,{t:1,duration:.8,ease:'power2.inOut',onUpdate:()=>place(from,pos,o.t)});setTimeout(()=>tw.progress(1),1200)}else place(null,pos,1);
}
function place(from,to,t){const at=id=>{const b=to.get(id);if(!from||!from.get(id))return b;const a=from.get(id);return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}};
 const P=new Map();C.nodes.forEach(n=>{const p=at(n.id);P.set(n.id,p);nodeEls.get(n.id).g.setAttribute('transform','translate('+p.x.toFixed(1)+','+p.y.toFixed(1)+')')});
 const w=W(),cx=w/2;edgeEls.forEach(({e,p})=>{const a=P.get(e.from),b=P.get(e.to);let d;
  if(S.view==='spatial'){const cy=(parseFloat($('svg').getAttribute('height'))-40)/2+16,mx=(a.x+b.x)/2*.55+cx*.45,my=(a.y+b.y)/2*.55+cy*.45;d='M'+a.x+','+a.y+'Q'+mx+','+my+' '+b.x+','+b.y}
  else if(S.view==='axonometric')d='M'+a.x+','+a.y+'L'+b.x+','+b.y;
  else if(Math.abs(a.x-b.x)<2){const bend=Math.min(60,20+Math.abs(a.y-b.y)*.2);d='M'+a.x+','+a.y+'C'+(a.x-bend)+','+a.y+' '+(b.x-bend)+','+b.y+' '+b.x+','+b.y}
  else{const dx=(b.x-a.x)/2;d='M'+a.x+','+a.y+'C'+(a.x+dx)+','+a.y+' '+(b.x-dx)+','+b.y+' '+b.x+','+b.y}
  p.setAttribute('d',d)})}
function match(n){if(S.kind!=='all'&&n.kind!==S.kind&&!(S.kind==='variable'&&n.kind==='builtin'))return false;
 if(S.risk==='none'?n.risk:S.risk!=='all'&&n.risk!==S.risk)return false;
 if(S.q){const q=S.q;return[n.name,n.ref,n.type,n.folder||''].some(v=>String(v).toLowerCase().includes(q))}return true}
function apply(){const focus=S.hover||S.sel,near=new Set();if(focus){near.add(focus);adj.get(focus).out.forEach(e=>near.add(e.to));adj.get(focus).in.forEach(e=>near.add(e.from))}
 const ok=new Set(C.nodes.filter(match).map(n=>n.id));
 C.nodes.forEach(n=>{const{g}=nodeEls.get(n.id);g.classList.toggle('off',!ok.has(n.id));g.classList.toggle('fade',!!focus&&!near.has(n.id));g.classList.toggle('hot',!!focus&&near.has(n.id)&&n.id!==S.sel);g.classList.toggle('sel',n.id===S.sel);g.classList.toggle('lab',!!focus&&near.has(n.id))});
 edgeEls.forEach(({e,p})=>{const hot=!!focus&&(e.from===focus||e.to===focus);p.classList.toggle('hot',hot);p.classList.toggle('fade',(!!focus&&!hot)||!ok.has(e.from)||!ok.has(e.to))});
 const list=$('rows');[...list.children].forEach(tr=>{tr.hidden=!ok.has(tr.dataset.id);tr.classList.toggle('sel',tr.dataset.id===S.sel)});
 if(S.hover||S.sel){const g=nodeEls.get(focus).g;g.parentNode.append(g)}}
function names(list,parent){if(!list.length){parent.append(document.createTextNode('—'));return}list.slice(0,24).forEach(id=>{const n=byId.get(id),b=h('button','link',short(n.name,40),parent);b.title=ONE[n.kind]+' '+n.ref;b.onclick=()=>select(id,true)});if(list.length>24)parent.append(document.createTextNode(' +'+(list.length-24)+' more'))}
function select(id,scroll){S.sel=id&&byId.has(id)?id:null;const box=$('selected');box.textContent='';
 if(!S.sel){h('p','empty','Select an element in the diagram or a recommendation below to trace what it fires on, reads and feeds.',box);apply();return}
 const n=byId.get(S.sel),c=h('div','card','',box);h('h3','',n.name,c);h('p','sub',ONE[n.kind]+' '+n.ref+' · '+n.type+(n.folder?' · '+n.folder:' · no folder'),c);
 const ch=h('div','chips','',c);if(n.paused)h('span','chip','paused',ch);[...new Set(n.findings.map(f=>f.severity))].forEach(s=>h('span','chip '+s,RISKNAME[s],ch));if(!n.findings.length)h('span','chip','no findings',ch);
 n.findings.forEach(f=>{const p=f.pair&&byId.get(f.pair);h('p','find '+f.severity,p?'Same settings as '+p.name+' ('+ONE[p.kind]+' '+p.ref+').':f.message,c)});
 const o=adj.get(n.id),dl=h('dl','','',c),row=(label,ids)=>{if(!ids.length&&label!=='Used by')return;h('dt','',label,dl);names([...new Set(ids)],h('dd','','',dl))};
 row('Fires on',o.out.filter(e=>e.kind==='fires').map(e=>e.to));row('Blocked by',o.out.filter(e=>e.kind==='blocks').map(e=>e.to));row('Reads',o.out.filter(e=>e.kind==='reads').map(e=>e.to));
 row('Runs after',o.in.filter(e=>e.kind==='sequence').map(e=>e.from));row('Used by',o.in.filter(e=>e.kind!=='duplicate'&&e.kind!=='sequence').map(e=>e.from));
 $('live').textContent='Selected '+ONE[n.kind]+' '+n.name;apply();
 if(scroll){if(S.view==='schedule'){const tr=$('rows').querySelector('[data-id="'+CSS.escape(n.id)+'"]');tr&&tr.scrollIntoView({block:'center',behavior:reduce?'auto':'smooth'})}
  else{const p=S.pos.get(n.id),d=$('diagram');if(p)d.scrollTo({top:Math.max(0,p.y-d.clientHeight/2),left:Math.max(0,p.x-d.clientWidth/2),behavior:reduce?'auto':'smooth'});
   if(G){const dot=nodeEls.get(n.id).dot;G.fromTo(dot,{attr:{r:14}},{attr:{r:n.kind==='tag'?5:4.5},duration:.7,ease:'elastic.out(1,.4)'})}}}}
function rows(){const tb=$('rows');tb.textContent='';const deg=n=>adj.get(n.id).out.length+adj.get(n.id).in.length;let list=[...C.nodes];
 if(S.sort){const[k,dir]=S.sort;const val={0:n=>n.name,1:n=>n.kind,2:n=>n.type,3:n=>n.folder||'~',4:deg,5:n=>({critical:0,review:1,info:2}[n.risk]??3)}[k];list.sort((a,b)=>{const x=val(a),y=val(b);return(x>y?1:x<y?-1:0)*dir})}
 list.forEach(n=>{const tr=h('tr','','',tb);tr.dataset.id=n.id;tr.tabIndex=0;h('td','',n.name,tr);h('td','',ONE[n.kind],tr);h('td','',n.type,tr);h('td','',n.folder||'—',tr);h('td','num',deg(n),tr);
  const f=n.findings.find(x=>x.severity===n.risk);const td=h('td','',f?RISKNAME[n.risk]+': '+(f.pair?'same as '+(byId.get(f.pair)?.name||f.pair):f.message):'—',tr);if(n.risk&&n.risk!=='info')td.style.color=n.risk==='critical'?'var(--crit)':'var(--gold)';
  tr.onclick=()=>select(n.id,false);tr.onkeydown=e=>{if(e.key==='Enter')select(n.id,false)}});apply()}
document.querySelectorAll('.schedule th').forEach((th,i)=>th.onclick=()=>{S.sort=S.sort&&S.sort[0]===i?[i,-S.sort[1]]:[i,1];rows()});
function setView(v){S.view=v;document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===v)));
 const sch=v==='schedule';$('schedule').hidden=!sch;$('svg').style.display=sch?'none':'';$('legend').hidden=sch;$('caption').hidden=sch;if(!sch){layout(true);apply()}
 try{history.replaceState(null,'','#'+v)}catch(e){}}
function intro(){if(!G)return;const ns=[...nodeEls.values()].map(x=>x.g),ds=[...nodeEls.values()].map(x=>x.dot),es=edgeEls.map(x=>x.p);
 // One timeline, forced to its end state if the browser throttles animation (background tabs, previews).
 S.intro&&S.intro.progress(1);const tl=S.intro=G.timeline({onComplete(){G.set(es,{clearProps:'strokeDasharray,strokeDashoffset'})}});
 tl.set(es,{strokeDasharray:1,strokeDashoffset:1}).from(ns,{opacity:0,duration:.35,stagger:{amount:.9}},0).from(ds,{attr:{r:0},duration:.5,stagger:{amount:.9},ease:'back.out(3)'},0)
  .to(es,{strokeDashoffset:0,duration:.9,stagger:{amount:.8},ease:'power2.out'},.5).from('.deco > *',{opacity:0,duration:.6,stagger:.04},0);
 setTimeout(()=>tl.progress(1),2600)}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$('q').oninput=e=>{S.q=e.target.value.toLowerCase().trim();apply()};$('kind').onchange=e=>{S.kind=e.target.value;apply()};$('risk').onchange=e=>{S.risk=e.target.value;apply()};
$('reset').onclick=()=>{S.q='';S.kind='all';S.risk='all';$('q').value='';$('kind').value='all';$('risk').value='all';select(null);setView('structured')};
document.addEventListener('keydown',e=>{if(e.key==='Escape')select(null)});
let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(S.view!=='schedule'){layout(false);apply()}},150)});
tabs();load(true);const hv=location.hash.slice(1);if(['spatial','axonometric','schedule'].includes(hv))setView(hv);
})();
`;

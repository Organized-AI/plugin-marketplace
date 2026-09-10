import { promises as fs } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inventory } from './inventory.mjs';
const here=dirname(fileURLToPath(import.meta.url));
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function renderOverview(data) {
  const reference=await fs.readFile(join(here,'skill-loop-all-skills-layout-preview.html'),'utf8');
  const css=reference.match(/<style>([\s\S]*?)<\/style>/)[1];
  const skills=data.skills??[], unavailable=data.unavailable??[];
  const issueCount=skills.reduce((n,s)=>n+(s.packageAssessment?.issues?.length??0),0);
  const cards=skills.map((s,i)=>`<button data-index="${i}" aria-pressed="${i===0}">${esc(s.name)}<span class="count">${s.packageAssessment?.components?.length??0}</span><span class="small">files inventoried · Behavioral QA untested</span></button>`).join('');
  const panels=skills.map((s,i)=>{
    const p=s.packageAssessment??{}, issues=p.issues??[];
    return `<section class="panel" id="skill-${i}" ${i?'hidden':''}><div class="label">Your skill · Initial assessment</div><h2>${esc(s.name)}</h2><p class="dim">${esc(s.path)}</p><p><b>Behavioral QA: Untested.</b> ${esc(s.reason)}</p><p>Package fingerprint: <code>${esc(s.packageHash)}</code></p><h3>Package findings (${issues.length})</h3>${issues.length?issues.map(x=>`<div class="finding"><b>${esc(x.path)}</b><p>${esc(x.reason)} · ${esc(x.status)}</p></div>`).join(''):'<p>No package findings reported by this scan. This is not a behavioral pass.</p>'}<button data-request="${i}">Prepare next QA step</button><details><summary>Files and coverage</summary><p>${esc(p.coverage)}</p><div class="table-scroll"><table><thead><tr><th>File</th><th>Type</th><th>Check status</th></tr></thead><tbody>${(p.components??[]).map(c=>`<tr><td>${esc(c.path)}</td><td>${esc(c.kind)}</td><td>${esc(c.status)}: ${esc(c.reason)}</td></tr>`).join('')}</tbody></table></div></details></section>`;
  }).join('');
  const payload=JSON.stringify(data).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Skill Loop QA Review · Jordaaan</title><style>${css}
[hidden]{display:none!important}input,textarea{width:100%;background:var(--surface);color:var(--text);padding:12px;border:1px solid var(--line)}code{overflow-wrap:anywhere}dialog{max-width:800px;width:90%;background:var(--card);color:var(--text)}a{color:var(--gold)}</style></head><body><header><div class="wordmark">ORGANIZED <span class="gold">AI</span></div><a href="https://www.linkedin.com/in/jordaaanhill" target="_blank" rel="noopener noreferrer">Jordaaan</a></header><main><div class="label">Skill Loop · Your accessible skills</div><h1>See what needs attention.</h1><p>Initial package assessment. Run deeper checks after this overview; no skills were changed.</p><div class="overview"><div class="ocard">Skills found<div class="stat">${skills.length}</div></div><div class="ocard">Package findings<div class="stat">${issueCount}</div></div><div class="ocard">Access gaps<div class="stat">${unavailable.length}</div></div><div class="ocard">Behavioral tests run<div class="stat">0</div></div></div><p class="gapnote">Static inventory is not behavioral QA or proof of reduced variance. Repeated checks establish reliability over time.</p><details><summary>What was scanned</summary><p>${esc(data.coverage)}</p><pre>${esc((data.scope??[]).join('\n'))}</pre></details>${skills.length?'<label for="filter">Find a skill</label><input id="filter" type="search" placeholder="Search your skills">':'<section class="panel"><h2>No readable skills found</h2><p>Attach your skill package or provide an accessible skill directory, then run again. No sample has been substituted.</p></section>'}<nav id="skillsNav" aria-label="Skills">${cards}</nav>${panels}${unavailable.length?`<section class="panel"><h2>Could not assess</h2>${unavailable.map(x=>`<p><b>${esc(x.path)}</b>: ${esc(x.reason)}</p>`).join('')}<p>Provide a readable package or resolve the stated access limitation, then reassess.</p></section>`:''}<section class="panel"><h2>Keep your progress</h2><p>This report and inventory are saved in the QA output folder. Cloudflare history is optional and requires the connected save/readback workflow.</p><button id="history">Prepare history request</button></section></main><dialog id="request"><h2>Continue in your assistant</h2><p>This prepares a request. Nothing has been changed or saved to cloud storage.</p><textarea id="requestText" rows="9" readonly></textarea><button id="copy">Copy request</button><button id="close">Close</button><p id="copyStatus" role="status"></p></dialog><script type="application/json" id="inventory-data">${payload}</script><script>
const data=JSON.parse(document.getElementById('inventory-data').textContent);
const dialog=document.getElementById('request'), text=document.getElementById('requestText');
function request(value){text.value=value;document.getElementById('copyStatus').textContent='';dialog.showModal();}
document.querySelectorAll('[data-index]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-index]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));data.skills.forEach((s,i)=>{document.getElementById('skill-'+i).hidden=i!==Number(button.dataset.index);});}));
document.getElementById('filter')?.addEventListener('input',event=>{document.querySelectorAll('[data-index]').forEach(b=>{b.hidden=!data.skills[Number(b.dataset.index)].name.toLowerCase().includes(event.target.value.toLowerCase());});});
document.querySelectorAll('[data-request]').forEach(button=>button.addEventListener('click',()=>{const s=data.skills[Number(button.dataset.request)];request('Continue Skill Loop for '+s.name+' at '+s.path+'. Verify the package still matches '+s.packageHash+'. Review package findings against the actual source, draft source-grounded behavioral checks, and run supported checks. Preserve originals, report limitations, and update this HTML with actual evidence.');}));
document.getElementById('history').addEventListener('click',()=>request('Use this Skill Loop overview and its inventory.json to prepare a compact package-assessment summary through my Cloudflare Developer Platform connection. Preserve the inventory-only and behavioral-untested labels. Follow the bundled storage guide and confirm save only after exact readback. Do not claim a full package backup. If the connector is unavailable, explain how to connect it.'));
document.getElementById('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(text.value);document.getElementById('copyStatus').textContent='Copied. Paste into your assistant.';}catch{text.focus();text.select();document.getElementById('copyStatus').textContent='Select and copy the request above.';}});
document.getElementById('close').addEventListener('click',()=>dialog.close());
</script></body></html>`;
}
export async function overview(folder,roots) {
  if(!folder)throw Error('Usage: overview EMPTY_OUTPUT_DIRECTORY [SKILL_DIRECTORY ...]');
  folder=resolve(folder);await fs.mkdir(folder,{recursive:true});
  if((await fs.readdir(folder)).length)throw Error('Choose an empty output directory; existing files are preserved');
  const data=await inventory(roots?.length?roots:undefined);
  const html=await renderOverview(data);
  await fs.writeFile(join(folder,'inventory.json'),JSON.stringify(data,null,2)+'\n',{flag:'wx'});
  await fs.writeFile(join(folder,'report.html'),html,{flag:'wx'});
  return {inventory:join(folder,'inventory.json'),report:join(folder,'report.html'),skills:data.skills.length,unavailable:data.unavailable.length,behavioralTestsRun:0,next:'Open the initial report, then run task-specific QA for the actual skills'};
}

(()=>{
'use strict';
const data=JSON.parse(document.getElementById('review-data').textContent);
const $=id=>document.getElementById(id), versions=data.versions;
let editing=false;
function selected(side){return versions[Number($(side+'-version').value)];}
function text(id,value){$(id).textContent=value;}
function add(tag,value,parent,cls){const e=document.createElement(tag);e.textContent=value;if(cls)e.className=cls;parent.append(e);return e;}
function lines(a,b){
 const x=a.split('\n'),y=b.split('\n');
 if(x.length*y.length>500000)return {approximate:true,left:x.map((s,i)=>({s,changed:s!==y[i]})),right:y.map((s,i)=>({s,changed:s!==x[i]}))};
 const dp=Array.from({length:x.length+1},()=>new Uint32Array(y.length+1));
 for(let i=x.length-1;i>=0;i--)for(let j=y.length-1;j>=0;j--)dp[i][j]=x[i]===y[j]?1+dp[i+1][j+1]:Math.max(dp[i+1][j],dp[i][j+1]);
 const left=[],right=[];let i=0,j=0;
 while(i<x.length||j<y.length){if(i<x.length&&j<y.length&&x[i]===y[j]){left.push({s:x[i++],changed:false});right.push({s:y[j++],changed:false});}else if(j<y.length&&(i===x.length||dp[i][j+1]>=dp[i+1][j]))right.push({s:y[j++],changed:true});else left.push({s:x[i++],changed:true});}
 return {left,right};
}
function drawCode(id,rows,kind){const box=$(id);box.replaceChildren();rows.forEach(r=>add('span',r.s||' ',box,$('highlight').checked&&r.changed?kind:''));}
function drawEvidence(v,id){const box=$(id);box.replaceChildren();for(const c of v.checks??[]){const row=add('div','',box,'check');add('strong',`${c.caseId} · check ${c.index+1} · ${c.path||'/'} ${c.op} · ${c.passed?'Pass':'Fail'}`,row,c.passed?'pass':'fail');add('div',`Actual: ${JSON.stringify(c.actual)} · Expected: ${JSON.stringify(c.expected)}`,row);}}
function render(){
 const a=selected('left'),b=selected('right');if(!a||!b)return;
 const diff=lines(a.skill,editing?$('draft').value:b.skill);drawCode('left-code',diff.left,'removed');drawCode('right-code',diff.right,'added');
 text('left-score',`${a.passed} / ${a.total} · ${a.qa}`);text('right-score',editing?'Untested draft — saved score does not apply':`${b.passed} / ${b.total} · ${b.qa}`);
 text('left-source',`QA source: ${a.source?.title??'Not specified'} · ${a.source?.version??'Unversioned'}`);text('right-source',`QA source: ${b.source?.title??'Not specified'} · ${b.source?.version??'Unversioned'}`);
 text('comparison',editing?'Draft changed. Run fresh tests before comparing scores.':a.conditions!==b.conditions?'Conditions differ. These scores cannot establish improvement or effectiveness drift.':a.version===b.version?'Same saved version selected on both sides.':'Same test conditions. Review individual checks as well as total scores.');
 if(diff.approximate)$('comparison').textContent+=' Large file: highlights compare line positions, not moved blocks.';
 drawEvidence(a,'left-checks');drawEvidence(b,'right-checks');$('right-checks').hidden=editing;$('right-source').hidden=editing;
 $('left-version').disabled=editing;$('right-version').disabled=editing;$('revision-request').disabled=editing;
 $('choose-version').disabled=editing||b.active;$('edit-draft').disabled=editing;
 $('download-draft').hidden=!editing;$('test-draft').hidden=!editing;$('cancel-draft').hidden=!editing;
 text('choose-version',b.active?'Already active in this snapshot':'Prepare version choice');
}
function request(value){$('request-box').hidden=false;$('review-request').value=value;text('request-status','Ready to copy. Nothing has been applied.');}
for(const [i,v] of versions.entries())for(const side of ['left','right']){const o=document.createElement('option');o.value=i;o.textContent=`${v.active?'Active':'Saved'} · ${v.version.slice(0,8)} · ${v.passed}/${v.total}`;$(side+'-version').append(o);}
if(!versions.length){$('review-controls').hidden=true;text('comparison','No saved versions yet. Run a skill check, then regenerate this report.');return;}
$('left-version').value=String(Math.max(0,versions.findIndex(v=>v.active)));$('right-version').value=String(versions.length-1);
for(const side of ['left','right'])$(side+'-version').addEventListener('change',()=>{editing=false;$('draft-area').hidden=true;$('request-box').hidden=true;text('request-status','');render();});
$('highlight').addEventListener('change',render);
$('revision-note').addEventListener('input',()=>{$('request-box').hidden=true;text('request-status','');});
$('edit-draft').addEventListener('click',()=>{editing=true;$('draft').value=selected('right').skill;$('draft-area').hidden=false;$('request-box').hidden=true;text('request-status','');render();});
$('draft').addEventListener('input',()=>{$('request-box').hidden=true;text('request-status','');render();});
$('cancel-draft').addEventListener('click',()=>{editing=false;$('draft-area').hidden=true;$('request-box').hidden=true;text('request-status','');render();});
$('choose-version').addEventListener('click',()=>{const v=selected('right');request(`Use Skill Loop with configuration ${JSON.stringify(data.config)}. I prefer saved version ${v.version}. Check current state and show its QA evidence and any lower-score or changed-condition warning. Ask me to confirm this exact version choice before activating it. Regenerate the interactive report after the decision. This report was a snapshot and may be stale.`);});
$('revision-request').addEventListener('click',()=>{const v=selected('right');request(`Use Skill Loop with configuration ${JSON.stringify(data.config)}. Review saved version ${v.version} and its QA failures. Research a correction using the task's authoritative sources, test it, and stage it for my review. My requested improvement is: ${$('revision-note').value.trim()||'Address the failed checks without losing passing behavior.'} Do not apply the change. Open the updated interactive report.`);});
$('download-draft').addEventListener('click',()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([$('draft').value],{type:'text/plain'}));a.href=url;a.download=data.draftName;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);text('request-status','Draft downloaded. It has not been tested or applied.');});
$('test-draft').addEventListener('click',()=>request(`Use Skill Loop with configuration ${JSON.stringify(data.config)}. I am attaching a draft named ${JSON.stringify(data.draftName)} based on saved version ${selected('right').version}. If the attachment is missing, ask me for it. Test the supplied draft against the configured QA suite, keep its source and rationale explicit, and stage the result for review without changing the active skill. Regenerate the interactive report. Do not reuse the saved version's score for this draft.`));
$('copy-review-request').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('review-request').value);text('request-status','Copied. Paste into your desktop assistant with any required draft attachment.');}catch{text('request-status','Select and copy the request below.');$('review-request').focus();$('review-request').select();}});
render();
})();

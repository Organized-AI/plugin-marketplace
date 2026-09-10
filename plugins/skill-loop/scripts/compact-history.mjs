import {createHash} from 'node:crypto';
export function compactHistory(evidence){
 const r=evidence.saved??{};
 const text=(v,n=100)=>String(v??'').slice(0,n);
 const failed=(r.checks??[]).filter(x=>x.pass===false||x.passed===false);
 const proposals=evidence.proposals??[];
 const record={format:'skill-loop-qa-summary',version:1,runId:text(r.id),createdAt:text(r.createdAt),skill:text(r.skillPath?.split('/').pop()??'unknown'),skillHash:text(r.skillHash,64),packageHash:text(r.packageHash,64),passed:r.passed??null,total:r.total??null,score:r.score??null,drift:text(r.comparison?.status??'not-assessed'),qaSource:text(r.qaSource?.title),failedCheckCount:failed.length,findings:failed.slice(0,3).map(x=>text(x.reason??x.message??x.id??x.caseId??'Failed check',80)),reviewCount:proposals.length,reviews:proposals.slice(0,3).map(p=>({id:text(p.id,64),status:text(p.status??'pending',30)})),scope:'Compact QA summary only. Source files, outputs, full findings, drafts, and package restoration are excluded.'};
 const raw=JSON.stringify(record);if(Buffer.byteLength(raw)>2200)throw Error('Compact summary exceeds 2200 bytes');
 const id=createHash('sha256').update(raw).digest('hex');
 const q=s=>"'"+s.replaceAll("'","''")+"'";
 return {record,raw,id,setup:'CREATE TABLE IF NOT EXISTS skill_loop_qa_summaries (id TEXT PRIMARY KEY, document TEXT NOT NULL);',write:`INSERT OR IGNORE INTO skill_loop_qa_summaries(id,document) VALUES (${q(id)},${q(raw)});`,read:`SELECT id,document FROM skill_loop_qa_summaries WHERE id=${q(id)};`};
}

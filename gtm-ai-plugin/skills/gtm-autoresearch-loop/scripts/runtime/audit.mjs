import { iterate, dominates } from './shared/core.mjs';
import { createHash } from 'node:crypto';

export const groups = { tag: 'tagId', trigger: 'triggerId', variable: 'variableId', folder: 'folderId' };
export function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])]));
  return value;
}
export const hash = value => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
export function container(input) {
  const c = structuredClone(input.containerVersion ?? input);
  if (!c || typeof c !== 'object' || Array.isArray(c)) throw Error('Expected GTM container export');
  // Require explicit inventories so a failed export cannot pass as a clean empty container.
  for (const [key, id] of Object.entries(groups)) {
    if (!Array.isArray(c[key])) throw Error(`Missing complete ${key} inventory`);
    const ids = new Set();
    for (const row of c[key]) {
      if (!row || typeof row !== 'object' || typeof row[id] !== 'string' || !row[id] || typeof row.name !== 'string') throw Error(`Invalid ${key} identity`);
      if (ids.has(row[id])) throw Error(`Duplicate ${key} ID`);
      ids.add(row[id]);
      if (key !== 'folder' && typeof row.type !== 'string') throw Error(`Missing ${key} type`);
      for (const field of ['firingTriggerId', 'blockingTriggerId']) if (row[field] !== undefined && (!Array.isArray(row[field]) || row[field].some(x => typeof x !== 'string'))) throw Error(`Invalid ${field}`);
      for (const field of ['setupTag','teardownTag']) if(row[field]!==undefined&&(!Array.isArray(row[field])||row[field].some(x=>!x||typeof x.tagName!=='string')))throw Error(`Invalid ${field}`);
    }
  }
  if (!Array.isArray(c.builtInVariable)) throw Error('Missing builtInVariable inventory');
  if(c.builtInVariable.some(v=>!v||typeof v.name!=='string'))throw Error('Invalid builtInVariable identity');
  return c;
}
export function fingerprint(input) {
  const c = container(input);
  for (const [key, id] of Object.entries(groups)) c[key].sort((a, b) => a[id].localeCompare(b[id]));
  c.builtInVariable.sort((a,b) => String(a.name).localeCompare(String(b.name)));
  // Retrieval timestamps belong in the envelope, not the semantic snapshot.
  return hash(c);
}
function references(value) {
  if (typeof value === 'string') return [...value.matchAll(/\{\{([^{}]+)\}\}/g)].map(m => m[1]);
  if (value && typeof value === 'object') return Object.values(value).flatMap(references);
  return [];
}
const builtinTriggers = new Set(['2147479553', '2147479572', '2147479573']);
const sequenceMatches=(reference,tag)=>reference.tagName===tag.name||reference.tagName===tag.tagId;
const dimensions = ['references', 'duplicates', 'naming', 'hygiene', 'legacy', 'folders'];
export function audit(input) {
  const c = container(input), findings = [];
  const add = (dimension, severity, kind, row, id, message) => findings.push({ dimension, severity, kind, id: row[id], name: row.name, message });
  const triggerIds = new Set(c.trigger.map(t => t.triggerId));
  const variableNames = new Set([...c.variable, ...c.builtInVariable].map(v => v.name));
  const folderIds = new Set(c.folder.map(f => f.folderId));
  const usedTriggers = new Set(), usedVariables = new Set();
  for (const tag of c.tag) {
    for (const id of [...tag.firingTriggerId ?? [], ...tag.blockingTriggerId ?? []]) {
      usedTriggers.add(id);
      if (!triggerIds.has(id) && !builtinTriggers.has(id)) add('references','critical','tag',tag,'tagId',`Unresolved trigger ID ${id}`);
    }
    const sequenced = c.tag.some(t => [...t.setupTag ?? [], ...t.teardownTag ?? []].some(s => sequenceMatches(s,tag)));
    if (!tag.paused && !(tag.firingTriggerId?.length) && !sequenced) add('hygiene','review','tag',tag,'tagId','No firing trigger; review intended use');
    if (tag.type === 'ua') add('legacy','review','tag',tag,'tagId','Universal Analytics tag; review migration');
  }
  for (const [key, id] of Object.entries(groups)) {
    const seen = new Map();
    for (const row of c[key]) {
      if (key !== 'folder') {
        for (const name of references(row)) {
          usedVariables.add(name);
          if (!variableNames.has(name)) add('references','critical',key,row,id,`Unresolved variable ${name}`);
        }
        if (!row.parentFolderId) add('folders','info',key,row,id,'No folder assigned');
        else if (!folderIds.has(row.parentFolderId)) add('references','critical',key,row,id,'Unresolved parent folder');
        const shape = { ...row };
        for (const field of [id, 'name','notes','path','fingerprint','accountId','containerId','workspaceId','parentFolderId','tagManagerUrl']) delete shape[field];
        const signature = hash(shape);
        if (seen.has(signature)) add('duplicates','review',key,row,id,`Configuration matches ${seen.get(signature)}; confirm whether intentional`);
        else seen.set(signature,row[id]);
      }
      if (!row.name.trim() || /^(tag|trigger|variable)\s*\d+$/i.test(row.name.trim())) add('naming','info',key,row,id,'Generic or empty name');
    }
  }
  for (const t of c.trigger) if (!usedTriggers.has(t.triggerId)) add('hygiene','review','trigger',t,'triggerId','No tag references this trigger; review before removal');
  for (const v of c.variable) if (!usedVariables.has(v.name)) add('hygiene','review','variable',v,'variableId','No configuration reference found; external use not verified');
  findings.sort((a,b) => `${a.dimension}:${a.kind}:${a.id}:${a.message}`.localeCompare(`${b.dimension}:${b.kind}:${b.id}:${b.message}`));
  const size = Math.max(1,c.tag.length+c.trigger.length+c.variable.length);
  const scores = Object.fromEntries(dimensions.map(d => [d,Math.max(0, 100 - 100 * findings.filter(f=>f.dimension===d).length / size)]));
  return { score: Math.round(Object.values(scores).reduce((a,b)=>a+b,0)/dimensions.length*100)/100, dimensions:scores, findings,
    criticalCount:findings.filter(f=>f.severity==='critical').length,
    scope:'Static GTM configuration checks; score is a heuristic, not tracking correctness or conversion performance.',
    skipped:['Live tag firing and data-layer values','Consent timing and privacy compliance','Ad-platform/GA4/CRM reconciliation','Server delivery','Required business-event coverage','Workspace conflicts and compiler validation'] };
}

// Narrow candidate contract: metadata improvements only. Functional changes require a later reviewed extension.
export function applyOperations(input, operations) {
  const c = container(input);
  if (!Array.isArray(operations) || operations.length > 100) throw Error('Expected at most 100 operations');
  for (const op of operations) {
    if (!op || !['rename','assignFolder','addFolder'].includes(op.op)) throw Error('Unsupported mutation operation');
    if (op.op === 'addFolder') {
      if (typeof op.id !== 'string' || !/^\d+$/.test(op.id) || typeof op.name !== 'string' || !op.name.trim() || c.folder.some(f=>f.folderId===op.id)) throw Error('Invalid new folder');
      c.folder.push({folderId:op.id,name:op.name}); continue;
    }
    if (!Object.hasOwn(groups,op.kind)) throw Error('Invalid component kind');
    const row = c[op.kind].find(r=>r[groups[op.kind]]===op.id);
    if (!row) throw Error('Unknown mutation target');
    if (op.op==='assignFolder') {
      if (op.kind==='folder' || !c.folder.some(f=>f.folderId===op.folderId)) throw Error('Unknown folder');
      row.parentFolderId=op.folderId;
    } else {
      if (typeof op.name!=='string' || !op.name.trim() || op.name.length>256 || /[{}]/.test(op.name)) throw Error('Invalid name');
      if (c[op.kind].some(r=>r!==row&&r.name===op.name)) throw Error('Name collision');
      if(op.kind==='variable'&&c.builtInVariable.some(v=>v.name===op.name))throw Error('Built-in variable name collision');
      // Renaming referenced variables/tags needs a coordinated functional edit; leave it for review.
      if (op.kind==='variable' && [...c.tag,...c.trigger,...c.variable].some(r=>references(r).includes(row.name))) throw Error('Cannot rename referenced variable');
      if (op.kind==='tag' && c.tag.some(t=>[...t.setupTag??[],...t.teardownTag??[]].some(s=>sequenceMatches(s,row)))) throw Error('Cannot rename sequenced tag');
      row.name=op.name;
    }
  }
  return container(c);
}

export async function optimize(input, propose, options={}) {
  const result=await iterate(container(input), {
    evaluate:audit,
    propose:({candidate,report,round})=>propose({container:candidate,audit:report,round}),
    apply:applyOperations,
    accept:(before,after)=>dominates(before,after)&&after.criticalCount<=before.criticalCount
  },options);
  return {...result,rounds:result.rounds.map(({change,...round})=>change===undefined?round:{...round,operations:change})};
}

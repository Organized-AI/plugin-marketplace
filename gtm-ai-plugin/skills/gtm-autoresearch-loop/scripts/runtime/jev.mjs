// Jev for GTM Audit Pro, through jev-gateway (Cloudflare Worker + AI Gateway "jev-gateway").
// Each review/critical finding becomes one System One claim against RUB-S1-JEV-ATLAS-FINDING:
//   VERIFIED -> fix · REFUTED -> intended · INCONCLUSIVE / ERROR -> ask the owner.
// Jev never changes a score, status or ordering: its verdicts are an appendix. Until the rubric
// reaches the "gating" stage every verdict is a suggestion (shadow).
//
// Credentials, in order:
//   JEV_GATEWAY_TOKEN  call jev-gateway directly (JEV_GATEWAY_URL overrides the endpoint)
//   JEV_KEY            hosted Jev-gateway key, sent to the Container Atlas /api/judge (JEV_URL overrides)
// The token is read from the environment only and is never written to any output.
import { judgeFindings, findingState, RUBRIC_ID } from './jev-core.mjs';

const CHECK = { references: 'References', duplicates: 'Duplicates', hygiene: 'Unused', naming: 'Naming', legacy: 'Legacy', folders: 'Folders' };
const ID = { tag: 'tagId', trigger: 'triggerId', variable: 'variableId', folder: 'folderId', client: 'clientId', transformation: 'transformationId' };
const cvOf = s => s?.containerVersion ?? s ?? {};

export function contextOf(snapshot) {
  const u = (cvOf(snapshot).container?.usageContext ?? []).map(x => String(x).toUpperCase());
  return u.includes('SERVER') ? 'server' : 'web';
}

// Audit findings -> the finding shape the atlas rubric was built for, with GTM notes/folder/paused as evidence.
export function toJevFindings(report, snapshot) {
  const cv = cvOf(snapshot), context = contextOf(snapshot), pub = cv.container?.publicId || context;
  const folders = new Map((cv.folder ?? []).map(f => [f.folderId, f.name]));
  return report.findings.filter(f => f.severity === 'critical' || f.severity === 'review').map(f => {
    const row = (cv[f.kind] ?? []).find(r => String(r[ID[f.kind]]) === String(f.id)) || {};
    return {
      key: `${pub}:${f.kind}:${f.id}:${f.dimension}`, context, check: CHECK[f.dimension] || f.dimension, severity: f.severity,
      message: f.message, kind: f.kind, name: f.name, type: row.type, folder: folders.get(row.parentFolderId), paused: !!row.paused, notes: row.notes,
    };
  });
}

export function jevMode(env = process.env) {
  return env.JEV_GATEWAY_TOKEN ? 'jev-gateway' : env.JEV_KEY ? 'hosted' : 'off';
}

const OFF = reason => ({ mode: 'off', reason, rubric: { id: RUBRIC_ID }, results: [] });

export async function runJev(findings, website, env = process.env, fetchImpl = fetch) {
  const mode = jevMode(env);
  if (!findings.length) return { mode, rubric: { id: RUBRIC_ID }, results: [] };
  if (mode === 'off') return OFF('No JEV_GATEWAY_TOKEN or JEV_KEY in the environment; every finding stays with you to decide.');
  if (mode === 'jev-gateway') {
    try { return { mode, ...(await judgeFindings(env, findings, website, fetchImpl)) }; }
    catch (e) { return { ...OFF('Jev rubric could not be loaded (' + String(e.message).slice(0, 120) + '); every finding stays with you to decide.'), mode }; }
  }
  try {
    const r = await fetchImpl(env.JEV_URL || 'https://atlas.organizedai.vip/api/judge', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.JEV_KEY }, body: JSON.stringify({ findings, website }), signal: AbortSignal.timeout(120_000) });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || !Array.isArray(j.results)) return { ...OFF((j && (j.message || j.error)) || 'Hosted Jev returned HTTP ' + r.status + '; every finding stays with you to decide.'), mode };
    return { mode, rubric: j.rubric || { id: RUBRIC_ID }, results: j.results };
  } catch (e) { return { ...OFF('Hosted Jev could not be reached; every finding stays with you to decide.'), mode }; }
}
export { findingState, RUBRIC_ID };

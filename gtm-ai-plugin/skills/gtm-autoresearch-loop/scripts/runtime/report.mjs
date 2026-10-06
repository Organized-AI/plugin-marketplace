// GTM Audit Pro report: one Markdown file and one PDF for a web container and/or server container,
// with the optional Jev appendix. Report-only: nothing here writes to GTM.
//   build(items, {website, jev, title})  -> model
//   toMarkdown(model) / toPrintHtml(model)
//   pdf(html, outPath)                    -> renders with a local Chrome/Chromium/Edge (headless)
import { existsSync, promises as fs } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { contextOf } from './jev.mjs';

const cvOf = s => s?.containerVersion ?? s ?? {};
const SEV = { critical: 0, review: 1, info: 2 };
const SEV_LABEL = { critical: 'Fix first', review: 'Confirm', info: 'Note' };
const DIM_LABEL = { references: 'References', duplicates: 'Duplicates', naming: 'Naming', hygiene: 'Unused / no trigger', legacy: 'Legacy', folders: 'Folders' };
const DECISION = { fix: 'Fix', intended: 'Intended', ask_owner: 'Ask the owner' };

export function build(items, { website = '', jev = null, title = '', generatedAt = new Date().toISOString() } = {}) {
  const byKey = new Map((jev?.results ?? []).map(r => [r.key, r]));
  const containers = items.map(({ snapshot, report }) => {
    const cv = cvOf(snapshot), c = cv.container ?? {}, context = contextOf(snapshot), pub = c.publicId || context;
    const findings = [...report.findings].sort((a, b) => SEV[a.severity] - SEV[b.severity] || a.dimension.localeCompare(b.dimension) || String(a.name).localeCompare(String(b.name)))
      .map(f => ({ ...f, jev: byKey.get(`${pub}:${f.kind}:${f.id}:${f.dimension}`) || null }));
    return {
      publicId: pub, name: c.name || pub, context, version: cv.containerVersionId || cv.name || '',
      counts: { tag: (cv.tag ?? []).length, trigger: (cv.trigger ?? []).length, variable: (cv.variable ?? []).length, client: (cv.client ?? []).length },
      score: report.score, dimensions: report.dimensions, criticalCount: report.criticalCount, scope: report.scope, skipped: report.skipped,
      actionable: findings.filter(f => f.severity !== 'info'), notes: findings.filter(f => f.severity === 'info'),
    };
  });
  const stage = jev?.rubric?.stage;
  return {
    title: title || `GTM audit · ${containers.map(c => c.publicId).join(' + ')}`, website, generatedAt, containers,
    jev: jev ? { mode: jev.mode, reason: jev.reason || null, rubric: jev.rubric || null, gating: stage === 'gating', judged: (jev.results ?? []).length,
      tally: (jev.results ?? []).reduce((a, r) => ((a[r.decision] = (a[r.decision] || 0) + 1), a), {}) } : null,
    skipped: [...new Set(containers.flatMap(c => c.skipped))],
  };
}

const md = s => String(s ?? '').replace(/[\r\n]+/g, ' ').replace(/\|/g, '\\|');
const pct = n => (typeof n === 'number' ? Math.round(n) : '—');
const jevCell = j => (!j ? '—' : `${DECISION[j.decision] || j.decision} (${j.verdict}${typeof j.pFix === 'number' ? `, p=${j.pFix.toFixed(2)}` : ''})`);

export function toMarkdown(m) {
  const L = [];
  L.push(`# ${md(m.title)}`, '');
  L.push(`- Website: ${m.website ? md(m.website) : 'not given'}`, `- Generated: ${m.generatedAt.slice(0, 16).replace('T', ' ')} UTC`, `- Source: GTM container export (static configuration). Report-only; nothing was changed in GTM.`);
  if (m.jev) L.push(`- Jev: ${jevLine(m.jev)}`);
  L.push('', '## Summary', '', '| Container | Type | Tags | Triggers | Variables | Clients | Score | Fix first | Confirm | Notes |', '|---|---|--:|--:|--:|--:|--:|--:|--:|--:|');
  for (const c of m.containers) L.push(`| ${md(c.publicId)} | ${c.context} | ${c.counts.tag} | ${c.counts.trigger} | ${c.counts.variable} | ${c.counts.client} | ${c.score} | ${c.criticalCount} | ${c.actionable.length - c.criticalCount} | ${c.notes.length} |`);
  for (const c of m.containers) {
    L.push('', `## ${md(c.publicId)} · ${c.context} container`, '', `Score **${c.score}/100**. ${md(c.scope)}`, '', '| Dimension | Score |', '|---|--:|');
    for (const [k, v] of Object.entries(c.dimensions)) L.push(`| ${DIM_LABEL[k] || k} | ${pct(v)} |`);
    L.push('', `### Findings to act on (${c.actionable.length})`, '');
    if (!c.actionable.length) L.push('None.');
    else {
      L.push(m.jev ? '| Priority | Check | Kind | ID | Name | Finding | Jev |' : '| Priority | Check | Kind | ID | Name | Finding |', m.jev ? '|---|---|---|--:|---|---|---|' : '|---|---|---|--:|---|---|');
      for (const f of c.actionable) L.push(`| ${SEV_LABEL[f.severity]} | ${DIM_LABEL[f.dimension] || f.dimension} | ${f.kind} | ${md(f.id)} | ${md(f.name)} | ${md(f.message)} |${m.jev ? ` ${jevCell(f.jev)} |` : ''}`);
    }
    if (c.notes.length) {
      const by = c.notes.reduce((a, f) => ((a[f.message] = a[f.message] || []).push(f), a), {});
      L.push('', `### Notes (${c.notes.length})`, '');
      for (const [msg, list] of Object.entries(by)) L.push(`- **${md(msg)}** (${list.length}): ${list.slice(0, 25).map(f => `${f.kind} ${md(f.name)}`).join('; ')}${list.length > 25 ? `; and ${list.length - 25} more` : ''}`);
    }
  }
  if (m.jev) {
    L.push('', '## Jev verdicts', '', jevExplain(m.jev));
    if (m.jev.judged) L.push('', `Judged ${m.jev.judged} findings: ${Object.entries(m.jev.tally).map(([k, v]) => `${DECISION[k] || k} ${v}`).join(' · ')}.`);
  }
  L.push('', '## Not verified by this audit', '', ...m.skipped.map(s => `- ${s}`), '', 'Findings come from the container configuration only. Nothing here is verified on the live site.', '');
  return L.join('\n');
}

function jevLine(j) {
  if (j.mode === 'off' || !j.judged) return `not run. ${j.reason || ''}`.trim();
  const r = j.rubric || {};
  return `${j.mode} · rubric ${r.id}${r.version ? ' v' + r.version : ''} (${r.source || 'registry'}, stage ${r.stage || 'shadow'})${j.gating ? '' : ' · suggestions only'}`;
}
function jevExplain(j) {
  if (j.mode === 'off' || !j.judged) return `Jev did not run: ${j.reason || 'no verdicts returned'}. Every finding stays with you to decide.`;
  return `Each finding to act on was sent to jev-gateway as one claim against ${j.rubric?.id}. VERIFIED means Jev reads it as a real problem to fix; REFUTED means the element's notes, name or folder show it is deliberate; INCONCLUSIVE or ERROR means ask the owner. ` +
    (j.gating ? 'The rubric is at the gating stage.' : `The rubric is at the ${j.rubric?.stage || 'shadow'} stage, so these verdicts are suggestions only.`) +
    ' Jev never changes a score, priority or status in this report.';
}

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export function toPrintHtml(m) {
  const sevCls = { critical: 'crit', review: 'rev', info: 'info' };
  const sec = c => {
    const notes = c.notes.reduce((a, f) => ((a[f.message] = a[f.message] || []).push(f), a), {});
    return `<section><h2>${esc(c.publicId)} <small>${c.context} container · ${c.counts.tag} tags · ${c.counts.trigger} triggers · ${c.counts.variable} variables${c.counts.client ? ` · ${c.counts.client} clients` : ''}</small></h2>
<div class="score"><b>${c.score}</b><span>/100</span></div><p class="scope">${esc(c.scope)}</p>
<div class="dims">${Object.entries(c.dimensions).map(([k, v]) => `<div><span>${DIM_LABEL[k] || k}</span><i style="--w:${Math.max(0, Math.min(100, v))}%"></i><b>${pct(v)}</b></div>`).join('')}</div>
<h3>Findings to act on (${c.actionable.length})</h3>
${c.actionable.length ? `<table><thead><tr><th>Priority</th><th>Check</th><th>Element</th><th>Finding</th>${m.jev ? '<th>Jev</th>' : ''}</tr></thead><tbody>
${c.actionable.map(f => `<tr><td><span class="pill ${sevCls[f.severity]}">${SEV_LABEL[f.severity]}</span></td><td>${DIM_LABEL[f.dimension] || f.dimension}</td><td><b>${esc(f.name)}</b><br><small>${f.kind} ${esc(f.id)}</small></td><td>${esc(f.message)}</td>${m.jev ? `<td>${f.jev ? `<b>${DECISION[f.jev.decision] || f.jev.decision}</b><br><small>${f.jev.verdict}${typeof f.jev.pFix === 'number' ? ` · p=${f.jev.pFix.toFixed(2)}` : ''}</small>` : '—'}</td>` : ''}</tr>`).join('\n')}
</tbody></table>` : '<p>None.</p>'}
${c.notes.length ? `<h3>Notes (${c.notes.length})</h3><ul class="notes">${Object.entries(notes).map(([msg, l]) => `<li><b>${esc(msg)}</b> (${l.length}): ${esc(l.slice(0, 25).map(f => `${f.kind} ${f.name}`).join('; '))}${l.length > 25 ? ` and ${l.length - 25} more` : ''}</li>`).join('')}</ul>` : ''}
</section>`;
  };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(m.title)}</title><style>
@page{size:Letter;margin:14mm 13mm}
:root{--ink:#17150f;--mute:#6b6352;--line:#e3ddcc;--crit:#c8322f;--rev:#b77a00;--info:#6b6352;--acc:#e0c400}
*{box-sizing:border-box}body{font:10.5px/1.45 -apple-system,"Helvetica Neue",Arial,sans-serif;color:var(--ink);margin:0;background:#fff}
header{border-bottom:3px solid var(--ink);padding-bottom:8px;margin-bottom:12px}h1{font-size:20px;margin:0 0 4px}
.meta{color:var(--mute);margin:0}.meta b{color:var(--ink)}
h2{font-size:15px;margin:18px 0 6px;border-bottom:1px solid var(--line);padding-bottom:4px}h2 small{font-weight:400;color:var(--mute);font-size:10px}
h3{font-size:12px;margin:12px 0 6px}section{break-inside:auto}
.score{float:right;margin-top:-30px}.score b{font-size:26px}.score span{color:var(--mute)}.scope{color:var(--mute);margin:2px 0 8px}
.dims{display:grid;grid-template-columns:repeat(3,1fr);gap:4px 16px;margin-bottom:6px}.dims div{display:grid;grid-template-columns:110px 1fr 28px;align-items:center;gap:6px}
.dims i{display:block;height:6px;background:var(--line);position:relative}.dims i:after{content:"";position:absolute;inset:0 auto 0 0;width:var(--w);background:var(--ink)}.dims b{text-align:right}
table{width:100%;border-collapse:collapse;margin:4px 0}th,td{text-align:left;vertical-align:top;padding:4px 6px;border-bottom:1px solid var(--line)}th{font-size:9px;text-transform:uppercase;letter-spacing:.04em;color:var(--mute)}
tr{break-inside:avoid}small{color:var(--mute)}.pill{display:inline-block;padding:1px 6px;border-radius:9px;font-size:9px;font-weight:700;color:#fff}.crit{background:var(--crit)}.rev{background:var(--rev)}.info{background:var(--info)}
.sum td:nth-child(n+3),.sum th:nth-child(n+3){text-align:right}.notes li{margin-bottom:3px}.box{border:1px solid var(--line);border-left:4px solid var(--acc);padding:8px 10px;margin:10px 0}
footer{margin-top:16px;color:var(--mute);border-top:1px solid var(--line);padding-top:6px}
</style></head><body>
<header><h1>${esc(m.title)}</h1><p class="meta">Website <b>${esc(m.website || 'not given')}</b> · Generated ${esc(m.generatedAt.slice(0, 16).replace('T', ' '))} UTC · Static configuration audit, report-only${m.jev ? ` · Jev: ${esc(jevLine(m.jev))}` : ''}</p></header>
<table class="sum"><thead><tr><th>Container</th><th>Type</th><th>Tags</th><th>Triggers</th><th>Variables</th><th>Clients</th><th>Score</th><th>Fix first</th><th>Confirm</th><th>Notes</th></tr></thead><tbody>
${m.containers.map(c => `<tr><td><b>${esc(c.publicId)}</b></td><td>${c.context}</td><td>${c.counts.tag}</td><td>${c.counts.trigger}</td><td>${c.counts.variable}</td><td>${c.counts.client}</td><td><b>${c.score}</b></td><td>${c.criticalCount}</td><td>${c.actionable.length - c.criticalCount}</td><td>${c.notes.length}</td></tr>`).join('')}
</tbody></table>
${m.containers.map(sec).join('\n')}
${m.jev ? `<section><h2>Jev verdicts</h2><div class="box">${esc(jevExplain(m.jev))}${m.jev.judged ? `<br><br>Judged ${m.jev.judged}: ${esc(Object.entries(m.jev.tally).map(([k, v]) => `${DECISION[k] || k} ${v}`).join(' · '))}` : ''}</div></section>` : ''}
<section><h2>Not verified by this audit</h2><ul>${m.skipped.map(s => `<li>${esc(s)}</li>`).join('')}</ul></section>
<footer>Findings come from the container configuration only; nothing here is verified on the live site. Generated by GTM Audit Pro (Organized AI). Contains client container names: treat as client material.</footer>
</body></html>\n`;
}

const CHROMES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
];
export function findChrome() { return CHROMES.find(p => p && existsSync(p)) || null; }

export async function pdf(html, outPath, { chrome = findChrome(), timeoutMs = 60_000 } = {}) {
  if (!chrome) return { ok: false, reason: 'No Chrome, Chromium or Edge found (set CHROME_PATH). Open the print HTML and use Save as PDF.' };
  const dir = await fs.mkdtemp(join(tmpdir(), 'gtm-audit-pdf-')), src = join(dir, 'report.html');
  await fs.writeFile(src, html, { mode: 0o600 });
  const args = ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${join(dir, 'profile')}`, '--no-pdf-header-footer', `--print-to-pdf=${outPath}`, 'file://' + src];
  const code = await new Promise(res => {
    const p = spawn(chrome, args, { stdio: 'ignore' }), t = setTimeout(() => { p.kill('SIGKILL'); res(-1); }, timeoutMs);
    p.on('exit', c => { clearTimeout(t); res(c); }); p.on('error', () => { clearTimeout(t); res(-2); });
  });
  await fs.rm(dir, { recursive: true, force: true });
  return existsSync(outPath) ? { ok: true, path: outPath } : { ok: false, reason: `Chrome exited with ${code} without writing the PDF.` };
}

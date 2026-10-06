#!/usr/bin/env node
// Builds the GTM Audit Lab: one self-contained page (plus GSAP from cdnjs) that runs
// the audit, the web -> server check and the Autoresearch loop in the browser.
//   node demo/build.mjs [OUT.html] [--fragment]
// --fragment omits <!doctype>/<html>/<head>/<body> for hosts that add their own (claude.ai artifacts).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = p => fileURLToPath(new URL(p, import.meta.url));
const read = p => readFileSync(here(p), 'utf8');
// Turn an ES module with no imports into a function body that returns its exports.
const asModule = (src, names) => `(() => {\n${src.replace(/^export\s+(?=(function|const|let|class)\b)/gm, '')}\nreturn { ${names.join(', ')} };\n})()`;
for (const [file, src] of [['graph.mjs', read('../graph.mjs')], ['flow.mjs', read('../flow.mjs')], ['sample.mjs', read('./sample.mjs')]]) {
  if (/^\s*import\s/m.test(src)) throw Error(`${file} must not import anything to be inlined`);
}

export function buildLab({ fragment = false } = {}) {
  const js = [
    read('../atlas/auto.js'),
    `const G = ${asModule(read('../graph.mjs'), ['graph', 'refs'])};`,
    `const F = ${asModule(read('../flow.mjs'), ['signalFlow', 'platformOf'])};`,
    `const SAMPLE = ${asModule(read('./sample.mjs'), ['sampleWeb', 'sampleServer'])};`,
    read('./app.js'),
  ].join('\n').replace(/<\/(script)/gi, '<\\/$1');
  const body = read('./page.html').replace('%%SCRIPT%%', () => js);
  if (fragment) return body;
  const head = body.slice(0, body.indexOf('</style>') + 8), rest = body.slice(body.indexOf('</style>') + 8);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">${head}</head><body>${rest}</body></html>\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2), out = args.find(a => !a.startsWith('--')) ?? 'gtm-audit-lab.html';
  writeFileSync(out, buildLab({ fragment: args.includes('--fragment') }));
  process.stdout.write(JSON.stringify({ lab: out }) + '\n');
}

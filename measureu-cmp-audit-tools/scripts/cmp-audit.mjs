#!/usr/bin/env node
import fs from "node:fs/promises";
import { audit, auditMany, loadConfig } from "../cmp-audit/audit.mjs";

function usage() {
  console.error("Usage: cmp-audit --url <https://example.com> [--url <https://example.org>] [--urls-file <urls.txt>] [--out <dir>] [--config <json>] [--accept-selector <css>] [--reject-selector <css>] [--withdraw-selector <css>] [--headed]");
}

function parse(argv) {
  const result = { selectors: {} };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--url") (result.urls ||= []).push(argv[++index]);
    else if (arg === "--urls-file") result.urlsFile = argv[++index];
    else if (arg === "--out") result.outputDir = argv[++index];
    else if (arg === "--config") result.configFile = argv[++index];
    else if (arg === "--accept-selector") result.selectors.accept = argv[++index];
    else if (arg === "--reject-selector") result.selectors.reject = argv[++index];
    else if (arg === "--withdraw-selector") result.selectors.withdraw = argv[++index];
    else if (arg === "--headed") result.headless = false;
    else if (arg === "--help" || arg === "-h") result.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return result;
}

try {
  const args = parse(process.argv.slice(2));
  if (args.help) {
    usage();
    process.exit(0);
  }
  const fileConfig = args.configFile ? await loadConfig(args.configFile) : {};
  const fileUrls = args.urlsFile
    ? (await fs.readFile(args.urlsFile, "utf8")).split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"))
    : [];
  const urls = [...new Set([...(fileConfig.urls || (fileConfig.url ? [fileConfig.url] : [])), ...(args.urls || []), ...fileUrls])];
  const config = {
    ...fileConfig,
    ...Object.fromEntries(Object.entries(args).filter(([key, value]) => !["configFile", "urlsFile", "urls", "help", "selectors"].includes(key) && value !== undefined)),
    selectors: { ...(fileConfig.selectors || {}), ...args.selectors },
    urls,
    url: urls[0],
  };
  if (!urls.length) {
    usage();
    process.exit(2);
  }
  const result = urls.length > 1 ? await auditMany(config) : await audit(config);
  console.log(JSON.stringify(urls.length > 1
    ? { outputDir: result.outputDir, audits: result.report.audits.map((item) => ({ url: item.url, outputDir: item.outputDir, findings: item.findings })) }
    : { outputDir: result.outputDir, coverage: result.report.coverage, captureHealth: result.report.captureHealth, summary: result.report.summary, findings: result.report.findings }, null, 2));
} catch (error) {
  console.error(`cmp-audit: ${error.message}`);
  process.exit(1);
}

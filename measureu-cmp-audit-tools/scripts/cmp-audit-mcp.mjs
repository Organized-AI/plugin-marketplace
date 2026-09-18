#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { audit, auditMany } from "../cmp-audit/audit.mjs";
import { compareAuditFiles } from "../cmp-audit/compare.mjs";

const tools = [
  {
    name: "audit_cmp_page",
    description: "Run isolated pre-consent, accept, reject, GPC, persistence, and withdrawal browser scenarios and capture CMP evidence.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", format: "uri" },
        output_dir: { type: "string" },
        accept_selector: { type: "string" },
        reject_selector: { type: "string" },
        withdraw_selector: { type: "string" },
        locale: { type: "string" },
        timezone: { type: "string" },
        scenarios: { type: "array", items: { type: "string" } },
        flows: { type: "object" },
        classifiers: { type: "array", items: { type: "object" } },
        capture_post_data: { type: "boolean" },
        proxy: { type: "object", properties: { server: { type: "string" }, username: { type: "string" }, password: { type: "string" } } },
      },
      required: ["url"],
    },
  },
  {
    name: "audit_cmp_pages",
    description: "Audit several CMP pages and write one evidence directory per URL plus a batch index.",
    inputSchema: {
      type: "object",
      properties: {
        urls: { type: "array", items: { type: "string", format: "uri" }, minItems: 2 },
        output_dir: { type: "string" },
        locale: { type: "string" },
        timezone: { type: "string" },
        selectors: { type: "object" },
        scenarios: { type: "array", items: { type: "string" } },
        flows: { type: "object" },
        classifiers: { type: "array", items: { type: "object" } },
        capture_post_data: { type: "boolean" },
        proxy: { type: "object", properties: { server: { type: "string" }, username: { type: "string" }, password: { type: "string" } } },
      },
      required: ["urls"],
    },
  },
  {
    name: "read_cmp_audit",
    description: "Read the summary and findings from a previously generated CMP audit directory.",
    inputSchema: { type: "object", properties: { audit_dir: { type: "string" } }, required: ["audit_dir"] },
  },
  {
    name: "compare_cmp_audits",
    description: "Compare a baseline and candidate audit to reveal new tracking hosts, requests, cookies, and storage keys by consent scenario.",
    inputSchema: {
      type: "object",
      properties: { baseline_file: { type: "string" }, candidate_file: { type: "string" } },
      required: ["baseline_file", "candidate_file"],
    },
  },
  {
    name: "get_cmp_audit_methodology",
    description: "Explain the CMP activity evidence model and interpretation limits.",
    inputSchema: { type: "object", properties: {} },
  },
];

const methodology = `Run clean browser contexts for pre-consent, accept, reject, GPC, accept/reload, reject/reload, and withdrawal. The audit records a timestamped timeline, network requests with response metadata, Consent Mode query signals, storage, visible CMP controls across frames, screenshots, and console output. The action phase is set before each click so click-triggered requests are attributed to that action. Compare scenarios and later baselines to test whether user intent changes browser behavior. Findings are heuristic evidence; server-side collection, first-party proxies, jurisdiction, policy, and vendor purpose require separate review.`;

function send(id, result, error) {
  process.stdout.write(`${JSON.stringify(error ? { jsonrpc: "2.0", id, error } : { jsonrpc: "2.0", id, result })}\n`);
}

function content(text, structuredContent, isError = false) {
  return { content: [{ type: "text", text }], ...(structuredContent ? { structuredContent } : {}), ...(isError ? { isError: true } : {}) };
}

function auditUrl(value, label) {
  if (typeof value !== "string" || !value) throw new Error(`${label} must be a URL`);
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol)) throw new Error(`${label} must use http or https`);
  return url.toString();
}

function auditUrls(values) {
  if (!Array.isArray(values) || values.length === 0) throw new Error("urls must contain at least one URL");
  return values.map((value, index) => auditUrl(value, `urls[${index}]`));
}

async function handle(message) {
  const { id, method, params = {} } = message;
  if (method === "initialize") return send(id, { protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "cmp-audit", version: "0.2.0" } });
  if (method === "notifications/initialized") return;
  if (method === "ping") return send(id, {});
  if (method === "tools/list") return send(id, { tools });
  if (method !== "tools/call") return id !== undefined && send(id, null, { code: -32601, message: `Method not found: ${method}` });
  try {
    const args = params.arguments || {};
    if (params.name === "get_cmp_audit_methodology") return send(id, content(methodology));
    if (params.name === "audit_cmp_page") {
      const { outputDir, report } = await audit({
        url: auditUrl(args.url, "url"),
        outputDir: args.output_dir,
        locale: args.locale,
        timezone: args.timezone,
        selectors: { accept: args.accept_selector, reject: args.reject_selector, withdraw: args.withdraw_selector },
        scenarios: args.scenarios,
        flows: args.flows,
        classifiers: args.classifiers,
        capturePostData: args.capture_post_data,
        proxy: args.proxy,
      });
      return send(id, content(`Audit written to ${outputDir}`, { output_dir: outputDir, summary: report.summary, findings: report.findings }));
    }
    if (params.name === "audit_cmp_pages") {
      const { outputDir, report } = await auditMany({
        urls: auditUrls(args.urls),
        outputDir: args.output_dir,
        locale: args.locale,
        timezone: args.timezone,
        selectors: args.selectors,
        scenarios: args.scenarios,
        flows: args.flows,
        classifiers: args.classifiers,
        capturePostData: args.capture_post_data,
        proxy: args.proxy,
      });
      return send(id, content(`Batch audit written to ${outputDir}`, { output_dir: outputDir, audits: report.audits }));
    }
    if (params.name === "read_cmp_audit") {
      const file = path.resolve(args.audit_dir, "audit.json");
      const report = JSON.parse(await fs.readFile(file, "utf8"));
      return send(id, content(JSON.stringify({ url: report.url, generatedAt: report.generatedAt, summary: report.summary, findings: report.findings }, null, 2), { audit_file: file }));
    }
    if (params.name === "compare_cmp_audits") {
      const comparison = await compareAuditFiles(args.baseline_file, args.candidate_file);
      return send(id, content(JSON.stringify(comparison, null, 2), comparison));
    }
    return send(id, null, { code: -32602, message: `Unknown tool: ${params.name}` });
  } catch (error) {
    return send(id, content(`Error: ${error.message}`, undefined, true));
  }
}

const lines = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of lines) {
  try {
    await handle(JSON.parse(line));
  } catch (error) {
    send(null, null, { code: -32700, message: error.message });
  }
}

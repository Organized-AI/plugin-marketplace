#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { audit, auditMany } from "../cmp-audit/audit.mjs";
import { compareAuditFiles } from "../cmp-audit/compare.mjs";
import { explainFinding, inspectRequest, queryStorage, readAudit, traceVendor, validateProfile } from "../cmp-audit/evidence.mjs";

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
        profile: { type: "object" },
        capture_health: { type: "boolean" },
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
        profile: { type: "object" },
        capture_health: { type: "boolean" },
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
    name: "inspect_cmp_request",
    description: "Inspect one request by stable evidence ID, including phase, source context, classification trace, payload, and consent signals.",
    inputSchema: { type: "object", properties: { audit: { type: "string" }, request_id: { type: "string" } }, required: ["audit", "request_id"] },
  },
  {
    name: "explain_cmp_finding",
    description: "Explain a finding and return the concrete request evidence referenced by it.",
    inputSchema: { type: "object", properties: { audit: { type: "string" }, finding_id: { type: "string" } }, required: ["audit", "finding_id"] },
  },
  {
    name: "trace_cmp_vendor",
    description: "Trace a host, URL fragment, or category across every consent scenario with source and classification context.",
    inputSchema: { type: "object", properties: { audit: { type: "string" }, query: { type: "string" } }, required: ["audit", "query"] },
  },
  {
    name: "query_cmp_storage_events",
    description: "Read timestamped local/session storage writes and removals, optionally filtered by key.",
    inputSchema: { type: "object", properties: { audit: { type: "string" }, key: { type: "string" } }, required: ["audit"] },
  },
  {
    name: "check_cmp_capture_health",
    description: "Read the audit's instrumentation-on/off comparison and positive-control status.",
    inputSchema: { type: "object", properties: { audit: { type: "string" } }, required: ["audit"] },
  },
  {
    name: "validate_cmp_audit_profile",
    description: "Validate an expected CMP, consent model, Consent Mode, geography, and behavior profile before running an audit.",
    inputSchema: { type: "object", properties: { profile: { type: "object" } }, required: ["profile"] },
  },
  {
    name: "get_cmp_audit_methodology",
    description: "Explain the CMP activity evidence model and interpretation limits.",
    inputSchema: { type: "object", properties: {} },
  },
];

const methodology = `Declare expected CMP, consent model, Consent Mode, geography, and scenario behavior when known. Run clean browser contexts for pre-consent, accept, reject, GPC, persistence, and withdrawal. The audit records stable evidence IDs, shared event clocks, network requests with source-frame and classification traces, Consent Mode signals, storage mutations and snapshots, visible CMP controls, screenshots, and console output. It compares instrumented and control runs before marking coverage complete. Use evidence-query tools to move from a finding to its concrete records. Findings remain heuristic; server-side collection, first-party proxies, jurisdiction, policy, and vendor purpose require separate review.`;

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
  if (method === "initialize") return send(id, { protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "cmp-audit", version: "0.3.0" } });
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
        profile: args.profile,
        captureHealth: args.capture_health,
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
        profile: args.profile,
        captureHealth: args.capture_health,
      });
      return send(id, content(`Batch audit written to ${outputDir}`, { output_dir: outputDir, audits: report.audits }));
    }
    if (params.name === "read_cmp_audit") {
      const file = path.resolve(args.audit_dir, "audit.json");
      const report = JSON.parse(await fs.readFile(file, "utf8"));
      return send(id, content(JSON.stringify({ url: report.url, generatedAt: report.generatedAt, coverage: report.coverage, captureHealth: report.captureHealth, profile: report.profile, summary: report.summary, findings: report.findings }, null, 2), { audit_file: file }));
    }
    if (params.name === "compare_cmp_audits") {
      const comparison = await compareAuditFiles(args.baseline_file, args.candidate_file);
      return send(id, content(JSON.stringify(comparison, null, 2), comparison));
    }
    if (params.name === "validate_cmp_audit_profile") return send(id, content(JSON.stringify(validateProfile(args.profile), null, 2), validateProfile(args.profile)));
    if (["inspect_cmp_request", "explain_cmp_finding", "trace_cmp_vendor", "query_cmp_storage_events", "check_cmp_capture_health"].includes(params.name)) {
      const { file, audit: report } = await readAudit(args.audit);
      let result;
      if (params.name === "inspect_cmp_request") result = inspectRequest(report, args.request_id);
      if (params.name === "explain_cmp_finding") result = explainFinding(report, args.finding_id);
      if (params.name === "trace_cmp_vendor") result = traceVendor(report, args.query);
      if (params.name === "query_cmp_storage_events") result = queryStorage(report, args.key);
      if (params.name === "check_cmp_capture_health") result = report.captureHealth || { status: "not-run" };
      if (result == null) throw new Error("Evidence record was not found");
      return send(id, content(JSON.stringify(result, null, 2), { audit_file: file, result }));
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

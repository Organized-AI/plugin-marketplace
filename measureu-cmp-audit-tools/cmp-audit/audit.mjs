import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { classifyUrl, isTrackingCategory, mergedConsentSignals } from "./classify.mjs";

const CHROME_CANDIDATES = {
  darwin: [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ],
  linux: ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"],
  win32: [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ],
};
const DEFAULT_SCENARIOS = ["preconsent", "accept", "reject", "gpc", "persistence-accept", "persistence-reject", "withdraw"];
const CMP_HINTS = [
  "[id*='cookie' i]", "[class*='cookie' i]", "[id*='consent' i]", "[class*='consent' i]",
  "[id*='onetrust' i]", "[class*='onetrust' i]", "[aria-label*='cookie' i]",
];
const REDACTED_HEADERS = new Set(["authorization", "cookie", "proxy-authorization", "set-cookie", "x-api-key"]);

function slug(value) {
  return value.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 80) || "site";
}

export function resolveChromePath(config = {}) {
  const candidates = [config.chromePath, process.env.CHROME_PATH, ...(CHROME_CANDIDATES[process.platform] || [])].filter(Boolean);
  const executablePath = candidates.find((candidate) => existsSync(candidate));
  if (!executablePath) {
    throw new Error("No Chrome or Chromium executable was found. Set CHROME_PATH to its executable path.");
  }
  return executablePath;
}

function unique(items) {
  return [...new Set(items)];
}

function countCandidates(cmp) {
  return (cmp.frames || []).reduce((total, frame) => total + frame.candidates.length, 0);
}

function sanitizeHeaders(headers) {
  return Object.fromEntries(Object.entries(headers || {}).filter(([name]) => !REDACTED_HEADERS.has(name.toLowerCase())));
}

function truncate(value, maximum = 16384) {
  if (!value) return null;
  return value.length > maximum ? `${value.slice(0, maximum)}\n[truncated]` : value;
}

function stateFingerprint(snapshot) {
  return {
    cookies: Object.fromEntries(snapshot.cookies.map((cookie) => [`${cookie.domain}:${cookie.path}:${cookie.name}`, cookie.value])),
    localStorage: snapshot.storage.localStorage,
    sessionStorage: snapshot.storage.sessionStorage,
  };
}

export function persistenceEvidence(beforeReload, afterReload) {
  const before = stateFingerprint(beforeReload);
  const after = stateFingerprint(afterReload);
  const retained = (left, right) => Object.keys(left).filter((key) => right[key] === left[key]).sort();
  return {
    tested: true,
    retainedCookies: retained(before.cookies, after.cookies),
    retainedLocalStorageKeys: retained(before.localStorage, after.localStorage),
    retainedSessionStorageKeys: retained(before.sessionStorage, after.sessionStorage),
    retainedConsentLocalStorageKeys: retained(beforeReload.consentState?.consentStorage?.localStorage || {}, afterReload.consentState?.consentStorage?.localStorage || {}),
    retainedConsentSessionStorageKeys: retained(beforeReload.consentState?.consentStorage?.sessionStorage || {}, afterReload.consentState?.consentStorage?.sessionStorage || {}),
    consentCommandsAfterReload: afterReload.consentState?.dataLayerConsentEvents || [],
  };
}

function hasDeniedConsent(snapshot) {
  return (snapshot.consentState?.dataLayerConsentEvents || []).some((event) => {
    const values = event[2] || {};
    return event[0] === "consent" && event[1] === "update" && Object.values(values).some((value) => value === "denied");
  });
}

function frameLabel(frame, page) {
  return frame === page.mainFrame() ? "main" : frame.url();
}

async function storageSnapshot(page) {
  return page.evaluate(() => {
    const read = (store) => {
      const result = {};
      for (let index = 0; index < store.length; index += 1) {
        const key = store.key(index);
        result[key] = store.getItem(key);
      }
      return result;
    };
    return { localStorage: read(localStorage), sessionStorage: read(sessionStorage) };
  }).catch(() => ({ localStorage: {}, sessionStorage: {} }));
}

async function frameStorageSnapshot(page) {
  return Promise.all(page.frames().map(async (frame) => ({
    label: frameLabel(frame, page),
    url: frame.url(),
    storage: await frame.evaluate(() => {
      const read = (store) => Object.fromEntries([...Array(store.length)].map((_, index) => {
        const key = store.key(index);
        return [key, store.getItem(key)];
      }));
      return { localStorage: read(localStorage), sessionStorage: read(sessionStorage) };
    }).catch(() => ({ localStorage: {}, sessionStorage: {} })),
  })));
}

async function consentStateSnapshot(page) {
  return page.evaluate(() => {
    const audit = window.__cmpAudit || { dataLayer: [] };
    const events = audit.dataLayer || [];
    const consentEvents = events.filter((event) => event[0] === "consent" || event[0]?.event === "consent");
    const relevant = (store) => Object.fromEntries(Object.keys(store).filter((key) => /consent|cookie|privacy|opt/i.test(key)).map((key) => [key, store[key]]));
    return {
      dataLayerConsentEvents: consentEvents,
      consentStorage: {
        localStorage: relevant(Object.fromEntries([...Array(localStorage.length)].map((_, index) => [localStorage.key(index), localStorage.getItem(localStorage.key(index))]))),
        sessionStorage: relevant(Object.fromEntries([...Array(sessionStorage.length)].map((_, index) => [sessionStorage.key(index), sessionStorage.getItem(sessionStorage.key(index))]))),
      },
      globalPrivacyControl: navigator.globalPrivacyControl === true,
    };
  }).catch(() => ({ dataLayerConsentEvents: [], consentStorage: { localStorage: {}, sessionStorage: {} }, globalPrivacyControl: false }));
}

async function cmpEvidence(page) {
  const frames = await Promise.all(page.frames().map(async (frame) => {
    const evidence = await frame.evaluate((hints) => {
      const nodes = [...document.querySelectorAll(hints.join(","))].filter((node) => {
        const style = getComputedStyle(node);
        const box = node.getBoundingClientRect();
        return style.visibility !== "hidden" && style.display !== "none" && box.width > 20 && box.height > 10;
      });
      const controls = [...document.querySelectorAll("button, [role='button'], input[type='button'], input[type='submit'], a")]
        .map((node) => ({
          tag: node.tagName.toLowerCase(),
          id: node.id || null,
          classes: String(node.className || "").slice(0, 300),
          text: (node.innerText || node.value || node.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 200),
        }))
        .filter((control) => /accept|agree|allow|reject|decline|deny|cookie|consent|privacy|settings|preferences|withdraw/i.test(control.text));
      return {
        candidates: nodes.slice(0, 20).map((node) => ({
          tag: node.tagName.toLowerCase(),
          id: node.id || null,
          classes: String(node.className || "").slice(0, 300),
          text: (node.innerText || "").trim().replace(/\s+/g, " ").slice(0, 1000),
          html: node.outerHTML.slice(0, 5000),
        })),
        controls: controls.slice(0, 100),
      };
    }, CMP_HINTS).catch(() => ({ candidates: [], controls: [] }));
    return { url: frame.url(), label: frameLabel(frame, page), ...evidence };
  }));
  return { frames };
}

async function snapshot(page, context) {
  return {
    cookies: await context.cookies(),
    storage: await storageSnapshot(page),
    frameStorage: await frameStorageSnapshot(page),
    consentState: await consentStateSnapshot(page),
    cmp: await cmpEvidence(page),
  };
}

function actionPatterns(action) {
  if (action === "accept") return [/accept all/i, /^accept$/i, /allow all/i, /^agree$/i];
  if (action === "reject") return [/reject all/i, /^reject$/i, /decline all/i, /^decline$/i, /deny all/i, /only necessary/i];
  return [/withdraw consent/i, /withdraw/i, /change.*preferences/i, /privacy settings/i, /cookie settings/i, /manage.*cookies/i];
}

async function clickAction(page, action, selectors) {
  const configured = selectors?.[action];
  for (const frame of page.frames()) {
    if (configured) {
      const locator = frame.locator(configured).first();
      if (await locator.isVisible().catch(() => false)) {
        await locator.click();
        return { action, clicked: true, method: "selector", selector: configured, frame: frameLabel(frame, page) };
      }
    }
    for (const pattern of actionPatterns(action)) {
      for (const role of ["button", "link"]) {
        const locator = frame.getByRole(role, { name: pattern }).first();
        if (await locator.isVisible().catch(() => false)) {
          await locator.click();
          return { action, clicked: true, method: "accessible-name", selector: String(pattern), frame: frameLabel(frame, page) };
        }
      }
    }
  }
  return { action, clicked: false, method: "not-found", selector: configured || null, frame: null };
}

function planFor(scenario, config) {
  if (config.flows?.[scenario]) return { actions: config.flows[scenario], reload: scenario.startsWith("persistence-") };
  if (scenario === "accept") return { actions: ["accept"], reload: false };
  if (scenario === "reject") return { actions: ["reject"], reload: false };
  if (scenario === "persistence-accept") return { actions: ["accept"], reload: true };
  if (scenario === "persistence-reject") return { actions: ["reject"], reload: true };
  if (scenario === "withdraw") return { actions: ["accept", "withdraw", "reject"], reload: false };
  return { actions: [], reload: false };
}

function asAction(step) {
  if (typeof step === "string") return { action: step };
  return { action: step.action || step.name || "custom", selector: step.selector || null, waitMs: step.waitMs, type: step.type || "click", checked: step.checked };
}

async function toggleAction(page, step) {
  if (!step.selector) return { action: step.action, clicked: false, method: "missing-selector", selector: null, frame: null };
  for (const frame of page.frames()) {
    const locator = frame.locator(step.selector).first();
    if (!await locator.isVisible().catch(() => false)) continue;
    const before = await locator.isChecked().catch(() => null);
    if (typeof step.checked === "boolean" && before !== step.checked) {
      if (step.checked) await locator.check();
      else await locator.uncheck();
    } else if (typeof step.checked !== "boolean") {
      await locator.click();
    }
    return { action: step.action, clicked: true, method: "toggle", selector: step.selector, frame: frameLabel(frame, page), checkedBefore: before, checkedAfter: await locator.isChecked().catch(() => null) };
  }
  return { action: step.action, clicked: false, method: "not-found", selector: step.selector, frame: null };
}

async function performActions(page, scenario, config, emit) {
  const results = [];
  for (const rawStep of planFor(scenario, config).actions) {
    const step = asAction(rawStep);
    page.__auditPhase = `action-${step.action}`;
    emit("action-started", { action: step.action, selector: step.selector });
    const result = step.type === "toggle"
      ? await toggleAction(page, step)
      : step.selector
        ? await clickAction(page, step.action, { ...config.selectors, [step.action]: step.selector })
        : await clickAction(page, step.action, config.selectors || {});
    results.push(result);
    emit("action-finished", result);
    await page.waitForTimeout(step.waitMs ?? config.postInteractionMs ?? 3000);
    if (!result.clicked) break;
  }
  return results;
}

function requestRecord(request, startedAt, page, config) {
  const classification = classifyUrl(request.url(), new URL(config.url).hostname, config.classifiers || []);
  const postData = config.capturePostData === false ? null : truncate(request.postData());
  return {
    timestampMs: Date.now() - startedAt,
    phase: page.__auditPhase || "navigation",
    method: request.method(),
    resourceType: request.resourceType(),
    url: request.url(),
    requestHeaders: sanitizeHeaders(request.headers()),
    postData,
    ...classification,
    consentSignals: mergedConsentSignals(request.url(), postData),
    response: null,
    failure: null,
  };
}

async function runScenario(browser, config, scenario, outputDir) {
  const startedAt = Date.now();
  const timeline = [];
  const emit = (type, details = {}) => timeline.push({ timestampMs: Date.now() - startedAt, type, ...details });
  const context = await browser.newContext({
    viewport: config.viewport || { width: 1440, height: 1000 },
    locale: config.locale || "en-US",
    timezoneId: config.timezone || "America/Chicago",
    extraHTTPHeaders: scenario === "gpc" ? { "Sec-GPC": "1" } : {},
  });
  if (scenario === "gpc") {
    await context.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, "globalPrivacyControl", { get: () => true, configurable: true });
    });
  }
  await context.addInitScript(() => {
    const state = window.__cmpAudit = window.__cmpAudit || { dataLayer: [] };
    const record = (value) => {
      try {
        const entry = Array.from(value).map((item) => typeof item === "object" && item !== null ? JSON.parse(JSON.stringify(item)) : item);
        state.dataLayer.push(entry);
      } catch {
        state.dataLayer.push(["unserializable-data-layer-event"]);
      }
    };
    const wrap = (layer) => {
      if (!Array.isArray(layer) || layer.__cmpAuditWrapped) return layer;
      for (const item of layer) record(item);
      const push = layer.push.bind(layer);
      Object.defineProperty(layer, "__cmpAuditWrapped", { value: true, configurable: true });
      layer.push = (...items) => {
        items.forEach(record);
        return push(...items);
      };
      return layer;
    };
    window.dataLayer = wrap(window.dataLayer || []);
  });

  const page = await context.newPage();
  const requests = [];
  const requestRecords = new WeakMap();
  const consoleMessages = [];
  page.on("request", (request) => {
    const record = requestRecord(request, startedAt, page, config);
    requestRecords.set(request, record);
    requests.push(record);
    emit("request", { url: record.url, phase: record.phase, category: record.category });
  });
  page.on("response", (response) => {
    const record = requestRecords.get(response.request());
    if (!record) return;
    record.response = {
      status: response.status(),
      statusText: response.statusText(),
      headers: sanitizeHeaders(response.headers()),
    };
  });
  page.on("requestfailed", (request) => {
    const record = requestRecords.get(request);
    if (record) record.failure = request.failure()?.errorText || "request failed";
  });
  page.on("console", (message) => {
    const record = { timestampMs: Date.now() - startedAt, type: message.type(), text: message.text().slice(0, 2000), phase: page.__auditPhase || "navigation" };
    consoleMessages.push(record);
    emit("console", record);
  });

  page.__auditPhase = "navigation";
  emit("navigation-started", { url: config.url });
  const response = await page.goto(config.url, { waitUntil: "domcontentloaded", timeout: config.navigationTimeoutMs || 45000 });
  emit("domcontentloaded", { status: response?.status() || null });
  await page.waitForTimeout(config.settleMs || 3000);

  page.__auditPhase = "pre-interaction";
  const before = await snapshot(page, context);
  emit("pre-interaction-captured", { cmpCandidates: countCandidates(before.cmp) });
  await page.screenshot({ path: path.join(outputDir, `${scenario}-before.png`), fullPage: true });

  const interactions = await performActions(page, scenario, config, emit);
  let after = await snapshot(page, context);
  emit("post-actions-captured", { cmpCandidates: countCandidates(after.cmp) });
  await page.screenshot({ path: path.join(outputDir, `${scenario}-after.png`), fullPage: true });

  let afterReload = null;
  let persistence = null;
  if (planFor(scenario, config).reload && interactions.every((interaction) => interaction.clicked)) {
    page.__auditPhase = "reload";
    emit("reload-started");
    await page.reload({ waitUntil: "domcontentloaded", timeout: config.navigationTimeoutMs || 45000 });
    await page.waitForTimeout(config.postInteractionMs || 3000);
    afterReload = await snapshot(page, context);
    persistence = persistenceEvidence(after, afterReload);
    emit("reload-captured", persistence);
    await page.screenshot({ path: path.join(outputDir, `${scenario}-reload.png`), fullPage: true });
  }

  const title = await page.title();
  const finalUrl = page.url();
  await context.close();
  return {
    scenario,
    status: response?.status() || null,
    title,
    finalUrl,
    durationMs: Date.now() - startedAt,
    interactions,
    before,
    after,
    afterReload,
    persistence,
    timeline,
    requests,
    console: consoleMessages,
  };
}

function summarizeScenario(scenario) {
  const tracking = scenario.requests.filter((request) => isTrackingCategory(request.category));
  return {
    scenario: scenario.scenario,
    interactions: scenario.interactions,
    requestCount: scenario.requests.length,
    trackingRequestCount: tracking.length,
    trackingHosts: unique(tracking.map((request) => request.hostname)).sort(),
    cookieCountBefore: scenario.before.cookies.length,
    cookieCountAfter: scenario.after.cookies.length,
    localStorageKeysAfter: Object.keys(scenario.after.storage.localStorage).sort(),
    bannerCandidatesBefore: countCandidates(scenario.before.cmp),
    persistence: scenario.persistence,
  };
}

function findingsFor(scenarios) {
  const byName = Object.fromEntries(scenarios.map((scenario) => [scenario.scenario, scenario]));
  const findings = [];
  const trackers = (scenario, phase) => (scenario?.requests || []).filter((request) => isTrackingCategory(request.category) && (!phase || request.phase === phase));
  const pre = byName.preconsent;
  const reject = byName.reject;
  const accept = byName.accept;
  const gpc = byName.gpc;
  const withdraw = byName.withdraw;

  if (pre && countCandidates(pre.before.cmp) === 0 && pre.before.cmp.frames.every((frame) => frame.controls.length === 0)) {
    findings.push({ severity: "review", code: "cmp-not-detected", message: "No visible CMP candidate was detected before interaction. Confirm jurisdiction, geolocation, and custom markup." });
  }
  if (pre && trackers(pre).length) {
    findings.push({ severity: "review", code: "preconsent-tracking", message: `${trackers(pre).length} likely analytics/advertising requests occurred before consent. Inspect the timeline and Consent Mode parameters.`, evidence: unique(trackers(pre).map((request) => request.hostname)) });
  }
  for (const [name, scenario, action] of [["accept", accept, "accept"], ["reject", reject, "reject"]]) {
    if (scenario && !scenario.interactions.some((interaction) => interaction.action === action && interaction.clicked)) {
      findings.push({ severity: "error", code: `${name}-control-not-found`, message: `The audit could not exercise the ${name} action. Configure selectors.${name} or inspect CMP controls in audit.json.` });
    }
  }
  if (reject && trackers(reject, "action-reject").length) {
    findings.push({ severity: "review", code: "post-reject-tracking", message: `${trackers(reject, "action-reject").length} likely analytics/advertising requests occurred after reject. Verify whether they are restricted cookieless pings or prohibited collection.`, evidence: unique(trackers(reject, "action-reject").map((request) => request.hostname)) });
  }
  if (accept && reject && accept.interactions.some((item) => item.clicked) && reject.interactions.some((item) => item.clicked) && trackers(accept).length === trackers(reject).length) {
    findings.push({ severity: "review", code: "accept-reject-no-request-delta", message: "Accept and reject produced the same number of likely tracking requests. Inspect the timeline, request parameters, and storage to confirm that choice changes behavior." });
  }
  if (gpc && trackers(gpc).length) {
    findings.push({ severity: "review", code: "gpc-tracking-observed", message: `${trackers(gpc).length} likely tracking requests occurred with GPC enabled. Confirm the site's GPC obligations and request restrictions.`, evidence: unique(trackers(gpc).map((request) => request.hostname)) });
  }
  for (const scenario of [byName["persistence-accept"], byName["persistence-reject"]].filter(Boolean)) {
    if (scenario.persistence && scenario.persistence.retainedCookies.length + scenario.persistence.retainedLocalStorageKeys.length === 0) {
      findings.push({ severity: "review", code: `${scenario.scenario}-state-not-retained`, message: `No cookie or local-storage state remained after reload in ${scenario.scenario}. Inspect consent persistence and the audit timeline.` });
    }
  }
  if (withdraw && !withdraw.interactions.some((interaction) => interaction.action === "withdraw" && interaction.clicked)) {
    findings.push({ severity: "review", code: "withdrawal-control-not-found", message: "The audit could not locate a withdrawal or preferences control after accept. Configure selectors.withdraw and selectors.reject for the CMP's preference flow." });
  }
  if (withdraw && withdraw.interactions.some((interaction) => interaction.action === "reject" && interaction.clicked) && !hasDeniedConsent(withdraw.after)) {
    findings.push({ severity: "review", code: "withdrawal-state-not-observed", message: "The withdrawal flow clicked reject, but no denied consent update was observed in the browser data layer. Inspect storage and request activity after the action." });
  }
  return findings;
}

function markdownReport(report) {
  const rows = report.summary.map((item) => `| ${item.scenario} | ${item.interactions.filter((interaction) => interaction.clicked).map((interaction) => interaction.action).join(", ") || "-"} | ${item.requestCount} | ${item.trackingRequestCount} | ${item.cookieCountBefore} -> ${item.cookieCountAfter} | ${item.trackingHosts.join(", ") || "-"} |`).join("\n");
  const findings = report.findings.length
    ? report.findings.map((item) => `- **${item.severity.toUpperCase()} ${item.code}:** ${item.message}${item.evidence ? ` Evidence: ${item.evidence.join(", ")}.` : ""}`).join("\n")
    : "- No heuristic findings. This is not a compliance determination.";
  return `# CMP audit: ${report.url}\n\nGenerated: ${report.generatedAt}\n\n## Scenario comparison\n\n| Scenario | Completed actions | Requests | Likely tracking | Cookies | Tracking hosts |\n| --- | --- | ---: | ---: | ---: | --- |\n${rows}\n\n## Findings\n\n${findings}\n\n## Evidence\n\nThe output directory contains screenshots and \`audit.json\` with a timestamped timeline, request/response metadata, request bodies when enabled, cookies, web storage, CMP markup, and console messages.\n\n## Interpretation boundary\n\nThese are browser-observable facts and heuristic classifications. Review jurisdiction, policy, purpose, server-side flows, first-party proxies, and vendor contracts separately.\n`;
}

function publicConfig(config, outputDir) {
  const proxy = config.proxy ? {
    server: config.proxy.server,
    username: config.proxy.username ? "[configured]" : undefined,
    password: config.proxy.password ? "[redacted]" : undefined,
  } : undefined;
  return { ...config, proxy, outputDir };
}

export async function audit(config) {
  if (!config?.url) throw new Error("config.url is required");
  const outputDir = path.resolve(config.outputDir || path.join("cmp-audits", `${slug(config.url)}-${new Date().toISOString().replace(/[:.]/g, "-")}`));
  await fs.mkdir(outputDir, { recursive: true });
  const browser = await chromium.launch({
    headless: config.headless !== false,
    executablePath: resolveChromePath(config),
    proxy: config.proxy,
  });
  try {
    const scenarios = [];
    for (const scenario of config.scenarios || DEFAULT_SCENARIOS) scenarios.push(await runScenario(browser, config, scenario, outputDir));
    const report = {
      schemaVersion: "0.3.0",
      generatedAt: new Date().toISOString(),
      url: config.url,
      methodology: "Browser-observable CMP activity evidence model",
      config: publicConfig(config, outputDir),
      summary: scenarios.map(summarizeScenario),
      findings: findingsFor(scenarios),
      scenarios,
    };
    await fs.writeFile(path.join(outputDir, "audit.json"), JSON.stringify(report, null, 2));
    await fs.writeFile(path.join(outputDir, "REPORT.md"), markdownReport(report));
    return { outputDir, report };
  } finally {
    await browser.close();
  }
}

export async function auditMany(config) {
  const urls = unique(config.urls || (config.url ? [config.url] : []));
  if (!urls.length) throw new Error("config.urls or config.url is required");
  const outputDir = path.resolve(config.outputDir || path.join("cmp-audits", `batch-${new Date().toISOString().replace(/[:.]/g, "-")}`));
  await fs.mkdir(outputDir, { recursive: true });
  const audits = [];
  for (const url of urls) {
    const result = await audit({ ...config, url, urls: undefined, outputDir: path.join(outputDir, slug(url)) });
    audits.push({ url, outputDir: result.outputDir, summary: result.report.summary, findings: result.report.findings });
  }
  const report = { schemaVersion: "0.3.0", generatedAt: new Date().toISOString(), urls, audits };
  await fs.writeFile(path.join(outputDir, "batch-audit.json"), JSON.stringify(report, null, 2));
  return { outputDir, report };
}

export async function loadConfig(file) {
  return JSON.parse(await fs.readFile(path.resolve(file), "utf8"));
}

#!/usr/bin/env node
/**
 * GTM Preview Validator
 * Automated validation of GTM workspace changes using Playwright.
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

const DEFAULT_CONFIG = {
  containerId: '',
  targetUrl: '',
  expectedTags: [],
  expectedEvents: [],
  expectedDataLayer: {},
  actions: [],
  timeout: 30000,
  headless: false,
  userDataDir: path.join(process.env.HOME || '', '.gtm-validator-profile')
};

function parseArgs() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--config': config.configFile = args[++i]; break;
      case '--container': config.containerId = args[++i]; break;
      case '--url': config.targetUrl = args[++i]; break;
      case '--output': config.outputDir = args[++i]; break;
      case '--headless': config.headless = true; break;
      case '--help': printHelp(); process.exit(0);
    }
  }
  return config;
}

function printHelp() {
  console.log(`
GTM Preview Validator

Usage: node validate.js [options]

Options:
  --config <file>     JSON config file
  --container <id>    GTM Container ID (GTM-XXXXXXX)
  --url <url>         Target URL to test
  --output <dir>      Output directory (default: ./reports)
  --headless          Run headless (limited)
  --help              Show help
  `);
}

class GTMPreviewValidator {
  constructor(config) {
    this.config = config;
    this.results = {
      passed: [], failed: [], warnings: [],
      dataLayerSnapshots: [], networkRequests: [], screenshots: []
    };
  }

  async initialize() {
    const outputDir = this.config.outputDir || './reports';
    const screenshotDir = path.join(outputDir, 'screenshots');
    await fs.mkdir(outputDir, { recursive: true });
    await fs.mkdir(screenshotDir, { recursive: true });
    this.outputDir = outputDir;
    this.screenshotDir = screenshotDir;
    
    console.log('🚀 Launching browser...');
    this.context = await chromium.launchPersistentContext(this.config.userDataDir, {
      headless: this.config.headless,
      viewport: { width: 1920, height: 1080 },
      args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
    });
    this.page = await this.context.newPage();
    this.setupNetworkMonitoring();
    console.log('✅ Browser launched');
  }

  setupNetworkMonitoring() {
    const patterns = {
      ga4: /google-analytics\.com\/g\/collect/,
      metaPixel: /facebook\.com\/tr/,
      tiktok: /analytics\.tiktok\.com/
    };
    this.page.on('request', request => {
      const url = request.url();
      for (const [platform, pattern] of Object.entries(patterns)) {
        if (pattern.test(url)) {
          this.results.networkRequests.push({
            timestamp: new Date().toISOString(), platform, url
          });
        }
      }
    });
  }

  async connectToPreview() {
    const { containerId, targetUrl } = this.config;
    console.log(`🔗 Connecting to GTM Preview for ${containerId}...`);
    const previewUrl = `https://tagassistant.google.com/#/?id=${containerId}&url=${encodeURIComponent(targetUrl)}`;
    await this.page.goto(previewUrl);
    await this.page.waitForLoadState('networkidle');
    await this.takeScreenshot('tag_assistant_loaded');
    
    const selectors = ['button:has-text("Connect")', '[data-testid="connect-button"]'];
    for (const sel of selectors) {
      try {
        await this.page.waitForSelector(sel, { timeout: 5000 });
        await this.page.click(sel);
        break;
      } catch (e) { continue; }
    }
    
    const pagePromise = this.context.waitForEvent('page', { timeout: 15000 });
    this.targetPage = await pagePromise;
    await this.targetPage.waitForLoadState('networkidle');
    console.log(`✅ Connected to ${targetUrl}`);
  }

  async captureDataLayer(name = 'snapshot') {
    if (!this.targetPage) return null;
    const snapshot = await this.targetPage.evaluate(() => ({
      timestamp: new Date().toISOString(),
      url: window.location.href,
      dataLayer: window.dataLayer ? JSON.parse(JSON.stringify(window.dataLayer)) : []
    }));
    snapshot.name = name;
    this.results.dataLayerSnapshots.push(snapshot);
    console.log(`📊 Captured dataLayer: ${snapshot.dataLayer.length} entries`);
    return snapshot;
  }

  async executeAction(action) {
    if (!this.targetPage) return;
    console.log(`▶️  Executing: ${action.type}`);
    try {
      switch (action.type) {
        case 'wait':
          if (action.selector) await this.targetPage.waitForSelector(action.selector, { timeout: action.timeout || 5000 });
          else await this.targetPage.waitForTimeout(action.duration || 1000);
          break;
        case 'click':
          await this.targetPage.waitForSelector(action.selector, { timeout: 5000 });
          await this.targetPage.click(action.selector);
          break;
        case 'fill':
          await this.targetPage.fill(action.selector, action.value);
          break;
        case 'scroll':
          await this.targetPage.evaluate(t => window.scrollTo(0, t === 'bottom' ? document.body.scrollHeight : t), action.target || 'bottom');
          break;
      }
      await this.targetPage.waitForTimeout(500);
    } catch (error) {
      this.results.failed.push(`Action ${action.type} failed: ${error.message}`);
    }
  }

  async takeScreenshot(name) {
    const page = this.targetPage || this.page;
    if (!page) return null;
    const filename = `${String(this.results.screenshots.length + 1).padStart(3, '0')}_${name}.png`;
    const filepath = path.join(this.screenshotDir, filename);
    await page.screenshot({ path: filepath });
    this.results.screenshots.push({ name, path: filepath });
    console.log(`📸 Screenshot: ${filename}`);
    return filepath;
  }

  validateResults() {
    console.log('\n🔍 Validating results...\n');
    const allEvents = [...new Set(
      this.results.dataLayerSnapshots.flatMap(s => s.dataLayer || []).filter(i => i.event).map(i => i.event)
    )];
    
    for (const exp of this.config.expectedEvents) {
      if (allEvents.includes(exp)) this.results.passed.push(`✅ Event '${exp}' fired`);
      else this.results.failed.push(`❌ Event '${exp}' NOT fired`);
    }
    
    const platforms = [...new Set(this.results.networkRequests.map(r => r.platform))];
    console.log('Events detected:', allEvents);
    console.log('Platforms detected:', platforms);
  }

  async generateReport() {
    const report = {
      summary: {
        containerId: this.config.containerId,
        targetUrl: this.config.targetUrl,
        timestamp: new Date().toISOString(),
        passed: this.results.passed.length,
        failed: this.results.failed.length,
        recommendation: this.results.failed.length === 0 ? 'SAFE_TO_PUBLISH' : 'DO_NOT_PUBLISH'
      },
      validation: this.results
    };
    
    await fs.writeFile(path.join(this.outputDir, 'validation-report.json'), JSON.stringify(report, null, 2));
    await fs.writeFile(path.join(this.outputDir, 'datalayer-snapshots.json'), JSON.stringify(this.results.dataLayerSnapshots, null, 2));
    
    const status = report.summary.failed === 0 ? '✅ PASSED' : '❌ FAILED';
    const md = [
      '# GTM Validation Report', '',
      `**Container:** ${report.summary.containerId}`,
      `**URL:** ${report.summary.targetUrl}`,
      `**Status:** ${status}`,
      `**Recommendation:** ${report.summary.recommendation}`, '',
      '## Passed', ...this.results.passed.map(p => `- ${p}`), '',
      '## Failed', ...this.results.failed.map(f => `- ${f}`)
    ].join('\n');
    
    await fs.writeFile(path.join(this.outputDir, 'validation-report.md'), md);
    console.log(`\n📄 Report saved to: ${this.outputDir}/validation-report.md`);
    return report;
  }

  async run() {
    try {
      await this.initialize();
      await this.connectToPreview();
      await this.captureDataLayer('baseline');
      
      for (const action of this.config.actions) {
        await this.executeAction(action);
        await this.captureDataLayer(`after_${action.type}`);
        await this.takeScreenshot(`after_${action.type}`);
      }
      
      await this.captureDataLayer('final');
      this.validateResults();
      const report = await this.generateReport();
      
      console.log('\n' + '='.repeat(50));
      console.log(`VALIDATION: ${report.summary.recommendation}`);
      console.log('='.repeat(50) + '\n');
      
      return report;
    } finally {
      if (this.context) await this.context.close();
    }
  }
}

async function main() {
  const args = parseArgs();
  if (args.configFile) {
    const content = await fs.readFile(args.configFile, 'utf-8');
    Object.assign(args, JSON.parse(content));
  }
  
  if (!args.containerId || !args.targetUrl) {
    console.error('Error: --container and --url required');
    process.exit(1);
  }
  
  console.log('\n🔧 GTM Preview Validator\n');
  const validator = new GTMPreviewValidator(args);
  const report = await validator.run();
  process.exit(report.summary.failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });

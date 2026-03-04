#!/usr/bin/env node
/**
 * GTM Preview Validator - Browser Setup
 * Sets up persistent browser profile with Google authentication.
 */

const { chromium } = require('playwright');
const path = require('path');
const readline = require('readline');

const USER_DATA_DIR = path.join(process.env.HOME || '', '.gtm-validator-profile');

async function main() {
  console.log('\n🔧 GTM Preview Validator - Browser Setup');
  console.log('=========================================\n');
  console.log('This will open a browser for Google login.');
  console.log(`Profile: ${USER_DATA_DIR}\n`);
  
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise(r => rl.question('Press Enter to launch browser...', r));
  
  console.log('\n🚀 Launching browser...\n');
  
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: { width: 1280, height: 900 },
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
  });
  
  const page = await context.newPage();
  await page.goto('https://accounts.google.com');
  
  console.log('📱 Please log into your Google account, then close the browser.\n');
  
  await context.waitForEvent('close').catch(() => {});
  console.log('✅ Setup complete!\n');
  rl.close();
}

main().catch(e => { console.error(e); process.exit(1); });

#!/usr/bin/env node
// Larry — Onboarding Config Validator
// Usage: node onboarding.js --validate

const checks = [
  { key: 'OPENAI_API_KEY', required: true, hint: 'Get from platform.openai.com — needed for gpt-image-1.5' },
  { key: 'POSTIZ_API_KEY', required: true, hint: 'Sign up at postiz.pro/oliverhenry — analytics backbone' },
  { key: 'REVENUECAT_API_KEY', required: false, hint: 'Optional — completes conversion tracking loop' },
];

let passed = 0; let failed = 0;

console.log('\n=== Larry Config Validation ===\n');
for (const check of checks) {
  const val = process.env[check.key];
  if (val) {
    console.log(`  ✓ ${check.key}`);
    passed++;
  } else if (check.required) {
    console.log(`  ✗ ${check.key} (REQUIRED) — ${check.hint}`);
    failed++;
  } else {
    console.log(`  ⚠ ${check.key} (optional) — ${check.hint}`);
  }
}

console.log(`\nResult: ${passed} set, ${failed} missing\n`);
if (failed > 0) { console.error('Fix required env vars before running Larry.'); process.exit(1); }
else { console.log('✓ Larry is ready to run.\n'); }

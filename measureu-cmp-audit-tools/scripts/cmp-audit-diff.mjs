#!/usr/bin/env node
import { compareAuditFiles } from "../cmp-audit/compare.mjs";

if (process.argv.length !== 4 || process.argv.includes("--help")) {
  console.error("Usage: cmp-audit-diff <baseline-audit.json> <candidate-audit.json>");
  process.exit(process.argv.includes("--help") ? 0 : 2);
}

try {
  console.log(JSON.stringify(await compareAuditFiles(process.argv[2], process.argv[3]), null, 2));
} catch (error) {
  console.error(`cmp-audit-diff: ${error.message}`);
  process.exit(1);
}

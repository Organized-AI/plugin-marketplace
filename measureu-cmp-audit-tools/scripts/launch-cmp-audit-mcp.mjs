#!/usr/bin/env node
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

if (!existsSync(new URL("../node_modules/playwright-core", import.meta.url))) {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  execFileSync(npm, ["ci", "--omit=dev", "--ignore-scripts"], {
    cwd: new URL("..", import.meta.url),
    stdio: ["ignore", "ignore", "inherit"],
  });
}

await import("./cmp-audit-mcp.mjs");

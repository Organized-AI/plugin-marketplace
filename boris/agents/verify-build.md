---
name: verify-build
description: Validate builds work correctly
---

# Build Validation Agent

## Checks

1. Clean install: `rm -rf node_modules && npm ci`
2. Build: `npm run build`
3. Verify artifacts exist
4. Smoke test: start app, check for crashes

## Output

Build status, time, artifact sizes, warnings

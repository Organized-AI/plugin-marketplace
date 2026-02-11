---
description: Clean build verification and deploy Actor to Apify cloud
---

# Actor Deploy

Perform a clean-state build verification and deploy the Actor to Apify cloud with `apify push`.

## Prerequisites

Verify Apify CLI is authenticated:
```bash
apify whoami 2>&1 || echo "Not logged in — run: apify login"
```

## Steps

### 1. Clean Build Verification

Remove all build artifacts and reinstall from scratch to ensure reproducibility:

```bash
rm -rf node_modules dist
npm ci
npm run build
```

### 2. Verify dist/ Output

```bash
ls dist/
```

The `dist/` directory MUST contain compiled `.js` files. If empty, the Actor will fail on Apify cloud.

### 3. Run Tests

```bash
npm test
```

All tests must pass before deploying.

### 4. Type Check

```bash
npx tsc --noEmit
```

### 5. Verify Actor Config

Check that required files exist:
```bash
ls .actor/actor.json .actor/input_schema.json .actor/Dockerfile
```

### 6. Deploy

```bash
apify push
```

### 7. Report

```
Actor Deploy Results:
  Clean Install: ✅
  Build:         ✅ (dist/ has N files)
  Tests:         ✅ (N/N passed)
  Type Check:    ✅
  Actor Config:  ✅
  Deploy:        ✅ Pushed to Apify cloud

  Actor URL: https://console.apify.com/actors/<actor-id>
```

## Failure Recovery

| Step Failed | Action |
|-------------|--------|
| Clean install | Check package.json and package-lock.json are in sync |
| Build | Check tsconfig.json: `importHelpers: false`, `incremental: false` |
| Tests | Fix failing tests before deploying |
| Type check | Fix TypeScript errors |
| Deploy | Check `apify login`, verify `.actor/actor.json` is valid |

## Important Notes

- NEVER deploy with failing tests
- ALWAYS do a clean build (`rm -rf node_modules dist && npm ci`) before deploying — incremental builds can mask issues
- The Dockerfile uses `apify/actor-node:22` — ensure your code works with Node 22
- Check `.actorignore` excludes test files, docs, and dev-only files

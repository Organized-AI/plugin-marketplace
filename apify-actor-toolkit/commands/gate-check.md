---
description: Run build + test + type-check verification gate for an Apify Actor project
---

# Gate Check

Run the standard verification gate for a TypeScript Apify Actor project. All three steps must pass.

## Steps

### 1. Build

```bash
npm run build
```

Verify `dist/` directory is populated:
```bash
ls dist/
```

If `dist/` is empty after a successful build, check `tsconfig.json` for:
- `importHelpers: true` (must be `false`)
- `incremental: true` (must be `false`)

### 2. Test

```bash
npm test
```

Report test count and pass/fail status.

### 3. Type Check

```bash
npx tsc --noEmit
```

## Output

```
Gate Check Results:
  Build:      ✅ OK (dist/ has N files)
  Tests:      ✅ OK (N/N passed)
  Type Check: ✅ OK

Gate: PASSED ✅
```

Or on failure:
```
Gate Check Results:
  Build:      ✅ OK
  Tests:      ❌ FAILED (2 tests failing)
  Type Check: ✅ OK

Gate: FAILED ❌
```

## When to Run

- After implementing each phase of a phased build
- Before committing changes
- Before deploying with `/actor-deploy`
- After dependency updates

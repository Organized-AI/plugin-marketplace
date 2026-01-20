---
description: Run all verification checks before committing
---

# Verify Current Work

Run complete verification suite:

1. **Linting**: `npm run lint`
2. **Tests**: `npm test`
3. **Type Check**: `npm run typecheck` (if TypeScript)
4. **Build**: `npm run build`

Report Pass/Fail for each with specific errors.

## Pre-Commit Checklist

- [ ] Code compiles/builds
- [ ] All tests pass
- [ ] Linter passes
- [ ] No console.log/debug statements
- [ ] No commented-out code
- [ ] No TODO without issue link
- [ ] No hardcoded secrets
- [ ] Changes match intent

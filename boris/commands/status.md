---
description: Project health check
---

# Project Status

1. Git status and last 5 commits
2. `npm outdated` for dependency health
3. `npm test -- --coverage` for test coverage
4. Build status
5. Summary: Healthy / Needs Attention / Critical

## Health Indicators

| Status | Meaning |
|--------|---------|
| Healthy | All checks pass, deps up to date |
| Needs Attention | Minor issues, outdated deps |
| Critical | Failing tests, build errors |

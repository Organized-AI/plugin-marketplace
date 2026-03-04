# Implementation Tracker Template

## Client: [CLIENT_NAME]
## Account: [ACCOUNT_ID]
## Engagement Start: [DATE]

---

## Progress Overview

```
Overall: [XX]% Complete
[████████░░░░░░░░░░░░] XX%
```

---

## Task Categories

### CAPI_SETUP

| ID | Task | Status | Depends On | Validation |
|----|------|--------|------------|------------|
| CAPI-001 | Create Stape account | ⬜ PLANNED | — | Account active |
| CAPI-002 | Deploy Stape container | ⬜ PLANNED | CAPI-001 | Container in list |
| CAPI-003 | Configure custom domain | ⬜ PLANNED | CAPI-002 | DNS resolves |
| CAPI-004 | Generate CAPI access token | ⬜ PLANNED | CAPI-002 | Token works |
| CAPI-005 | Configure event mapping | ⬜ PLANNED | CAPI-004 | Events in Meta |
| CAPI-006 | Enable deduplication | ⬜ PLANNED | CAPI-005 | No duplicates |
| CAPI-007 | Add enhanced matching | ⬜ PLANNED | CAPI-005 | Match quality > 6.0 |

### REVENUE_TRACKING

| ID | Task | Status | Depends On | Validation |
|----|------|--------|------------|------------|
| REV-001 | Audit purchase pages | ⬜ PLANNED | — | All pages documented |
| REV-002 | Standardize value param | ⬜ PLANNED | REV-001 | All purchases have value |
| REV-003 | Dynamic value calc | ⬜ PLANNED | REV-002 | Value = order total |
| REV-004 | Currency consistency | ⬜ PLANNED | REV-002 | All use account currency |

### CRM_INTEGRATION

| ID | Task | Status | Depends On | Validation |
|----|------|--------|------------|------------|
| CRM-001 | Map GHL events | ⬜ PLANNED | — | Mapping documented |
| CRM-002 | Configure webhooks | ⬜ PLANNED | CRM-001, CAPI-002 | Webhooks fire |
| CRM-003 | Connect to Stape | ⬜ PLANNED | CRM-002 | Events flow through |
| CRM-004 | Offline conversion upload | ⬜ PLANNED | CRM-003 | CRM sales in Meta |

### CAMPAIGN_OPTIMIZATION

| ID | Task | Status | Depends On | Validation |
|----|------|--------|------------|------------|
| OPT-001 | Pause losing campaigns | ⬜ PLANNED | — | Status = PAUSED |
| OPT-002 | Scale winning campaigns | ⬜ PLANNED | — | Budget increased |
| OPT-003 | Enable value-based bidding | ⬜ PLANNED | REV-002 | Bid strategy updated |

---

## Status Legend

| Symbol | Status | Meaning |
|--------|--------|---------|
| ⬜ | PLANNED | Not started |
| 🔄 | IN_PROGRESS | Actively working |
| ✅ | COMPLETE | Done and validated |
| ⏸️ | BLOCKED | Cannot proceed |
| ❌ | CANCELLED | No longer needed |

---

## Metrics Tracking

| Metric | Baseline | Current | Target | Progress |
|--------|----------|---------|--------|----------|
| Match Quality | [X] | [X] | 7.0+ | [░░░░░░░░] |
| Attribution Rate | [X]% | [X]% | 95% | [░░░░░░░░] |
| ROAS | [X]x | [X]x | [X]x | [░░░░░░░░] |
| Revenue Tracked | [X]% | [X]% | 100% | [░░░░░░░░] |

---

## Validation Log

| Date | Task ID | Check | Result | Notes |
|------|---------|-------|--------|-------|
| [DATE] | [ID] | [Validation] | ✅/❌ | [Notes] |

---

## Blockers

| Task ID | Blocker | Owner | Since | Resolution |
|---------|---------|-------|-------|------------|
| — | — | — | — | — |

---

## Weekly Updates

### Week of [DATE]

**Completed:**
- ✅ [Task]

**In Progress:**
- 🔄 [Task]

**Next Week:**
- [ ] [Task]

---

## Notes & Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| [DATE] | [Decision] | [Why] |
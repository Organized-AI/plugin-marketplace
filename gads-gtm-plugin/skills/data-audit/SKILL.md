---
name: data-audit
description: Comprehensive Meta Ads account auditing using Pipeboard Meta MCP and Stape MCP tools. Use when conducting performance audits, analyzing ad account data, evaluating tracking infrastructure (Pixel/CAPI/Stape), creating audit reports, assessing campaign performance, managing Stape containers, or generating architecture diagrams.
triggers:
  - "audit this Meta account"
  - "analyze ad performance"
  - "evaluate tracking setup"
  - "create CAPI recommendations"
  - "set up Stape container"
  - "generate audit report"
  - "client audit"
  - "implementation tracking"
---

# Data Audit Skill

Systematic workflow for conducting comprehensive Meta Ads account audits, generating professional client reports, and tracking implementation progress.

## Two Primary Use Cases

### 1. Client Audits
Professional deliverables for client presentations and proposals.

### 2. Implementation Tracking
Ongoing task management for CAPI setup, revenue tracking, and optimization.

---

## Audit Workflow

### Phase 1: Data Collection

**Step 1: Account Discovery**
```python
# Get all accessible ad accounts
get_ad_accounts(user_id="me", limit=200)

# Select target account and get details
get_account_info(account_id="act_XXXXXXXXX")
```

**Step 2: Performance Analysis**
```python
# Account-level insights (30 days)
bulk_get_insights(level="account", time_range="last_30d")

# Campaign-level insights
bulk_get_insights(level="campaign", time_range="last_30d")

# Detailed campaign data
get_campaign_details(campaign_id="CAMPAIGN_ID")
```

**Step 3: Tracking Assessment**
```python
# Check Stape containers (if Stape MCP available)
stape_container_crud(action="list")
stape_container_analytics()
```

### Phase 2: Analysis & Scoring

**Health Score Components (10 points total):**

| Component | Weight | Scoring |
|-----------|--------|---------|
| Attribution Health | 3.0 pts | Full: 3.0 / Partial: 1.5 / Broken: 0 |
| ROAS Performance | 2.5 pts | >5x: 2.5 / 3-5x: 2.0 / 2-3x: 1.5 / <2x: 0.5 |
| CAPI Deployment | 1.5 pts | Full: 1.5 / Partial: 0.75 / None: 0 |
| Revenue Tracking | 1.5 pts | Complete: 1.5 / Partial: 0.75 / Missing: 0 |
| Campaign Structure | 1.5 pts | Optimal: 1.5 / Good: 1.0 / Needs work: 0.5 |

**Status Thresholds:**
- 🟢 8.5-10: Excellent
- 🟡 7.0-8.4: Good
- 🟠 5.0-6.9: Needs Attention
- 🔴 <5.0: Critical

### Phase 3: Artifact Generation

**Required Deliverables:**

1. **Executive Summary** (1-page)
   - Health score with breakdown
   - Key metrics vs benchmarks
   - Top 3-5 findings
   - Recommended next steps

2. **Full Audit Report**
   - Detailed campaign analysis
   - Tracking infrastructure assessment
   - Opportunity identification
   - Implementation roadmap

3. **Implementation Checklist**
   - Task categories with dependencies
   - Validation criteria
   - Progress tracking

### Phase 4: Implementation Tracking

**Task Categories:**

- **CAPI_SETUP** - Stape container, events, matching
- **REVENUE_TRACKING** - Value parameter standardization
- **CRM_INTEGRATION** - GHL → Stape → Meta flow
- **CAMPAIGN_OPTIMIZATION** - Budget and targeting changes

**Task States:**
```
PLANNED → IN_PROGRESS → VALIDATING → COMPLETE
              ↓
           BLOCKED → (resolve) → IN_PROGRESS
```

---

## CAPI Best Practices

### One vs. Multiple CAPI Integrations

**Use ONE CAPI when:**
- Single ad account
- Single domain
- Single Meta Pixel
- Want simple setup (RECOMMENDED)

**Architecture:**
```
1 Website → 1 Pixel → 1 CAPI → All Campaigns
```

**Key:** CAPI connects to Pixel/Dataset, not campaigns. Meta routes events automatically via fbclid.

### Implementation Phases

**Phase 1: Foundation**
- Set up Stape container (Europe zone for GDPR)
- Configure custom domain
- Generate CAPI access token
- Basic event flow testing

**Phase 2: Enhancement**
- Enhanced matching (email, phone, external_id)
- Event deduplication
- Revenue tracking standardization

**Phase 3: CRM Integration**
- GHL webhook configuration
- Event mapping
- Offline conversion upload

---

## Tool Integration

### Pipeboard Meta MCP Tools

**Account:** `get_ad_accounts`, `get_account_info`, `get_account_pages`
**Campaign:** `get_campaigns`, `get_campaign_details`, `bulk_update_campaigns`
**Ad Set:** `get_adsets`, `get_adset_details`, `bulk_update_adsets`
**Ad:** `get_ads`, `get_ad_details`, `get_ad_creatives`, `get_ad_image`
**Analytics:** `get_insights`, `bulk_get_insights`

### Stape MCP Tools

**Container:** `stape_container_crud`, `stape_container_power_ups`
**Domain:** `stape_container_domains`
**Analytics:** `stape_container_analytics`, `stape_container_statistics`

---

## Formatting Rules

- Use clear headers (##, ###)
- Include tables for data comparisons
- Add status indicators: ✅ OK, ⚠️ WARN, 🚨 CRITICAL
- No time constraints in roadmaps (use phases)
- Phased implementation plans
- Simple ASCII diagrams for architecture

---

## Resources

### references/
- `audit-report-template.md` - Full audit report structure
- `pixel-audit-checklist.md` - Events Manager review checklist
- `architecture-diagram.md` - Current vs ideal state visualization
- `implementation-tracker-template.md` - Task tracking format

### Example Artifacts
- See Organized Data Audit project for real client examples
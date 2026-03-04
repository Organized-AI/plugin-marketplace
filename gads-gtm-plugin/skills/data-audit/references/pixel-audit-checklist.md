# Meta Pixel & CAPI Audit Checklist
## Challenges by Marisa - Events Manager Review

**Account:** act_4178428858845500  
**Account Name:** Challenges by Marisa  
**Audit Date:** November 3, 2025  
**Auditor:** _________________  
**Review Duration:** 60-90 minutes  
**Currency:** GBP  
**Account Status:** Active

---

## 📋 PRE-AUDIT PREPARATION

### Required Access
- [ ] Meta Business Manager access confirmed
- [ ] Events Manager access verified
- [ ] Pixel ID documented: _______________
- [ ] Dataset ID documented: _______________
- [ ] Admin permissions confirmed

### Tools Needed
- [ ] Spreadsheet for data capture (Google Sheets/Excel)
- [ ] Screenshot tool ready
- [ ] Meta Pixel Helper Chrome extension installed
- [ ] Access to GHL admin panel
- [ ] Access to website backend

### Expected Baseline (From Pipeboard Meta MCP Analysis - Last 30 Days)
```
Known Performance Metrics (Oct 4 - Nov 2, 2025):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Account Spend: £111,974
Total Impressions: 5,987,000+
Total Clicks: 217,000+
Overall CTR: 3.63%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Conversion Events:
├─ Lead Events: 27,765
├─ Purchase Events: 575+
├─ Schedule Events: 471
├─ Submit Application: 18,307
├─ ViewContent Events: 1,005
└─ Add to Cart Events: 623

Campaign Performance:
├─ Active Campaigns: 16
├─ Lead Generation: Strong (£1.33-£30.82 CPL)
├─ Purchase Conversion: Working (£24.62-£216.23 per purchase)
└─ Revenue Tracking: Partial (some campaigns tracking value)
```

---

## SECTION 1: ACCOUNT & PIXEL IDENTIFICATION

### 1.1 Account Status Check
**Navigate to:** Business Manager > Ad Accounts

**Account Details:**
- [ ] **Account ID:** act_4178428858845500 ✓
- [ ] **Account Name:** Challenges by Marisa ✓
- [ ] **Account Status:** Active (1) ✓
- [ ] **Business Country:** GB ✓
- [ ] **Currency:** GBP ✓
- [ ] **Account Age:** 1,631 days (~4.5 years) ✓
- [ ] **Lifetime Spend:** £3,453,330.97 ✓
- [ ] **Current Balance:** £_____ (check live)

**Health Indicators:**
- [ ] No spending limits active? ☐ Yes ☐ No
- [ ] No billing issues? ☐ Yes ☐ No
- [ ] Admin access confirmed? ☐ Yes ☐ No

**Screenshot Required:** Account overview page

---

### 1.2 Pixel Discovery
**Navigate to:** Events Manager > Data Sources > Pixels

- [ ] **Pixel ID:** _______________
- [ ] **Pixel Name:** _______________
- [ ] **Status:** ☐ Active ☐ Inactive ☐ Limited
- [ ] **Creation Date:** _______________
- [ ] **Associated Ad Account:** act_4178428858845500 ✓

**Multiple Pixels Check:**
- [ ] How many pixels exist? _____
- [ ] Are there duplicate/legacy pixels? ☐ Yes ☐ No
- [ ] If yes, list IDs: _______________

**Integration Status:**
- [ ] Pixel receiving events? ☐ Yes ☐ No
- [ ] Events in last 24 hours: _____
- [ ] Last event received: _______________

**Screenshot Required:** Full pixel list view

---

### 1.3 Pixel Installation Method
**Navigate to:** Events Manager > Pixel > Settings > Set Up Pixel

**Installation Type:**
- [ ] ☐ Manually install pixel code
- [ ] ☐ Use a partner integration
- [ ] ☐ Email instructions to developer
- [ ] ☐ Google Tag Manager
- [ ] ☐ WordPress plugin
- [ ] ☐ Other: _______________

**Partner Integration (if applicable):**
- [ ] Platform: _______________ (Check for GHL, Kajabi, etc.)
- [ ] Integration status: ☐ Connected ☐ Disconnected
- [ ] Last sync: _______________

**Code Installation:**
- [ ] Base pixel code present? ☐ Yes ☐ No
- [ ] Where installed: _______________
- [ ] Installed on all pages? ☐ Yes ☐ No
- [ ] Install method: ☐ GTM ☐ Direct ☐ CMS Plugin ☐ Other

**Screenshot Required:** Installation settings page

---

## SECTION 2: EVENT TRACKING AUDIT

### 2.1 Standard Events Configuration
**Navigate to:** Events Manager > Data Sources > [Your Pixel] > Events

**Events Currently Firing (Verify Each):**

**PageView Event:**
- [ ] Firing on all pages? ☐ Yes ☐ No
- [ ] Event count (last 7 days): _____
- [ ] Deduplication configured? ☐ Yes ☐ No

**Lead Event:**
- [ ] Configured? ☐ Yes ☐ No
- [ ] Volume (last 30 days): _____ (Expected: ~27,765 based on MCP data)
- [ ] Match quality score: _____/10
- [ ] Enhanced matching enabled? ☐ Yes ☐ No

**Purchase Event:**
- [ ] Configured? ☐ Yes ☐ No
- [ ] Volume (last 30 days): _____ (Expected: ~575 based on MCP data)
- [ ] Revenue value passing? ☐ Yes ☐ No
- [ ] Currency correct (GBP)? ☐ Yes ☐ No
- [ ] Match quality score: _____/10

**Schedule Event (Custom):**
- [ ] Configured? ☐ Yes ☐ No
- [ ] Volume (last 30 days): _____ (Expected: ~471 based on MCP data)
- [ ] Mapped correctly? ☐ Yes ☐ No
- [ ] Used in conversions API? ☐ Yes ☐ No

**Submit Application Event (Custom):**
- [ ] Configured? ☐ Yes ☐ No
- [ ] Volume (last 30 days): _____ (Expected: ~18,307 based on MCP data)
- [ ] Used for optimization? ☐ Yes ☐ No

**ViewContent Event:**
- [ ] Configured? ☐ Yes ☐ No
- [ ] Volume (last 30 days): _____ (Expected: ~1,005 based on MCP data)
- [ ] Product data passing? ☐ Yes ☐ No

**AddToCart Event:**
- [ ] Configured? ☐ Yes ☐ No
- [ ] Volume (last 30 days): _____ (Expected: ~623 based on MCP data)
- [ ] Product value included? ☐ Yes ☐ No

**InitiateCheckout Event:**
- [ ] Configured? ☐ Yes ☐ No
- [ ] Volume (last 30 days): _____ (Expected: ~205 based on MCP data)
- [ ] Funnel tracking working? ☐ Yes ☐ No

**Screenshot Required:** Events overview showing all configured events

---

### 2.2 Event Parameter Validation

**For Each Standard Event, Check Parameters:**

**Purchase Event Parameters:**
- [ ] value: _____ (must pass revenue)
- [ ] currency: GBP ✓
- [ ] content_ids: ☐ Yes ☐ No
- [ ] content_type: ☐ Yes ☐ No
- [ ] content_name: ☐ Yes ☐ No

**Lead Event Parameters:**
- [ ] content_name: ☐ Yes ☐ No (form name/funnel)
- [ ] content_category: ☐ Yes ☐ No (lead type)
- [ ] value: ☐ Yes ☐ No (optional estimated value)

**Issues Found:**
Record any missing or incorrect parameters:
- [ ] Issue 1: _______________
- [ ] Issue 2: _______________
- [ ] Issue 3: _______________

---

### 2.3 Event Match Quality Assessment
**Navigate to:** Events Manager > [Your Pixel] > Overview > Match Quality

**Current Match Quality Scores:**
- [ ] Overall Match Score: _____/10 (Target: 7.0+)
- [ ] Events with good match (>5.0): _____%
- [ ] Events with poor match (<5.0): _____%

**Match Parameters Present:**
- [ ] **Email:** ☐ Yes ☐ No (hashed)
- [ ] **Phone:** ☐ Yes ☐ No (hashed)
- [ ] **First Name:** ☐ Yes ☐ No (hashed)
- [ ] **Last Name:** ☐ Yes ☐ No (hashed)
- [ ] **City:** ☐ Yes ☐ No (hashed)
- [ ] **State:** ☐ Yes ☐ No (hashed)
- [ ] **ZIP:** ☐ Yes ☐ No (hashed)
- [ ] **Country:** ☐ Yes ☐ No (hashed)
- [ ] **External ID:** ☐ Yes ☐ No (hashed)
- [ ] **Client IP Address:** ☐ Yes ☐ No
- [ ] **Client User Agent:** ☐ Yes ☐ No
- [ ] **FBC (Click ID):** ☐ Yes ☐ No
- [ ] **FBP (Browser ID):** ☐ Yes ☐ No

**Match Quality Issues:**
- [ ] What parameters are missing? _______________
- [ ] Are parameters properly hashed? ☐ Yes ☐ No
- [ ] Is automatic enhanced matching enabled? ☐ Yes ☐ No

**Screenshot Required:** Match quality dashboard

---

## SECTION 3: CONVERSION API (CAPI) STATUS

### 3.1 CAPI Implementation Check
**Navigate to:** Events Manager > [Your Dataset] > Settings > Conversions API

**CAPI Status:**
- [ ] **CAPI Configured:** ☐ Yes ☐ No
- [ ] **Events sending via CAPI:** _____
- [ ] **Last CAPI event received:** _______________
- [ ] **CAPI access token generated:** ☐ Yes ☐ No

**Server-Side Implementation:**
- [ ] Using which method?
  - [ ] ☐ Stape (recommended)
  - [ ] ☐ Direct server integration
  - [ ] ☐ Partner integration (which: _______)
  - [ ] ☐ Not implemented ❌

**If CAPI NOT Implemented:**
This is your primary gap. Document why:
- [ ] ☐ Not aware of requirement
- [ ] ☐ Technical resources unavailable
- [ ] ☐ Not prioritized
- [ ] ☐ Cost concern
- [ ] ☐ Complexity concern
- [ ] Other: _______________

**Screenshot Required:** CAPI settings page (or "Not Configured" message)

---

### 3.2 CAPI Event Quality (If Implemented)
**Navigate to:** Events Manager > Test Events

**Event Deduplication:**
- [ ] Deduplication configured? ☐ Yes ☐ No
- [ ] event_id parameter present? ☐ Yes ☐ No
- [ ] Browser + Server events properly matched? ☐ Yes ☐ No
- [ ] Duplicate events found? ☐ Yes ☐ No

**CAPI Match Quality:**
- [ ] CAPI events match score: _____/10
- [ ] Better than browser events? ☐ Yes ☐ No
- [ ] Using external_id? ☐ Yes ☐ No
- [ ] User data parameters complete? ☐ Yes ☐ No

---

### 3.3 Server Infrastructure (If Using CAPI)

**Stape Configuration (if applicable):**
- [ ] Stape container ID: _______________
- [ ] Custom domain configured? ☐ Yes ☐ No
- [ ] Domain: _______________
- [ ] DNS verified? ☐ Yes ☐ No
- [ ] SSL certificate valid? ☐ Yes ☐ No
- [ ] Region: ☐ US ☐ EU ☐ Asia ☐ Other

**GHL Integration:**
- [ ] Webhooks configured? ☐ Yes ☐ No
- [ ] Which events mapped?
  - [ ] ☐ Form submission → Lead
  - [ ] ☐ Appointment booked → Schedule
  - [ ] ☐ Appointment completed → CompleteRegistration
  - [ ] ☐ Opportunity created → Custom event
  - [ ] ☐ Sale/Deal won → Purchase
- [ ] Event payload includes user data? ☐ Yes ☐ No

**Screenshot Required:** Server-side configuration dashboard

---

## SECTION 4: CAMPAIGN PERFORMANCE VALIDATION

### 4.1 Campaign-Level Event Verification

**Top Campaigns to Audit (from MCP data):**

**Campaign 1: Certs BK Funnel | Schedule**
- [ ] Campaign ID: 120232208043580742 ✓
- [ ] Objective: OUTCOME_LEADS ✓
- [ ] Optimization Goal: _____
- [ ] Tracking Schedule events? ☐ Yes ☐ No
- [ ] Last 30d Schedule events: _____ (Expected: 250)
- [ ] Events attributing to campaign? ☐ Yes ☐ No

**Campaign 2: Foundations Global | Purchase**
- [ ] Campaign ID: 120233269942720742 ✓
- [ ] Objective: OUTCOME_SALES ✓
- [ ] Optimization Goal: _____
- [ ] Tracking Purchase events? ☐ Yes ☐ No
- [ ] Last 30d Purchase events: _____ (Expected: 261)
- [ ] Revenue value passing? ☐ Yes ☐ No (Expected: £18,859 spend, £643/purchase avg)

**Campaign 3: Foundations Tier 1 | Leads**
- [ ] Campaign ID: 120231332127220742 ✓
- [ ] Objective: OUTCOME_LEADS ✓
- [ ] Optimization Goal: _____
- [ ] Tracking Lead events? ☐ Yes ☐ No
- [ ] Last 30d Lead events: _____ (Expected: 9,085)
- [ ] CPL matching expected? ☐ Yes ☐ No (Expected: £1.74)

**Campaign 4: Lovability Master**
- [ ] Campaign ID: 120229161322380742 ✓
- [ ] Objective: OUTCOME_SALES ✓
- [ ] Tracking Purchase events? ☐ Yes ☐ No
- [ ] Last 30d Purchase events: _____ (Expected: 122)
- [ ] Revenue tracking? ☐ Yes ☐ No (Expected: £24.62/purchase)

---

### 4.2 Attribution Window Validation
**Navigate to:** Ads Manager > Campaign Settings

**Check Attribution Settings:**
- [ ] Current attribution window: _____ days
- [ ] Click-through window: _____ days
- [ ] View-through window: _____ days
- [ ] Consistent across campaigns? ☐ Yes ☐ No

**iOS 14+ Attribution:**
- [ ] Using Aggregated Event Measurement? ☐ Yes ☐ No
- [ ] Priority events configured? ☐ Yes ☐ No
- [ ] 8 event limit respected? ☐ Yes ☐ No
- [ ] Domain verified? ☐ Yes ☐ No

---

## SECTION 5: TECHNICAL IMPLEMENTATION AUDIT

### 5.1 Website Pixel Implementation
**Test on:** challengesbymarisa.com (or relevant domain)

**Using Meta Pixel Helper Chrome Extension:**

**Home Page Check:**
- [ ] Base pixel firing? ☐ Yes ☐ No
- [ ] PageView event firing? ☐ Yes ☐ No
- [ ] Any errors shown? ☐ Yes ☐ No
- [ ] Pixel ID matches: ☐ Yes ☐ No

**Lead Form Pages:**
- [ ] Pixel present on form pages? ☐ Yes ☐ No
- [ ] Lead event configured on submit? ☐ Yes ☐ No
- [ ] Form submission triggers event? ☐ Yes ☐ No
- [ ] User data captured? ☐ Yes ☐ No

**Purchase/Checkout Pages:**
- [ ] Pixel on confirmation page? ☐ Yes ☐ No
- [ ] Purchase event firing? ☐ Yes ☐ No
- [ ] Revenue value included? ☐ Yes ☐ No
- [ ] Order details passed? ☐ Yes ☐ No

**Common Technical Issues:**
- [ ] Duplicate pixel codes? ☐ Yes ☐ No
- [ ] Events firing multiple times? ☐ Yes ☐ No
- [ ] SSL/HTTPS issues? ☐ Yes ☐ No
- [ ] Cookie consent blocking pixel? ☐ Yes ☐ No
- [ ] Ad blockers interfering? ☐ Test ☐ Not Tested

**Screenshot Required:** Pixel Helper output on key pages

---

### 5.2 iOS 14+ Compatibility Check
**Navigate to:** Events Manager > Aggregated Event Measurement

**Domain Verification:**
- [ ] Domain verified? ☐ Yes ☐ No
- [ ] Verification method: _______________
- [ ] Verification status: ☐ Active ☐ Pending ☐ Failed

**Event Configuration:**
- [ ] Priority events ranked (max 8):
  1. _______________
  2. _______________
  3. _______________
  4. _______________
  5. _______________
  6. _______________
  7. _______________
  8. _______________

**Expected Priority Based on MCP Data:**
1. Purchase (highest value)
2. Lead
3. Schedule
4. Submit Application
5. InitiateCheckout
6. AddToCart
7. ViewContent
8. PageView

- [ ] Priority order makes business sense? ☐ Yes ☐ No

**Screenshot Required:** Aggregated Event Measurement configuration

---

### 5.3 First-Party Cookie Configuration

**Cookie Lifespan:**
- [ ] Current fbp cookie duration: _____ days
- [ ] Is it set to maximum (90 days)? ☐ Yes ☐ No
- [ ] First-party domain used? ☐ Yes ☐ No
- [ ] Custom subdomain configured? ☐ Yes ☐ No (e.g., track.yourdomain.com)

**Cookie Consent:**
- [ ] Cookie consent banner present? ☐ Yes ☐ No
- [ ] Does banner block pixel? ☐ Yes ☐ No
- [ ] Consent management platform: _______________
- [ ] Meta pixel allowed by default? ☐ Yes ☐ No

---

## SECTION 6: CAMPAIGN OPTIMIZATION SETUP

### 6.1 Conversion Objectives Alignment

**Review Each Active Campaign:**

| Campaign Name | Objective | Optimization Event | Tracking Correctly? |
|---------------|-----------|-------------------|---------------------|
| ___________ | _________ | ________________ | ☐ Yes ☐ No |
| ___________ | _________ | ________________ | ☐ Yes ☐ No |
| ___________ | _________ | ________________ | ☐ Yes ☐ No |
| ___________ | _________ | ________________ | ☐ Yes ☐ No |
| ___________ | _________ | ________________ | ☐ Yes ☐ No |

**Expected Alignments Based on MCP Data:**
- Lead campaigns → Lead event (9+ campaigns) ✓
- Sales campaigns → Purchase event (3+ campaigns) ✓
- Schedule campaigns → Schedule custom event (2+ campaigns) ✓

**Misalignment Issues Found:**
- [ ] Campaign optimizing for wrong event? ☐ Yes ☐ No
- [ ] Event volume too low for optimization? ☐ Yes ☐ No
- [ ] Event not configured in pixel? ☐ Yes ☐ No

---

### 6.2 Value-Based Bidding Check

**Campaigns Using Value Optimization:**
- [ ] How many campaigns use value bidding? _____
- [ ] Which campaigns:
  - [ ] _______________
  - [ ] _______________
  - [ ] _______________

**Revenue Tracking Status:**
- [ ] Purchase events passing value? ☐ Consistent ☐ Inconsistent ☐ None
- [ ] Value in correct currency (GBP)? ☐ Yes ☐ No
- [ ] Value matches actual AOV? ☐ Yes ☐ No

**Based on MCP Data:**
- Some campaigns show value (Lovability: £643, BBC: £729)
- Many campaigns missing value despite purchases
- Inconsistent implementation = missed optimization opportunity

**Value Optimization Opportunity:**
- [ ] Could more campaigns use value bidding? ☐ Yes ☐ No
- [ ] Is AOV data available? ☐ Yes ☐ No
- [ ] Should implement value-based bidding? ☐ Yes ☐ No

---

## SECTION 7: AUDIENCE & RETARGETING INFRASTRUCTURE

### 7.1 Custom Audiences Setup
**Navigate to:** Audiences > Custom Audiences

**Event-Based Audiences:**
- [ ] How many custom audiences exist? _____
- [ ] Using pixel events for audiences? ☐ Yes ☐ No

**Key Audiences to Check:**
- [ ] **Website visitors (all):** ☐ Exists ☐ Missing
  - [ ] Retention window: _____ days
  - [ ] Size estimate: _____
  
- [ ] **Lead form submitters:** ☐ Exists ☐ Missing
  - [ ] Using Lead event? ☐ Yes ☐ No
  - [ ] Size estimate: _____ (Expected: 27K+ last 30d)
  
- [ ] **Purchasers:** ☐ Exists ☐ Missing
  - [ ] Using Purchase event? ☐ Yes ☐ No
  - [ ] Size estimate: _____ (Expected: 575+ last 30d)
  
- [ ] **Schedule/Appointment:** ☐ Exists ☐ Missing
  - [ ] Using custom Schedule event? ☐ Yes ☐ No
  - [ ] Size estimate: _____ (Expected: 471 last 30d)

**Exclusion Audiences:**
- [ ] Existing customers excluded? ☐ Yes ☐ No
- [ ] Recent purchasers excluded? ☐ Yes ☐ No
- [ ] Do exclusion audiences update automatically? ☐ Yes ☐ No

---

### 7.2 Lookalike Audiences
**Navigate to:** Audiences > Lookalike Audiences

**Current Lookalikes:**
- [ ] How many lookalike audiences exist? _____
- [ ] Source audiences used:
  - [ ] Purchasers: ☐ Yes ☐ No
  - [ ] High-value customers: ☐ Yes ☐ No
  - [ ] Engagement: ☐ Yes ☐ No

**Lookalike Quality:**
- [ ] Source audience size > 1,000? ☐ Yes ☐ No
- [ ] Lookalike %%%: _____ (1%, 2%, 5%, etc.)
- [ ] Geographic: ☐ UK ☐ EU ☐ Global ☐ Other

**Opportunity Assessment:**
With 575+ purchasers/month:
- [ ] Enough data for quality lookalikes? ☐ Yes ☐ No
- [ ] Should create value-based lookalikes? ☐ Yes ☐ No
- [ ] Need to segment by product/offer? ☐ Yes ☐ No

---

## SECTION 8: DATA QUALITY & ANOMALY CHECK

### 8.1 Event Volume Validation

**Compare Expected vs. Actual (Last 30 Days):**

| Event | Expected (MCP) | Actual (EM) | Δ | Status |
|-------|----------------|-------------|---|--------|
| Lead | 27,765 | _____ | ___% | ☐ ✓ ☐ ✗ |
| Purchase | 575+ | _____ | ___% | ☐ ✓ ☐ ✗ |
| Schedule | 471 | _____ | ___% | ☐ ✓ ☐ ✗ |
| Submit App | 18,307 | _____ | ___% | ☐ ✓ ☐ ✗ |
| ViewContent | 1,005 | _____ | ___% | ☐ ✓ ☐ ✗ |
| AddToCart | 623 | _____ | ___% | ☐ ✓ ☐ ✗ |

**Variance Analysis:**
- [ ] Any events off by >10%? ☐ Yes ☐ No
- [ ] If yes, which: _______________
- [ ] Investigate reasons: _______________

---

### 8.2 Revenue Discrepancy Check

**Expected Revenue (from MCP):**
- Foundations Global: 261 purchases × avg £72.26 = £18,859.86
- Lovability: 122 purchases × avg £24.62 = £3,003.64
- BBC Subscription: 44 purchases × avg £122.88 = £5,406.72

**Actual Revenue in Events Manager:**
- Foundations Global: £_____ (Expected: £18,859+)
- Lovability: £_____ (Expected: £3,003+)
- BBC Subscription: £_____ (Expected: £5,406+)

**Discrepancy Issues:**
- [ ] Revenue significantly lower? ☐ Yes ☐ No
- [ ] Some purchases missing value? ☐ Yes ☐ No
- [ ] Value currency wrong? ☐ Yes ☐ No

**Known Issue from MCP:**
Many campaigns show purchases but NO revenue value
This indicates incomplete pixel implementation on purchase confirmation pages

---

### 8.3 Attribution Model Accuracy

**iOS 14+ Impact Assessment:**
- [ ] Estimated iOS traffic: _____%
- [ ] iOS conversion drop noted? ☐ Yes ☐ No
- [ ] Gap between pixel and CAPI data? ☐ Yes ☐ No ☐ N/A (no CAPI)

**Modeled Conversions:**
- [ ] Meta using conversion modeling? ☐ Yes ☐ No
- [ ] Modeled conversion volume: _____
- [ ] Confidence in modeled data: ☐ High ☐ Medium ☐ Low

---

## SECTION 9: GHL CRM INTEGRATION STATUS

### 9.1 GHL Event Tracking

**GHL to Meta Connection:**
- [ ] **GHL integrated with Meta?** ☐ Yes ☐ No
- [ ] Integration method: 
  - [ ] ☐ Webhooks to CAPI
  - [ ] ☐ Zapier/Make
  - [ ] ☐ Direct API
  - [ ] ☐ None ❌

**CRM Events Being Tracked:**
- [ ] ☐ Form submission → Lead event
- [ ] ☐ Appointment booked → Schedule event
- [ ] ☐ Appointment completed → CompleteRegistration
- [ ] ☐ Opportunity created → Custom event
- [ ] ☐ Deal/Sale won → Purchase event
- [ ] ☐ None of the above ❌

**Critical Gap:**
Based on MCP data showing ~471 Schedule events but likely more in GHL:
- [ ] Are ALL GHL bookings sending to Meta? ☐ Yes ☐ No ☐ Unknown
- [ ] Appointment → Purchase attribution working? ☐ Yes ☐ No
- [ ] Offline conversions tracked? ☐ Yes ☐ No

---

### 9.2 CRM Data Enhancement Opportunity

**User Data Available in GHL:**
- [ ] Email addresses: ☐ Yes
- [ ] Phone numbers: ☐ Yes
- [ ] Full names: ☐ Yes
- [ ] Address data: ☐ Yes ☐ Partial
- [ ] External CRM ID: ☐ Yes

**Currently Passing to Meta:**
- [ ] Email (hashed): ☐ Yes ☐ No
- [ ] Phone (hashed): ☐ Yes ☐ No
- [ ] Name (hashed): ☐ Yes ☐ No
- [ ] External ID: ☐ Yes ☐ No

**Enhancement Opportunity:**
If GHL has data but NOT passing to Meta:
- This is your biggest match quality improvement opportunity
- Should increase match quality from ~3-4 to 7-8+
- Better matching = better attribution = better optimization

---

## SECTION 10: ISSUE SUMMARY & PRIORITIZATION

### 10.1 Critical Issues Found (Fix Immediately)

**Issue #1:** _______________
- **Impact:** ☐ High ☐ Medium ☐ Low
- **Effort to fix:** ☐ High ☐ Medium ☐ Low
- **Priority:** ☐ P0 ☐ P1 ☐ P2 ☐ P3
- **Action:** _______________

**Issue #2:** _______________
- **Impact:** ☐ High ☐ Medium ☐ Low
- **Effort to fix:** ☐ High ☐ Medium ☐ Low
- **Priority:** ☐ P0 ☐ P1 ☐ P2 ☐ P3
- **Action:** _______________

**Issue #3:** _______________
- **Impact:** ☐ High ☐ Medium ☐ Low
- **Effort to fix:** ☐ High ☐ Medium ☐ Low
- **Priority:** ☐ P0 ☐ P1 ☐ P2 ☐ P3
- **Action:** _______________

---

### 10.2 Expected Key Findings (Based on MCP Analysis)

**Likely Issue #1: No CAPI Implementation**
- **Evidence:** No server-side events detected in initial scan
- **Impact:** Missing 30-40% of conversions (iOS blocking)
- **Priority:** P1 - High impact, medium effort
- **Action:** Implement Stape + CAPI infrastructure

**Likely Issue #2: Inconsistent Revenue Tracking**
- **Evidence:** Some campaigns track value, many don't
- **Impact:** Cannot optimize on ROAS, missing value bidding opportunities
- **Priority:** P1 - High impact, low effort
- **Action:** Fix purchase confirmation pixel implementation

**Likely Issue #3: Limited Enhanced Matching**
- **Evidence:** Match quality likely 3-4/10
- **Impact:** Poor event matching, weak attribution
- **Priority:** P1 - High impact, medium effort  
- **Action:** Pass user data from GHL to CAPI

**Likely Issue #4: GHL Not Connected to Meta**
- **Evidence:** CRM events (bookings, sales) not visible in Meta
- **Impact:** Missing critical conversion events
- **Priority:** P0 - Critical, medium effort
- **Action:** Set up GHL webhooks to Stape/CAPI

---

### 10.3 Opportunities for Enhancement

**Opportunity #1:** _______________
- **Benefit:** _______________
- **Effort:** ☐ High ☐ Medium ☐ Low
- **ROI:** ☐ High ☐ Medium ☐ Low

**Opportunity #2:** _______________
- **Benefit:** _______________
- **Effort:** ☐ High ☐ Medium ☐ Low
- **ROI:** ☐ High ☐ Medium ☐ Low

**Opportunity #3:** _______________
- **Benefit:** _______________
- **Effort:** ☐ High ☐ Medium ☐ Low
- **ROI:** ☐ High ☐ Medium ☐ Low

---

## SECTION 11: RECOMMENDATIONS & NEXT STEPS

### 11.1 Immediate Actions (This Week)

**Priority 1:**
- [ ] Action: _______________
- [ ] Owner: _______________
- [ ] Timeline: _______________
- [ ] Resources needed: _______________

**Priority 2:**
- [ ] Action: _______________
- [ ] Owner: _______________
- [ ] Timeline: _______________
- [ ] Resources needed: _______________

**Priority 3:**
- [ ] Action: _______________
- [ ] Owner: _______________
- [ ] Timeline: _______________
- [ ] Resources needed: _______________

---

### 11.2 Short Term (Next 2-4 Weeks)

**Infrastructure Setup:**
- [ ] Set up Stape account and container
- [ ] Configure CAPI endpoint
- [ ] Generate access tokens
- [ ] Set up custom domain
- [ ] Test event flow

**Timeline:** _______________  
**Resources:** _______________  
**Budget:** _______________

---

### 11.3 Medium Term (Weeks 4-8)

**Optimization & Scaling:**
- [ ] GHL webhook integration complete
- [ ] Enhanced matching implemented
- [ ] Revenue tracking standardized
- [ ] Audience strategies enhanced
- [ ] Value-based bidding deployed

**Timeline:** _______________  
**Resources:** _______________  
**Expected Impact:** _______________

---

### 11.4 Success Metrics

**Tracking Improvements:**
- [ ] Match quality: _____ → _____ (Target: 7.0+)
- [ ] Conversion visibility: _____ → _____ (+30-40%)
- [ ] CAPI events: _____ → _____ (100% of key events)

**Business Impact:**
- [ ] CPL improvement: _____ → _____ (-15-20%)
- [ ] ROAS improvement: _____ → _____ (+25-35%)
- [ ] Attribution accuracy: _____ → _____ (85%+)

---

## AUDIT COMPLETION

**Audit Date:** _____________  
**Auditor:** _____________  
**Time Spent:** _____ hours  
**Overall Audit Score:** _____/100

**Key Findings:**
1. _______________
2. _______________
3. _______________

**Recommended Next Steps:**
1. _______________
2. _______________
3. _______________

**Sign Off:**
- [ ] Findings reviewed with stakeholders
- [ ] Action plan approved
- [ ] Resources allocated
- [ ] Timeline agreed
- [ ] Follow-up audit scheduled for: _____________

---

## APPENDIX A: EXPECTED BASELINE DATA

From Pipeboard Meta MCP Analysis (Oct 4 - Nov 2, 2025):

**Account Performance:**
```
Total Spend: £111,974
Total Impressions: 5,987,000+
Total Clicks: 217,000+
Average CTR: 3.63%
Average CPC: £0.52
```

**Conversion Volume:**
```
Lead Events: 27,765
Purchase Events: 575+
Schedule Events: 471
Submit Application: 18,307
ViewContent: 1,005
AddToCart: 623
InitiateCheckout: 205
```

**Top Performers:**
```
Foundations Tier 1: £1.74 CPL, 9,085 leads
Foundations Tier 2: £1.81 CPL, 4,450 leads
Lovability: £1.33 CPL, £24.62 per purchase
Foundations Global: £72.26 per purchase, 261 purchases
```

---

## APPENDIX B: TECHNICAL REFERENCES

**Meta Pixel Documentation:**
- Pixel Setup: https://developers.facebook.com/docs/meta-pixel
- Standard Events: https://developers.facebook.com/docs/meta-pixel/implementation/conversion-tracking
- Enhanced Matching: https://developers.facebook.com/docs/meta-pixel/advanced/advanced-matching

**Conversions API:**
- CAPI Overview: https://developers.facebook.com/docs/marketing-api/conversions-api
- Event Deduplication: https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events
- Parameter Reference: https://developers.facebook.com/docs/marketing-api/conversions-api/parameters

**Stape Resources:**
- Stape Setup: https://stape.io/docs
- GHL Integration: https://stape.io/integrations/gohighlevel
- Custom Domain: https://stape.io/docs/custom-domain

---

**Audit Complete** ✓  
**Next Review Date:** _____________

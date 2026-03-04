# Tidy GTM Workflow Diagrams

Visual representations of the audit and cleanup workflow.

---

## Main Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        TIDY GTM WORKFLOW                                │
└─────────────────────────────────────────────────────────────────────────┘

    START
      │
      ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   PHASE 1   │     │   PHASE 2   │     │   PHASE 3   │
│  DISCOVERY  │────▶│  ANALYSIS   │────▶│ CORRELATION │
│             │     │             │     │    CHECK    │
│ • List tags │     │ • Find dups │     │ • Tag→Trig  │
│ • List trig │     │ • Find orph │     │ • Tag→Var   │
│ • List vars │     │ • Check nam │     │ • Validate  │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
    ┌─────────────────────────────────────────┘
    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   PHASE 4   │     │   PHASE 5   │     │   PHASE 6   │
│   NAMING    │────▶│   CLEANUP   │────▶│   EXECUTE   │
│   AUDIT     │     │    PLAN     │     │             │
│             │     │             │     │ • Sync WS   │
│ • Tags      │     │ • Priority  │     │ • Apply     │
│ • Triggers  │     │ • Risk      │     │ • Batches   │
│ • Variables │     │ • Order     │     └─────────────┘
└─────────────┘     └─────────────┘           │
                                              │
    ┌─────────────────────────────────────────┘
    ▼
┌─────────────┐     ┌─────────────┐
│   PHASE 7   │     │   PHASE 8   │
│  VALIDATE   │────▶│  DOCUMENT   │────▶ END
│             │     │             │
│ • WS status │     │ • Report    │
│ • Preview   │     │ • Changes   │
│ • No errors │     │ • Publish   │
└─────────────┘     └─────────────┘
```

---

## Discovery Phase Detail

```
┌─────────────────────────────────────────────────┐
│              PHASE 1: DISCOVERY                  │
└─────────────────────────────────────────────────┘

gtm_container action=get
        │
        ▼
  ┌───────────┐
  │ Container │──▶ Name, Public ID, Type
  │   Info    │
  └───────────┘
        │
        ▼
  ┌───────────┐     ┌───────────┐     ┌───────────┐
  │   Tags    │     │ Triggers  │     │ Variables │
  │  (list)   │     │  (list)   │     │  (list)   │
  │           │     │           │     │           │
  │ Page 1-N  │     │ Page 1-N  │     │ Page 1-N  │
  └───────────┘     └───────────┘     └───────────┘
        │                 │                 │
        └────────┬────────┴────────┬────────┘
                 │                 │
                 ▼                 ▼
           ┌───────────┐     ┌───────────┐
           │ Templates │     │  Folders  │
           │  (list)   │     │  (list)   │
           └───────────┘     └───────────┘
                 │                 │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │    INVENTORY    │
                 │    COMPLETE     │
                 │                 │
                 │ Tags: XX        │
                 │ Triggers: XX    │
                 │ Variables: XX   │
                 │ Templates: XX   │
                 │ Folders: XX     │
                 └─────────────────┘
```

---

## Issue Detection Decision Tree

```
┌─────────────────────────────────────────────────┐
│         ISSUE DETECTION DECISION TREE           │
└─────────────────────────────────────────────────┘

FOR EACH TAG:
         │
         ▼
    ┌─────────┐
    │ Has     │───No──▶ ISSUE: Tag has no trigger
    │ trigger?│
    └────┬────┘
         │Yes
         ▼
    ┌─────────┐
    │ Trigger │───No──▶ ISSUE: Invalid trigger reference
    │ exists? │
    └────┬────┘
         │Yes
         ▼
    ┌─────────┐
    │ Name    │───No──▶ ISSUE: Naming violation
    │ valid?  │
    └────┬────┘
         │Yes
         ▼
    ┌─────────┐
    │ Vars    │───No──▶ ISSUE: Broken variable reference
    │ valid?  │
    └────┬────┘
         │Yes
         ▼
    ┌─────────┐
    │ Is      │───Yes─▶ ISSUE: Duplicate tag
    │ duplicate│
    └────┬────┘
         │No
         ▼
      TAG OK ✓


FOR EACH TRIGGER:
         │
         ▼
    ┌─────────┐
    │ Used by │───No──▶ ISSUE: Orphaned trigger
    │ any tag?│
    └────┬────┘
         │Yes
         ▼
    ┌─────────┐
    │ Name    │───No──▶ ISSUE: Naming violation
    │ valid?  │
    └────┬────┘
         │Yes
         ▼
    TRIGGER OK ✓


FOR EACH VARIABLE:
         │
         ▼
    ┌─────────┐
    │ Used    │───No──▶ ISSUE: Orphaned variable
    │anywhere?│
    └────┬────┘
         │Yes
         ▼
    ┌─────────┐
    │ Name    │───No──▶ ISSUE: Naming violation
    │ valid?  │
    └────┬────┘
         │Yes
         ▼
    VARIABLE OK ✓
```

---

## Cleanup Priority Matrix

```
┌─────────────────────────────────────────────────┐
│            CLEANUP PRIORITY MATRIX              │
└─────────────────────────────────────────────────┘

                    IMPACT
            LOW      MED      HIGH
         ┌────────┬────────┬────────┐
    LOW  │   P5   │   P4   │   P2   │
         │ Naming │ Orphan │  Dupe  │
RISK     ├────────┼────────┼────────┤
    MED  │   P4   │   P3   │   P1   │
         │ Folder │ Legacy │ Broken │
         ├────────┼────────┼────────┤
    HIGH │   P3   │   P2   │   P1   │
         │  Test  │ Security│Critical│
         └────────┴────────┴────────┘

PRIORITY ORDER:
  P1 (CRITICAL) ──▶ Fix immediately
  P2 (HIGH)     ──▶ Fix in same session
  P3 (MEDIUM)   ──▶ Fix before publish
  P4 (LOW)      ──▶ Fix when convenient
  P5 (OPTIONAL) ──▶ Nice to have
```

---

## Safe Execution Flow

```
┌─────────────────────────────────────────────────┐
│           SAFE EXECUTION PROTOCOL               │
└─────────────────────────────────────────────────┘

                    START
                      │
                      ▼
             ┌────────────────┐
             │ Check Workspace│
             │    Status      │
             └───────┬────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
    ┌─────────┐            ┌─────────┐
    │  Clean  │            │Conflicts│
    │         │            │         │
    └────┬────┘            └────┬────┘
         │                      │
         │                      ▼
         │               ┌─────────┐
         │               │  SYNC   │
         │               │Workspace│
         │               └────┬────┘
         │                    │
         └────────┬───────────┘
                  │
                  ▼
         ┌────────────────┐
         │  Make Changes  │
         │  (Batch 5-10)  │
         └───────┬────────┘
                 │
                 ▼
         ┌────────────────┐
         │ Verify Status  │──▶ If conflicts, resolve
         └───────┬────────┘
                 │
                 ▼
         ┌────────────────┐
         │ More Batches?  │──Yes──▶ (Loop back)
         └───────┬────────┘
                 │No
                 ▼
         ┌────────────────┐
         │ Quick Preview  │
         │    (Test)      │
         └───────┬────────┘
                 │
                 ▼
         ┌────────────────┐
         │ Create Version │
         └───────┬────────┘
                 │
                 ▼
         ┌────────────────┐
         │    Publish     │
         │  (if approved) │
         └───────┬────────┘
                 │
                 ▼
         ┌────────────────┐
         │ Verify Live    │
         │    Version     │
         └────────────────┘
                 │
                 ▼
                END
```

---

## Rollback Flow

```
┌─────────────────────────────────────────────────┐
│              ROLLBACK PROTOCOL                  │
└─────────────────────────────────────────────────┘

    Issue Detected
          │
          ▼
    ┌─────────────┐
    │ Get Version │
    │   Headers   │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │ Find Last   │
    │ Good Version│
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │ Set Latest  │
    │ (optional)  │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  Publish    │
    │ Old Version │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  Verify     │
    │  Rollback   │
    └─────────────┘
```

---

## Naming Convention Decision Tree

```
┌─────────────────────────────────────────────────┐
│        NAMING CONVENTION DECISION TREE          │
└─────────────────────────────────────────────────┘

TAG NAME:
         │
         ▼
    What platform?
         │
    ┌────┴────┬────────┬────────┬────────┐
    │         │        │        │        │
    GA4     Meta    LinkedIn  GADS    Other
    │         │        │        │        │
    ▼         ▼        ▼        ▼        ▼
  "GA4 -"  "Meta -" "LinkedIn"  "GADS"  [Custom]
    │         │        │        │
    └────┬────┴────────┴────────┘
         │
         ▼
    What type?
         │
    ┌────┴────┬────────┐
    │         │        │
  Config   Event   Conversion
    │         │        │
    ▼         ▼        ▼
  "Config"  [Name]  "Conv - [Name]"
    │         │        │
    └────┬────┴────────┘
         │
         ▼
    FINAL: "[Platform] - [Type] - [Event]"

    Examples:
    • GA4 - Config
    • GA4 - Event - Purchase
    • Meta - Base Pixel
    • Meta - Lead
    • LinkedIn - Insight Tag - Base
    • GADS - Conv - Lead
```

---

## Correlation Validation Flow

```
┌─────────────────────────────────────────────────┐
│         CORRELATION VALIDATION FLOW             │
└─────────────────────────────────────────────────┘

                    START
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
    ┌───────────┐           ┌───────────┐
    │   TAGS    │           │ TRIGGERS  │
    │   LIST    │           │   LIST    │
    └─────┬─────┘           └─────┬─────┘
          │                       │
          ▼                       │
    ┌───────────┐                 │
    │  Extract  │                 │
    │ Trigger   │◀────────────────┘
    │   IDs     │
    └─────┬─────┘
          │
          ▼
    ┌───────────┐
    │  Compare  │
    │  Trigger  │───▶ Missing? ──▶ ISSUE
    │   Lists   │
    └─────┬─────┘
          │All Valid
          ▼
    ┌───────────┐           ┌───────────┐
    │  Extract  │           │ VARIABLES │
    │ Variable  │◀──────────│   LIST    │
    │   Refs    │           └───────────┘
    └─────┬─────┘
          │
          ▼
    ┌───────────┐
    │  Compare  │
    │ Variable  │───▶ Missing? ──▶ ISSUE
    │   Lists   │
    └─────┬─────┘
          │All Valid
          ▼
    ┌───────────┐
    │   ALL     │
    │CORRELATIONS
    │   VALID   │
    └───────────┘
```

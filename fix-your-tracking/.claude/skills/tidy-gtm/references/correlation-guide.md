# GTM Correlation Guide

Understanding and validating relationships between Tags, Triggers, and Variables.

---

## Correlation Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    GTM CORRELATION MODEL                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    ┌─────────┐         ┌───────────┐         ┌──────────┐ │
│    │ TRIGGER │ ──────▶ │   TAG     │ ◀────── │ VARIABLE │ │
│    │         │  fires  │           │  uses   │          │ │
│    └─────────┘         └───────────┘         └──────────┘ │
│         │                    │                     │       │
│         │                    │                     │       │
│         ▼                    ▼                     ▼       │
│    ┌─────────┐         ┌───────────┐         ┌──────────┐ │
│    │  EVENT  │         │  PIXELS   │         │ DATALAYER│ │
│    │(browser)│         │(3rd party)│         │ (values) │ │
│    └─────────┘         └───────────┘         └──────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Relationship Types

### 1. Trigger → Tag (Firing Relationship)

| Property | Description |
|----------|-------------|
| `firingTriggerId` | Array of trigger IDs that fire the tag |
| `blockingTriggerId` | Array of trigger IDs that block the tag |

**Logic**:
- Tag fires when ANY firing trigger is true
- Tag blocked when ANY blocking trigger is true
- Blocking takes precedence over firing

**Example**:
```json
{
  "tagId": "346",
  "name": "LinkedIn - Insight Tag - Base",
  "firingTriggerId": ["2147479553"],  // All Pages
  "blockingTriggerId": []              // None
}
```

---

### 2. Tag → Variable (Reference Relationship)

Variables are referenced in tag parameters using `{{Variable Name}}` syntax.

**Example**:
```json
{
  "tagId": "347",
  "name": "LinkedIn - Insight Tag - Lead",
  "parameter": [
    {
      "key": "partnerId",
      "value": "{{CONST - LinkedIn Partner ID}}"  // Variable reference
    },
    {
      "key": "conversionId",
      "value": "25208314"  // Hardcoded value (no variable)
    }
  ]
}
```

---

### 3. Variable → Variable (Nested Reference)

Some variables can reference other variables.

**Example**:
```json
{
  "variableId": "100",
  "name": "JS - Combined User Data",
  "parameter": [
    {
      "key": "javascript",
      "value": "function() { return {{DL - email}} + '|' + {{DL - phone}}; }"
    }
  ]
}
```

---

### 4. Trigger → Variable (Condition Reference)

Triggers can use variables in their conditions.

**Example**:
```json
{
  "triggerId": "305",
  "name": "CE - signed_up",
  "customEventFilter": [
    {
      "type": "equals",
      "parameter": [
        {"key": "arg0", "value": "{{_event}}"},  // Built-in variable
        {"key": "arg1", "value": "signed_up"}
      ]
    }
  ]
}
```

---

## Validation Procedures

### A. Validate Tag → Trigger Correlation

```
FOR EACH tag:
  1. Get firingTriggerId array
  2. FOR EACH triggerId:
     - Check trigger exists
     - Verify trigger ID is valid
  3. Get blockingTriggerId array (if any)
  4. FOR EACH blockingTriggerId:
     - Check trigger exists
     - Verify trigger ID is valid

OUTPUT: List of tags with invalid trigger references
```

**GTM MCP Commands**:
```
# List all tags
gtm_tag action=list

# List all triggers
gtm_trigger action=list

# Cross-reference manually or programmatically
```

---

### B. Validate Tag → Variable Correlation

```
FOR EACH tag:
  1. Get all parameters
  2. FOR EACH parameter value:
     - Extract {{variable_name}} patterns
     - Check if variable exists
     - Verify variable name matches exactly

OUTPUT: List of tags with invalid variable references
```

**Pattern to Match**:
```regex
\{\{([^}]+)\}\}
```

---

### C. Validate Trigger → Variable Correlation

```
FOR EACH trigger:
  1. Get filter conditions
  2. FOR EACH condition parameter:
     - Extract {{variable_name}} patterns
     - Check if variable or built-in variable exists

OUTPUT: List of triggers with invalid variable references
```

---

### D. Find Orphaned Triggers

```
1. Get all trigger IDs
2. Get all tags' firingTriggerId and blockingTriggerId
3. Find triggers NOT referenced by ANY tag

OUTPUT: List of orphaned triggers
```

---

### E. Find Orphaned Variables

```
1. Get all variable names
2. Scan all tag parameters for {{variable_name}}
3. Scan all trigger conditions for {{variable_name}}
4. Scan all variables for nested {{variable_name}}
5. Find variables NOT referenced anywhere

OUTPUT: List of orphaned variables

EXCEPTIONS: Some variables may be used by:
- Custom HTML scripts
- Consent mode
- External systems
```

---

## Correlation Matrix Template

### Tags Matrix

| Tag ID | Tag Name | Firing Triggers | Blocking Triggers | Variables Used |
|--------|----------|-----------------|-------------------|----------------|
| 346 | LinkedIn - Insight Tag - Base | 2147479553 (All Pages) | None | {{CONST - LinkedIn Partner ID}} |
| 347 | LinkedIn - Insight Tag - Lead | 305 (signed_up) | None | {{CONST - LinkedIn Partner ID}}, {{DL - event_id}} |

### Triggers Matrix

| Trigger ID | Trigger Name | Tags Using | Variables Used |
|------------|--------------|------------|----------------|
| 2147479553 | All Pages | 346, 350, 351 | None |
| 305 | signed_up | 347, 348 | {{_event}} |

### Variables Matrix

| Variable ID | Variable Name | Used By Tags | Used By Triggers | Nested Variables |
|-------------|---------------|--------------|------------------|------------------|
| 343 | CONST - LinkedIn Partner ID | 346, 347 | None | None |
| 100 | DL - email | 347, 348, 349 | None | None |

---

## Common Correlation Issues

### Issue 1: Missing Variable

```
Tag: "GA4 - Event - Purchase"
Parameter: "{{DL - transaction_id}}"
Status: VARIABLE NOT FOUND

Fix Options:
1. Create variable "DL - transaction_id"
2. Use different existing variable
3. Hardcode value (not recommended)
```

### Issue 2: Typo in Variable Name

```
Tag uses: "{{DL_email}}"
Variable exists: "{{DL - email}}"

Fix: Update tag parameter to match variable name
```

### Issue 3: Orphaned Trigger

```
Trigger: "test click trigger"
Referenced by: NO TAGS

Fix Options:
1. Delete trigger
2. Assign to appropriate tag
3. Document why keeping (future use)
```

### Issue 4: Tag Without Trigger

```
Tag: "HTML - Test Script"
firingTriggerId: []

Fix: Add appropriate trigger or delete tag
```

---

## Built-in Variables Reference

These don't need to be created - just enabled:

| Category | Variables |
|----------|-----------|
| **Pages** | `{{Page URL}}`, `{{Page Hostname}}`, `{{Page Path}}`, `{{Referrer}}` |
| **Clicks** | `{{Click Element}}`, `{{Click Classes}}`, `{{Click ID}}`, `{{Click Text}}`, `{{Click URL}}` |
| **Forms** | `{{Form Element}}`, `{{Form Classes}}`, `{{Form ID}}`, `{{Form Text}}` |
| **Utilities** | `{{Event}}`, `{{Container ID}}`, `{{Container Version}}`, `{{Random Number}}` |
| **Errors** | `{{Error Message}}`, `{{Error URL}}`, `{{Error Line}}` |
| **Scrolling** | `{{Scroll Depth Threshold}}`, `{{Scroll Depth Units}}`, `{{Scroll Direction}}` |
| **Videos** | `{{Video Provider}}`, `{{Video Title}}`, `{{Video URL}}`, `{{Video Percent}}` |

---

## Correlation Validation Checklist

```markdown
## Tag-Trigger-Variable Correlation Check

### Tags → Triggers
- [ ] Every tag has at least one firing trigger
- [ ] All firingTriggerId values are valid
- [ ] All blockingTriggerId values are valid
- [ ] No tags reference deleted triggers

### Tags → Variables
- [ ] All {{variable}} references resolve
- [ ] Variable names match exactly (case-sensitive)
- [ ] Variable types are appropriate for usage

### Orphaned Components
- [ ] No orphaned triggers (unless documented)
- [ ] No orphaned variables (unless documented)
- [ ] No unused folders

### Validation Status
- [ ] All correlations valid
- [ ] No broken references
- [ ] No circular dependencies
```

---

## Debugging Correlation Issues

### Step 1: Identify the Break

```
1. Check tag/trigger/variable exists
2. Check exact name spelling
3. Check ID matches
4. Check for deleted components
```

### Step 2: Trace the Reference

```
For broken tag-trigger:
1. Get tag details → firingTriggerId
2. Get trigger by ID
3. If not found → trigger was deleted

For broken tag-variable:
1. Get tag parameters
2. Extract {{variable_name}}
3. Search variables for exact match
4. If not found → variable doesn't exist or name differs
```

### Step 3: Fix the Correlation

```
Option A: Create missing component
Option B: Update reference to existing component
Option C: Remove the broken reference
```

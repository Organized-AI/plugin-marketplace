# GTM MCP Tool Patterns

Complete reference for all GTM MCP tool call patterns with examples.

---

## Table of Contents

1. [Template Operations](#template-operations)
2. [Variable Operations](#variable-operations)
3. [Tag Operations](#tag-operations)
4. [Trigger Operations](#trigger-operations)
5. [Workspace Operations](#workspace-operations)
6. [Version Operations](#version-operations)
7. [Container Operations](#container-operations)
8. [Folder Operations](#folder-operations)
9. [sGTM Client Operations](#sgtm-client-operations)

---

## Template Operations

### List Templates
```
gtm_template action=list
  accountId=4702245012
  containerId=42412215
  workspaceId=86
```

### Get Template
```
gtm_template action=get
  accountId=4702245012
  containerId=42412215
  workspaceId=86
  templateId=cvt_42412215_123
```

### Create Template (Gallery Reference)
```
gtm_template action=create
  accountId=4702245012
  containerId=42412215
  workspaceId=86
  createOrUpdateConfig={
    "name": "LinkedIn InsightTag 2.0",
    "galleryReference": {
      "host": "github.com",
      "owner": "linkedin",
      "repository": "linkedin-gtm-community-template",
      "version": "c07099c0e0cf0ade2057ee4016d3da9f32959169"
    }
  }
```

### Create Template (Raw Template Data)
```
gtm_template action=create
  accountId=4702245012
  containerId=42412215
  workspaceId=86
  createOrUpdateConfig={
    "name": "Custom Template",
    "templateData": "___TEMPLATE_DATA_FROM_TPL_FILE___"
  }
```

### Remove Template
```
gtm_template action=remove
  accountId=4702245012
  containerId=42412215
  workspaceId=86
  templateId=cvt_42412215_123
```

---

## Variable Operations

### List Variables
```
gtm_variable action=list
  accountId=4702245012
  containerId=42412215
  workspaceId=86
```

### Get Variable
```
gtm_variable action=get
  accountId=4702245012
  containerId=42412215
  workspaceId=86
  variableId=123
```

### Create Constant Variable
```
gtm_variable action=create
  accountId=4702245012
  containerId=42412215
  workspaceId=86
  config={
    "name": "LinkedIn Partner ID",
    "type": "c",
    "parameter": [
      {"key": "value", "type": "template", "value": "1234567"}
    ]
  }
```

### Create Custom JavaScript Variable
```
gtm_variable action=create
  accountId=4702245012
  containerId=42412215
  workspaceId=86
  config={
    "name": "CJS - Event ID Generator",
    "type": "jsm",
    "parameter": [
      {
        "key": "javascript",
        "type": "template",
        "value": "function() {\n  return 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);\n}"
      }
    ]
  }
```

### Create Cookie Variable
```
gtm_variable action=create
  accountId=4702245012
  containerId=42412215
  workspaceId=86
  config={
    "name": "Cookie - li_fat_id",
    "type": "k",
    "parameter": [
      {"key": "cookieName", "type": "template", "value": "li_fat_id"}
    ]
  }
```

### Create Data Layer Variable
```
gtm_variable action=create
  accountId=4702245012
  containerId=42412215
  workspaceId=86
  config={
    "name": "DL - Transaction ID",
    "type": "v",
    "parameter": [
      {"key": "name", "type": "template", "value": "ecommerce.transaction_id"},
      {"key": "dataLayerVersion", "type": "integer", "value": "2"}
    ]
  }
```

### Create Lookup Table Variable
```
gtm_variable action=create
  accountId=4702245012
  containerId=42412215
  workspaceId=86
  config={
    "name": "LUT - Event Mapping",
    "type": "smm",
    "parameter": [
      {"key": "input", "type": "template", "value": "{{Event}}"},
      {"key": "map", "type": "list", "list": [
        {"type": "map", "map": [
          {"key": "key", "type": "template", "value": "purchase"},
          {"key": "value", "type": "template", "value": "Purchase"}
        ]},
        {"type": "map", "map": [
          {"key": "key", "type": "template", "value": "add_to_cart"},
          {"key": "value", "type": "template", "value": "AddToCart"}
        ]}
      ]}
    ]
  }
```

### Update Variable
```
gtm_variable action=update
  accountId=4702245012
  containerId=42412215
  workspaceId=86
  variableId=123
  config={
    "name": "LinkedIn Partner ID - Updated",
    "type": "c",
    "parameter": [
      {"key": "value", "type": "template", "value": "7654321"}
    ]
  }
```

### Remove Variable
```
gtm_variable action=remove
  accountId=4702245012
  containerId=42412215
  workspaceId=86
  variableId=123
```

---

## Tag Operations

### List Tags
```
gtm_tag action=list
  accountId=4702245012
  containerId=42412215
  workspaceId=86
```

### Get Tag
```
gtm_tag action=get
  accountId=4702245012
  containerId=42412215
  workspaceId=86
  tagId=456
```

### Create Tag (Custom Template)
```
gtm_tag action=create
  accountId=4702245012
  containerId=42412215
  workspaceId=86
  config={
    "name": "LinkedIn - Base Pageview",
    "type": "cvt_42412215_123",
    "parameter": [
      {"key": "partnerId", "type": "template", "value": "{{LinkedIn Partner ID}}"},
      {"key": "trackPageview", "type": "boolean", "value": "true"}
    ],
    "firingTriggerId": ["2147479553"],
    "tagFiringOption": "oncePerLoad"
  }
```

### Create Tag (GA4 Event)
```
gtm_tag action=create
  accountId=4702245012
  containerId=42412215
  workspaceId=86
  config={
    "name": "GA4 - Purchase",
    "type": "gaawe",
    "parameter": [
      {"key": "eventName", "type": "template", "value": "purchase"},
      {"key": "measurementIdOverride", "type": "template", "value": "{{GA4 Measurement ID}}"},
      {"key": "eventParameters", "type": "list", "list": [
        {"type": "map", "map": [
          {"key": "name", "type": "template", "value": "transaction_id"},
          {"key": "value", "type": "template", "value": "{{DL - Transaction ID}}"}
        ]},
        {"type": "map", "map": [
          {"key": "name", "type": "template", "value": "value"},
          {"key": "value", "type": "template", "value": "{{DL - Value}}"}
        ]}
      ]}
    ],
    "firingTriggerId": ["10"]
  }
```

### Create Tag with Blocking Trigger
```
gtm_tag action=create
  accountId=4702245012
  containerId=42412215
  workspaceId=86
  config={
    "name": "Meta - PageView",
    "type": "cvt_42412215_456",
    "parameter": [...],
    "firingTriggerId": ["2147479553"],
    "blockingTriggerId": ["789"],
    "tagFiringOption": "oncePerLoad"
  }
```

### Update Tag
```
gtm_tag action=update
  accountId=4702245012
  containerId=42412215
  workspaceId=86
  tagId=456
  config={
    "name": "LinkedIn - Base Pageview (v2)",
    ...
  }
```

### Remove Tag
```
gtm_tag action=remove
  accountId=4702245012
  containerId=42412215
  workspaceId=86
  tagId=456
```

---

## Trigger Operations

### List Triggers
```
gtm_trigger action=list
  accountId=4702245012
  containerId=42412215
  workspaceId=86
```

### Get Trigger
```
gtm_trigger action=get
  accountId=4702245012
  containerId=42412215
  workspaceId=86
  triggerId=789
```

### Create Pageview Trigger
```
gtm_trigger action=create
  accountId=4702245012
  containerId=42412215
  workspaceId=86
  config={
    "name": "PV - Thank You Page",
    "type": "pageview",
    "filter": [
      {
        "type": "contains",
        "parameter": [
          {"key": "arg0", "type": "template", "value": "{{Page Path}}"},
          {"key": "arg1", "type": "template", "value": "/thank-you"}
        ]
      }
    ]
  }
```

### Create Custom Event Trigger
```
gtm_trigger action=create
  accountId=4702245012
  containerId=42412215
  workspaceId=86
  config={
    "name": "CE - Purchase",
    "type": "customEvent",
    "customEventFilter": [
      {
        "type": "equals",
        "parameter": [
          {"key": "arg0", "type": "template", "value": "{{_event}}"},
          {"key": "arg1", "type": "template", "value": "purchase"}
        ]
      }
    ]
  }
```

### Create Click Trigger
```
gtm_trigger action=create
  accountId=4702245012
  containerId=42412215
  workspaceId=86
  config={
    "name": "Click - CTA Button",
    "type": "linkClick",
    "filter": [
      {
        "type": "contains",
        "parameter": [
          {"key": "arg0", "type": "template", "value": "{{Click Classes}}"},
          {"key": "arg1", "type": "template", "value": "cta-button"}
        ]
      }
    ],
    "waitForTags": {"type": "boolean", "value": "true"},
    "checkValidation": {"type": "boolean", "value": "true"},
    "waitForTagsTimeout": {"type": "template", "value": "2000"}
  }
```

### Remove Trigger
```
gtm_trigger action=remove
  accountId=4702245012
  containerId=42412215
  workspaceId=86
  triggerId=789
```

---

## Workspace Operations

### Get Workspace Status
```
gtm_workspace action=getStatus
  accountId=4702245012
  containerId=42412215
  workspaceId=86
```

**Response includes:**
- `workspaceChange` - List of changes
- `mergeConflict` - List of conflicts

### Sync Workspace
```
gtm_workspace action=sync
  accountId=4702245012
  containerId=42412215
  workspaceId=86
```

### Create Version
```
gtm_workspace action=createVersion
  accountId=4702245012
  containerId=42412215
  workspaceId=86
  name="LinkedIn Tracking v1.0"
  notes="Added LinkedIn Insight Tag base + Lead conversion tag"
```

### Quick Preview
```
gtm_workspace action=quickPreview
  accountId=4702245012
  containerId=42412215
  workspaceId=86
```

**Response includes:**
- `quickPreviewUrl` - Preview URL
- `compilerError` - Any compilation errors

---

## Version Operations

### Get Version
```
gtm_version action=get
  accountId=4702245012
  containerId=42412215
  containerVersionId=123
```

### Get Live Version
```
gtm_version action=live
  accountId=4702245012
  containerId=42412215
```

### Publish Version
```
gtm_version action=publish
  accountId=4702245012
  containerId=42412215
  containerVersionId=123
```

### List Version Headers
```
gtm_version_header action=list
  accountId=4702245012
  containerId=42412215
```

---

## Container Operations

### Get Container
```
gtm_container action=get
  accountId=4702245012
  containerId=42412215
```

### List Containers
```
gtm_container action=list
  accountId=4702245012
```

---

## Folder Operations

### List Folders
```
gtm_folder action=list
  accountId=4702245012
  containerId=42412215
  workspaceId=86
```

### Create Folder
```
gtm_folder action=create
  accountId=4702245012
  containerId=42412215
  workspaceId=86
  config={
    "name": "LinkedIn"
  }
```

### Move Items to Folder
```
gtm_folder action=move_entities_to_folder
  accountId=4702245012
  containerId=42412215
  workspaceId=86
  folderId=123
  tagId=["456", "789"]
  variableId=["111", "222"]
```

---

## sGTM Client Operations

### List Clients
```
gtm_client action=list
  accountId=4702245012
  containerId=175099610
  workspaceId=86
```

### Get Client
```
gtm_client action=get
  accountId=4702245012
  containerId=175099610
  workspaceId=86
  clientId=123
```

### Create Client (GA4)
```
gtm_client action=create
  accountId=4702245012
  containerId=175099610
  workspaceId=86
  config={
    "name": "GA4 Client",
    "type": "gaaw_client"
  }
```

---

## Common Patterns

### Full Deployment Cycle
```
1. gtm_template action=create     → Get templateId
2. gtm_variable action=create     → Get variableIds (repeat)
3. gtm_tag action=create          → Get tagIds (repeat)
4. gtm_workspace action=getStatus → Check for conflicts
5. gtm_workspace action=sync      → Resolve if needed
6. gtm_workspace action=quickPreview → Test
7. gtm_workspace action=createVersion → Create snapshot
8. gtm_version action=publish     → Deploy to live
```

### Rollback Pattern
```
1. gtm_version_header action=list → Get previous versionId
2. gtm_version action=publish containerVersionId=[PREVIOUS_ID]
```

### Audit Pattern
```
1. gtm_tag action=list           → Inventory tags
2. gtm_variable action=list      → Inventory variables
3. gtm_trigger action=list       → Inventory triggers
4. gtm_template action=list      → Inventory templates
5. Analyze correlations
6. Report issues
```

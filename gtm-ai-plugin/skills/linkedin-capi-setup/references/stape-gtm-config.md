# Stape Container Configuration for LinkedIn CAPI

## Container Setup Checklist

### 1. Container Creation

Using Stape MCP:
```python
stape_container_crud(
    action="create",
    name="Client Name - sGTM",
    code="client-sgtm",
    zone={"type": "us"}  # or "eu" for GDPR
)
```

### 2. Custom Domain Setup

**Required for first-party cookies and li_fat_id persistence.**

1. Add domain via Stape MCP
2. Add DNS CNAME record
3. Validate domain

### 3. Power-Ups Configuration

**Cookie Keeper (Recommended):**
```python
stape_container_power_ups(
    identifier="container_id",
    powerUpType="cookie_keeper",
    isActive=True,
    cookieKeeperConfig={
        "options": {"standard": {"linkedin": True}}
    }
)
```

## GTM Server Container Configuration

### LinkedIn CAPI Tag Template

1. Templates → Tag Templates → Search Gallery
2. Search: "LinkedIn Conversions API" by Stape
3. Add to Workspace

### Tag Configuration

**PageView Tag:**
```
Name: LinkedIn CAPI - PageView
Event Type: PageView
Access Token: {{LinkedIn - Access Token}}
Trigger: All page_view events
```

**Conversion Tag:**
```
Name: LinkedIn CAPI - {Event Name}
Event Type: Conversion
Access Token: {{LinkedIn - Access Token}}
Conversion Rule ID: {{LinkedIn - Conversion Rule ID}}
Event ID: {{Event ID}}
Trigger: Specific conversion event
```

## Testing Checklist

1. **Preview Mode Active** - Both containers
2. **Test li_fat_id** - Add ?li_fat_id=test123 to URL
3. **Check Response** - ResponseStatusCode should be 201
4. **Confirm in LinkedIn** - Status shows "Active"

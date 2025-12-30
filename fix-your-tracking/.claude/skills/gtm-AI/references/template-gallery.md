# GTM Template Gallery Reference

Popular Community Gallery templates with their `galleryReference` configurations for programmatic installation.

---

## How to Install Templates Programmatically

### Method 1: Gallery Reference (Preferred)

```
gtm_template action=create
  accountId=[ACCOUNT_ID]
  containerId=[CONTAINER_ID]
  workspaceId=[WORKSPACE_ID]
  createOrUpdateConfig={
    "name": "Template Name",
    "galleryReference": {
      "host": "github.com",
      "owner": "[OWNER]",
      "repository": "[REPO]",
      "version": "[COMMIT_SHA]"
    }
  }
```

### Method 2: Template Data (Fallback)

Download the `.tpl` file and pass content:

```
gtm_template action=create
  createOrUpdateConfig={
    "name": "Template Name",
    "templateData": "[RAW_TPL_CONTENT]"
  }
```

---

## LinkedIn Templates

### LinkedIn InsightTag 2.0
```json
{
  "name": "LinkedIn InsightTag 2.0",
  "galleryReference": {
    "host": "github.com",
    "owner": "linkedin",
    "repository": "linkedin-gtm-community-template",
    "version": "c07099c0e0cf0ade2057ee4016d3da9f32959169"
  }
}
```

**Parameters:**
| Key | Type | Description |
|-----|------|-------------|
| `partnerId` | template | LinkedIn Partner ID |
| `trackPageview` | boolean | Fire pageview |
| `conversionId` | template | Conversion ID (optional) |
| `conversionValue` | template | Value (optional) |
| `currency` | template | Currency code (optional) |

---

## Meta (Facebook) Templates

### Facebook Pixel
```json
{
  "name": "Facebook Pixel",
  "galleryReference": {
    "host": "github.com",
    "owner": "nicobentin",
    "repository": "facebook-pixel-gtm-template",
    "version": "main"
  }
}
```

### Meta Conversions API (CAPI) - Stape
```json
{
  "name": "Facebook CAPI",
  "galleryReference": {
    "host": "github.com",
    "owner": "stape-io",
    "repository": "facebook-conversion-api-tag",
    "version": "main"
  }
}
```

**Parameters:**
| Key | Description |
|-----|-------------|
| `pixelId` | Meta Pixel ID |
| `accessToken` | CAPI Access Token |
| `eventName` | Event name |
| `eventId` | Deduplication ID |
| `userData` | Enhanced matching data |

---

## Google Analytics 4 Templates

### GA4 Configuration (Built-in)
Type: `gaaw` (no gallery reference needed)

### GA4 Event (Built-in)
Type: `gaawe` (no gallery reference needed)

### Server-Side GA4 Client (Built-in)
Type: `gaaw_client` (sGTM)

---

## TikTok Templates

### TikTok Pixel
```json
{
  "name": "TikTok Pixel",
  "galleryReference": {
    "host": "github.com",
    "owner": "nicobentin",
    "repository": "tiktok-pixel-template",
    "version": "main"
  }
}
```

### TikTok Events API - Stape
```json
{
  "name": "TikTok Events API",
  "galleryReference": {
    "host": "github.com",
    "owner": "stape-io",
    "repository": "tiktok-events-api-tag",
    "version": "main"
  }
}
```

---

## Pinterest Templates

### Pinterest Tag
```json
{
  "name": "Pinterest Tag",
  "galleryReference": {
    "host": "github.com",
    "owner": "nicobentin",
    "repository": "pinterest-tag-template",
    "version": "main"
  }
}
```

### Pinterest Conversions API - Stape
```json
{
  "name": "Pinterest CAPI",
  "galleryReference": {
    "host": "github.com",
    "owner": "stape-io",
    "repository": "pinterest-conversion-api-tag",
    "version": "main"
  }
}
```

---

## Twitter/X Templates

### Twitter Pixel
```json
{
  "name": "Twitter Pixel",
  "galleryReference": {
    "host": "github.com",
    "owner": "nicobentin",
    "repository": "twitter-pixel-template",
    "version": "main"
  }
}
```

---

## Snapchat Templates

### Snapchat Pixel
```json
{
  "name": "Snapchat Pixel",
  "galleryReference": {
    "host": "github.com",
    "owner": "nicobentin",
    "repository": "snapchat-pixel-template",
    "version": "main"
  }
}
```

---

## Microsoft/Bing Templates

### Microsoft UET Tag
```json
{
  "name": "Microsoft UET",
  "galleryReference": {
    "host": "github.com",
    "owner": "nicobentin",
    "repository": "microsoft-uet-template",
    "version": "main"
  }
}
```

---

## Utility Templates

### Stape Cookie Keeper
```json
{
  "name": "Cookie Keeper",
  "galleryReference": {
    "host": "github.com",
    "owner": "stape-io",
    "repository": "cookie-keeper",
    "version": "main"
  }
}
```

### Stape User Data
```json
{
  "name": "User Data",
  "galleryReference": {
    "host": "github.com",
    "owner": "stape-io",
    "repository": "user-data-tag",
    "version": "main"
  }
}
```

### Consent Mode v2 Banner
```json
{
  "name": "Consent Mode",
  "galleryReference": {
    "host": "github.com",
    "owner": "nicobentin",
    "repository": "consent-mode-template",
    "version": "main"
  }
}
```

---

## Server-Side (sGTM) Templates

### Stape LinkedIn CAPI
```json
{
  "name": "LinkedIn CAPI - Stape",
  "galleryReference": {
    "host": "github.com",
    "owner": "stape-io",
    "repository": "linkedin-conversion-api-tag",
    "version": "main"
  }
}
```

### Stape Data Tag (sGTM)
```json
{
  "name": "Data Tag",
  "galleryReference": {
    "host": "github.com",
    "owner": "stape-io",
    "repository": "data-tag",
    "version": "main"
  }
}
```

### Stape Firestore Writer
```json
{
  "name": "Firestore Writer",
  "galleryReference": {
    "host": "github.com",
    "owner": "stape-io",
    "repository": "firestore-writer-tag",
    "version": "main"
  }
}
```

### Stape BigQuery Writer
```json
{
  "name": "BigQuery Writer",
  "galleryReference": {
    "host": "github.com",
    "owner": "stape-io",
    "repository": "bigquery-writer-tag",
    "version": "main"
  }
}
```

---

## Finding Template Versions

### Get Latest Commit SHA

1. Go to the GitHub repository
2. Click on the latest commit
3. Copy the full SHA (40 characters)

Example:
```
https://github.com/linkedin/linkedin-gtm-community-template/commit/c07099c0e0cf0ade2057ee4016d3da9f32959169
```

SHA: `c07099c0e0cf0ade2057ee4016d3da9f32959169`

### Using "main" Branch

You can use `"version": "main"` for latest, but pinning to a specific commit is recommended for stability.

---

## Template Type IDs After Installation

After installing a template, it gets an ID like:

```
cvt_[CONTAINER_ID]_[TEMPLATE_INDEX]
```

Example: `cvt_42412215_123`

Use this `type` value when creating tags with the template.

---

## Quick Reference Table

| Platform | Template | Owner/Repo |
|----------|----------|------------|
| LinkedIn | InsightTag 2.0 | `linkedin/linkedin-gtm-community-template` |
| Meta | Pixel | `nicobentin/facebook-pixel-gtm-template` |
| Meta | CAPI (Stape) | `stape-io/facebook-conversion-api-tag` |
| TikTok | Pixel | `nicobentin/tiktok-pixel-template` |
| TikTok | Events API | `stape-io/tiktok-events-api-tag` |
| Pinterest | Tag | `nicobentin/pinterest-tag-template` |
| Pinterest | CAPI | `stape-io/pinterest-conversion-api-tag` |
| Twitter/X | Pixel | `nicobentin/twitter-pixel-template` |
| Snapchat | Pixel | `nicobentin/snapchat-pixel-template` |
| Microsoft | UET | `nicobentin/microsoft-uet-template` |
| LinkedIn | CAPI (sGTM) | `stape-io/linkedin-conversion-api-tag` |

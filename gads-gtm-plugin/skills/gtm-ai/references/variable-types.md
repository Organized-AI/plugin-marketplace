# GTM Variable Types Reference

Complete reference for all Google Tag Manager variable types and their configurations.

---

## Variable Type Codes

| Type Code | Name | Description |
|-----------|------|-------------|
| `c` | Constant | Static value |
| `jsm` | Custom JavaScript | JavaScript function |
| `v` | Data Layer Variable | Value from dataLayer |
| `k` | 1st Party Cookie | Browser cookie |
| `j` | JavaScript Variable | Global JS variable |
| `d` | DOM Element | HTML element value |
| `e` | Auto-Event Variable | Built-in event data |
| `u` | URL | URL component |
| `f` | HTTP Referrer | Referrer URL |
| `smm` | Lookup Table | Key-value mapping |
| `remm` | RegEx Table | Pattern matching |
| `gas` | Google Analytics Settings | GA settings |
| `gtes` | Google Tag: Event Settings | Event config |
| `gtcs` | Google Tag: Config Settings | Config settings |
| `vis` | Element Visibility | Visibility state |

---

## Constant Variable (`c`)

### Use Case
Static values that don't change: IDs, API keys, fixed strings.

### Configuration
```json
{
  "name": "Const - LinkedIn Partner ID",
  "type": "c",
  "parameter": [
    {"key": "value", "type": "template", "value": "1234567"}
  ]
}
```

### Examples
| Name | Value |
|------|-------|
| `Const - GA4 Measurement ID` | `G-XXXXXXXXXX` |
| `Const - LinkedIn Partner ID` | `1234567` |
| `Const - Meta Pixel ID` | `1234567890` |
| `Const - Environment` | `production` |

---

## Custom JavaScript (`jsm`)

### Use Case
Dynamic values requiring logic: generated IDs, hashed data, computed values.

### Configuration
```json
{
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

### Common Patterns

**Event ID Generator:**
```javascript
function() {
  return 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
```

**SHA256 Email Hash:**
```javascript
function() {
  var email = {{DL - User Email}};
  if (!email) return undefined;
  email = email.toLowerCase().trim();
  // Use Web Crypto API
  var encoder = new TextEncoder();
  var data = encoder.encode(email);
  return crypto.subtle.digest('SHA-256', data).then(function(hash) {
    return Array.from(new Uint8Array(hash))
      .map(function(b) { return b.toString(16).padStart(2, '0'); })
      .join('');
  });
}
```

**Get Cookie Value:**
```javascript
function() {
  var name = 'li_fat_id';
  var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : undefined;
}
```

**Format Phone (E.164):**
```javascript
function() {
  var phone = {{DL - User Phone}};
  if (!phone) return undefined;
  // Remove non-digits
  phone = phone.replace(/\D/g, '');
  // Add country code if missing
  if (phone.length === 10) phone = '1' + phone;
  return '+' + phone;
}
```

**Get URL Parameter:**
```javascript
function() {
  var param = 'utm_source';
  var url = new URL(window.location.href);
  return url.searchParams.get(param);
}
```

---

## Data Layer Variable (`v`)

### Use Case
Read values from the GTM dataLayer.

### Configuration
```json
{
  "name": "DL - Transaction ID",
  "type": "v",
  "parameter": [
    {"key": "name", "type": "template", "value": "ecommerce.transaction_id"},
    {"key": "dataLayerVersion", "type": "integer", "value": "2"}
  ]
}
```

### Common Data Layer Paths

| Variable Name | Path | Purpose |
|---------------|------|---------|
| `DL - Transaction ID` | `ecommerce.transaction_id` | Order ID |
| `DL - Transaction Value` | `ecommerce.value` | Order total |
| `DL - Currency` | `ecommerce.currency` | Currency code |
| `DL - Items` | `ecommerce.items` | Product array |
| `DL - User Email` | `user.email` | User email |
| `DL - User ID` | `user.id` | User identifier |
| `DL - Event Name` | `event` | Event name |
| `DL - Page Type` | `pageType` | Page category |
| `DL - Product ID` | `ecommerce.items.0.item_id` | First product ID |

### Version Parameter
- `dataLayerVersion: 1` - Legacy (flat object)
- `dataLayerVersion: 2` - Modern (nested objects, recommended)

---

## 1st Party Cookie (`k`)

### Use Case
Read browser cookies for click IDs, session data.

### Configuration
```json
{
  "name": "Cookie - li_fat_id",
  "type": "k",
  "parameter": [
    {"key": "cookieName", "type": "template", "value": "li_fat_id"}
  ]
}
```

### Common Cookie Variables

| Variable Name | Cookie Name | Platform |
|---------------|-------------|----------|
| `Cookie - li_fat_id` | `li_fat_id` | LinkedIn |
| `Cookie - _fbc` | `_fbc` | Meta (click) |
| `Cookie - _fbp` | `_fbp` | Meta (browser) |
| `Cookie - _gcl_aw` | `_gcl_aw` | Google Ads |
| `Cookie - _ga` | `_ga` | GA4 |
| `Cookie - ttclid` | `ttclid` | TikTok |

---

## JavaScript Variable (`j`)

### Use Case
Read global JavaScript variables on the page.

### Configuration
```json
{
  "name": "JS - dataLayer",
  "type": "j",
  "parameter": [
    {"key": "name", "type": "template", "value": "dataLayer"}
  ]
}
```

### Examples
| Variable Name | JS Variable | Purpose |
|---------------|-------------|---------|
| `JS - dataLayer` | `dataLayer` | Full dataLayer |
| `JS - Shopify` | `Shopify` | Shopify object |
| `JS - User Object` | `window.userInfo` | Custom user data |

---

## DOM Element (`d`)

### Use Case
Read values from HTML elements.

### Configuration
```json
{
  "name": "DOM - Form Email",
  "type": "d",
  "parameter": [
    {"key": "elementId", "type": "template", "value": "email-input"},
    {"key": "attributeName", "type": "template", "value": "value"}
  ]
}
```

### Selection Methods
- `elementId` - By ID
- `cssSelector` - By CSS selector

### Attribute Types
- `value` - Input value
- `text` - Text content
- `href` - Link URL
- Custom attribute name

---

## URL Variable (`u`)

### Use Case
Extract URL components.

### Configuration
```json
{
  "name": "URL - Page Path",
  "type": "u",
  "parameter": [
    {"key": "component", "type": "template", "value": "path"}
  ]
}
```

### Component Types

| Component | Example | Result |
|-----------|---------|--------|
| `url` | `https://example.com/path?q=1` | Full URL |
| `protocol` | `https://example.com/path` | `https` |
| `host` | `https://example.com/path` | `example.com` |
| `port` | `https://example.com:8080/` | `8080` |
| `path` | `https://example.com/path?q=1` | `/path` |
| `query` | `https://example.com?q=1&a=2` | `?q=1&a=2` |
| `fragment` | `https://example.com#section` | `section` |

---

## HTTP Referrer (`f`)

### Use Case
Get the referring URL.

### Configuration
```json
{
  "name": "Ref - Referrer URL",
  "type": "f",
  "parameter": [
    {"key": "component", "type": "template", "value": "url"}
  ]
}
```

### Component Types
Same as URL variable: `url`, `host`, `path`, `query`, etc.

---

## Lookup Table (`smm`)

### Use Case
Map input values to output values.

### Configuration
```json
{
  "name": "LUT - Event Name Map",
  "type": "smm",
  "parameter": [
    {"key": "input", "type": "template", "value": "{{Event}}"},
    {"key": "defaultValue", "type": "template", "value": ""},
    {
      "key": "map",
      "type": "list",
      "list": [
        {
          "type": "map",
          "map": [
            {"key": "key", "type": "template", "value": "purchase"},
            {"key": "value", "type": "template", "value": "Purchase"}
          ]
        },
        {
          "type": "map",
          "map": [
            {"key": "key", "type": "template", "value": "add_to_cart"},
            {"key": "value", "type": "template", "value": "AddToCart"}
          ]
        },
        {
          "type": "map",
          "map": [
            {"key": "key", "type": "template", "value": "begin_checkout"},
            {"key": "value", "type": "template", "value": "InitiateCheckout"}
          ]
        }
      ]
    }
  ]
}
```

### Common Mappings

**GA4 → Meta Event Mapping:**
| Input (GA4) | Output (Meta) |
|-------------|---------------|
| `purchase` | `Purchase` |
| `add_to_cart` | `AddToCart` |
| `view_item` | `ViewContent` |
| `begin_checkout` | `InitiateCheckout` |
| `add_payment_info` | `AddPaymentInfo` |
| `generate_lead` | `Lead` |

---

## RegEx Table (`remm`)

### Use Case
Pattern-based value mapping.

### Configuration
```json
{
  "name": "RegEx - Page Category",
  "type": "remm",
  "parameter": [
    {"key": "input", "type": "template", "value": "{{Page Path}}"},
    {"key": "defaultValue", "type": "template", "value": "other"},
    {
      "key": "map",
      "type": "list",
      "list": [
        {
          "type": "map",
          "map": [
            {"key": "key", "type": "template", "value": "^/product/.*"},
            {"key": "value", "type": "template", "value": "product"}
          ]
        },
        {
          "type": "map",
          "map": [
            {"key": "key", "type": "template", "value": "^/category/.*"},
            {"key": "value", "type": "template", "value": "category"}
          ]
        },
        {
          "type": "map",
          "map": [
            {"key": "key", "type": "template", "value": "^/cart.*"},
            {"key": "value", "type": "template", "value": "cart"}
          ]
        }
      ]
    }
  ]
}
```

---

## Auto-Event Variables (`e`)

### Built-in Variables (Enable in GTM)

| Variable | Description |
|----------|-------------|
| `{{Click Element}}` | Clicked element |
| `{{Click Classes}}` | Element classes |
| `{{Click ID}}` | Element ID |
| `{{Click URL}}` | Link URL |
| `{{Click Text}}` | Element text |
| `{{Form Element}}` | Form element |
| `{{Form ID}}` | Form ID |
| `{{Form Classes}}` | Form classes |
| `{{Form URL}}` | Form action URL |
| `{{Scroll Depth Threshold}}` | Scroll percentage |
| `{{Video Title}}` | YouTube title |
| `{{Video Status}}` | Play/pause/end |
| `{{Video Percent}}` | Playback percent |

---

## Quick Reference: When to Use What

| Need | Variable Type | Example |
|------|---------------|---------|
| Static ID/key | Constant (`c`) | Partner ID, Pixel ID |
| Generate unique value | Custom JS (`jsm`) | Event ID, timestamp |
| Read dataLayer | Data Layer (`v`) | Transaction ID, items |
| Read cookie | Cookie (`k`) | Click IDs, session |
| Read page element | DOM (`d`) | Form values |
| URL component | URL (`u`) | Path, query params |
| Map values | Lookup Table (`smm`) | Event name translation |
| Pattern match | RegEx Table (`remm`) | Page categorization |
| Click/form data | Auto-Event (`e`) | Click text, form ID |

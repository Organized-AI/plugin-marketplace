# GTM Naming Conventions

Standardized naming patterns for Google Tag Manager items.

---

## General Principles

1. **Prefix by type** - Start with category identifier
2. **Platform second** - Identify the platform/vendor
3. **Action/purpose last** - What it does
4. **Use separators** - Hyphens for readability
5. **Be consistent** - Same pattern across all items

---

## Tags

### Format
```
[Platform] - [Action/Event] - [Optional Detail]
```

### Examples by Platform

| Platform | Tag Name | Purpose |
|----------|----------|---------|
| **GA4** | `GA4 - Config` | Configuration tag |
| **GA4** | `GA4 - PageView` | Page view tracking |
| **GA4** | `GA4 - Purchase` | Purchase event |
| **GA4** | `GA4 - Add to Cart` | Add to cart event |
| **LinkedIn** | `LinkedIn - Base Pageview` | Insight tag base |
| **LinkedIn** | `LinkedIn - Lead` | Lead conversion |
| **LinkedIn** | `LinkedIn - Purchase` | Purchase conversion |
| **Meta** | `Meta - PageView` | Pixel pageview |
| **Meta** | `Meta - Purchase` | Purchase event |
| **Meta** | `Meta - Lead` | Lead event |
| **Google Ads** | `GAds - Conversion - Purchase` | Conversion tracking |
| **Google Ads** | `GAds - Remarketing` | Remarketing tag |
| **TikTok** | `TikTok - PageView` | Pixel pageview |
| **TikTok** | `TikTok - CompletePayment` | Purchase event |

### Server-Side Tags (sGTM)

```
[Platform] CAPI - [Event]
```

| Tag Name | Purpose |
|----------|---------|
| `LinkedIn CAPI - Lead` | Server-side lead |
| `LinkedIn CAPI - Purchase` | Server-side purchase |
| `Meta CAPI - PageView` | Server-side pageview |
| `Meta CAPI - Purchase` | Server-side purchase |
| `GA4 - Server` | GA4 forwarding |

---

## Variables

### Format
```
[Type Prefix] - [Name/Purpose]
```

### Type Prefixes

| Prefix | Type | GTM Type Code |
|--------|------|---------------|
| `Const` | Constant | `c` |
| `CJS` | Custom JavaScript | `jsm` |
| `DL` | Data Layer | `v` |
| `Cookie` | 1st Party Cookie | `k` |
| `LUT` | Lookup Table | `smm` |
| `RegEx` | RegEx Table | `remm` |
| `URL` | URL Component | `u` |
| `DOM` | DOM Element | `d` |
| `JS` | JavaScript Variable | `j` |
| `Ref` | HTTP Referrer | `f` |

### Examples

| Variable Name | Type | Purpose |
|---------------|------|---------|
| `Const - LinkedIn Partner ID` | Constant | Partner ID |
| `Const - GA4 Measurement ID` | Constant | GA4 ID |
| `CJS - Event ID Generator` | Custom JS | Unique event ID |
| `CJS - SHA256 Email` | Custom JS | Hashed email |
| `DL - Transaction ID` | Data Layer | `ecommerce.transaction_id` |
| `DL - Transaction Value` | Data Layer | `ecommerce.value` |
| `DL - Currency` | Data Layer | `ecommerce.currency` |
| `DL - User Email` | Data Layer | `user.email` |
| `Cookie - li_fat_id` | Cookie | LinkedIn click ID |
| `Cookie - _fbc` | Cookie | Meta click ID |
| `Cookie - _fbp` | Cookie | Meta browser ID |
| `LUT - Event Name Map` | Lookup Table | Event mapping |
| `URL - Page Path` | URL | Page path |
| `URL - Query String` | URL | Query parameters |

### Platform-Specific Variables

```
[Platform] - [Parameter Name]
```

| Variable Name | Purpose |
|---------------|---------|
| `LinkedIn - Partner ID` | LinkedIn partner ID |
| `LinkedIn - Event ID` | LinkedIn event ID |
| `LinkedIn - Conversion Value` | Conversion value |
| `Meta - Pixel ID` | Meta pixel ID |
| `Meta - Access Token` | CAPI access token |
| `GA4 - Measurement ID` | GA4 measurement ID |
| `GA4 - API Secret` | MP API secret |

---

## Triggers

### Format
```
[Type Prefix] - [Description]
```

### Type Prefixes

| Prefix | Type | When Fires |
|--------|------|------------|
| `PV` | Pageview | Page load |
| `DOM` | DOM Ready | DOM loaded |
| `WL` | Window Loaded | Full page load |
| `CE` | Custom Event | dataLayer push |
| `Click` | Click | Element click |
| `Form` | Form Submit | Form submission |
| `Timer` | Timer | Time interval |
| `Scroll` | Scroll Depth | Scroll percentage |
| `YT` | YouTube | Video events |
| `Vis` | Visibility | Element visible |
| `Hist` | History Change | SPA navigation |

### Examples

| Trigger Name | Type | Condition |
|--------------|------|-----------|
| `PV - All Pages` | Pageview | All pageviews |
| `PV - Thank You Page` | Pageview | Path contains `/thank-you` |
| `PV - Product Pages` | Pageview | Path matches `/product/*` |
| `DOM - All Pages` | DOM Ready | All pages |
| `CE - Purchase` | Custom Event | Event = `purchase` |
| `CE - Add to Cart` | Custom Event | Event = `add_to_cart` |
| `CE - Lead` | Custom Event | Event = `generate_lead` |
| `CE - Form Submit` | Custom Event | Event = `form_submit` |
| `Click - CTA Button` | Click | Class contains `cta` |
| `Click - Outbound Links` | Click | URL doesn't contain hostname |
| `Form - Contact Form` | Form Submit | Form ID = `contact` |
| `Scroll - 50%` | Scroll | 50% depth |
| `Timer - 30s` | Timer | 30 seconds |

### Server-Side Triggers (sGTM)

| Trigger Name | Type | Condition |
|--------------|------|-----------|
| `GA4 - All Events` | Custom | Client = GA4 |
| `GA4 - Purchase` | Custom | Event = `purchase` |
| `GA4 - Lead` | Custom | Event = `generate_lead` |

---

## Folders

### Format
```
[Category/Platform]
```

### Recommended Folder Structure

```
📁 _Configuration
   └── GA4 Config, Consent Mode, etc.

📁 _Data Layer
   └── DL variables

📁 GA4
   └── All GA4 tags

📁 LinkedIn
   └── LinkedIn tags + variables

📁 Meta
   └── Meta tags + variables

📁 Google Ads
   └── Google Ads tags

📁 Analytics
   └── Other analytics (Hotjar, etc.)

📁 Utilities
   └── Helper tags, error tracking
```

---

## Anti-Patterns (Avoid)

### Bad Naming

| Bad | Good | Why |
|-----|------|-----|
| `New Tag` | `GA4 - PageView` | Generic name |
| `Copy of GA4 Purchase` | `GA4 - Purchase - US` | Duplicate indicator |
| `Test` | `GA4 - Purchase - TEST` | Unclear purpose |
| `trigger1` | `CE - Purchase` | No description |
| `variable` | `DL - Transaction ID` | Generic name |
| `LinkedIn` | `LinkedIn - Base Pageview` | Missing action |
| `fbq purchase` | `Meta - Purchase` | Inconsistent format |

### Naming Violations to Flag in Audit

1. **No prefix** - Missing type indicator
2. **All lowercase** - Should use Title Case
3. **Spaces instead of hyphens** - `GA4 Purchase` vs `GA4 - Purchase`
4. **"Copy of" prefix** - Duplicate not renamed
5. **"Test" without suffix** - Testing tag not marked
6. **Numbers only** - `tag1`, `var2`
7. **Platform name only** - `LinkedIn`, `Meta`
8. **Mixed formats** - Some use `_`, others use `-`

---

## Validation Regex Patterns

### Tag Name Pattern
```regex
^(GA4|LinkedIn|Meta|GAds|TikTok|Pinterest|Twitter|Hotjar|Clarity|Custom)\s-\s[\w\s]+$
```

### Variable Name Pattern
```regex
^(Const|CJS|DL|Cookie|LUT|RegEx|URL|DOM|JS|Ref)\s-\s[\w\s]+$
```

### Trigger Name Pattern
```regex
^(PV|DOM|WL|CE|Click|Form|Timer|Scroll|YT|Vis|Hist)\s-\s[\w\s]+$
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                    GTM NAMING CHEAT SHEET                   │
├─────────────────────────────────────────────────────────────┤
│  TAGS                                                       │
│  [Platform] - [Action] - [Optional Detail]                  │
│  Example: GA4 - Purchase                                    │
│  Example: LinkedIn - Lead - Westchester Campaign            │
├─────────────────────────────────────────────────────────────┤
│  VARIABLES                                                  │
│  [Type] - [Name]                                            │
│  Types: Const, CJS, DL, Cookie, LUT, URL, DOM               │
│  Example: DL - Transaction ID                               │
│  Example: CJS - Event ID Generator                          │
├─────────────────────────────────────────────────────────────┤
│  TRIGGERS                                                   │
│  [Type] - [Description]                                     │
│  Types: PV, CE, Click, Form, DOM, WL, Scroll                │
│  Example: CE - Purchase                                     │
│  Example: PV - Thank You Page                               │
├─────────────────────────────────────────────────────────────┤
│  FOLDERS                                                    │
│  [Platform] or [Category]                                   │
│  Example: LinkedIn, Meta, GA4, _Configuration               │
└─────────────────────────────────────────────────────────────┘
```

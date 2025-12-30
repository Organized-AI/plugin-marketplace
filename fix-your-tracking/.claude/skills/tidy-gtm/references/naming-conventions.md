# GTM Naming Conventions

Standardized naming conventions for all GTM components to ensure consistency and clarity.

## General Principles

1. **Be Descriptive**: Names should clearly indicate purpose
2. **Use Prefixes**: Group components by type/platform
3. **Avoid Ambiguity**: No generic names like "test", "copy", "1"
4. **Use Title Case**: For readability
5. **Use Hyphens**: As separators (not underscores in names)
6. **Keep It Short**: But not at expense of clarity

---

## Tags

### Platform Prefixes

| Platform | Prefix | Example |
|----------|--------|---------|
| Google Analytics 4 | `GA4 - ` | `GA4 - Config` |
| Universal Analytics | `UA - ` | `UA - Pageview` (legacy) |
| Google Ads | `GADS - ` | `GADS - Conversion - Lead` |
| Meta/Facebook | `Meta - ` | `Meta - Base Pixel` |
| LinkedIn | `LinkedIn - ` | `LinkedIn - Insight Tag - Base` |
| Microsoft/Bing | `MSFT - ` | `MSFT - UET Tag` |
| TikTok | `TikTok - ` | `TikTok - PageView` |
| Pinterest | `Pinterest - ` | `Pinterest - Base Tag` |
| Snapchat | `Snapchat - ` | `Snapchat - Pixel` |
| Twitter/X | `X - ` | `X - Base Pixel` |
| Custom HTML | `HTML - ` | `HTML - Chat Widget` |
| Custom Image | `Img - ` | `Img - Tracking Pixel` |

### Tag Type Suffixes

| Purpose | Suffix | Example |
|---------|--------|---------|
| Base/Config | `- Base` or `- Config` | `Meta - Base Pixel` |
| Page View | `- PageView` | `GA4 - PageView` |
| Conversion | `- [Event Name]` | `GADS - Conversion - Purchase` |
| Event | `- [Event Name]` | `GA4 - Add to Cart` |

### Tag Naming Patterns

```
[Platform] - [Type] - [Action/Event]

Examples:
- GA4 - Config
- GA4 - Event - Purchase
- GADS - Conversion - Lead
- GADS - Remarketing
- Meta - Base Pixel
- Meta - PageView
- Meta - Lead
- Meta - Purchase
- LinkedIn - Insight Tag - Base
- LinkedIn - Insight Tag - Lead
- MSFT - UET Tag
- TikTok - PageView
- TikTok - CompleteRegistration
- HTML - Hotjar Script
- HTML - Intercom Chat
```

### Anti-Patterns (Avoid These)

```
BAD                           GOOD
---                           ----
"Facebook Pixel"          →   "Meta - Base Pixel"
"FB"                      →   "Meta - PageView"
"Pixel - Copy"            →   (delete duplicate)
"test"                    →   (delete or rename)
"GA4 Tag"                 →   "GA4 - Config"
"Google Ads"              →   "GADS - Conversion - Lead"
"LinkedIn"                →   "LinkedIn - Insight Tag - Base"
"asdf"                    →   (delete)
"Tag 1"                   →   (rename with purpose)
"NEW - Facebook"          →   "Meta - Base Pixel"
```

---

## Triggers

### Type Prefixes

| Type | Prefix | Example |
|------|--------|---------|
| Page View | `PV - ` | `PV - Thank You Page` |
| Custom Event | `CE - ` | `CE - signed_up` |
| Click - All | `Click - ` | `Click - CTA Button` |
| Click - Links | `Link - ` | `Link - Outbound` |
| Form Submit | `Form - ` | `Form - Contact Submit` |
| Scroll Depth | `Scroll - ` | `Scroll - 50 Percent` |
| Timer | `Timer - ` | `Timer - 30 Seconds` |
| YouTube | `YT - ` | `YT - Video Start` |
| Visibility | `Vis - ` | `Vis - Footer Visible` |
| History | `History - ` | `History - Hash Change` |
| Window Loaded | `Window - ` | `Window - Loaded` |
| DOM Ready | `DOM - ` | `DOM - Ready` |

### Built-in Triggers (Don't Rename)

| Trigger | ID | Keep Name |
|---------|-----|-----------|
| All Pages | 2147479553 | `All Pages` |

### Trigger Naming Patterns

```
[Type Prefix] - [Description/Event Name]

Examples:
- All Pages                    (built-in, don't rename)
- PV - Thank You Page
- PV - Confirmation Page
- CE - signed_up
- CE - purchase
- CE - add_to_cart
- CE - begin_checkout
- Click - CTA Button
- Click - Phone Number
- Link - Outbound Click
- Form - Contact Form Submit
- Form - Newsletter Signup
- Scroll - 25 Percent
- Scroll - 50 Percent
- Scroll - 90 Percent
- Timer - 30 Seconds
- Timer - 60 Seconds Engagement
- YT - Video Start
- YT - Video Complete
```

### Anti-Patterns (Avoid These)

```
BAD                           GOOD
---                           ----
"click"                   →   "Click - CTA Button"
"Trigger 1"               →   "CE - purchase"
"test trigger"            →   (delete)
"form"                    →   "Form - Contact Submit"
"pageview trigger"        →   "PV - Thank You Page"
"custom event"            →   "CE - [event_name]"
"DELETE ME"               →   (delete)
```

---

## Variables

### Type Prefixes

| Type | Prefix | Example |
|------|--------|---------|
| Constant | `CONST - ` | `CONST - GA4 Measurement ID` |
| Data Layer Variable | `DL - ` | `DL - email` |
| JavaScript Variable | `JS - ` | `JS - Generate UUID` |
| Custom JavaScript | `CJS - ` | `CJS - Format Currency` |
| DOM Element | `DOM - ` | `DOM - Form Email Input` |
| 1st Party Cookie | `Cookie - ` | `Cookie - _fbp` |
| URL Variable | `URL - ` | `URL - Page Path` |
| HTTP Referrer | `Ref - ` | `Ref - Full URL` |
| Lookup Table | `LUT - ` | `LUT - Event Name Map` |
| RegEx Table | `REX - ` | `REX - Page Category` |
| Google Analytics Settings | `GAS - ` | `GAS - GA4 Config` |
| Auto-Event Variable | `AEV - ` | `AEV - Click Text` |

### Variable Naming Patterns

```
[Type Prefix] - [Description]

Examples:
Constants:
- CONST - GA4 Measurement ID
- CONST - LinkedIn Partner ID
- CONST - Meta Pixel ID
- CONST - GADS Conversion ID

Data Layer:
- DL - email
- DL - first_name
- DL - last_name
- DL - phone
- DL - event_id
- DL - transaction_id
- DL - value
- DL - currency
- DL - items

JavaScript:
- JS - Generate UUID
- JS - Get Timestamp
- CJS - Format Phone
- CJS - Hash Email SHA256

DOM:
- DOM - Form Email Field
- DOM - Page Title
- DOM - Meta Description

URL:
- URL - Page Path
- URL - Query String
- URL - Hostname
- URL - Fragment

Cookie:
- Cookie - _fbp
- Cookie - _fbc
- Cookie - _ga
- Cookie - li_fat_id

Lookup:
- LUT - Event Name to Conversion ID
- LUT - Page Path to Category
- REX - Extract Product ID
```

### Legacy Prefixes (Still Valid)

Some containers use these older patterns - they're acceptable but new variables should use the standard:

```
Legacy                        Preferred
------                        ---------
{{dlv - email}}          →    {{DL - email}}
{{cjs - hash}}           →    {{CJS - Hash Email}}
{{c - partner_id}}       →    {{CONST - Partner ID}}
```

### Anti-Patterns (Avoid These)

```
BAD                           GOOD
---                           ----
"email"                   →   "DL - email"
"dataLayer.email"         →   "DL - email"
"dlv - email"             →   "DL - email" (standardize)
"variable1"               →   (rename with purpose)
"test"                    →   (delete)
"unused"                  →   (delete if truly unused)
"{{Click Text}}"          →   "AEV - Click Text"
```

---

## Folders

### Folder Organization Strategy

Organize by **platform/vendor** for easy navigation:

```
Folders:
├── Google               # GA4, GADS, etc.
├── Meta                 # Facebook/Meta
├── LinkedIn
├── Microsoft            # Bing/MSFT
├── TikTok
├── Pinterest
├── Consent              # Consent mode tags
├── Custom               # HTML, Image pixels
└── Utilities            # Helper tags
```

### Alternative: By Purpose

```
Folders:
├── Analytics            # GA4, Adobe, etc.
├── Advertising          # GADS, Meta, LinkedIn, etc.
├── Conversion Tracking
├── Remarketing
├── Consent
└── Utilities
```

---

## Quick Reference Card

```
TAGS:        [Platform] - [Type] - [Event]
             Meta - Base Pixel
             GA4 - Event - Purchase

TRIGGERS:    [Type] - [Description]
             CE - signed_up
             Click - CTA Button

VARIABLES:   [Type] - [Description]
             CONST - GA4 Measurement ID
             DL - email
             JS - Generate UUID
```

---

## Migration Guide

When standardizing an existing container:

1. **Export current names** - Document before changes
2. **Map old → new** - Create rename list
3. **Check references** - Ensure variable names in tags match
4. **Rename in batches** - 5-10 at a time
5. **Test after each batch** - Use Quick Preview
6. **Document changes** - For audit trail

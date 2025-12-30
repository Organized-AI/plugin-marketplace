# Tag Parser Reference

Extract structured data from GHL contact tags for revenue attribution and funnel tracking.

## Overview

GHL contacts often store valuable attribution data in tags rather than custom fields. This reference documents patterns for extracting:
- Customer status (is this a paying customer?)
- Product purchases with prices
- Currency detection
- Funnel stage progression
- Attribution source/campaign

## Tag Patterns

### Customer Status Tags

Identify paying customers by matching these patterns:

```typescript
const CUSTOMER_TAG_PATTERNS = [
  '_customer (rtt any)',
  '_customer (rtc any)',
  '_customer (ciah)',
  '_customer (rtt integrated)',
  '_customer (dubai cart)',
  '_customer (vc accelerator)',
];
```

**Example tags:**
```
_customer (rtt any), profile: completed application form - qualified, career guide campaign
```

### Product Purchase Tags

Revenue is embedded in tags with product names and prices:

```
70. product purchase: foundation in hypnotherapy $49
70. product purchase: rtt premium £2950
bought inner belief ($97)
```

**Extraction regex patterns:**

```typescript
// USD with $ symbol
const usdMatch = tag.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
// → $2,950.00 → 2950

// GBP with £ symbol
const gbpMatch = tag.match(/£(\d+(?:,\d{3})*(?:\.\d{2})?)/);
// → £2950 → 2950

// EUR with € symbol
const eurMatch = tag.match(/€(\d+(?:,\d{3})*(?:\.\d{2})?)/);

// Parenthesized amounts
const parenMatch = tag.match(/\(\$(\d+(?:,\d{3})*(?:\.\d{2})?)\)/);
// → ($97) → 97
```

### Funnel Stage Tags

Map profile tags to Triple Whale event types:

| Tag Pattern | TW Event Type |
|-------------|---------------|
| `profile: initial.*lead` | `lead` |
| `profile: completed application form.*qualified` | `mql` |
| `booked rtt (sales\|setter) call` | `book_demo` |
| `attended rtt (sales\|setter)? ?call` | `sql` |
| `agreement signed` | `custom` |
| `_customer (` | `custom` |

**Stage priority:** Higher index = more progressed in funnel.

### Source/Campaign Tags

Extract attribution source from campaign tags:

| Tag Pattern | Source Value |
|-------------|--------------|
| `career guide campaign` | `career_guide` |
| `wealth webinar` | `wealth_webinar` |
| `health webinar` | `health_webinar` |
| `transformation webinar` | `transformation_webinar` |
| `open house webinar` | `open_house_webinar` |
| `foundation in hypnotherapy` | `foundation_hypnotherapy` |
| `free meditation` | `free_meditation` |
| `inner belief` | `inner_belief` |

## TypeScript Implementation

### ParsedTagData Interface

```typescript
interface ParsedTagData {
  isCustomer: boolean;
  customerTypes: string[];        // ['rtt any', 'rtt integrated']
  products: ProductPurchase[];    // Extracted product purchases
  totalRevenue: number;           // Sum of all purchases
  currency: 'GBP' | 'USD' | 'EUR';
  funnelStage: TWEventType;
  source?: string;                // Attribution source
  agreementSigned: boolean;
}

interface ProductPurchase {
  name: string;
  price: number;
  currency: 'GBP' | 'USD' | 'EUR';
}
```

### Core Parser Function

```typescript
function parseTags(tagsString: string): ParsedTagData {
  if (!tagsString || tagsString.trim() === '') {
    return {
      isCustomer: false,
      customerTypes: [],
      products: [],
      totalRevenue: 0,
      currency: 'USD',
      funnelStage: 'lead',
      agreementSigned: false,
    };
  }

  const tags = tagsString.split(',').map(t => t.trim().toLowerCase());

  // Detect customer status
  const customerTypes = CUSTOMER_TAG_PATTERNS
    .filter(pattern => tags.some(t => t.includes(pattern.toLowerCase())))
    .map(p => p.replace('_customer (', '').replace(')', ''));

  // Extract products and revenue
  const products: ProductPurchase[] = [];
  let totalRevenue = 0;
  let detectedCurrency: 'GBP' | 'USD' | 'EUR' = 'USD';

  for (const tag of tagsString.split(',')) {
    const trimmedTag = tag.trim();
    if (trimmedTag.match(/70\. product purchase:|bought|purchase/i)) {
      const { price, currency } = extractRevenue(trimmedTag);
      if (price > 0) {
        products.push({
          name: extractProductName(trimmedTag),
          price,
          currency,
        });
        totalRevenue += price;
        detectedCurrency = currency;
      }
    }
  }

  // Determine highest funnel stage
  const funnelStage = determineStage(tags);

  // Extract source/campaign
  const source = extractSource(tagsString);

  // Check agreement signed
  const agreementSigned = tags.some(t => t.includes('agreement signed'));

  return {
    isCustomer: customerTypes.length > 0,
    customerTypes,
    products,
    totalRevenue,
    currency: detectedCurrency,
    funnelStage,
    source,
    agreementSigned,
  };
}
```

### Revenue Extraction

```typescript
function extractRevenue(tag: string): { price: number; currency: 'GBP' | 'USD' | 'EUR' } {
  // Check for £ first (UK business)
  const gbpMatch = tag.match(/£(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  if (gbpMatch) {
    return { price: parseFloat(gbpMatch[1].replace(/,/g, '')), currency: 'GBP' };
  }

  // Check for $
  const usdMatch = tag.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  if (usdMatch) {
    return { price: parseFloat(usdMatch[1].replace(/,/g, '')), currency: 'USD' };
  }

  // Check for €
  const eurMatch = tag.match(/€(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  if (eurMatch) {
    return { price: parseFloat(eurMatch[1].replace(/,/g, '')), currency: 'EUR' };
  }

  // Check for parenthesized amounts like ($2950)
  const parenMatch = tag.match(/\(\$(\d+(?:,\d{3})*(?:\.\d{2})?)\)/);
  if (parenMatch) {
    return { price: parseFloat(parenMatch[1].replace(/,/g, '')), currency: 'USD' };
  }

  const parenGbpMatch = tag.match(/\(£(\d+(?:,\d{3})*(?:\.\d{2})?)\)/);
  if (parenGbpMatch) {
    return { price: parseFloat(parenGbpMatch[1].replace(/,/g, '')), currency: 'GBP' };
  }

  return { price: 0, currency: 'USD' };
}
```

### Tag Filtering for CSV Import

```typescript
function tagsStringHasRequiredTag(
  tagsString: string,
  requiredTags: string[] = CUSTOMER_TAG_PATTERNS.slice(0, 4)
): boolean {
  const lowerTags = tagsString.toLowerCase();
  return requiredTags.some(required => lowerTags.includes(required.toLowerCase()));
}
```

## Usage with CSV Import

When importing GHL CSV exports:

```bash
ghl-tw-sync import-csv "contacts.csv" "shop.com" \
  --filter-tags "_customer (rtt any)" "_customer (rtc any)" \
  --send-events \
  --auto-currency \
  --dry-run
```

**Options:**
- `--filter-tags` - Only sync contacts with these tags
- `--send-events` - Send to /data-in/event endpoint
- `--auto-currency` - Detect currency from tag symbols
- `--dry-run` - Preview without pushing to Triple Whale

## Sample Output

```
✔ Found 18568 contacts in CSV
✔ Filtered 18568 → 18566 contacts by tags
✔ Converted 50 contacts with tag data
  Customers: 50 | With Revenue: 26 | Total Revenue: 7760.00

💰 Revenue Extracted:
  GBP: £1998.00
  USD: $5762.00
```

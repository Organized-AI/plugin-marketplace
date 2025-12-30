# LinkedIn Conversion Categories & Types

## Standard Conversion Types

| Category | Event Name | Description |
|----------|------------|-------------|
| **Lead** | Lead | Form submission, contact request |
| **Purchase** | Purchase | Completed transaction |
| **Sign Up** | Sign Up | Account creation |
| **Key Page View** | Key Page View | High-value page visit |
| **Add to Cart** | Add to Cart | Product added to cart |
| **Download** | Download | Content download |
| **Start Trial** | Start Trial | Free trial started |
| **Book Appointment** | Book Appointment | Scheduled meeting |

## Deduplication Behavior

### Deduplicated Events
Same conversion type + same campaign:
- Lead, Sign Up, Key Page View, Download, Start Trial, Book Appointment

### Non-Deduplicated Events
Count every occurrence:
- **Purchase** - Each transaction counts
- **Add to Cart** - Each cart addition counts

## Conversion Value Guidelines

| Conversion Type | Value Strategy | Example |
|-----------------|----------------|---------|
| Purchase | Dynamic (actual value) | $149.99 |
| Lead | Static (estimated value) | $50 |
| Sign Up | Static (lifetime value) | $100 |
| Book Appointment | Static (close rate × deal) | $200 |

## B2B Funnel Mapping

| Funnel Stage | Conversion Type |
|--------------|-----------------|
| Awareness | Key Page View |
| Interest | Download |
| Consideration | Book Appointment |
| Intent | Start Trial |
| Evaluation | Lead (Demo Request) |
| Purchase | Purchase |

## Conversion Rule Naming

Format: `{Source} - {Action} - {Details}`

Examples:
- `CAPI - Purchase - All Products`
- `CAPI - Lead - Demo Request`
- `Insight - PageView - Pricing Page`

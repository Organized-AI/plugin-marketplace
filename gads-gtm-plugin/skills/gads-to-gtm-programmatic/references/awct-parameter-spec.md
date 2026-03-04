# awct Tag Parameter Specification

Complete parameter reference for Google Ads Conversion Tracking tags (type `awct`) in GTM.

## Required Parameters

| Key | Type | Description | Example Value |
|---|---|---|---|
| `conversionId` | template | Conversion Tracking ID (AW-XXXXXXXXX) | `{{CONST - Google Ads Conversion ID}}` |
| `conversionLabel` | template | Unique label per conversion action | `{{CONST - GADS Purchase Label}}` |

## Dynamic Value Parameters

| Key | Type | Description | Example Value |
|---|---|---|---|
| `conversionValue` | template | Revenue/value from dataLayer | `{{DLV - ecommerce.value}}` |
| `currencyCode` | template | 3-letter ISO currency code | `{{DLV - ecommerce.currency}}` |
| `orderId` | template | Transaction deduplication ID | `{{DLV - ecommerce.transaction_id}}` |

## Enhanced Conversions Parameters

| Key | Type | Description | Values |
|---|---|---|---|
| `enableEnhancedConversions` | boolean | Enable enhanced conversions | `true` / `false` |
| `cssProvidedEnhancedConversionValue` | template | Data source for enhanced conversions | `AUTOMATIC` or `MANUAL` |

## Reporting Parameters

| Key | Type | Description | Values |
|---|---|---|---|
| `enableNewCustomerReporting` | boolean | New customer acquisition reporting | `true` / `false` |
| `enableProductReporting` | boolean | Cart data / product-level reporting | `true` / `false` |
| `enableShippingData` | boolean | Include shipping in cart data | `true` / `false` |

## Full Parameter Block (Copy-Paste Template)

```json
[
  {"type": "template", "key": "conversionId", "value": "{{CONST - Google Ads Conversion ID}}"},
  {"type": "template", "key": "conversionLabel", "value": "{{CONST - GADS Purchase Label}}"},
  {"type": "template", "key": "conversionValue", "value": "{{DLV - ecommerce.value}}"},
  {"type": "template", "key": "currencyCode", "value": "{{DLV - ecommerce.currency}}"},
  {"type": "template", "key": "orderId", "value": "{{DLV - ecommerce.transaction_id}}"},
  {"type": "boolean", "key": "enableNewCustomerReporting", "value": "false"},
  {"type": "boolean", "key": "enableEnhancedConversions", "value": "true"},
  {"type": "template", "key": "cssProvidedEnhancedConversionValue", "value": "AUTOMATIC"},
  {"type": "boolean", "key": "enableProductReporting", "value": "false"},
  {"type": "boolean", "key": "enableShippingData", "value": "false"}
]
```

## Non-Purchase Tags

For non-purchase events (Begin Checkout, Add to Cart, View Item), remove `orderId` and set enhanced conversions to false:

```json
[
  {"type": "template", "key": "conversionId", "value": "{{CONST - Google Ads Conversion ID}}"},
  {"type": "template", "key": "conversionLabel", "value": "{{CONST - GADS BeginCheckout Label}}"},
  {"type": "template", "key": "conversionValue", "value": "{{DLV - ecommerce.value}}"},
  {"type": "template", "key": "currencyCode", "value": "{{DLV - ecommerce.currency}}"},
  {"type": "boolean", "key": "enableNewCustomerReporting", "value": "false"},
  {"type": "boolean", "key": "enableEnhancedConversions", "value": "false"},
  {"type": "boolean", "key": "enableProductReporting", "value": "false"},
  {"type": "boolean", "key": "enableShippingData", "value": "false"}
]
```

## Conversion Linker (gclidw)

The Conversion Linker tag has NO parameters. Just set type to `gclidw` and fire on All Pages (trigger ID `2147479553`).

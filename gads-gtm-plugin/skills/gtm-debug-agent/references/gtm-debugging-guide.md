# GTM Debugging Guide

## Debug Mode Overview

### Enabling Debug Mode

1. **GTM Preview Mode**
   - Open GTM container
   - Click "Preview" button
   - Opens Tag Assistant in new tab
   - Navigate to your site

2. **Direct URL Access**
   ```
   https://yoursite.com/?gtm_debug=x
   ```

3. **Browser Extension**
   - Install "Tag Assistant" Chrome extension
   - Enables on-page debugging

## Common Debugging Scenarios

### Scenario 1: Tag Not Firing

**Symptoms:**
- Tag shows in GTM but no events in destination
- Preview mode shows tag as "Not Fired"

**Diagnostic Steps:**
```
1. Check trigger conditions
   └── Are all conditions met?
       └── Variable values correct?
           └── Timing correct?

2. Check tag configuration
   └── Required fields filled?
       └── Variable references valid?

3. Check consent state
   └── Consent required?
       └── Consent granted?
```

**Common Causes:**
| Issue | Solution |
|-------|----------|
| Trigger not matching | Verify trigger conditions in preview |
| Variable undefined | Check variable configuration |
| Consent blocked | Review consent settings |
| Tag sequencing | Check tag dependencies |

### Scenario 2: Duplicate Events

**Symptoms:**
- Events fire multiple times
- Double-counting in analytics

**Diagnostic Steps:**
1. Check for multiple triggers on same tag
2. Look for recursive dataLayer pushes
3. Verify tag firing options (once per page vs unlimited)
4. Check for duplicate GTM containers

**Prevention:**
```javascript
// Deduplicate with event_id
dataLayer.push({
  event: 'purchase',
  event_id: 'order_12345', // Unique identifier
  transaction_id: '12345',
  value: 99.99
});
```

### Scenario 3: Data Not Passing Correctly

**Symptoms:**
- Events fire but with wrong/missing data
- Variables show undefined

**Check dataLayer:**
```javascript
// In browser console
console.table(dataLayer);

// Or filter specific events
dataLayer.filter(e => e.event === 'purchase');
```

**Variable Debugging:**
```javascript
// Check specific variable value
google_tag_manager['GTM-XXXXXX'].dataLayer.get('variableName');
```

## DataLayer Best Practices

### Standard Event Structure
```javascript
dataLayer.push({
  event: 'event_name',
  event_category: 'category',
  event_action: 'action',
  event_label: 'label',
  event_value: 123,
  // Custom parameters
  custom_param_1: 'value1',
  custom_param_2: 'value2'
});
```

### E-commerce Events
```javascript
// Purchase event
dataLayer.push({
  event: 'purchase',
  ecommerce: {
    transaction_id: 'T12345',
    value: 99.99,
    currency: 'USD',
    items: [{
      item_id: 'SKU123',
      item_name: 'Product Name',
      price: 99.99,
      quantity: 1
    }]
  }
});
```

### Clear Previous Ecommerce
```javascript
// Always clear before new ecommerce event
dataLayer.push({ ecommerce: null });
dataLayer.push({
  event: 'view_item',
  ecommerce: { /* ... */ }
});
```

## Consent Mode Debugging

### Check Consent State
```javascript
// In console
gtag('get', 'consent', 'ad_storage');
gtag('get', 'consent', 'analytics_storage');
```

### Consent Mode Events
```javascript
// Default (denied)
gtag('consent', 'default', {
  'ad_storage': 'denied',
  'analytics_storage': 'denied'
});

// User grants consent
gtag('consent', 'update', {
  'ad_storage': 'granted',
  'analytics_storage': 'granted'
});
```

## GTM Preview Mode Reference

### Event States

| State | Meaning | Action |
|-------|---------|--------|
| Fired | Tag executed | Verify data in destination |
| Not Fired | Trigger conditions not met | Check trigger setup |
| Blocked | Consent or exception blocking | Review consent/exceptions |

### Variables Tab
- Shows all variable values at time of event
- Use to verify data is available
- Check for undefined values

### DataLayer Tab
- Shows full dataLayer history
- Useful for event sequencing
- Check for malformed pushes

## Console Commands

### View All GTM Info
```javascript
// All GTM containers
Object.keys(google_tag_manager);

// Specific container
google_tag_manager['GTM-XXXXXX'];

// DataLayer
google_tag_manager['GTM-XXXXXX'].dataLayer;
```

### Monitor DataLayer Changes
```javascript
// Watch for new pushes
(function() {
  var original = dataLayer.push;
  dataLayer.push = function() {
    console.log('dataLayer.push:', arguments);
    return original.apply(this, arguments);
  };
})();
```

### Debug Specific Tag
```javascript
// Enable verbose logging
gtag('config', 'GA4-XXXXXX', {
  'debug_mode': true
});
```

## Validation Checklist

### Pre-Publish Validation
- [ ] All tags fire in preview mode
- [ ] Variables resolve correctly
- [ ] Events appear in real-time reports
- [ ] Consent mode working
- [ ] No JavaScript errors in console
- [ ] Mobile testing completed
- [ ] Cross-browser testing done

### Post-Publish Verification
- [ ] Live site events firing
- [ ] Data appearing in destinations
- [ ] No duplicate events
- [ ] Conversion tracking accurate
- [ ] Performance impact acceptable

# GTM Debug Panel Selectors

Reference for targeting elements in the GTM Tag Assistant debug panel.

## Main Panel Selectors

```javascript
const TAG_ASSISTANT = {
  panel: 'iframe[src*="tagassistant.google.com"]',
  summaryTab: '[data-tab="summary"]',
  tagsTab: '[data-tab="tags"]',
  variablesTab: '[data-tab="variables"]',
  dataLayerTab: '[data-tab="dataLayer"]',
  eventList: '.event-list',
  eventItem: '.event-list-item',
  tagsFired: '.tags-fired',
  tagsNotFired: '.tags-not-fired',
  tagItem: '.tag-item',
  tagName: '.tag-name',
  variableItem: '.variable-item'
};
```

## Event Types

```javascript
const GTM_EVENTS = {
  CONTAINER_LOADED: 'Container Loaded',
  DOM_READY: 'DOM Ready',
  WINDOW_LOADED: 'Window Loaded',
  PAGE_VIEW: 'Page View',
  LINK_CLICK: 'Link Click',
  FORM_SUBMIT: 'Form Submission',
  SCROLL_DEPTH: 'Scroll Depth'
};
```

## Network Endpoints

```javascript
const TRACKING_ENDPOINTS = {
  ga4: /google-analytics\.com\/g\/collect/,
  metaPixel: /facebook\.com\/tr/,
  tiktok: /analytics\.tiktok\.com/,
  linkedin: /px\.ads\.linkedin\.com/
};
```

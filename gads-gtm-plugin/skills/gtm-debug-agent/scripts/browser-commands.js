/**
 * GTM Debug Agent - Browser Automation Commands
 * Reusable browser automation snippets for GTM debugging.
 */

async function launchGTMPreview(page, containerId, targetUrl) {
  const previewUrl = `https://tagassistant.google.com/#/?id=${containerId}&url=${encodeURIComponent(targetUrl)}`;
  await page.goto(previewUrl);
  await page.waitForSelector('[data-testid="connect-button"], button:has-text("Connect")', { timeout: 10000 });
  await page.click('[data-testid="connect-button"], button:has-text("Connect")');
  const newPage = await page.context().waitForEvent('page');
  await newPage.waitForLoadState('networkidle');
  return newPage;
}

async function captureDataLayer(page) {
  return await page.evaluate(() => ({
    timestamp: new Date().toISOString(),
    url: window.location.href,
    dataLayer: window.dataLayer ? JSON.parse(JSON.stringify(window.dataLayer)) : [],
    gtmContainers: window.google_tag_manager ? Object.keys(window.google_tag_manager).filter(k => k.startsWith('GTM-')) : []
  }));
}

async function watchDataLayer(page, callback) {
  await page.exposeFunction('__onDataLayerPush', callback);
  await page.evaluate(() => {
    const originalPush = window.dataLayer.push.bind(window.dataLayer);
    window.dataLayer.push = function(...args) {
      window.__onDataLayerPush(args);
      return originalPush(...args);
    };
  });
}

async function executeAction(page, action) {
  const result = { action: action.type, timestamp: new Date().toISOString(), success: false, error: null };
  try {
    switch (action.type) {
      case 'click':
        await page.waitForSelector(action.selector, { timeout: action.timeout || 5000 });
        await page.click(action.selector);
        result.success = true;
        break;
      case 'fill':
        await page.waitForSelector(action.selector, { timeout: action.timeout || 5000 });
        await page.fill(action.selector, action.value);
        result.success = true;
        break;
      case 'scroll':
        await page.evaluate((target) => {
          if (target === 'bottom') window.scrollTo(0, document.body.scrollHeight);
          else if (typeof target === 'number') window.scrollTo(0, target);
        }, action.target || 'bottom');
        result.success = true;
        break;
      case 'wait':
        if (action.selector) await page.waitForSelector(action.selector, { timeout: action.timeout || 5000 });
        else await page.waitForTimeout(action.duration || 1000);
        result.success = true;
        break;
      case 'navigate':
        await page.goto(action.url);
        await page.waitForLoadState('networkidle');
        result.success = true;
        break;
      case 'capture':
        result.dataLayer = await captureDataLayer(page);
        result.success = true;
        break;
      default:
        result.error = `Unknown action type: ${action.type}`;
    }
  } catch (error) {
    result.error = error.message;
  }
  return result;
}

async function interceptTrackingRequests(page) {
  const trackingRequests = [];
  const patterns = {
    ga4: /google-analytics\.com\/g\/collect/,
    metaPixel: /facebook\.com\/tr/,
    tiktok: /analytics\.tiktok\.com/,
    linkedin: /px\.ads\.linkedin\.com/,
    pinterest: /ct\.pinterest\.com/
  };
  page.on('request', request => {
    const url = request.url();
    for (const [platform, pattern] of Object.entries(patterns)) {
      if (pattern.test(url)) {
        trackingRequests.push({ timestamp: new Date().toISOString(), platform, url, method: request.method() });
        break;
      }
    }
  });
  return () => trackingRequests;
}

function validateOutcomes(dataLayer, expected) {
  const results = { passed: [], failed: [], warnings: [] };
  if (expected.dataLayerEvents) {
    expected.dataLayerEvents.forEach(eventName => {
      const found = dataLayer.some(item => item.event === eventName);
      if (found) results.passed.push(`Event '${eventName}' fired`);
      else results.failed.push(`Event '${eventName}' NOT fired`);
    });
  }
  return results;
}

module.exports = {
  launchGTMPreview, captureDataLayer, watchDataLayer, executeAction,
  interceptTrackingRequests, validateOutcomes
};

// A made-up web + server container pair for demos ("Trailhead Outfitters").
// Every ID is fictional. It carries one of each problem the Audit Lab looks for,
// so a demo shows every checkpoint even before anyone loads their own export.
const T = (key, value) => ({ type: 'TEMPLATE', key, value });
const B = (key, value) => ({ type: 'BOOLEAN', key, value: String(value) });
const cond = (type, a0, a1) => ({ type, parameter: [T('arg0', a0), T('arg1', a1)] });
const ce = name => ({ customEventFilter: [cond('EQUALS', '{{_event}}', name)] });

export function sampleWeb() {
  const ids = { accountId: '6000000001', containerId: '90000001' };
  const tag = (tagId, name, type, firing, parameter = [], extra = {}) => ({ ...ids, tagId, name, type, firingTriggerId: firing, parameter, tagFiringOption: 'ONCE_PER_EVENT', ...extra });
  const trig = (triggerId, name, type, extra = {}) => ({ ...ids, triggerId, name, type, ...extra });
  const dlv = (variableId, name, key, extra = {}) => ({ ...ids, variableId, name, type: 'v', parameter: [{ type: 'INTEGER', key: 'dataLayerVersion', value: '2' }, B('setDefaultValue', false), T('name', key)], ...extra });
  const cst = (variableId, name, value) => ({ ...ids, variableId, name, type: 'c', parameter: [T('value', value)] });
  return {
    exportFormatVersion: 2, exportTime: '2026-10-01 09:00:00',
    containerVersion: {
      ...ids, containerVersionId: '0',
      container: { ...ids, name: 'Trailhead Outfitters (sample)', publicId: 'GTM-SAMPLE1', usageContext: ['WEB'] },
      folder: [{ ...ids, folderId: '50', name: 'GA4' }],
      tag: [
        tag('1', 'GA4 - Config', 'googtag', ['2147479553'], [T('tagId', '{{CONST - GA4 ID}}'), { type: 'LIST', key: 'configSettingsTable', list: [{ type: 'MAP', map: [T('parameter', 'server_container_url'), T('parameterValue', 'https://sst.trailhead.example')] }] }], { parentFolderId: '50' }),
        tag('2', 'GA4 - purchase', 'gaawe', ['10'], [T('eventName', 'purchase'), T('measurementIdOverride', '{{CONST - GA4 ID}}'), { type: 'LIST', key: 'eventSettingsTable', list: [{ type: 'MAP', map: [T('parameter', 'value'), T('parameterValue', '{{DLV - ecommerce.value}}')] }, { type: 'MAP', map: [T('parameter', 'currency'), T('parameterValue', '{{DLV - ecommerce.currency}}')] }] }], { parentFolderId: '50' }),
        tag('3', 'GA4 - add_to_cart', 'gaawe', ['11'], [T('eventName', 'add_to_cart'), T('measurementIdOverride', '{{CONST - GA4 ID}}'), { type: 'LIST', key: 'eventSettingsTable', list: [{ type: 'MAP', map: [T('parameter', 'value'), T('parameterValue', '{{DLV - ecommerce.value}}')] }] }], { parentFolderId: '50' }),
        tag('4', 'GA4 - sign_up', 'gaawe', ['12'], [T('eventName', 'sign_up'), T('measurementIdOverride', '{{CONST - GA4 ID}}'), { type: 'LIST', key: 'eventSettingsTable', list: [{ type: 'MAP', map: [T('parameter', 'method'), T('parameterValue', '{{DLV - signup_method}}')] }] }]),
        tag('5', 'Google Ads - Purchase', 'awct', ['10'], [T('conversionId', '111111111'), T('conversionLabel', 'SAMPLELABEL1'), T('conversionValue', '{{DLV - ecommerce.value}}'), T('currencyCode', '{{DLV - ecommerce.currency}}'), T('orderId', '{{DLV - ecommerce.transaction_id}}')]),
        tag('6', 'Google Ads - Purchase (copy)', 'awct', ['10'], [T('conversionId', '111111111'), T('conversionLabel', 'SAMPLELABEL1'), T('conversionValue', '{{DLV - ecommerce.value}}'), T('currencyCode', '{{DLV - ecommerce.currency}}'), T('orderId', '{{DLV - ecommerce.transaction_id}}')]),
        tag('7', 'Google Ads - Remarketing', 'sp', ['2147479553'], [T('conversionId', '111111111')]),
        tag('8', 'Conversion Linker', 'gclidw', ['2147479553'], []),
        tag('9', 'Meta Pixel - Base', 'html', ['2147479553'], [T('html', '<script>!function(f,b,e,v,n,t,s){/* Meta base code */}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");fbq("init","{{CONST - Meta Pixel}}");fbq("track","PageView");</script>')]),
        tag('10', 'Meta Pixel - Purchase', 'html', ['10'], [T('html', '<script>fbq("track","Purchase",{value:{{DLV - ecommerce.value}},currency:"{{DLV - ecommerce.currency}}"});</script>')]),
        tag('11', 'Meta Pixel - Lead', 'html', ['13'], [T('html', '<script>fbq("track","Lead",{content_name:"{{DLV - form_name}}"});</script>')]),
        tag('12', 'Data Tag - purchase', 'cvt_SAMPLE', ['10'], [T('gtm_server_domain', 'https://sst.trailhead.example'), T('event_type', 'standard'), T('event_name_standard', 'purchase')]),
        tag('13', 'Data Tag - add_to_cart', 'cvt_SAMPLE', ['11'], [T('gtm_server_domain', 'https://sst.trailhead.example'), T('event_type', 'standard'), T('event_name_standard', 'add_to_cart')]),
        tag('14', 'UA - Pageview', 'ua', ['2147479553'], [T('trackingId', 'UA-000000-1'), T('trackType', 'TRACK_PAGEVIEW')]),
        tag('15', 'Hotjar', 'hjtc', ['2147479553'], [T('hotjar_site_id', '0000000')], { paused: true }),
        tag('16', 'TikTok Pixel - old', 'html', [], [T('html', '<script>/* TikTok base code */ttq.load("{{CONST - TikTok Pixel}}");</script>')]),
        tag('17', 'LinkedIn Insight', 'bzi', ['2147479553'], [T('partnerId', '0000000')]),
        tag('18', 'Tag 18', 'html', ['14'], [T('html', '<script>console.log("{{DLV - promo_code}}")</script>')]),
      ],
      trigger: [
        trig('10', 'CE - purchase', 'CUSTOM_EVENT', ce('purchase')),
        trig('11', 'CE - add_to_cart', 'CUSTOM_EVENT', ce('add_to_cart')),
        trig('12', 'CE - sign_up', 'CUSTOM_EVENT', ce('sign_up')),
        trig('13', 'CE - generate_lead', 'CUSTOM_EVENT', ce('generate_lead')),
        trig('14', 'Click - Promo banner', 'CLICK', { filter: [cond('CONTAINS', '{{Click Classes}}', 'promo')] }),
        trig('15', 'CE - begin_checkout', 'CUSTOM_EVENT', ce('begin_checkout')),
        trig('16', 'CE - purchase (old)', 'CUSTOM_EVENT', ce('purchase')),
        trig('17', 'Page View - Thank you', 'PAGEVIEW', { filter: [cond('CONTAINS', '{{Page Path}}', '/thank-you')] }),
      ],
      variable: [
        cst('20', 'CONST - GA4 ID', 'G-SAMPLE0000'),
        cst('21', 'CONST - Meta Pixel', '000000000000000'),
        cst('22', 'CONST - TikTok Pixel', 'SAMPLETIKTOK'),
        dlv('30', 'DLV - ecommerce.value', 'ecommerce.value'),
        dlv('31', 'DLV - ecommerce.currency', 'ecommerce.currency'),
        dlv('32', 'DLV - ecommerce.transaction_id', 'ecommerce.transaction_id'),
        dlv('33', 'DLV - ecommerce.items', 'ecommerce.items'),
        dlv('34', 'DLV - Order Value', 'ecommerce.value'),
        dlv('35', 'DLV - signup_method', 'method'),
        dlv('36', 'DLV - form_name', 'form_name'),
        dlv('37', 'DLV - user_email', 'user.email'),
        { ...ids, variableId: '40', name: 'JS - Page Type', type: 'jsm', parameter: [T('javascript', 'function(){return document.body.dataset.pageType}')] },
      ],
      builtInVariable: ['PAGE_URL', 'PAGE_PATH', 'PAGE_HOSTNAME', 'EVENT', 'CLICK_CLASSES', 'CLICK_TEXT'].map(type => ({ ...ids, type, name: { PAGE_URL: 'Page URL', PAGE_PATH: 'Page Path', PAGE_HOSTNAME: 'Page Hostname', EVENT: 'Event', CLICK_CLASSES: 'Click Classes', CLICK_TEXT: 'Click Text' }[type] })),
      customTemplate: [{ ...ids, templateId: 'SAMPLE', name: 'Data Tag' }],
    },
  };
}

export function sampleServer() {
  const ids = { accountId: '6000000001', containerId: '90000002' };
  return {
    exportFormatVersion: 2, exportTime: '2026-10-01 09:00:00',
    containerVersion: {
      ...ids, containerVersionId: '0',
      container: { ...ids, name: 'Trailhead Outfitters server (sample)', publicId: 'GTM-SAMPLE2', usageContext: ['SERVER'] },
      client: [
        { ...ids, clientId: '1', name: 'GA4', type: 'gaaw_client', priority: 0 },
        { ...ids, clientId: '2', name: 'Data Client', type: 'cvt_2_97', priority: 0 },
      ],
      customTemplate: [{ ...ids, templateId: '97', name: 'Data Client' }, { ...ids, templateId: '19', name: 'Meta Conversion API' }],
      trigger: [
        { ...ids, triggerId: '60', name: 'Event - purchase', type: 'ALWAYS', filter: [cond('EQUALS', '{{Event Name}}', 'purchase')] },
        { ...ids, triggerId: '61', name: 'Event - page_view', type: 'ALWAYS', filter: [cond('EQUALS', '{{Event Name}}', 'page_view')] },
        { ...ids, triggerId: '62', name: 'Event - lead', type: 'ALWAYS', filter: [cond('EQUALS', '{{Event Name}}', 'generate_lead')] },
      ],
      tag: [
        { ...ids, tagId: '70', name: 'GA4 - forward all', type: 'sgtmgaaw', firingTriggerId: ['61', '60'] },
        { ...ids, tagId: '71', name: 'Meta CAPI - Purchase', type: 'cvt_2_19', firingTriggerId: ['60'], parameter: [T('accessToken', '{{CONST - Meta token}}')] },
        { ...ids, tagId: '72', name: 'Meta CAPI - Lead', type: 'cvt_2_19', firingTriggerId: ['62'], parameter: [T('accessToken', '{{CONST - Meta token}}')] },
      ],
      variable: [
        { ...ids, variableId: '80', name: 'Event Name', type: 'ed', parameter: [T('keyPath', 'event_name')] },
        { ...ids, variableId: '81', name: 'CONST - Meta token', type: 'c', parameter: [T('value', 'SAMPLE-NOT-A-REAL-TOKEN')] },
      ],
      folder: [], builtInVariable: [{ ...ids, type: 'CLIENT_NAME', name: 'Client Name' }],
    },
  };
}

import { Actor, log } from 'apify';
import { PlaywrightCrawler } from 'crawlee';

type StartUrl = { url: string };
type Input = {
    startUrls?: StartUrl[];
    maxPages?: number;
    sameDomainOnly?: boolean;
    maxElementsPerPage?: number;
};

type Candidate = {
    eventName: string;
    interaction: 'click' | 'form_start' | 'form_submit';
    selector: string;
    rationale: string;
};

await Actor.init();

try {
    const input = (await Actor.getInput<Input>()) ?? {};
    const startUrls = input.startUrls?.map(({ url }) => url).filter(Boolean) ?? [];
    if (startUrls.length === 0) throw new Error('startUrls must contain at least one URL');

    const scopeHostname = new URL(startUrls[0]).hostname;
    const maxPages = Math.min(Math.max(input.maxPages ?? 10, 1), 100);
    const maxElements = Math.min(Math.max(input.maxElementsPerPage ?? 250, 1), 500);
    const sameDomainOnly = input.sameDomainOnly ?? true;

    const crawler = new PlaywrightCrawler({
        maxRequestsPerCrawl: maxPages,
        requestHandlerTimeoutSecs: 60,
        async requestHandler({ request, page, enqueueLinks }) {
            const inventory = await page.evaluate((limit: number) => {
                const clean = (value: string | null | undefined, length = 160) =>
                    (value ?? '').replace(/\s+/g, ' ').trim().slice(0, length);
                const stableSelector = (element: Element) => {
                    const attr = (name: string) => clean(element.getAttribute(name), 100);
                    const safe = (value: string) => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
                    const id = attr('id');
                    if (id && /^[A-Za-z][A-Za-z0-9_-]*$/.test(id)) return `#${id}`;
                    for (const name of ['data-testid', 'data-track', 'data-event', 'name']) {
                        const value = attr(name);
                        if (value) return `[${name}="${safe(value)}"]`;
                    }
                    const tag = element.tagName.toLowerCase();
                    const type = attr('type');
                    return type ? `${tag}[type="${safe(type)}"]` : tag;
                };
                const allowedAttributes = ['id', 'name', 'type', 'role', 'aria-label', 'data-testid', 'data-track', 'data-event'];
                const controls = Array.from(document.querySelectorAll(
                    'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="link"], [contenteditable="true"]',
                )).filter((element) => {
                    const style = window.getComputedStyle(element);
                    return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
                }).slice(0, limit);

                return controls.map((element) => {
                    const attributes = Object.fromEntries(allowedAttributes
                        .map((name) => [name, clean(element.getAttribute(name), 100)])
                        .filter(([, value]) => value));
                    const tag = element.tagName.toLowerCase();
                    const type = clean(element.getAttribute('type'), 40).toLowerCase();
                    const candidates: Candidate[] = [];
                    if (tag === 'input' || tag === 'select' || tag === 'textarea' || element.closest('form')) {
                        candidates.push({ eventName: 'form_started', interaction: 'form_start', selector: stableSelector(element), rationale: 'Field or control belongs to a visible form.' });
                    }
                    if (tag === 'button' || tag === 'a' || element.getAttribute('role') === 'button') {
                        candidates.push({ eventName: 'cta_clicked', interaction: 'click', selector: stableSelector(element), rationale: 'Visible link or button; confirm business intent before tracking.' });
                    }
                    if ((tag === 'button' && type === 'submit') || element.getAttribute('type') === 'submit') {
                        candidates.push({ eventName: 'form_submitted', interaction: 'form_submit', selector: stableSelector(element), rationale: 'Submit control; prefer an application confirmation event.' });
                    }
                    return {
                        selector: stableSelector(element), tag, type: type || undefined,
                        text: clean(element.textContent), attributes, candidates,
                    };
                });
            }, maxElements);

            await Actor.pushData({
                kind: 'page_inventory', url: request.loadedUrl ?? request.url,
                title: await page.title(), controls: inventory,
                safety: { readOnly: true, clickedControls: false, submittedForms: false, capturedInputValues: false },
            });

            await enqueueLinks({
                selector: 'a[href]',
                strategy: sameDomainOnly ? 'same-domain' : 'same-hostname',
                transformRequestFunction: (next) => {
                    if (sameDomainOnly && new URL(next.url).hostname !== scopeHostname) return false;
                    return next;
                },
            });
        },
        failedRequestHandler({ request }) { log.warning('Page inventory failed', { url: request.url }); },
    });

    log.info('Starting read-only DOM inventory', { maxPages, maxElements, sameDomainOnly });
    await crawler.run(startUrls);
} finally {
    await Actor.exit();
}

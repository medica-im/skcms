import { test, expect, chromium, firefox, type Page } from '@playwright/test';
import { originFor, requireSite } from './sites';
import { createSessionCookie, sessionCookieName } from '../fixtures/session';

/**
 * The sidebar of a programme page stays after a reload.
 *
 * Reported on /prevention/alimentation: the sidebar appeared, then vanished
 * about two seconds later. Sampled over several seconds because the server
 * render alone is right; what removes it happens after hydration.
 */

const SITE = 'msp-vedene.fr';
const ORIGIN = originFor(SITE);
const PATH = '/prevention/alimentation';
const RAIL = '#sidebar-left .app-rail';

test.beforeAll(async () => await requireSite(SITE));

/** Whether the rail is visible, and where the page is, every 250 ms for 6 s. */
async function sample(page: Page) {
	const samples: { t: number; visible: boolean; url: string }[] = [];
	for (let t = 0; t <= 6000; t += 250) {
		samples.push({ t, visible: await page.locator(RAIL).isVisible(), url: page.url() });
		await page.waitForTimeout(250);
	}
	return samples;
}

const BROWSERS = { chromium, firefox };

for (const [name, browserType] of Object.entries(BROWSERS))
for (const role of ['anonymous', 'superuser'] as const) {
	test(`the sidebar is still there 6 s after a reload (${name}, ${role})`, async () => {
		const browser = await browserType.launch();
		const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
		if (role !== 'anonymous') {
			await context.addCookies([
				{ name: sessionCookieName(ORIGIN), value: await createSessionCookie(role, ORIGIN), url: ORIGIN }
			]);
		}
		const page = await context.newPage();
		const errors: string[] = [];
		page.on('pageerror', (e) => errors.push(String(e)));

		await page.goto(`${ORIGIN}${PATH}`);
		await page.reload();
		await page.locator(RAIL).waitFor({ timeout: 20_000 });
		const samples = await sample(page);

		const gone = samples.filter((s) => !s.visible);
		expect(gone, `the rail disappeared:\n${JSON.stringify(gone, null, 1)}`).toEqual([]);
		expect(errors).toEqual([]);
		await browser.close();
	});
}

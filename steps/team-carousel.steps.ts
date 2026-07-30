import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { addSessionCookie, djangoShell } from './common.steps';

const { Given, When, Then } = createBdd();

const API_ORIGIN = 'http://dev.santelyon3.fr';

/**
 * Other scenarios restrict this avatar, so set it explicitly rather than relying
 * on whatever the previous test left behind.
 */
Given('the entry {string} avatar is public', async ({}, slug: string) => {
	const response = await fetch(`${API_ORIGIN}/api/v2/fullentries/slug/${slug}`, {
		headers: { Accept: 'application/json' }
	});
	expect(response.ok, `GET entry ${slug} -> ${response.status}`).toBeTruthy();
	const { uid } = await response.json();
	expect(uid, `entry ${slug} not found`).toBeTruthy();
	const out = await djangoShell(`
from addressbook.models import Contact
c = Contact.objects.get(neomodel_uid="${uid}")
c.avatar_access = "anonymous"
c.save()
print("ACCESS_SET", c.avatar_access)
`);
	expect(out).toContain('ACCESS_SET anonymous');
});

/** Horizontal scroll offset of the carousel track. */
async function trackOffset(page: import('@playwright/test').Page) {
	return page.evaluate(() => {
		const track = document.querySelector('[data-carousel-slide]')?.parentElement;
		return track ? Math.round(track.scrollLeft) : -1;
	});
}

// The arrows are flex siblings ordered around the track, not absolutely
// positioned, so they are identified by their order class.
const prevButton = (page: import('@playwright/test').Page) =>
	page.locator('.carousel-arrow.order-first');
const nextButton = (page: import('@playwright/test').Page) =>
	page.locator('.carousel-arrow.order-last');

Given('the home page carousel has more than one slide', async ({ page, context, baseURL }) => {
	// A superuser sees every avatar, which guarantees several slides regardless
	// of the access levels currently set on the test data.
	await addSessionCookie(context, 'superuser', baseURL);
	await page.goto('/', { waitUntil: 'networkidle' });
	const slides = page.locator('[data-carousel-slide]');
	await expect(slides.first()).toBeAttached({ timeout: 20_000 });
	expect(await slides.count(), 'expected more than one carousel slide').toBeGreaterThan(1);
	// Autoplay would move the carousel under the test; hovering pauses it.
	await page.locator('figure').first().hover();
	await page.waitForTimeout(1000);
});

Then('a previous and a next button are visible', async ({ page }) => {
	await expect(prevButton(page)).toBeVisible();
	await expect(nextButton(page)).toBeVisible();
});

Then('at least one of them is clickable', async ({ page }) => {
	const enabled =
		(await prevButton(page).isEnabled()) || (await nextButton(page).isEnabled());
	expect(enabled, 'neither the previous nor the next button is enabled').toBe(true);
});

/** Track position captured just before navigating, to prove it changed. */
let offsetBeforeClick = -1;

When('I click the enabled navigation button', async ({ page }) => {
	offsetBeforeClick = await trackOffset(page);
	const next = nextButton(page);
	const target = (await next.isEnabled()) ? next : prevButton(page);
	await expect(target).toBeEnabled();
	await target.click();
});

Then('the carousel has moved to another slide', async ({ page }) => {
	// The library animates the scroll, so poll until it settles somewhere else.
	await expect
		.poll(() => trackOffset(page), {
			timeout: 15_000,
			message: `carousel did not move from ${offsetBeforeClick}`
		})
		.not.toBe(offsetBeforeClick);
});

/**
 * Rendered size of the first avatar. The picture is what a visitor sees change,
 * so it is measured directly — the figure around it can keep its width while
 * the image inside still resizes.
 */
async function avatarBox(page: import('@playwright/test').Page) {
	const image = page.locator('figure img').first();
	await image.waitFor({ timeout: 20_000 });
	return image.evaluate((img) => {
		const rect = img.getBoundingClientRect();
		return {
			width: Math.round(rect.width),
			height: Math.round(rect.height),
			centre: Math.round(rect.left + rect.width / 2)
		};
	});
}

type Box = { width: number; height: number; centre: number };
let ssrBox: Box | null = null;
let hydratedBox: Box | null = null;

/**
 * Disabling JavaScript leaves the component's SSR branch on screen, which is
 * exactly the first impression a visitor gets before hydration.
 */
Given('I load the home page without JavaScript', async ({ browser, baseURL }) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	const page = await context.newPage();
	await page.goto(new URL('/', baseURL ?? 'http://localhost:3000').href, {
		waitUntil: 'domcontentloaded'
	});
	// An avatar is intrinsically sized, so its box only means anything once the
	// image has actually loaded.
	await page.locator('figure img').first().waitFor({ timeout: 20_000 });
	await page.waitForTimeout(500);
	ssrBox = (await avatarBox(page)) as Box | null;
	await context.close();
});

Given('I note the size of the first avatar', async ({}) => {
	expect(ssrBox, 'no server-rendered avatar was captured').toBeTruthy();
});

When('I load the home page with JavaScript', async ({ page }) => {
	await page.goto('/', { waitUntil: 'networkidle' });
	await page.locator('[data-carousel-slide]').first().waitFor({ timeout: 20_000 });
	await pauseAutoplay(page);
	hydratedBox = (await avatarBox(page)) as Box | null;
});

Then('the avatar is displayed at the same size', async ({}) => {
	expect(ssrBox && hydratedBox, 'missing measurement').toBeTruthy();
	// Sub-pixel rounding is fine; anything larger is a visible change of size.
	expect(
		Math.abs(hydratedBox!.width - ssrBox!.width),
		`avatar width went from ${ssrBox!.width}px to ${hydratedBox!.width}px`
	).toBeLessThanOrEqual(1);
	expect(
		Math.abs(hydratedBox!.height - ssrBox!.height),
		`avatar height went from ${ssrBox!.height}px to ${hydratedBox!.height}px`
	).toBeLessThanOrEqual(1);
});

Then('the avatar has not moved horizontally', async ({}) => {
	expect(ssrBox && hydratedBox, 'missing measurement').toBeTruthy();
	expect(
		Math.abs(hydratedBox!.centre - ssrBox!.centre),
		`avatar centre moved from ${ssrBox!.centre} to ${hydratedBox!.centre} on hydration`
	).toBeLessThanOrEqual(1);
});

/** Autoplay would move the carousel under the assertions; hovering pauses it. */
async function pauseAutoplay(page: import('@playwright/test').Page) {
	await page.locator('figure').first().hover();
	await page.waitForTimeout(800);
}

Given('the carousel is {string}', async ({ page }, position: string) => {
	if (position === 'at the start') return;
	// "advanced": move one slide along before anything else happens.
	await pauseAutoplay(page);
	const next = nextButton(page);
	if (await next.isEnabled()) {
		await next.click();
		await page.waitForTimeout(2200);
	}
});

Given('the carousel is {string} while I sign out', async ({ page }, visibility: string) => {
	if (visibility === 'off screen') {
		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
	} else {
		await page.evaluate(() => window.scrollTo(0, 0));
	}
	await page.waitForTimeout(1000);
});

When('I return to the carousel', async ({ page }) => {
	await page.evaluate(() => window.scrollTo(0, 0));
	await page.waitForTimeout(2000);
	await pauseAutoplay(page);
});

/**
 * The real invariant: an arrow may legitimately be disabled (prev on the first
 * slide, next on the last), but an ENABLED arrow must actually move the
 * carousel. "Enabled but inert" is precisely the bug this guards against.
 */
Then(
	'clicking {string} moves the carousel or that arrow is disabled',
	async ({ page }, arrow: string) => {
		const button = arrow === 'prev' ? prevButton(page) : nextButton(page);
		await expect(button).toBeVisible();
		if (!(await button.isEnabled())) return; // legitimately at the end of travel

		const before = await trackOffset(page);
		await button.click({ force: true });
		await expect
			.poll(() => trackOffset(page), {
				timeout: 15_000,
				message:
					`"${arrow}" was enabled but the carousel stayed at ${before} — ` +
					`the library's cached slide count/geometry is stale`
			})
			.not.toBe(before);
	}
);

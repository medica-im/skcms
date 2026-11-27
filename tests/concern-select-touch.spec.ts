import { test, expect, devices, type Page } from '@playwright/test';

/**
 * The directory selectors under a finger, on a phone.
 *
 * On a phone the keyboard takes the lower half of the screen, so a directory
 * selector (fitOnPhone in $lib/Web/Select.svelte) brings its field up under the
 * app bar and opens its list below it. Moving the page under a finger is exactly
 * what breaks a tap: the browser sends its mousedown and click after the touch,
 * at the point the finger touched, and if the page has moved by then they land
 * beside the select, which closes its list and drops the focus before the
 * keyboard can show. A desktop click never sees this, so it is checked with
 * touch emulation, on the fixture page /_test/concern-select.
 *
 * The keyboard itself is not drawn by an emulated browser; the input holding
 * the focus is what makes a real one show it, and is what is checked.
 */

test.use({ ...devices['Pixel 7'] });

const SELECTORS = {
	condition: '.concern-select',
	type: '.type-select'
} as const;

const box = (page: Page, which: keyof typeof SELECTORS) =>
	page.locator(`${SELECTORS[which]} .svelte-select`).first();
const field = (page: Page, which: keyof typeof SELECTORS) =>
	page.locator(`${SELECTORS[which]} input[type="text"]`);
const list = (page: Page) => page.locator('.svelte-select-list');

async function open(page: Page, which: keyof typeof SELECTORS) {
	await page.goto('/_test/concern-select', { waitUntil: 'networkidle' });
	await expect(field(page, which)).toBeVisible();
	await field(page, which).tap();
}

for (const which of Object.keys(SELECTORS) as (keyof typeof SELECTORS)[]) {
	test(`the ${which} selector: a tap opens the list below the field, above the keyboard, with the keyboard`, async ({
		page
	}) => {
		await open(page, which);

		await expect(field(page, which)).toBeFocused();
		await expect(list(page)).toBeVisible();
		await page.waitForTimeout(400);

		const header = (await page.locator('#shell-header').boundingBox())!;
		const fieldBox = (await box(page, which).boundingBox())!;
		const listBox = (await list(page).boundingBox())!;
		expect(listBox.y).toBeGreaterThanOrEqual(fieldBox.y + fieldBox.height);
		// Above the keyboard (estimated at 45% of the screen before it shows), or as
		// far up as the field can go: under the app bar.
		const fits = listBox.y + listBox.height <= page.viewportSize()!.height * 0.55;
		const atTop = fieldBox.y - (header.y + header.height) < 24;
		expect(fits || atTop).toBe(true);

		// Not a flash: still open, still focused, once the tap has fully landed.
		await page.waitForTimeout(800);
		await expect(list(page)).toBeVisible();
		await expect(field(page, which)).toBeFocused();
	});
}

/** Every scroll position the page region goes through from now on, other than where it is. */
async function recordScroll(page: Page) {
	await page.evaluate(() => {
		const region = document.querySelector('#page')!;
		const start = region.scrollTop;
		(window as any).__scrolls = [];
		region.addEventListener('scroll', () => {
			if (region.scrollTop !== start) (window as any).__scrolls.push(region.scrollTop);
		});
	});
	return () => page.evaluate(() => (window as any).__scrolls as number[]);
}

test('a short list that fits above the keyboard opens where it is: the page does not move', async ({
	page
}) => {
	await page.goto('/_test/concern-select', { waitUntil: 'networkidle' });
	const department = page.locator('.department-select input[type="text"]');
	await expect(department).toBeVisible();
	const scrolls = await recordScroll(page);
	await department.tap();

	await expect(list(page)).toBeVisible();
	await page.waitForTimeout(800);
	await expect(list(page)).toBeVisible();
	await expect(department).toBeFocused();
	expect(await scrolls()).toEqual([]);
});

test('clearing a choice with the cross leaves the page where it is and the keyboard closed', async ({
	page
}) => {
	await open(page, 'type');
	await list(page).locator('.item', { hasText: 'Psychologue' }).tap();
	await expect(page.locator('.type-select .selected-item')).toHaveText('Psychologue');
	await page.evaluate(() => (document.querySelector('#page')!.scrollTop = 0));
	await page.waitForTimeout(300);

	const scrolls = await recordScroll(page);
	const cross = page.locator('.type-select .clear-select');
	await cross.scrollIntoViewIfNeeded();
	const before = await scrolls();
	await cross.tap();

	await expect(page.locator('.type-select .selected-item')).toHaveCount(0);
	await page.waitForTimeout(800);
	expect(await scrolls()).toEqual(before);
	await expect(field(page, 'type')).not.toBeFocused();
});

test('a long list brings the field up under the app bar', async ({ page }) => {
	await open(page, 'condition');
	await expect(list(page)).toBeVisible();
	const header = (await page.locator('#shell-header').boundingBox())!;
	await expect
		.poll(async () => (await box(page, 'condition').boundingBox())!.y - (header.y + header.height))
		.toBeLessThan(24);
});

test('a short list low on the screen moves only by what it lacks, not up to the app bar', async ({
	page
}) => {
	await page.goto('/_test/concern-select', { waitUntil: 'networkidle' });
	const facility = page.locator('.facility-select input[type="text"]');
	await expect(facility).toBeVisible();
	await facility.tap();

	await expect(list(page)).toBeVisible();
	await page.waitForTimeout(600);
	const screenHeight = page.viewportSize()!.height;
	const listBox = (await list(page).boundingBox())!;
	// It ends above the keyboard (estimated at 45% of the screen before it shows)…
	expect(listBox.y + listBox.height).toBeLessThanOrEqual(screenHeight * 0.55);
	// …and the field stays well below the app bar, with what was above it still in view.
	const header = (await page.locator('#shell-header').boundingBox())!;
	const fieldBox = (await page.locator('.facility-select .svelte-select').first().boundingBox())!;
	expect(fieldBox.y).toBeGreaterThan(header.y + header.height + 100);
	await expect(facility).toBeFocused();
});

test('a long list scrolls the field up progressively, not in one jump', async ({ page }) => {
	await page.goto('/_test/concern-select', { waitUntil: 'networkidle' });
	await expect(field(page, 'condition')).toBeVisible();
	const scrolls = await recordScroll(page);
	await field(page, 'condition').tap();

	await expect.poll(async () => (await scrolls()).length).toBeGreaterThan(2);
	const steps = await scrolls();
	expect(new Set(steps).size).toBeGreaterThan(2);
});

test.describe('with « reduce motion » on', () => {
	test.use({ reducedMotion: 'reduce' });

	test('the field jumps up at once', async ({ page }) => {
		await page.goto('/_test/concern-select', { waitUntil: 'networkidle' });
		await expect(field(page, 'condition')).toBeVisible();
		const scrolls = await recordScroll(page);
		await field(page, 'condition').tap();

		await expect.poll(async () => (await scrolls()).length).toBeGreaterThan(0);
		await page.waitForTimeout(500);
		expect(new Set(await scrolls()).size).toBe(1);
	});
});

test('typing narrows the list, and picking closes the keyboard and shows the choice', async ({
	page
}) => {
	await open(page, 'condition');
	await expect(field(page, 'condition')).toBeFocused();

	await page.keyboard.type('alc');
	const option = list(page).locator('.item', { hasText: 'Addiction alcool' });
	await expect(option).toBeVisible();
	await option.tap();

	await expect(page).toHaveURL(/concern=c-alc/);
	await expect(field(page, 'condition')).not.toBeFocused();
	await expect(list(page)).toBeHidden();
	await expect(page.locator('.concern-select .selected-item')).toHaveText('Addiction alcool');
});

test('the type selector closes the keyboard too once a choice is tapped', async ({ page }) => {
	await open(page, 'type');
	await expect(field(page, 'type')).toBeFocused();

	await list(page).locator('.item', { hasText: 'Psychologue' }).tap();

	await expect(field(page, 'type')).not.toBeFocused();
	await expect(list(page)).toBeHidden();
	await expect(page.locator('.type-select .selected-item')).toHaveText('Psychologue');
});

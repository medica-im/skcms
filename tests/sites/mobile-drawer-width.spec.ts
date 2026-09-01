import { test, expect, type Page } from '@playwright/test';
import { originFor, requireSite, type SiteName } from './sites';

/**
 * The mobile menu is a constant share of the screen, whatever is inside it.
 *
 * The drawer opens in one of two states — just the rail of icons when no
 * category is current (the common case: any page not itself in the menu), or
 * the rail plus a category's links. It used to size itself per state, and the
 * two drifted apart.
 *
 * The rail-only state passed Skeleton's Drawer `w-[80]`, which is not a real
 * Tailwind class. It emitted no CSS, but Drawer falls back to its own `w-[90%]`
 * only when the string is empty (dist/utilities/Drawer:120), so a truthy
 * non-class left the drawer with no width and it sized to its contents by
 * accident. Replacing it with a real `max-w-[80px]` did what it said and
 * pinned the drawer to the 80px rail: the hamburger showed a column of icons
 * and no menu.
 *
 * So the rule is measured against the **viewport**, never against the drawer's
 * own contents. That distinction is the whole point of this spec: when the
 * drawer collapsed onto the rail it was 80px around a rail whose content is
 * 79px wide, so every "is the rail visible" check passed while the menu was
 * visibly broken. Only the screen is a fixed reference.
 *
 * Lyon 3 because it is the site whose menu carries several categories; the
 * drawer itself is a $lib component and the rule is about the component.
 */

const SITE: SiteName = 'santelyon3.fr';
const ORIGIN = originFor(SITE);

test.beforeAll(async () => await requireSite(SITE));

/** Phone widths: the narrowest worth supporting, then the common iPhones. */
const PHONES = [320, 390, 430];

/** The share of the screen the drawer takes, and how far it may drift. */
const SHARE = 0.85;
const TOLERANCE = 0.03;

/**
 * The touch-target floor this project holds itself to. Patients and healthcare
 * professionals in France average 50+, and the backdrop is a dismiss control
 * like any other — see the hamburger's own comment in SkeletonAppBar.svelte.
 */
const MIN_TAP = 44;

/** The drawer panel, measured against the screen rather than its contents. */
async function readDrawer(page: Page) {
	return page.evaluate(() => {
		const panel = document.querySelector('[data-testid="drawer"]');
		if (!panel) return null;
		const r = panel.getBoundingClientRect();
		const rail = panel.querySelector('.app-rail');
		return {
			width: Math.round(r.width),
			right: Math.round(r.right),
			// The rail of icons: the drawer's whole content when no category is
			// open, and what "no empty space beside it" is measured against.
			rail: rail ? Math.round(rail.getBoundingClientRect().width) : 0,
			// Is a category's link list showing, or is this the rail alone?
			hasLinks: !!panel.querySelector('section'),
			viewport: document.documentElement.clientWidth
		};
	});
}

/** Open the menu the way a reader does: tap the hamburger. */
async function openMenu(page: Page, width: number, url = ORIGIN) {
	await page.setViewportSize({ width, height: 844 });
	await page.goto(url, { waitUntil: 'networkidle' });
	// The hamburger is the only btn-icon in the bar's lead slot.
	await page.locator('header button.btn-icon').first().click();
	await page.waitForSelector('[data-testid="drawer"]', { timeout: 10_000 });
	// The drawer animates in; measure once it has settled.
	await page.waitForTimeout(600);
	const found = await readDrawer(page);
	expect(found, 'the hamburger opened no drawer').not.toBeNull();
	return found!;
}

/**
 * Two states, two rules — they are not the same drawer.
 *
 * The home page is not a menu entry, so no category is current and the drawer
 * holds nothing but the rail of icons. It must then be exactly as wide as that
 * rail: a share of the screen here draws a blank panel beside the icons, which
 * is what the hamburger showed on every page outside the menu.
 *
 * A programme page opens with its category's links, which need room — and there
 * the share matters, because the strip of backdrop beside the panel is the only
 * way to dismiss the drawer by tapping.
 */
const STATES = [
	{ name: 'showing just the rail', path: '', links: false },
	{ name: 'showing a category', path: '/prevention', links: true }
] as const;

for (const width of PHONES) {
	test(`the menu is only as wide as the rail at ${width}px, with no category open`, async ({
		page
	}) => {
		const m = await openMenu(page, width, ORIGIN);

		// Guards the premise: if the home page ever gained a menu entry this
		// state would stop being reachable and the assertion below would pass
		// without testing anything.
		expect(m.hasLinks, `expected no category open at ${ORIGIN}`).toBe(false);
		expect(m.rail, 'the drawer rendered no rail').toBeGreaterThan(0);

		// The whole rule: nothing beside the icons. Measured against the rail
		// rather than a fixed number, because the rail's own width is Skeleton's
		// to choose and may change.
		const beside = m.width - m.rail;
		expect(
			beside,
			`the drawer is ${m.width}px around an ${m.rail}px rail, so ${beside}px ` +
				`of empty panel is held open beside the icons`
		).toBeLessThanOrEqual(2);
	});

	test(`the menu takes ${SHARE * 100}% of a ${width}px screen showing a category`, async ({
		page
	}) => {
		const m = await openMenu(page, width, `${ORIGIN}/prevention`);

		expect(m.hasLinks, `expected a category open at ${ORIGIN}/prevention`).toBe(true);

		const share = m.width / m.viewport;
		expect(
			share,
			`the menu is ${m.width}px of a ${m.viewport}px screen — ` +
				`${(share * 100).toFixed(0)}%, not ${SHARE * 100}%`
		).toBeCloseTo(SHARE, 1);
		expect(Math.abs(share - SHARE)).toBeLessThanOrEqual(TOLERANCE);
	});

	test(`enough backdrop is left to tap the menu closed at ${width}px showing a category`, async ({
		page
	}) => {
		const m = await openMenu(page, width, `${ORIGIN}/prevention`);
		const gap = m.viewport - m.width;
		expect(
			gap,
			`the menu is ${m.width}px of a ${m.viewport}px screen, leaving ` +
				`${gap}px of backdrop — under the ${MIN_TAP}px a finger needs`
		).toBeGreaterThanOrEqual(MIN_TAP);
	});
}

for (const state of STATES) {
	for (const width of PHONES) {
	test(`the menu does not overflow a ${width}px screen ${state.name}`, async ({ page }) => {
			const m = await openMenu(page, width, `${ORIGIN}${state.path}`);
			expect(
				m.right,
				`the menu ends ${m.right - m.viewport}px past the right edge`
			).toBeLessThanOrEqual(m.viewport + 1);
		});
	}
}

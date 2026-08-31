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
		return {
			width: Math.round(r.width),
			right: Math.round(r.right),
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
 * Both states, one width. The home page is not a menu entry, so it opens on
 * the rail alone — the state that regressed; a programme page opens with its
 * category's links showing.
 */
const STATES = [
	{ name: 'showing just the rail', path: '', links: false },
	{ name: 'showing a category', path: '/prevention', links: true }
] as const;

for (const state of STATES) {
	for (const width of PHONES) {
		test(`the menu takes ${SHARE * 100}% of a ${width}px screen ${state.name}`, async ({
			page
		}) => {
			const m = await openMenu(page, width, `${ORIGIN}${state.path}`);

			// Guards the premise: if this state stopped being reachable the
			// width assertion below would pass without testing anything.
			expect(
				m.hasLinks,
				`expected the drawer ${state.name} at ${ORIGIN}${state.path}`
			).toBe(state.links);

			const share = m.width / m.viewport;
			expect(
				share,
				`the menu is ${m.width}px of a ${m.viewport}px screen — ` +
					`${(share * 100).toFixed(0)}%, not ${SHARE * 100}%`
			).toBeCloseTo(SHARE, 1);
			expect(Math.abs(share - SHARE)).toBeLessThanOrEqual(TOLERANCE);
		});

		test(`enough backdrop is left to tap the menu closed at ${width}px ${state.name}`, async ({
			page
		}) => {
			const m = await openMenu(page, width, `${ORIGIN}${state.path}`);
			const gap = m.viewport - m.width;
			expect(
				gap,
				`the menu is ${m.width}px of a ${m.viewport}px screen, leaving ` +
					`${gap}px of backdrop — under the ${MIN_TAP}px a finger needs`
			).toBeGreaterThanOrEqual(MIN_TAP);
		});

		test(`the menu does not overflow a ${width}px screen ${state.name}`, async ({ page }) => {
			const m = await openMenu(page, width, `${ORIGIN}${state.path}`);
			expect(
				m.right,
				`the menu ends ${m.right - m.viewport}px past the right edge`
			).toBeLessThanOrEqual(m.viewport + 1);
		});
	}
}

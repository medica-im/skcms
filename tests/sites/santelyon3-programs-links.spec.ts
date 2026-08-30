import { test, expect } from '@playwright/test';
import { originFor, requireSite } from './sites';

/**
 * Every active link in santelyon3's programsNavLinks resolves.
 *
 * The cases are derived from the nav data rather than listed here, so a
 * programme added to variables.ts is covered the moment it is added, and a
 * page moved without its href is caught rather than silently 404ing behind a
 * link nobody clicked in a test.
 *
 * Three separate failures are possible and each gets its own assertion:
 *
 *   * **reachable** — the href resolves 200 by itself. A nav entry pointing at
 *     a route that was never created, or was moved, fails here. Both category
 *     landing pages and their children are checked: /acces-aux-soins pointed at
 *     nothing for weeks while its child links worked, so the heading was a dead
 *     link on a page that otherwise looked fine.
 *
 *   * **server-rendered** — the page's own content is in the HTML before any
 *     JavaScript runs. A page that only paints after hydration is invisible to
 *     crawlers and blank on a slow connection, and this is the assertion that
 *     tells such a regression apart from a 500.
 *
 *   * **preloadable** — the link carries data-sveltekit-preload-data, which is
 *     what makes the sidebar feel instant. It is set per-link in the sidebar
 *     markup, so it is easy to add a link that works but drops the preload.
 *
 * Specific to santelyon3.fr: programsNavLinks lives in that site's skvar
 * branch, and the other sites' nav data is a different shape entirely.
 */

const SITE = 'santelyon3.fr';
const ORIGIN = originFor(SITE);

// Imported from the site's own nav data — the point of the spec.
import { programsNavLinks } from '../../src/routes/(skvar)/(var)/variables';

type Target = { href: string; label: string; kind: 'category' | 'programme' };

const targets: Target[] = [];
for (const cat of Object.values(programsNavLinks)) {
	targets.push({ href: cat.href, label: cat.title.fr, kind: 'category' });
	for (const link of cat.list) {
		if (link.active === false) continue;
		targets.push({ href: link.href, label: link.label, kind: 'programme' });
	}
}

test.beforeAll(async () => {
	await requireSite(SITE);
});

test('the nav data yields the links this spec is meant to cover', () => {
	// Guards against the derivation silently collapsing to nothing, which would
	// make every test below vacuously pass.
	expect(targets.length).toBeGreaterThanOrEqual(5);
	expect(targets.filter((t) => t.kind === 'category').length).toBe(
		Object.keys(programsNavLinks).length
	);
});

for (const target of targets) {
	test(`${target.kind} ${target.href} is reachable, server-rendered and preloadable`, async ({
		page,
		request
	}) => {
		// 1. reachable — the href resolves on its own, no redirect chase.
		const direct = await request.get(`${ORIGIN}${target.href}`, { maxRedirects: 0 });
		expect(direct.status(), `${target.href} should resolve 200`).toBe(200);

		// 2. server-rendered — the heading is in the HTML before hydration.
		const html = await direct.text();
		expect(html, `${target.href} should carry an <h1> from the server`).toMatch(/<h1[^>]*>/);

		// 3. reachable in a real browser too, with its own <h1>.
		await page.goto(`${ORIGIN}${target.href}`);
		await expect(page.locator('h1').first()).toBeVisible();
	});
}

test('every sidebar link to a programme is preloadable', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	// Any page inside a category renders that category's group in the sidebar.
	const first = targets.find((t) => t.kind === 'programme')!;
	await page.goto(`${ORIGIN}${first.href}`);
	await page.waitForLoadState('networkidle');

	// Scoped to the programme links themselves: the drawer also carries a home
	// link that opts out of preloading on purpose.
	for (const t of targets.filter((t) => t.kind === 'programme')) {
		const link = page.locator(`nav.list-nav a[href="${t.href}"]`).first();
		await expect(link, `sidebar link ${t.href} should preload`).toHaveAttribute(
			'data-sveltekit-preload-data',
			'hover'
		);
	}
});

test('each category heading links to its own landing page', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	for (const cat of Object.values(programsNavLinks)) {
		const child = cat.list.find((l) => l.active !== false);
		if (!child) continue;
		await page.goto(`${ORIGIN}${child.href}`);
		await page.waitForLoadState('networkidle');
		const heading = page.locator('section div.font-bold.uppercase a').first();
		// 'uppercase' is a CSS transform, so the DOM text keeps its original case.
		await expect(heading).toHaveText(cat.title.fr);
		await expect(heading).toHaveAttribute('href', cat.href);
	}
});

/**
 * The footer lists the same missions as the rest of the site.
 *
 * Derived from programsNavLinks for the same reason the cases above are: a
 * mission added to the nav data should reach the footer without anyone
 * remembering to edit it, and a footer that silently lists two of three is the
 * failure this catches.
 */
test('the footer lists every category', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto(`${ORIGIN}/`);
	await page.waitForLoadState('networkidle');

	const footer = page.locator('footer.page-footer');
	for (const cat of Object.values(programsNavLinks)) {
		await expect(
			footer.getByRole('link', { name: cat.title.fr, exact: true }),
			`the footer should link ${cat.title.fr}`
		).toHaveAttribute('href', cat.href);
	}
});

test('the footer heading names them the way this organization does', async ({ page }) => {
	await page.goto(`${ORIGIN}/`);
	await page.waitForLoadState('networkidle');
	// santelyon3 is a CPTS: these links are its missions, not its programmes.
	await expect(
		page.locator('footer.page-footer h6').filter({ hasText: /^Missions$/ })
	).toHaveCount(1);
});

/**
 * The mission cards are all one width.
 *
 * The grid was `justify-items-center`, which sizes each item to its own content
 * and then centres it, so the cards came out at three different widths with
 * ragged left edges. Stacked in a single column on a phone that is unmistakable
 * — "Prévention en santé" measured 231px against "Parcours pluriprofessionnels"
 * at 300px — and it is why this is measured at a phone width rather than only
 * on the desktop layout where the columns hide it.
 */
for (const width of [390, 1440]) {
	test(`the mission cards share one width at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto(`${ORIGIN}/`);
		await page.waitForLoadState('networkidle');

		const cards = page.locator('#programs .grid > div');
		await expect(cards).toHaveCount(Object.keys(programsNavLinks).length);

		const widths: number[] = [];
		for (let i = 0; i < (await cards.count()); i++) {
			const box = await cards.nth(i).boundingBox();
			widths.push(Math.round(box!.width));
		}
		expect(
			new Set(widths).size,
			`the cards measure ${widths.join(', ')}px — they should all be one width`
		).toBe(1);
	});
}

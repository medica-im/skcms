import { test, expect, type Page } from '@playwright/test';
import { originFor } from './sites';

/**
 * How the Lyon 3 contact page lays its blocks out.
 *
 * Two requirements, one per screen size:
 *
 *   * below lg, one column, every block as wide as the column allows;
 *   * from lg up, two columns, still filling the width.
 *
 * Specific to santelyon3.fr: the page lives in that site's skvar branch, and
 * sante-gadagne's does not have the route at all. Hence tests/sites, and hence
 * naming the site rather than assuming whichever origin the runner supplies.
 *
 * Counting columns is not enough on its own, and that is the point of measuring
 * width too: the grid was already `grid-cols-1 md:grid-cols-2`, so the column
 * count was never wrong. What was wrong is that the grid centres its items, so
 * a block with no width of its own shrank to its content and floated in the
 * middle of the column — the address sat 226px wide in a 358px column while
 * its siblings, which carry w-full, filled it.
 */

const SITE = 'santelyon3.fr';
const ORIGIN = originFor(SITE);
/**
 * Tailwind's lg, where the second column appears.
 *
 * lg rather than md because that is what the rest of the project uses:
 * lg:grid-cols-2 outnumbers md:grid-cols-2 across src/ by roughly three to
 * one. The contact page went to two columns at md, so every screen from 768px
 * up got a layout the rest of the site would not have shown until 1024px.
 */
const LG = 1024;
/** gap-8 between the grid's columns. */
const GAP = 32;

type Block = { name: string; x: number; width: number; height: number; top: number };

/** Every direct child of the layout grid, with where it sits and how wide. */
async function readGrid(page: Page) {
	return page.evaluate(() => {
		// Found by its position in the page, not by the column classes: those are
		// what several of these tests are about, so keying on them would make a
		// wrong column count look like a missing page instead.
		const grid = document.querySelector('.section-container .grid');
		if (!grid) return null;
		const gr = grid.getBoundingClientRect();
		return {
			grid: { x: Math.round(gr.x), width: Math.round(gr.width) },
			children: [...grid.children].map((c) => ({
				name: `${c.tagName.toLowerCase()}.${(c.className || '').toString().split(/\s+/)[0]}`,
				x: Math.round(c.getBoundingClientRect().x),
				width: Math.round(c.getBoundingClientRect().width),
				height: Math.round(c.getBoundingClientRect().height),
				top: Math.round(c.getBoundingClientRect().y)
			}))
		};
	});
}

async function openContact(page: Page, width: number, height: number) {
	await page.setViewportSize({ width, height });
	await page.goto(`${ORIGIN}/contact`, { waitUntil: 'networkidle' });
	// The map draws late and can widen its container as it initialises.
	await page.waitForTimeout(2000);

	// Not checked by status code, deliberately. A route missing from a site's
	// skvar branch falls back to src/routes/(common)/[fallback]/contact, which
	// answers 200 with an entirely different page — so a status guard would
	// measure the fallback while believing it had this site's own page. The
	// grid is markup only this page has.
	const found = await readGrid(page);
	expect(
		found,
		`${ORIGIN}/contact has no layout grid — either this site has no contact ` +
			`page of its own and is serving the generic fallback, or the page changed`
	).not.toBeNull();
	expect(found!.children.length, 'nothing to lay out').toBeGreaterThan(1);
	return found!;
}

/** Distinct left edges, which is how many columns the blocks are sitting in. */
const columnsOf = (children: Block[]) => [...new Set(children.map((c) => c.x))].sort((a, b) => a - b);

test.describe(`${SITE}: one column is the base case`, () => {
	// Not just "one column on a phone": one column is what the page does before
	// any breakpoint applies, and the second column is added on top. The
	// difference is invisible at 390px — `sm:grid-cols-1 md:grid-cols-2` would
	// measure identically there — but it is the difference between a layout
	// built up from the small screen and one patched down to it.
	test('stacks in one column with no media query in play', async ({ page }) => {
		// 320px is the narrowest screen worth supporting and is below Tailwind's
		// smallest breakpoint (sm, 640px), so nothing prefixed can be applying.
		const { grid, children } = await openContact(page, 320, 844);

		const columns = columnsOf(children);
		expect(
			columns,
			`expected one column below every breakpoint, blocks start at ${columns.join(', ')}px`
		).toHaveLength(1);
		for (const c of children) {
			expect(c.width, `${c.name} is ${c.width}px in a ${grid.width}px column`).toBe(grid.width);
		}
	});

	test('declares the single column unprefixed, and adds the second at a breakpoint', async ({
		page
	}) => {
		// Read from the class list rather than the geometry, because geometry
		// cannot tell the two apart: a column count declared only inside a media
		// query still renders as one column on a phone, and would still be the
		// wrong way round.
		await openContact(page, 320, 844);
		const classes = await page.evaluate(
			() => document.querySelector('.section-container .grid')?.className.toString() ?? ''
		);

		expect(classes, 'the grid does not declare grid-cols-1 unprefixed').toMatch(
			/(^|\s)grid-cols-1(\s|$)/
		);
		expect(
			classes,
			'the single column is declared behind a breakpoint, so it is not the base case'
		).not.toMatch(/(^|\s)(sm|md|lg|xl|2xl):grid-cols-1(\s|$)/);
		expect(classes, 'no breakpoint adds the second column').toMatch(
			/(^|\s)(sm|md|lg|xl|2xl):grid-cols-2(\s|$)/
		);
	});
});

test.describe(`${SITE}: the contact page on a phone`, () => {
	// 390 is an iPhone 12/13/14; 430 covers the larger models, where a
	// max-width cap would start to bite before the layout is meant to change.
	for (const width of [390, 430, LG - 1]) {
		test(`stacks its blocks in one full-width column at ${width}px`, async ({ page }) => {
			const { grid, children } = await openContact(page, width, 844);

			const columns = columnsOf(children);
			expect(
				columns,
				`expected one column, blocks start at ${columns.join(', ')}px`
			).toHaveLength(1);

			for (const c of children) {
				expect(c.width, `${c.name} is ${c.width}px in a ${grid.width}px column`).toBe(grid.width);
			}

			// Stacked rather than overlapping: each block begins below the last.
			for (let i = 1; i < children.length; i++) {
				expect(
					children[i].top,
					`${children[i].name} does not sit below ${children[i - 1].name}`
				).toBeGreaterThan(children[i - 1].top);
			}
		});
	}
});

test.describe(`${SITE}: the contact page on a wider screen`, () => {
	for (const width of [LG, 1280]) {
		test(`uses two full columns at ${width}px`, async ({ page }) => {
			const { grid, children } = await openContact(page, width, 900);

			const columns = columnsOf(children);
			expect(
				columns,
				`expected two columns, blocks start at ${columns.join(', ')}px`
			).toHaveLength(2);

			// Each column filled rather than shrunk: two columns and one gap
			// should account for the grid's whole width.
			const expected = Math.round((grid.width - GAP) / 2);
			for (const c of children) {
				expect(
					Math.abs(c.width - expected),
					`${c.name} is ${c.width}px in a ${expected}px column`
				).toBeLessThanOrEqual(1);
			}
		});

		test(`gives the map, street view and photograph one size at ${width}px`, async ({ page }) => {
			// The visual blocks are what have to match, so the page reads as an
			// even 2 x 2. Their containers are not: the address is however tall
			// its text runs, and the photograph's figure carries a caption under
			// it. Measuring those would demand a caption-sized hole beside the
			// address to make the numbers agree.
			await openContact(page, width, 900);
			const visuals = await page.evaluate(() => {
				const pick = (sel: string) => {
					const el = document.querySelector(sel);
					if (!el) return null;
					const r = el.getBoundingClientRect();
					return { name: sel, width: Math.round(r.width), height: Math.round(r.height) };
				};
				return [
					pick('.maplibregl-map'),
					pick('iframe[title="Google Street View"]'),
					pick('figure img')
				].filter(Boolean) as { name: string; width: number; height: number }[];
			});

			expect(visuals, 'expected the map, the street view and the photograph').toHaveLength(3);

			for (const dimension of ['width', 'height'] as const) {
				const sizes = visuals.map((v) => v[dimension]);
				const largest = Math.max(...sizes);
				for (const v of visuals) {
					expect(
						largest - v[dimension],
						`${v.name} is ${v[dimension]}px ${dimension} where the others are ${largest}px`
					).toBeLessThanOrEqual(1);
				}
			}
		});
	}
});

test.describe(`${SITE}: sizing comes from the screen, not from fixed widths`, () => {
	test('no block is capped below the column it sits in', async ({ page }) => {
		// The blocks carried max-w-* caps, which is a width chosen in advance
		// rather than from the space available: at 1280 the map stopped 448px
		// short of a 480px column while its siblings filled it. Whatever caps
		// remain must be wide enough never to bite before the layout changes.
		const { grid, children } = await openContact(page, 1280, 900);
		const column = Math.round((grid.width - GAP) / 2);
		for (const c of children) {
			expect(c.width, `${c.name} is held to ${c.width}px inside a ${column}px column`).toBe(
				column
			);
		}
	});

	test('grows with the viewport instead of stopping at a fixed width', async ({ page }) => {
		// The real test of "as much width as available": widen the screen and the
		// blocks widen with it.
		//
		// Measured below 1024px, because .section-container is max-w-5xl and the
		// page stops widening there on purpose — that cap is the site's reading
		// width, applied to every section, not a block sized in advance. What
		// this rules out is a *block* that stops growing while its column keeps
		// going.
		const narrow = await openContact(page, 820, 900);
		const wide = await openContact(page, 1000, 900);
		expect(
			wide.grid.width,
			'the grid did not grow with the viewport'
		).toBeGreaterThan(narrow.grid.width);
		for (const c of wide.children) {
			const before = narrow.children.find((n) => n.name === c.name);
			if (!before) continue;
			expect(c.width, `${c.name} did not grow with the viewport`).toBeGreaterThan(before.width);
		}
	});
});

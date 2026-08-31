import { test, expect, type Page } from '@playwright/test';
import { originFor, requireSite, type SiteName } from './sites';

/**
 * The breadcrumb trail reads as a sentence, and breaks like one.
 *
 * Skeleton's .breadcrumb is a flex row with no flex-wrap. Its crumbs therefore
 * cannot move onto a second line: each is squeezed below its own text width
 * instead, and the label wraps inside that narrow box. On a phone a long trail
 * came out as a stack of columns — a name wrapped onto itself, a "/", then the
 * next name wrapped onto itself.
 *
 * So the trail is laid out as text rather than as a row of boxes, and the rule
 * is about where the line breaks land. Two things have to hold at once, and
 * they pull in opposite directions:
 *
 *   * the trail wraps at all, rather than one crumb being crushed narrower
 *     than its own words;
 *   * it wraps *between words*, keeping each line full — not by dropping a
 *     whole crumb onto a line of its own, which is what making the crumbs
 *     rigid would do.
 *
 * Measured as line boxes rather than element boxes, because an element box
 * cannot tell the two apart: a crumb crushed to one word per line and a crumb
 * wrapping properly are both "tall". Range.getClientRects() gives one rect per
 * line the text actually paints on, which is the thing being asserted.
 *
 * Lyon 3, on its longest real trail. The component is shared, but the trail
 * lengths that stress it come from this site's programme names.
 */

const SITE: SiteName = 'santelyon3.fr';
const ORIGIN = originFor(SITE);

test.beforeAll(async () => await requireSite(SITE));

/**
 * The longest trail the site actually has: "Accueil / Accès aux soins / Soins
 * non programmés", ~360px of text. A page whose trail fits on one line would
 * pass every assertion here without exercising anything.
 */
const LONG_TRAIL = '/acces-aux-soins/soins-non-programmes';

/** The narrowest phone worth supporting — where the trail must still wrap. */
const NARROW = 320;

const CRUMBS = 'nav[aria-label="Fil d\'Ariane"] ol';

/** The trail's crumbs, and the line boxes its last label paints on. */
async function readTrail(page: Page, width: number, path: string) {
	await page.setViewportSize({ width, height: 844 });
	await page.goto(`${ORIGIN}${path}`, { waitUntil: 'networkidle' });
	await page.waitForSelector(CRUMBS, { timeout: 10_000 });
	return page.evaluate((sel) => {
		const ol = document.querySelector(sel)!;
		const items = [...ol.children].map((c) => ({
			text: (c.textContent ?? '').trim(),
			display: getComputedStyle(c).display,
			width: Math.round(c.getBoundingClientRect().width),
			top: Math.round(c.getBoundingClientRect().top)
		}));
		// One rect per line the last crumb's text is painted on.
		const last = ol.lastElementChild!;
		const inner = last.querySelector('a,span') ?? last;
		const textNode = [...inner.childNodes].find((n) => n.nodeType === 3);
		let lines: { top: number; left: number; width: number }[] = [];
		if (textNode) {
			const range = document.createRange();
			range.selectNodeContents(textNode);
			lines = [...range.getClientRects()].map((r) => ({
				top: Math.round(r.top),
				left: Math.round(r.left),
				width: Math.round(r.width)
			}));
		}
		return {
			items,
			lines,
			height: Math.round(ol.getBoundingClientRect().height),
			olWidth: Math.round(ol.getBoundingClientRect().width)
		};
	}, CRUMBS);
}

test(`the whole trail is shown at ${NARROW}px`, async ({ page }) => {
	const t = await readTrail(page, NARROW, LONG_TRAIL);

	// Skeleton hides all but the last three items to keep its single row short,
	// which on this trail hid "Accueil" — the crumb a reader most wants, and
	// the one that makes the trail a way back rather than a label.
	const hidden = t.items.filter((i) => i.display === 'none').map((i) => i.text);
	expect(hidden, `these crumbs are display:none: ${hidden.join(', ')}`).toEqual([]);

	expect(
		t.items.map((i) => i.text).join(' '),
		'the trail should start at the home page'
	).toContain('Accueil');
});

test(`a long trail wraps between words at ${NARROW}px`, async ({ page }) => {
	const t = await readTrail(page, NARROW, LONG_TRAIL);

	// The premise: this trail is longer than the screen. If the labels are ever
	// shortened this fails loudly rather than passing without testing anything.
	expect(
		t.height,
		`the trail fits on one line at ${NARROW}px, so it never wrapped — ` +
			`pick a longer trail than ${LONG_TRAIL}`
	).toBeGreaterThan(30);

	// The fix: the last label runs across two lines, so the first line stays
	// full. A whole-crumb wrap would put this label alone on line two — one
	// line box, not two.
	expect(
		t.lines.length,
		`the last crumb paints on ${t.lines.length} line(s); it should break ` +
			`between its words so the line above stays full`
	).toBe(2);

	// The line count alone does not distinguish the fix from the bug: a crumb
	// squeezed into its own narrow column also paints on two lines. What
	// separates them is *where the first line starts*.
	//
	// Laid out as text, the last label continues the line the trail is already
	// on, so its first line begins partway across — to the right of where the
	// crumbs before it end. Squeezed into a column, it begins at that column's
	// left edge with the earlier crumbs stacked above, and the two lines are
	// flush.
	expect(
		t.lines[0].left,
		`the last crumb's first line starts at ${t.lines[0].left}px, flush with ` +
			`its second at ${t.lines[1].left}px — so it is wrapping inside its own ` +
			`column instead of continuing the trail's line`
	).toBeGreaterThan(t.lines[1].left);

	// And that first line genuinely shares a row with the crumb before it,
	// rather than merely being indented.
	const parent = t.items.find((i) => i.text === 'Accès aux soins');
	expect(parent, 'expected the parent category crumb to be present').toBeDefined();
	expect(
		t.lines[0].top,
		'the last crumb should start on the row the trail is already on'
	).toBe(parent!.top);
});

test(`the trail never scrolls sideways at ${NARROW}px`, async ({ page }) => {
	const t = await readTrail(page, NARROW, LONG_TRAIL);
	expect(
		t.olWidth,
		`the trail is ${t.olWidth}px wide on a ${NARROW}px screen`
	).toBeLessThanOrEqual(NARROW);

	const doc = await page.evaluate(() => ({
		scroll: document.documentElement.scrollWidth,
		client: document.documentElement.clientWidth
	}));
	expect(
		doc.scroll,
		`the page scrolls to ${doc.scroll}px in a ${doc.client}px viewport`
	).toBeLessThanOrEqual(doc.client + 1);
});

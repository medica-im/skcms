import { test, expect, type Page } from '@playwright/test';
import { originFor, requireSite, type SiteName } from './sites';

/**
 * The calendar's header fits the phone it is read on.
 *
 * GoogleCalendar is a $lib component — shared, and about to be reused by other
 * sites — but its header is FullCalendar's own toolbar, which lays three groups
 * out on one row: prev/next/today, the month title, and the view switcher. On a
 * 320px screen that does not fit, and FullCalendar does not shrink it: measured
 * on Lyon 3's home page, the toolbar's content was 309px wide inside a 288px
 * box, the view switcher ending 21px past the right edge, while the title stayed
 * at its desktop 28px and wrapped "août 2026" onto two lines.
 *
 * Measured on the home page rather than a fixture, because the container is
 * part of the problem: .section-container's p-4 is what leaves 288px of a 320px
 * screen. /_test/calendar-layouts renders the same container for comparing
 * candidate fixes side by side; this pins the rule the page exists to satisfy.
 *
 * Lyon 3 because that is the site whose home page carries the calendar today.
 * The rule is about the shared component, so when another tenant adopts it this
 * spec should grow a second site rather than be copied.
 */

const SITE: SiteName = 'santelyon3.fr';
const ORIGIN = originFor(SITE);

test.beforeAll(async () => await requireSite(SITE));

/** Phone widths: the narrowest worth supporting, then the common iPhones. */
const PHONES = [320, 390, 430];

/** The calendar's toolbar, and how it sits in its container. */
async function readToolbar(page: Page) {
	return page.evaluate(() => {
		const tb = document.querySelector('.fc-header-toolbar');
		if (!tb) return null;
		const box = (el: Element) => {
			const r = el.getBoundingClientRect();
			return { width: Math.round(r.width), height: Math.round(r.height), right: Math.round(r.right) };
		};
		const title = tb.querySelector('.fc-toolbar-title');
		return {
			toolbar: box(tb),
			scrollWidth: tb.scrollWidth,
			clientWidth: tb.clientWidth,
			// The furthest right edge of any chunk: what actually overflows.
			chunkRight: Math.max(
				...[...tb.querySelectorAll('.fc-toolbar-chunk')].map((c) => Math.round(c.getBoundingClientRect().right))
			),
			title: title ? { ...box(title), fontSize: parseFloat(getComputedStyle(title).fontSize) } : null,
			// The page itself must not scroll sideways because of it.
			docScroll: document.documentElement.scrollWidth,
			docClient: document.documentElement.clientWidth
		};
	});
}

async function openHome(page: Page, width: number) {
	await page.setViewportSize({ width, height: 844 });
	await page.goto(ORIGIN, { waitUntil: 'networkidle' });
	// FullCalendar renders after its Google event source answers, and the
	// toolbar is laid out again once events arrive.
	await page.waitForSelector('.fc-header-toolbar', { timeout: 20_000 });
	await page.waitForTimeout(2500);
	const found = await readToolbar(page);
	expect(found, 'the home page rendered no calendar toolbar').not.toBeNull();
	return found!;
}

for (const width of PHONES) {
	test(`the toolbar stays inside its container at ${width}px`, async ({ page }) => {
		const m = await openHome(page, width);

		// The failure as measured: chunks ending past the toolbar's own edge.
		expect(
			m.chunkRight,
			`a toolbar group ends ${m.chunkRight - m.toolbar.right}px past the ` +
				`toolbar's right edge (${m.toolbar.right}px)`
		).toBeLessThanOrEqual(m.toolbar.right + 1);

		expect(
			m.scrollWidth,
			`the toolbar's content is ${m.scrollWidth}px in a ${m.clientWidth}px box`
		).toBeLessThanOrEqual(m.clientWidth + 1);
	});

	test(`the page does not scroll sideways at ${width}px`, async ({ page }) => {
		const m = await openHome(page, width);
		expect(
			m.docScroll,
			`the document scrolls to ${m.docScroll}px in a ${m.docClient}px viewport`
		).toBeLessThanOrEqual(m.docClient + 1);
	});

	test(`the month title fits on one line at ${width}px`, async ({ page }) => {
		const m = await openHome(page, width);
		// Two lines of a 28px title is ~48px tall; one line is under ~34px. The
		// font is what has to give, so it is asserted rather than the height
		// alone — a wrapped title is the symptom, a desktop font size the cause.
		expect(
			m.title!.fontSize,
			`the month title is ${m.title!.fontSize}px on a ${width}px screen`
		).toBeLessThanOrEqual(22);
		expect(
			m.title!.height,
			`the month title is ${m.title!.height}px tall, so it has wrapped`
		).toBeLessThanOrEqual(36);
	});
}

/**
 * The view the calendar opened in is visibly the one selected.
 *
 * The view is chosen for the screen — list on a phone, month above — and
 * FullCalendar marks that button with .fc-button-active. It styles it by
 * darkening the fill, rgb(26,37,47) against rgb(44,62,80), which is 1.28:1 and
 * so reads as nothing being selected at all on first paint. A reader who cannot
 * see which view is current has no reason to believe the other button would
 * change anything.
 */
for (const [width, expected] of [
	[390, 'listMonth'],
	[1280, 'dayGridMonth']
] as const) {
	test(`the ${expected} button is marked and visibly selected at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto(ORIGIN, { waitUntil: 'networkidle' });
		await page.waitForSelector('.fc-header-toolbar', { timeout: 20_000 });
		await page.waitForTimeout(2500);

		const seen = await page.evaluate(() => {
			const tb = document.querySelector('.fc-header-toolbar');
			const active = tb?.querySelector('.fc-button-active');
			const idle = [...(tb?.querySelectorAll('.fc-button') ?? [])].find(
				(b) => !b.classList.contains('fc-button-active')
			);
			if (!active || !idle) return null;
			const rgb = (c: string) => (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
			return {
				// Which button: its class names the view it switches to.
				className: active.className,
				activeBg: rgb(getComputedStyle(active).backgroundColor),
				idleBg: rgb(getComputedStyle(idle).backgroundColor)
			};
		});
		expect(seen, 'no view button was marked active').not.toBeNull();

		expect(
			seen!.className,
			`the active button is not the ${expected} one`
		).toContain(`fc-${expected}-button`);

		// Told apart by eye, not merely by a class: WCAG 1.4.11 asks 3:1 of a
		// control's own boundary, and the two fills have to differ by about that
		// much for "selected" to mean anything.
		const lum = ([r, g, b]: number[]) => {
			const f = (v: number) => {
				const s = v / 255;
				return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
			};
			return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
		};
		const [hi, lo] = [lum(seen!.activeBg), lum(seen!.idleBg)].sort((a, b) => b - a);
		const ratio = (hi + 0.05) / (lo + 0.05);
		expect(
			ratio,
			`the selected view is ${seen!.activeBg} against ${seen!.idleBg} for the ` +
				`others — ${ratio.toFixed(2)}:1, so nothing looks selected`
		).toBeGreaterThanOrEqual(2.5);
	});
}

/**
 * The month and the "Calendrier" heading share one centre line.
 *
 * They sit directly above one another, so any disagreement reads as the header
 * being crooked. FullCalendar's toolbar is `space-between` over three chunks,
 * which centres the middle one only while the outer two match: measured at
 * 1280px the arrows and "Aujourd'hui" came to 213px against the view
 * switcher's 116px, putting the month 49px right of a heading that was exact.
 *
 * Measured against the card rather than the viewport, because that is the box a
 * reader sees them in.
 */
for (const width of [1280, 1024, 768, 390]) {
	test(`the heading and the month share a centre line at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto(ORIGIN, { waitUntil: 'networkidle' });
		await page.waitForSelector('.fc-header-toolbar', { timeout: 20_000 });
		await page.waitForTimeout(2500);

		const offsets = await page.evaluate(() => {
			const toolbar = document.querySelector('.fc-header-toolbar');
			const card = toolbar?.closest('.card');
			const heading = card?.querySelector('h2');
			const title = toolbar?.querySelector('.fc-toolbar-title');
			if (!card || !heading || !title) return null;
			const box = card.getBoundingClientRect();
			const middle = (box.left + box.right) / 2;
			const centre = (el: Element) => {
				const r = el.getBoundingClientRect();
				return Math.round((r.left + r.right) / 2 - middle);
			};
			return { heading: centre(heading), month: centre(title) };
		});
		expect(offsets, 'the calendar header did not render').not.toBeNull();

		// Two pixels of rounding, not a layout that merely looks close.
		expect(
			Math.abs(offsets!.month - offsets!.heading),
			`the month is ${offsets!.month}px from the card's centre where the ` +
				`heading is ${offsets!.heading}px, so they read as misaligned`
		).toBeLessThanOrEqual(2);
	});
}

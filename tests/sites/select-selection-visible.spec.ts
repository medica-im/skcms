import { test, expect, type Page, type Locator } from '@playwright/test';
import { directoryPathFor, originFor, requireSite, type SiteName } from './sites';

/**
 * A chosen option, and the cross that clears it, stay readable in both themes.
 *
 * Every dropdown in the app is svelte-select, styled in one place —
 * src/lib/assets/css/svelte-select.css — so this is one rule about one
 * stylesheet rather than a rule per selector. What it guards is the moment
 * *after* choosing: the control stops showing a placeholder and starts showing
 * the selection, and those are two different colours in svelte-select's own CSS
 * (`--placeholder-color` against `--selected-item-color`, which defaults to
 * `inherit`). A theme that sets the first and forgets the second looks correct
 * until someone picks something.
 *
 * The clear cross is worse, because it is not text: `--clear-select-color`
 * falls back to `--icons-color`, which svelte-select leaves with no default at
 * all. Unset, the icon takes whatever colour it inherits — which on a surface
 * that changes between themes is exactly where a control disappears.
 *
 * Measured rather than screenshotted: contrast is the property that matters,
 * a screenshot would have to be re-baselined for every palette change, and
 * "the text is there but invisible" is precisely the failure a DOM presence
 * check cannot see.
 *
 * WCAG AA is the bar — 4.5:1 for the option text, which is body-sized, and 3:1
 * for the cross, which is a graphic rather than prose (WCAG 1.4.11 non-text
 * contrast). Both are measured against the control's own painted background,
 * walked up the tree, because svelte-select's inner element is transparent.
 */

/**
 * Which site this runs against, and where that site keeps its directory.
 *
 * Not a rule about this tenant: the stylesheet under test is shared by every
 * site, and so is the component wearing it. Lyon 3 is only the site this suite
 * serves by default, and SITE_UNDER_TEST points the same spec at any other —
 * the sole per-site fact it needs is the path, which sites.ts holds.
 *
 * **One site on purpose.** This is a component-only spec (kind 2 in sites.ts):
 * what it measures is colour, and the stylesheet has no URL, no `base` and no
 * route in it, so the same control is painted identically wherever the
 * directory is mounted. Running it across DIRECTORY_MOUNTS would triple its
 * cost and could not produce a different answer. A spec that touched query
 * parameters, entry links or canonical would be kind 3 and would have to.
 */
const SITE = (process.env.SITE_UNDER_TEST as SiteName) ?? 'santelyon3.fr';
const ORIGIN = originFor(SITE);

// requireSite not because the *rule* is tenant-specific, but because a 502
// renders no controls at all: without it the spec skips on `renders no
// svelte-select` and reports a site that was never served as coverage. The API
// answers either way, so the path lookup cannot stand in for that check.
test.beforeAll(async () => {
	await requireSite(SITE);
	directoryPath = await directoryPathFor(SITE);
});

/** Body text against its background. */
const AA_TEXT = 4.5;
/** A control's graphic against its background — WCAG 1.4.11. */
const AA_NON_TEXT = 3;

/**
 * The page that renders selectors: the directory, and deliberately only that.
 *
 * It is the one page reachable without signing in that renders svelte-select —
 * the category and facility filters. /sites and /contact have none, and every
 * /web/* page that does (EffectorTypeSelect, FacilitySelect, the invite and
 * effector-type forms) renders nothing to a signed-out visitor, so listing them
 * here would add skips that look like coverage.
 *
 * Its path is asked of the site rather than written down, because it is a
 * Postgres setting: `/annuaire` on one site, the root on another, changeable by
 * an operator without touching this repo. Resolved in the beforeAll below
 * because that lookup is a request.
 *
 * The rule this spec checks lives in one stylesheet, applied to every
 * svelte-select in the app, so the controls on one page exercise it as
 * thoroughly as twenty would — and how many appear is data too (`inputField`
 * decides which filters exist per site), which is why nothing here asserts a
 * count. Extending to the authenticated selectors means a signed-in fixture —
 * worth doing, and a different change from this one.
 */
let directoryPath: string;

type Rgb = [number, number, number];

function parse(colour: string): Rgb | null {
	const n = colour.match(/[\d.]+/g);
	if (!n || n.length < 3) return null;
	// A fully transparent colour is not a colour: treat it as "no answer" so the
	// caller keeps walking up for the painted background behind it.
	if (n.length > 3 && Number(n[3]) === 0) return null;
	return [Number(n[0]), Number(n[1]), Number(n[2])];
}

function luminance([r, g, b]: Rgb): number {
	const f = (v: number) => {
		const s = v / 255;
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a: string, b: string): number {
	const [x, y] = [parse(a), parse(b)];
	if (!x || !y) return 0;
	const [hi, lo] = [luminance(x), luminance(y)].sort((m, n) => n - m);
	return (hi + 0.05) / (lo + 0.05);
}

/** The svelte-select controls on the page, innermost first. */
function selects(page: Page): Locator {
	// The wrapper in $lib/Web/Select.svelte carries the same class as the
	// library's own root, so `.svelte-select` matches twice for one control.
	// The inner one is what holds the value and the cross.
	return page.locator('.svelte-select:not(:has(.svelte-select))');
}

/**
 * Choose the first option of one select.
 *
 * By keyboard, because that is svelte-select's documented interaction and the
 * one that does not depend on where the list is painted: a click has to land on
 * an option that may be portalled to the body, positioned by floating-ui, and
 * overlapped by the map's own controls. ArrowDown opens the list and Enter
 * takes the active option.
 *
 * Returns false when the select has nothing to choose — an empty filter on a
 * small directory is legitimate, and skipping it is better than asserting
 * against a control that never changed state.
 */
async function chooseFirstOption(page: Page, select: Locator): Promise<boolean> {
	const input = select.locator('input').first();
	if (!(await input.count())) return false;
	await input.click();
	await page.keyboard.press('ArrowDown');
	await page.waitForTimeout(300);
	const options = page.locator('.svelte-select-list .list-item');
	if (!(await options.count())) return false;
	await page.keyboard.press('Enter');
	await page.waitForTimeout(300);
	return (await select.locator('.selected-item').count()) > 0;
}

/** The colours a chosen selection is actually painted in. */
async function paintedColours(select: Locator) {
	return await select.evaluate((root) => {
		const painted = (from: Element | null) => {
			let el: Element | null = from;
			while (el) {
				const c = getComputedStyle(el).backgroundColor;
				const n = c.match(/[\d.]+/g);
				const transparent = !n || (n.length > 3 && Number(n[3]) === 0);
				if (!transparent) return c;
				el = el.parentElement;
			}
			// Nothing painted anywhere up the tree: the page's own canvas.
			return getComputedStyle(document.body).backgroundColor || 'rgb(255, 255, 255)';
		};
		const item = root.querySelector('.selected-item');
		const clear = root.querySelector('.clear-select');
		return {
			text: item?.textContent?.trim() ?? '',
			itemColour: item ? getComputedStyle(item).color : null,
			clearPresent: !!clear,
			clearColour: clear ? getComputedStyle(clear).color : null,
			clearOpacity: clear ? Number(getComputedStyle(clear).opacity) : null,
			background: painted(root)
		};
	});
}

for (const scheme of ['light', 'dark'] as const) {
	// The site is named because it is where the colours were measured, not
	// because the rule is its own: the stylesheet is shared by every tenant.
	test.describe(`a chosen option is readable in ${scheme} mode (on ${SITE})`, () => {
		test.use({ colorScheme: scheme });

		test(`the directory: the selection and its clear cross meet contrast`, async ({ page }) => {
			const path = directoryPath;
			{
				await page.goto(`${ORIGIN}${path}`, { waitUntil: 'networkidle' });
				await page.waitForTimeout(2000);

				const all = selects(page);
				const count = await all.count();
				// Not a skip: this site's own settings say the directory is here,
				// and it renders svelte-select for every filter `inputField`
				// enables. None at all means the page did not render, which is a
				// fault to report rather than a condition to tiptoe around.
				expect(
					count,
					`${ORIGIN}${path} renders no svelte-select control; the directory ` +
						`should render one per enabled filter`
				).toBeGreaterThan(0);

				let checked = 0;
				for (let i = 0; i < count; i++) {
					const select = all.nth(i);
					if (!(await chooseFirstOption(page, select))) continue;

					const c = await paintedColours(select);
					const where = `${path} select #${i} (${scheme})`;

					// The point of the rule: something was chosen, and the reader
					// can see *what*.
					expect(c.text, `${where}: nothing shown after choosing`).not.toBe('');
					expect(
						contrast(c.itemColour!, c.background),
						`${where}: the chosen option "${c.text}" is ${c.itemColour} on ` +
							`${c.background} — unreadable`
					).toBeGreaterThanOrEqual(AA_TEXT);

					// And can undo it. An invisible cross is a control the reader
					// cannot find, which is the same as not having one.
					expect(c.clearPresent, `${where}: no clear cross after choosing`).toBe(true);
					expect(
						c.clearOpacity ?? 1,
						`${where}: the clear cross is transparent`
					).toBeGreaterThan(0.1);
					expect(
						contrast(c.clearColour!, c.background),
						`${where}: the clear cross is ${c.clearColour} on ${c.background} — invisible`
					).toBeGreaterThanOrEqual(AA_NON_TEXT);

					checked++;
				}

				expect(
					checked,
					`${path} (${scheme}): no select offered an option to choose, so nothing was ` +
						`measured — the page has ${count} control(s) but none had items`
				).toBeGreaterThan(0);
			}
		});
	});
}

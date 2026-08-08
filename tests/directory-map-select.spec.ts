import { test, expect } from '@playwright/test';

/**
 * The address book's filter dropdowns, over the map.
 *
 * With the map shown, the filters sit directly above it, so a list opening
 * downwards crosses maplibre's zoom, compass and locate buttons in the map's
 * top-left corner. svelte-select gives its list `z-index: 2` and maplibre gives
 * its control containers the same 2; an equal z-index is settled by document
 * order, and the map comes last, so those buttons were painted over the open
 * list. The facility filter is the one that shows it worst — it is the lowest
 * filter, so its list reaches furthest into the map.
 *
 * `--list-z-index` in $lib/assets/css/svelte-select.css is what breaks the tie.
 *
 * The check asks at each map button's own centre rather than at the centre of
 * each option. The controls are a narrow column on the far left (x≈208-247)
 * while an option's centre is out around x≈800, so sampling option centres
 * sails straight past them and calls a visibly obstructed list clean — which is
 * exactly how an earlier version of this test passed against the bug.
 */
test('map controls do not cover the address book filter dropdowns', async ({ page }) => {
	test.setTimeout(120_000);
	// Wide enough that the filters and the map share the screen as they do for
	// the people who reported this.
	await page.setViewportSize({ width: 1600, height: 900 });
	await page.goto('/annuaire', { waitUntil: 'networkidle' });
	await page.waitForTimeout(2500);

	// Switch from the list to the map. MapSelector is a Skeleton RadioGroup and
	// its "Carte" label is display:none below 2xl, so the clickable thing is the
	// radio item itself, not the text inside it.
	await page.locator('.radio-item').nth(1).click();
	await page.waitForTimeout(3000);

	const maps = await page.locator('.maplibregl-map').count();
	expect(maps, 'the map never appeared, so this proves nothing').toBeGreaterThan(0);

	const selects = page.locator('.svelte-select');
	const problems: string[] = [];
	let checkedAnOverlap = false;

	for (let i = 0; i < (await selects.count()); i++) {
		const sel = selects.nth(i);
		if (!(await sel.isVisible())) continue;

		// Opened where the page puts it: scrolling the select into view first
		// moves it away from the map and dissolves the very overlap under test.
		await sel.click();
		await page.waitForTimeout(400);
		if (!(await page.locator('.svelte-select-list').count())) continue;

		const res = await page.evaluate(() => {
			const list = document.querySelector('.svelte-select-list') as HTMLElement;
			const lr = list.getBoundingClientRect();
			const covered: string[] = [];
			let overlapped = false;

			for (const btn of [...document.querySelectorAll('.maplibregl-ctrl button')]) {
				const b = btn.getBoundingClientRect();
				if (!b.width || !b.height) continue;
				const cx = b.x + b.width / 2;
				const cy = b.y + b.height / 2;
				// Only buttons that actually sit over the open list are evidence.
				if (cx < lr.left || cx > lr.right || cy < lr.top || cy > lr.bottom) continue;
				overlapped = true;
				const top = document.elementFromPoint(cx, cy) as HTMLElement;
				if (!(list.contains(top) || list === top)) {
					covered.push(
						`a map button at (${Math.round(cx)},${Math.round(cy)}) is painted over the list`
					);
				}
			}
			return { covered, overlapped, listZ: getComputedStyle(list).zIndex };
		});

		if (res.overlapped) checkedAnOverlap = true;
		if (res.covered.length) problems.push(`select ${i}: ${res.covered.join('; ')}`);

		await page.keyboard.press('Escape');
		await page.waitForTimeout(250);
	}

	// Guards the test against quietly becoming vacuous: if a layout change ever
	// moves the filters clear of the map, nothing above is being tested and this
	// should be revisited rather than left passing on nothing.
	expect(
		checkedAnOverlap,
		'no filter list overlapped the map controls, so nothing was actually checked'
	).toBe(true);
	expect(problems, problems.join(' | ')).toEqual([]);
});

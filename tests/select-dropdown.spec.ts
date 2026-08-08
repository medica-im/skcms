import { test, expect, type Page, type Locator } from '@playwright/test';
import { addSessionCookie } from '../steps/common.steps';

/**
 * The selects, checked in a browser.
 *
 * Two things can break in a way that leaves the page looking perfectly normal,
 * which is why they are pinned here rather than left to review:
 *
 *  * **Where the list opens.** svelte-select flips its list above the input
 *    when there is no room below. Inside a <dialog> that draws it past the top
 *    of the box, over the page behind the modal, and the first option can be
 *    neither seen nor clicked — the select still works, it just quietly offers
 *    one choice fewer. $lib/Web/Select.svelte positions against the viewport to
 *    avoid this; that every select goes through the wrapper is checked
 *    separately and cheaply in src/lib/Web/select-wrapper.test.ts.
 *
 *  * **Whether the data still flows.** The wrapper stands between every select
 *    and its parent, and a rest spread cannot carry a two-way binding: a
 *    `bind:` the wrapper does not name is silently one-way. Nothing looks
 *    wrong, but the parent never learns what was picked.
 *
 * Deliberately a handful of representative cases rather than a sweep of all
 * forty-odd selects: they sit behind a dozen routes, roles and dialogs, and a
 * crawl that tries to open every one is slow and flaky. What regresses across
 * the whole set is the import, and that is checked in the unit test above.
 */

const ENTRY = 'e2e-w0-entry-0';

/** Every option must be where a click would actually reach it. */
async function unreachableOptions(page: Page): Promise<string[]> {
	const items = page.locator('.svelte-select-list .item');
	const bad: string[] = [];
	for (let i = 0; i < (await items.count()); i++) {
		const it = items.nth(i);
		const ok = await it.evaluate((el: Element) => {
			const r = el.getBoundingClientRect();
			if (!r.width || !r.height) return false;
			// Asks the browser what is on top: catches clipping, z-index and a
			// list drawn outside its dialog alike, which measuring boxes does not.
			const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
			return el.contains(top) || el === top;
		});
		if (!ok) bad.push(((await it.textContent()) ?? '').trim() || '(blank)');
	}
	return bad;
}

async function openEntryInEditMode(page: Page) {
	await page.goto(`/e/${ENTRY}`, { waitUntil: 'networkidle' });
	const pencil = page.getByRole('switch').first();
	await expect(pencil).toBeVisible({ timeout: 20_000 });
	await pencil.click();
	await expect(pencil).toHaveAttribute('aria-checked', 'true');
}

/** Opens the creation modal hanging off a section heading on the entry page. */
async function openCreateModal(page: Page, heading: RegExp): Promise<Locator> {
	const h = page.locator('h4', { hasText: heading }).first();
	await expect(h, `no section heading matching ${heading}`).toBeVisible({ timeout: 15_000 });
	await h.locator('button[title="Ajouter"]').first().click();
	const dialog = page.locator('dialog[open]').first();
	await expect(dialog).toBeVisible({ timeout: 10_000 });
	return dialog;
}

test.describe('select dropdowns inside a modal', () => {
	test.beforeEach(async ({ context, baseURL }) => {
		// A superuser sees every access level, so the lists are at their longest
		// and the modal at its most cramped — the case that broke.
		await addSessionCookie(context, 'superuser', baseURL);
	});

	for (const section of [
		{ name: 'email', heading: /^Email/ },
		{ name: 'phone', heading: /^Téléphone/ }
	]) {
		test(`every option in the ${section.name} modal can be clicked`, async ({ page }) => {
			await openEntryInEditMode(page);
			const dialog = await openCreateModal(page, section.heading);

			const selects = dialog.locator('.svelte-select');
			const count = await selects.count();
			expect(count, `the ${section.name} modal has no select`).toBeGreaterThan(0);

			for (let s = 0; s < count; s++) {
				await selects.nth(s).click();
				await expect(page.locator('.svelte-select-list')).toBeVisible({ timeout: 5000 });
				expect(
					await unreachableOptions(page),
					`options in ${section.name} select #${s} are drawn where a click cannot reach them`
				).toEqual([]);
				await page.keyboard.press('Escape');
			}
		});
	}

	test('choosing an option reaches the form that contains it', async ({ page }) => {
		// The wrapper sits between the select and its parent. If bind:value stops
		// being two-way the choice never arrives, the form stays incomplete, and
		// the only visible symptom is a submit button that will not enable.
		await openEntryInEditMode(page);
		const dialog = await openCreateModal(page, /^Email/);

		const submit = dialog.getByRole('button', { name: 'Créer' });
		await expect(submit, 'submit should start disabled').toBeDisabled();

		await dialog.locator('input[name="email"]').fill('select-test@example.test');
		await dialog.locator('.svelte-select').first().click();
		await page.locator('.svelte-select-list .item').first().click();

		await expect(
			submit,
			'the chosen access level never reached the form — bind:value is one-way'
		).toBeEnabled({ timeout: 5000 });
	});
});

test('typing narrows a searchable list', async ({ context, page, baseURL }) => {
	// EffectorTypeSelect turns svelte-select's own filtering off (itemFilter =
	// () => true) and filters externally from `filterText`, so the feature rests
	// entirely on that binding being two-way. One-way, the text stays empty and
	// every option keeps being returned: the list simply never narrows, which
	// looks like nothing at all going wrong.
	await addSessionCookie(context, 'superuser', baseURL);
	await page.goto('/web/effector/select', { waitUntil: 'networkidle' });

	const select = page.locator('.svelte-select').first();
	await expect(select).toBeVisible({ timeout: 20_000 });
	await select.click();

	const items = page.locator('.svelte-select-list .item');
	await expect(items.first()).toBeVisible({ timeout: 10_000 });
	const before = await items.count();
	expect(before, 'not enough options for filtering to mean anything').toBeGreaterThan(3);

	// A fragment of a real option, so what should survive is predictable.
	const fragment = (await items.first().textContent())!.trim().slice(0, 4).toLowerCase();
	const input = page.locator('.svelte-select input').first();
	await input.fill(fragment);
	await expect(async () => {
		expect(await items.count()).toBeLessThan(before);
	}).toPass({ timeout: 5000 });

	const after = await items.count();
	expect(after, 'filtering removed every option').toBeGreaterThan(0);

	// And back: clearing has to restore the list, so the binding works both ways.
	await input.fill('');
	await expect(async () => {
		expect(await items.count()).toBe(before);
	}).toPass({ timeout: 5000 });
});

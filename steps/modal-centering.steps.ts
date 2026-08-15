import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import type { Page } from '@playwright/test';
import { addSessionCookie } from './common.steps';
import { enterEditMode } from './facilityContext';
import { cloneEntry, removeClonedEntry, seedPhone, clearApiCache } from './seed';
import { apiOrigin, createSessionCookie, sessionCookieName } from '../tests/fixtures/session';

const { Given, Then, After } = createBdd(test);

// The entry these scenarios work on. Cloned rather than borrowed: opening a
// dialog changes nothing, but a scenario that navigates an entry page in edit
// mode should not depend on what another feature left behind.
const ctx: { uid?: string; slug?: string } = {};

After(async () => {
	if (!ctx.uid) return;
	const uid = ctx.uid;
	ctx.uid = undefined;
	ctx.slug = undefined;
	await removeClonedEntry(uid);
});

/**
 * The controls that open a dialog on an entry page.
 *
 * Found by title rather than listed as components: the page renders a create
 * control per contact section and an edit and delete control per existing
 * phone, email, website and social network, so how many there are depends on
 * the entry. Matching titles is what lets one scenario cover all of them — and
 * cover a fourteenth dialog nobody has written yet.
 */
const TRIGGER_TITLES = ['Ajouter', 'Modifier', 'Supprimer'];

type Measurement = {
	label: string;
	left: number;
	right: number;
	width: number;
	viewport: number;
};

/**
 * Opens every dialog trigger in turn and measures where its dialog lands.
 *
 * Each dialog is closed before the next is opened: showModal() on a second
 * dialog while one is already open stacks them in the top layer, and
 * `dialog[open]` would then match two elements.
 */
async function measureEveryDialog(page: Page): Promise<Measurement[]> {
	await page.goto(`/e/${ctx.slug}`, { waitUntil: 'networkidle' });
	await enterEditMode(page);

	const results: Measurement[] = [];

	for (const title of TRIGGER_TITLES) {
		const triggers = page.getByTitle(title, { exact: true });
		const count = await triggers.count();

		for (let i = 0; i < count; i++) {
			const trigger = triggers.nth(i);
			if (!(await trigger.isVisible())) continue;

			await trigger.click();
			const dialog = page.locator('dialog[open]');
			await expect(dialog).toBeVisible();

			results.push({
				label: `${title} #${i + 1}`,
				...(await dialog.evaluate((el) => {
					const box = el.getBoundingClientRect();
					const cs = getComputedStyle(el);
					return {
						left: box.left,
						right: window.innerWidth - box.right,
						width: box.width,
						viewport: window.innerWidth
					};
				}))
			});

			// close() rather than Escape or a cancel button: the cancel label
			// differs per dialog, and some of these swallow the Escape key —
			// several forms bind keydown for their own reasons. close() is the
			// dialog's own API and cannot be intercepted.
			await dialog.evaluate((el: HTMLDialogElement) => el.close());
			await expect(dialog).toBeHidden();
		}
	}

	expect(
		results.length,
		'no dialog trigger found on the entry page — is edit mode on?'
	).toBeGreaterThan(0);
	return results;
}

Given(
	'I am signed in as an administrator, on an entry with contact details',
	async ({ context }) => {
		// Fetched as the administrator because a phone is role-scoped
		// (api/utils.py scrub()), though on the e2e dataset it makes no
		// difference: no entry there has any contact row at all, which is why
		// the phone below is seeded rather than searched for.
		const origin = apiOrigin();
		const cookie = await createSessionCookie('administrator', origin);
		const response = await fetch(`${origin}/api/v2/entries`, {
			headers: {
				Accept: 'application/json',
				Cookie: `${sessionCookieName(origin)}=${cookie}`
			}
		});
		expect(response.ok, `GET entries -> ${response.status}`).toBeTruthy();

		const entries = (await response.json()) as {
			uid?: string;
			entrySlug?: string;
			active?: boolean;
		}[];
		const usable = entries.filter((e) => e.uid && e.active && e.entrySlug);
		expect(usable.length, 'this site has no active entry to clone').toBeGreaterThan(0);

		const clone = await cloneEntry({ sourceUid: usable[0].uid! });
		ctx.uid = clone.uid;
		ctx.slug = clone.slug;

		// A phone, so the page renders edit and delete controls beside it and
		// not only the create controls.
		await seedPhone({ entryUid: clone.uid });
		await clearApiCache();

		// An administrator, because these controls live in the entry page's edit
		// mode. Who may edit is settled by the facility features; this one is
		// about where a dialog opens once it is on screen.
		await addSessionCookie(context, 'administrator');
	}
);

Then('every dialog on the page opens horizontally centred', async ({ page }) => {
	const measured = await measureEveryDialog(page);

	// A pixel of slack: a dialog of odd width cannot split the remainder
	// evenly, and sub-pixel layout puts the halves a fraction apart.
	const offCentre = measured.filter((m) => Math.abs(m.left - m.right) > 1);

	expect(
		offCentre.map((m) => `${m.label}: ${m.width}px wide, ${m.left}px left / ${m.right}px right`),
		'these dialogs did not open centred'
	).toEqual([]);
});

Then('every dialog on the page fits within the viewport', async ({ page }) => {
	const measured = await measureEveryDialog(page);

	const overflowing = measured.filter((m) => m.left < 0 || m.right < 0 || m.width <= 0);

	expect(
		overflowing.map(
			(m) =>
				`${m.label}: ${m.width}px wide in a ${m.viewport}px viewport ` +
				`(${m.left}px left / ${m.right}px right)`
		),
		'these dialogs did not fit the screen'
	).toEqual([]);
});

import { createBdd } from 'playwright-bdd';
import { test, expect } from './fixtures';
import { ctx as creation } from './entry-creation-flow.steps';

const { Given, Then } = createBdd(test);

type Page = import('@playwright/test').Page;

// Opening the entry in edit mode is in entry-effector-type-edit.steps.ts.

Given('the window is {int} pixels wide', async ({ page }, width: number) => {
	await page.setViewportSize({ width, height: 900 });
});

const nameHeading = (page: Page) =>
	page.getByRole('heading', { level: 2 }).filter({ hasText: creation.personName! });
const personButton = (page: Page) => nameHeading(page).getByRole('button', { name: /Modifier/ });

Then("the button that edits the person is on the line of the person's name", async ({ page }) => {
	await expect(personButton(page)).toBeVisible({ timeout: 8_000 });
	// The name is a bare text node of the heading, so it is measured with a
	// range: the rectangle of its last line against the button's.
	const { lastLineBottom, lastLineTop, buttonTop, buttonBottom } = await nameHeading(page).evaluate(
		(heading) => {
			const range = document.createRange();
			range.selectNodeContents(heading.firstChild!);
			const rects = [...range.getClientRects()];
			const last = rects[rects.length - 1];
			const button = heading.querySelector('button')!.getBoundingClientRect();
			return {
				lastLineTop: last.top,
				lastLineBottom: last.bottom,
				buttonTop: button.top,
				buttonBottom: button.bottom
			};
		}
	);
	const lineCentre = (lastLineTop + lastLineBottom) / 2;
	expect(
		lineCentre >= buttonTop && lineCentre <= buttonBottom,
		`the name's last line is at ${lastLineTop}-${lastLineBottom}px, the button at ${buttonTop}-${buttonBottom}px`
	).toBe(true);
});

Then('that button is titled {string}', async ({ page }, title: string) => {
	await expect(personButton(page)).toHaveAttribute('title', title);
});

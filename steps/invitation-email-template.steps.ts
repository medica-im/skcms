import { createBdd } from 'playwright-bdd';
import { deflateSync } from 'node:zlib';
import { test, expect, basePathOf } from './fixtures';
import { djangoShell } from './seed';

const { Given, When, Then, After } = createBdd(test);

const PAGE_PATH = '/web/invite/email-template';

// "I am signed in with the role ..." / "I am signed out" live in
// common.steps.ts; 'I open {string}', "the response status is {int}" and the
// administrators-only message in invitees-admin-only.steps.ts.

const ctx: { imageUrl?: string; delegated?: boolean } = {};

type Page = import('@playwright/test').Page;

/**
 * Repeats `act` until `landed` holds. The page is painted server-side before
 * its handlers are attached, and an action in that window reaches nothing; the
 * reaction it should cause is the only honest sign that it was received (the
 * same reasoning as edit-mode-toggle.steps.ts).
 */
async function untilHydrated(act: () => Promise<void>, landed: () => Promise<void>) {
	const deadline = Date.now() + 20_000;
	for (;;) {
		await act();
		try {
			await landed();
			return;
		} catch (e) {
			if (Date.now() >= deadline) throw e;
		}
	}
}

/** A valid w×h PNG, built here so the scenario needs no fixture file. */
function png(width: number, height: number): Buffer {
	const crcTable = Array.from({ length: 256 }, (_, n) => {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		return c >>> 0;
	});
	const crc = (buf: Buffer) => {
		let c = 0xffffffff;
		for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
		return (c ^ 0xffffffff) >>> 0;
	};
	const chunk = (type: string, data: Buffer) => {
		const length = Buffer.alloc(4);
		length.writeUInt32BE(data.length);
		const body = Buffer.concat([Buffer.from(type), data]);
		const sum = Buffer.alloc(4);
		sum.writeUInt32BE(crc(body));
		return Buffer.concat([length, body, sum]);
	};
	const header = Buffer.alloc(13);
	header.writeUInt32BE(width, 0);
	header.writeUInt32BE(height, 4);
	header[8] = 8; // bit depth
	header[9] = 2; // truecolour
	const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, 0x80)]);
	const pixels = deflateSync(Buffer.concat(Array.from({ length: height }, () => row)));
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk('IHDR', header),
		chunk('IDAT', pixels),
		chunk('IEND', Buffer.alloc(0))
	]);
}

// --- State ------------------------------------------------------------------

/** The worker site's Organization, as Python for the Django shell. */
const organizationOf = (baseURL: string) =>
	`from facility.models import Organization\norg = Organization.objects.get(site__domain=${JSON.stringify(new URL(baseURL).hostname)})\n`;

Given('my organization lets its administrators change its emails', async ({ baseURL }) => {
	ctx.delegated = true;
	await djangoShell(`${organizationOf(baseURL)}org.email_template_editor_role = "administrator"\norg.save()`);
});

/**
 * Setup and cleanup write the database directly, not through the API: they
 * must not depend on the rights of whoever the scenario signs in as -- an
 * administrator is refused those writes by default, which is the point.
 * Deleting EmailImage rows also removes their files (a post_delete signal).
 */
const clearEmails = (baseURL: string) =>
	djangoShell(
		`${organizationOf(baseURL)}from mailer.models import EmailImage, EmailTemplate\n` +
			`EmailTemplate.objects.filter(organization=org).delete()\n` +
			`for image in EmailImage.objects.filter(organization=org): image.delete()`
	);

Given('my organization uses the default invitation email', async ({ baseURL }) => {
	await clearEmails(baseURL);
});

Given('my organization has no email images', async ({ baseURL }) => {
	await clearEmails(baseURL);
});

After({ tags: '@invitation-email' }, async ({ baseURL }) => {
	await clearEmails(baseURL);
	if (ctx.delegated) {
		ctx.delegated = false;
		await djangoShell(`${organizationOf(baseURL)}org.email_template_editor_role = "superuser"\norg.save()`);
	}
});

// --- Navigation -------------------------------------------------------------

When('I open the invitation email page', async ({ page }) => {
	await page.goto(PAGE_PATH, { waitUntil: 'domcontentloaded' });
});

Then('I am sent to sign in before the invitation email page', async ({ page, baseURL }) => {
	const prefix = basePathOf(baseURL);
	await expect(page).toHaveURL(new RegExp(`${prefix}/signin\\?redirectTo=${prefix}${PAGE_PATH}`.replace(/\//g, '\\/')));
});

/**
 * A tab is a radio: a click that lands before hydration checks it natively,
 * and every later click on an already checked radio fires no change, so a
 * plain retry would never switch. Checking another tab first makes each
 * attempt a real change.
 */
async function openTab(page: Page, name: string, panel: string) {
	await untilHydrated(
		async () => {
			await page.getByRole('tab', { name: name === 'Aperçu' ? 'Images' : 'Aperçu' }).click();
			await page.getByRole('tab', { name }).click();
		},
		() => expect(page.getByTestId(panel)).toBeVisible({ timeout: 2_000 })
	);
}

When('I open the preview', async ({ page }) => {
	await openTab(page, 'Aperçu', 'template-preview');
});

When('I open the images', async ({ page }) => {
	await openTab(page, 'Images', 'image-gallery');
});

// --- The template -----------------------------------------------------------

async function edit(page: Page, testId: string, value: string) {
	const field = page.getByTestId(testId);
	await untilHydrated(
		async () => {
			await field.fill('');
			await field.fill(value);
		},
		() => expect(page.getByTestId('template-unsaved')).toBeVisible({ timeout: 2_000 })
	);
}

When('I change the subject to {string}', async ({ page }, subject: string) => {
	await edit(page, 'template-subject', subject);
});

When('I replace the content with {string}', async ({ page }, body: string) => {
	await edit(page, 'template-body', body);
});

When('I choose the HTML format', async ({ page }) => {
	// Skeleton's RadioItem is a div with role=radio around a hidden input, so
	// the accessible name matches twice; the div is the one a person clicks.
	const html = page.getByTestId('radio-item').filter({ hasText: /^\s*HTML\s*$/ });
	await html.click();
	await expect(html).toHaveAttribute('aria-checked', 'true');
});

When('I save the template', async ({ page }) => {
	await page.getByTestId('template-save').click();
});

Then('the template in effect is the default one', async ({ page }) => {
	await expect(page.getByTestId('template-source')).toHaveText('Modèle par défaut');
});

Then("the template in effect is the organization's own", async ({ page }) => {
	await expect(page.getByTestId('template-source')).toHaveText('Modèle personnalisé');
});

Then('after reloading the page the subject is still {string}', async ({ page }, subject: string) => {
	await page.reload({ waitUntil: 'domcontentloaded' });
	await expect(page.getByTestId('template-subject')).toHaveValue(subject);
});

const fieldValue = (page: Page, name: string) =>
	page.getByTestId(`placeholder-${name}`).getByTestId('placeholder-value');

Then('the field {string} shows this site\'s sign-in page', async ({ page, baseURL }, name: string) => {
	// The root of the site as the backend knows it: its public_base_url, or
	// https://<domain> -- which on the e2e workers is the origin either way.
	await expect(fieldValue(page, name)).toHaveText(`${new URL(baseURL).origin}/signin`);
});

Then('the field {string} shows a value', async ({ page }, name: string) => {
	await expect(fieldValue(page, name)).toHaveText(/\S/);
});

Then('the field {string} shows the example {string}', async ({ page }, name: string, example: string) => {
	const field = page.getByTestId(`placeholder-${name}`);
	await expect(field.getByTestId('placeholder-value')).toHaveText(example);
	await expect(field.locator('dd')).toContainText(`ex. ${example}`);
});

Then('a screen reader hears the value of {string} announced as this site\'s', async ({ page }, name: string) => {
	const definition = page.getByTestId(`placeholder-${name}`).locator('dd');
	// The ";" is decoration, hidden from assistive technology; the spoken
	// prefix is what introduces the value.
	await expect(definition.locator('[aria-hidden="true"]')).toHaveText(';');
	await expect(definition.locator('.sr-only')).toHaveText('sur votre site :');
});

Then('I am told only super administrators may change the emails', async ({ page }) => {
	await expect(page.getByTestId('template-read-only')).toContainText('Seuls les super-administrateurs');
});

Then('there is no way to save the template', async ({ page }) => {
	await expect(page.getByTestId('template-save')).toHaveCount(0);
	await expect(page.getByTestId('template-import')).toHaveCount(0);
});

Then('the subject cannot be edited', async ({ page }) => {
	await expect(page.getByTestId('template-subject')).not.toBeEditable();
});

Then('there is no way to add an image', async ({ page }) => {
	await expect(page.getByTestId('email-image-upload')).toHaveCount(0);
});

Then('the save button is disabled', async ({ page }) => {
	await expect(page.getByTestId('template-save')).toBeDisabled();
});

Then('I am told under the content that the sign-in link is missing', async ({ page }) => {
	await expect(page.getByTestId('template-problem-body')).toContainText('lien de connexion');
});

// --- The preview ------------------------------------------------------------

Then('the preview reads {string}', async ({ page }, text: string) => {
	const frame = page.frameLocator('[data-testid="preview-frame"]');
	await expect(frame.locator('body')).toContainText(text, { timeout: 10_000 });
	// Stays so: a script that ran late would change it after the first look.
	await page.waitForTimeout(500);
	await expect(frame.locator('body')).toContainText(text);
});

/**
 * A block takes the theme's container radius, never the button one: unipa's
 * buttons are pills (--theme-rounded-base: 9999px), and that radius on a tall
 * block turned the text preview into an oval with its corners outside the
 * background. Compared with the theme's own variables, so it holds on any
 * site whose two radii differ.
 */
Then('the email is framed as a panel, with the corners of a panel and not of a button', async ({ page }) => {
	for (const testId of ['preview-frame', 'preview-text', 'preview-subject-bar']) {
		for (const tab of testId === 'preview-text' ? ['Texte'] : ['HTML']) {
			await page.getByRole('tab', { name: tab, exact: true }).click();
		}
		const radii = await page.getByTestId(testId).evaluate((el) => {
			const probe = document.createElement('div');
			probe.style.borderRadius = 'var(--theme-rounded-container)';
			document.body.append(probe);
			const container = getComputedStyle(probe).borderTopLeftRadius;
			probe.remove();
			return { block: getComputedStyle(el).borderTopLeftRadius, container };
		});
		expect(radii.block, testId).toBe(radii.container);
	}
});

// The seeded default is plain text: its preview has no html frame.
Then('the text version of the preview reads {string}', async ({ page }, text: string) => {
	await expect(page.getByTestId('preview-text')).toContainText(text, { timeout: 10_000 });
});

// --- Images -----------------------------------------------------------------

When('I upload the image {string}', async ({ page }, filename: string) => {
	await page.getByTestId('email-image-upload').setInputFiles({
		name: filename,
		mimeType: 'image/png',
		buffer: png(120, 40)
	});
	await expect(page.getByTestId('email-image-uploaded')).toBeVisible({ timeout: 15_000 });
});

When('I upload a text file named {string}', async ({ page }, filename: string) => {
	await page.getByTestId('email-image-upload').setInputFiles({
		name: filename,
		mimeType: 'image/png',
		buffer: Buffer.from('not an image at all')
	});
});

Then('I am told the file is not a valid image', async ({ page }) => {
	await expect(page.getByTestId('email-image-upload-error')).toHaveText(
		"Ce fichier n'est pas une image valide.",
		{ timeout: 15_000 }
	);
});

Then('the gallery shows {string}', async ({ page }, name: string) => {
	const tile = page.getByTestId('email-image').filter({ hasText: name });
	await expect(tile).toHaveCount(1);
	ctx.imageUrl = (await tile.getByTestId('email-image-url').textContent())?.trim();
});

Then('its address is absolute and serves the image', async ({ page, baseURL }) => {
	expect(ctx.imageUrl).toMatch(new RegExp(`^${new URL(baseURL).origin}/.*media/email_images/`));
	const response = await page.request.get(ctx.imageUrl!);
	expect(response.status()).toBe(200);
	expect(response.headers()['content-type']).toBe('image/png');
});

When('I delete the image {string}', async ({ page }, name: string) => {
	const tile = page.getByTestId('email-image').filter({ hasText: name });
	ctx.imageUrl = (await tile.getByTestId('email-image-url').textContent())?.trim();
	await tile.getByTestId('email-image-delete').click();
	await page.getByTestId('email-image-delete-confirm').click();
});

Then('the gallery is empty', async ({ page }) => {
	await expect(page.getByTestId('email-image-empty')).toBeVisible();
});

Then('its address no longer serves the image', async ({ page }) => {
	const response = await page.request.get(ctx.imageUrl!);
	expect(response.status()).toBe(404);
});

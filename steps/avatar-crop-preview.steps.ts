import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import { apiOrigin } from '../tests/fixtures/session';
import { addSessionCookie } from './common.steps';
import { enterEditMode } from './facilityContext';
import { cloneEntry, removeClonedEntry, djangoShell, seedAvatar } from './seed';

const { Given, When, Then, After } = createBdd(test);

const API_ORIGIN = apiOrigin();

const openDialog = (page: import('@playwright/test').Page) => page.locator('dialog[open]');
/** The preview shown between cropping and uploading. */
const preview = (page: import('@playwright/test').Page) =>
	openDialog(page).getByTestId('avatar-crop-preview');
const cropper = (page: import('@playwright/test').Page) =>
	openDialog(page).locator('cropper-canvas');

/**
 * Per-scenario state.
 *
 * The entry is a throwaway clone: these scenarios upload a picture onto it, and
 * borrowing one of the site's real entries would leave a test photograph on a
 * real person — and under parallel workers, have two scenarios overwrite each
 * other's avatar mid-assertion.
 */
const ctx: { uid?: string; slug?: string } = {};
let clonedUid: string | null = null;

After(async () => {
	if (!clonedUid) return;
	const uid = clonedUid;
	clonedUid = null;
	ctx.uid = undefined;
	ctx.slug = undefined;
	await removeClonedEntry(uid);
});

async function apiGet(path: string) {
	const response = await fetch(`${API_ORIGIN}${path}`, {
		headers: { accept: 'application/json' }
	});
	expect(response.ok, `GET ${path} -> ${response.status}`).toBe(true);
	return response.json();
}

/**
 * A plain JPEG built in the browser. These scenarios care about the shape of
 * the crop and never about what the photograph depicts, so a flat colour is
 * enough — and deliberately not square, so a preview that showed the source
 * image instead of the crop would be visibly non-square.
 */
async function makeImage(
	page: import('@playwright/test').Page,
	width: number,
	height: number
): Promise<string> {
	return page.evaluate(
		([w, h]) => {
			const canvas = document.createElement('canvas');
			canvas.width = w;
			canvas.height = h;
			const context = canvas.getContext('2d')!;
			context.fillStyle = '#b4b4b4';
			context.fillRect(0, 0, w, h);
			return canvas.toDataURL('image/jpeg', 0.85);
		},
		[width, height]
	);
}

/** Whether the entry currently has an avatar, read from the backend. */
async function entryHasAvatar(uid: string): Promise<boolean> {
	// profile_image, not "avatar": that is the field the Contact row carries.
	// filter().first() rather than get(), since an entry that never had a
	// picture may have no Contact row at all.
	const out = await djangoShell(`
from addressbook.models import Contact
c = Contact.objects.filter(neomodel_uid="${uid}").first()
print("HAS_AVATAR", bool(c and c.profile_image))
`);
	return out.includes('HAS_AVATAR True');
}

Given('I am signed in as an administrator, on an entry of this site', async ({ context }) => {
	const entries = (await apiGet('/api/v2/entries')) as {
		uid?: string;
		entrySlug?: string;
		active?: boolean;
	}[];
	const usable = entries.filter((e) => e.uid && e.active && e.entrySlug);
	expect(usable.length, 'this site has no active entry to clone').toBeGreaterThan(0);

	const clone = await cloneEntry({ sourceUid: usable[0].uid! });
	clonedUid = clone.uid;
	ctx.uid = clone.uid;
	ctx.slug = clone.slug;

	// An administrator, because the entry page's edit mode — which is what puts
	// the avatar control on screen — is theirs: canEdit in EffectorContact is
	// `r.Admin || (r.Member && owner/creator)`. Who may upload is settled by
	// avatar-access.feature and the facility features; these scenarios are
	// about what the dialog does once it is open, so they take the shortest
	// route to it rather than restating a permission rule.
	await addSessionCookie(context, 'administrator');
});

Given('I open the avatar dialog for that entry', async ({ page }) => {
	// /e/<slug> is the entry page. /annuaire/<slug> is the effector-*type*
	// listing and 500s on an entry slug.
	// networkidle, not domcontentloaded: the pencil is server-rendered but its
	// click handler only exists once Svelte has hydrated, so clicking too early
	// lands on the button and does nothing — aria-checked simply never flips.
	await page.goto(`/e/${ctx.slug}`, { waitUntil: 'networkidle' });
	// The upload control only exists in edit mode — it sits beside the picture
	// and answers to the same pencil as the entry's other editable parts.
	await enterEditMode(page);
	await page
		.getByRole('button', { name: /ajouter une photo|modifier la photo/i })
		.first()
		.click();
	await expect(openDialog(page)).toBeVisible();
});

When('I choose a photograph to use as the avatar', async ({ page }) => {
	// Wider than tall, so "the preview is square" cannot pass by accident on a
	// preview that is really the source image.
	const dataUrl = await makeImage(page, 1200, 800);
	const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');
	await openDialog(page)
		.locator('input[type="file"]')
		.setInputFiles({ name: 'avatar.jpg', mimeType: 'image/jpeg', buffer });
	// The cropper initializes asynchronously (dynamic import of cropperjs).
	await expect(cropper(page)).toBeVisible({ timeout: 15_000 });
});

When('I validate the crop', async ({ page }) => {
	await openDialog(page)
		.getByRole('button', { name: /valider le recadrage|aperçu/i })
		.first()
		.click();
});

When('I go back to adjust the crop', async ({ page }) => {
	await openDialog(page)
		.getByRole('button', { name: /modifier le recadrage|recadrer/i })
		.first()
		.click();
});

When('I confirm the upload', async ({ page }) => {
	await openDialog(page)
		.getByRole('button', { name: /envoyer|confirmer/i })
		.first()
		.click();
});

When('I close the avatar dialog', async ({ page }) => {
	await openDialog(page)
		.getByRole('button', { name: /annuler|fermer/i })
		.first()
		.click();
});

Then('I see a preview of the cropped picture', async ({ page }) => {
	await expect(preview(page)).toBeVisible({ timeout: 15_000 });
	// A rendered image, not an empty box: the element must actually have decoded
	// pixels, which a broken or unset src would not.
	const width = await preview(page).evaluate(
		(el) => (el as HTMLImageElement).naturalWidth ?? 0
	);
	expect(width, 'the preview has no decoded image').toBeGreaterThan(0);
});

Then('the preview is square', async ({ page }) => {
	const box = await preview(page).evaluate((el) => {
		const img = el as HTMLImageElement;
		return { w: img.naturalWidth, h: img.naturalHeight };
	});
	expect(box.w).toBeGreaterThan(0);
	// The source image is 1200x800, so equal dimensions can only come from the
	// crop rather than from the original being shown.
	expect(box.w).toBe(box.h);
});

Given('the window is {int} by {int}', async ({ page }, width: number, height: number) => {
	await page.setViewportSize({ width, height });
});

/**
 * Asserts an element is fully inside the viewport.
 *
 * The dialog scrolls (max-h + overflow-y-auto), so a control below the fold is
 * reachable in principle — but only by someone who realizes there is more to
 * scroll to inside a box that already fills the screen. Treating "off screen"
 * as broken is the point of these scenarios.
 */
async function expectWithinWindow(
	page: import('@playwright/test').Page,
	locator: import('@playwright/test').Locator,
	what: string
) {
	await expect(locator).toBeVisible();
	const box = await locator.boundingBox();
	const viewport = page.viewportSize();
	expect(box, `${what} has no box`).not.toBeNull();
	expect(viewport, 'no viewport').not.toBeNull();
	expect(box!.y, `${what} starts above the window`).toBeGreaterThanOrEqual(0);
	expect(
		box!.y + box!.height,
		`${what} runs past the bottom of the window`
	).toBeLessThanOrEqual(viewport!.height);
}

Then('the crop button is within the window', async ({ page }) => {
	await expectWithinWindow(
		page,
		openDialog(page).getByRole('button', { name: /valider le recadrage/i }).first(),
		'the crop button'
	);
});

Then('the upload button is within the window', async ({ page }) => {
	await expectWithinWindow(
		page,
		openDialog(page).getByRole('button', { name: /^envoyer$/i }).first(),
		'the upload button'
	);
});

Then('the preview is within the window', async ({ page }) => {
	await expectWithinWindow(page, preview(page), 'the preview');
});

const accessSelect = (page: import('@playwright/test').Page) =>
	openDialog(page).locator('select[name="avatar-access"]');

Then('the closing button is not styled as a warning', async ({ page }) => {
	const closeButton = openDialog(page).getByRole('button', { name: /^fermer$/i }).first();
	await expect(closeButton).toBeVisible();
	// The rendered colour, not the class list: what matters is that the button
	// does not read as an error, however that styling is expressed.
	const isRed = await closeButton.evaluate((el) => {
		const bg = getComputedStyle(el).backgroundColor;
		const m = bg.match(/^rgba?\(([^)]+)\)$/);
		if (!m) return false;
		const [r, g, b] = m[1].split(',').map((p) => parseFloat(p));
		// A filled error button is dominantly red; a neutral surface is not.
		return r > 120 && r > g * 1.8 && r > b * 1.8;
	});
	expect(isRed, 'the close button is still coloured as an error').toBe(false);
});

const selectionBox = (page: import('@playwright/test').Page) =>
	openDialog(page).locator('cropper-selection');

/** Drags from one point to another with enough steps for the cropper to track. */
async function drag(
	page: import('@playwright/test').Page,
	from: { x: number; y: number },
	to: { x: number; y: number }
) {
	await page.mouse.move(from.x, from.y);
	await page.mouse.down();
	await page.mouse.move(to.x, to.y, { steps: 25 });
	await page.mouse.up();
}

When('I drag the crop selection beyond the edge of the photograph', async ({ page }) => {
	const box = await selectionBox(page).boundingBox();
	expect(box, 'no crop selection on screen').not.toBeNull();
	// From the middle of the selection, far up and to the left — well past any
	// edge of the photograph.
	await drag(
		page,
		{ x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 },
		{ x: box!.x - box!.width * 2, y: box!.y - box!.height * 2 }
	);
});

When('I drag a corner handle well beyond the photograph', async ({ page }) => {
	const box = await selectionBox(page).boundingBox();
	expect(box, 'no crop selection on screen').not.toBeNull();
	// The south-east handle, pulled far past the bottom-right corner.
	await drag(
		page,
		{ x: box!.x + box!.width - 2, y: box!.y + box!.height - 2 },
		{ x: box!.x + box!.width * 3, y: box!.y + box!.height * 3 }
	);
});

Then('the crop selection is still inside the photograph', async ({ page }) => {
	// Compared as rendered rectangles rather than through the cropper's own
	// numbers: what matters is that no part of the selection covers anything but
	// the picture, which is what produces the black margins when it does.
	const { selection, image } = await openDialog(page).evaluate((root) => {
		const rect = (el: Element | null) => {
			if (!el) return null;
			const r = el.getBoundingClientRect();
			return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
		};
		return {
			selection: rect(root.querySelector('cropper-selection')),
			image: rect(root.querySelector('cropper-image'))
		};
	});

	expect(selection, 'no crop selection').not.toBeNull();
	expect(image, 'no image in the cropper').not.toBeNull();

	// A pixel of tolerance: the rendered rectangles are sub-pixel values, and a
	// rounding difference is not a black margin.
	const slack = 1;
	expect(selection!.left, 'selection runs past the left edge').toBeGreaterThanOrEqual(
		image!.left - slack
	);
	expect(selection!.top, 'selection runs past the top edge').toBeGreaterThanOrEqual(
		image!.top - slack
	);
	expect(selection!.right, 'selection runs past the right edge').toBeLessThanOrEqual(
		image!.right + slack
	);
	expect(selection!.bottom, 'selection runs past the bottom edge').toBeLessThanOrEqual(
		image!.bottom + slack
	);
});

Given('that entry already has a picture', async () => {
	await seedAvatar({ entryUid: ctx.uid!, access: 'anonymous' });
});

When('I delete the picture', async ({ page }) => {
	await openDialog(page)
		.getByRole('button', { name: /supprimer la photo/i })
		.first()
		.click();
});

Then('the dialog confirms the picture was deleted', async ({ page }) => {
	await expect(openDialog(page).getByText(/photo supprimée/i).first()).toBeVisible({
		timeout: 20_000
	});
});

Then('the dialog does not claim the picture was updated', async ({ page }) => {
	// The bug this guards: the success line was fixed wording, so a deletion
	// reported "Photo mise à jour" — the opposite of what happened.
	await expect(openDialog(page).getByText(/photo mise à jour/i)).toHaveCount(0);
});

Then('the access selector is disabled', async ({ page }) => {
	await expect(accessSelect(page)).toBeDisabled();
});

Then('the access selector is enabled', async ({ page }) => {
	await expect(accessSelect(page)).toBeEnabled();
});

Then('the preview has square corners', async ({ page }) => {
	// The computed radius rather than the class name, so this holds whichever
	// utility produces it — a theme token that resolves to a large radius fails
	// here exactly as `rounded-full` would.
	const { radius, width } = await preview(page).evaluate((el) => {
		const style = getComputedStyle(el as HTMLElement);
		return {
			radius: parseFloat(style.borderTopLeftRadius) || 0,
			width: (el as HTMLElement).getBoundingClientRect().width
		};
	});
	expect(width).toBeGreaterThan(0);
	// A circle needs a radius of half the width; anything approaching that is
	// rounding the crop away. A few pixels of softening is not.
	expect(radius, 'the preview is rounded like an avatar').toBeLessThan(width / 4);
});

Then('the preview is no longer shown', async ({ page }) => {
	await expect(preview(page)).toHaveCount(0);
});

Then('the cropper is no longer shown', async ({ page }) => {
	await expect(cropper(page)).toHaveCount(0);
});

Then('the cropper is shown again', async ({ page }) => {
	await expect(cropper(page)).toBeVisible({ timeout: 15_000 });
});

Then('I did not have to choose the file again', async ({ page }) => {
	// The file input still holds the chosen file, so the original photograph
	// never had to be re-selected.
	const files = await openDialog(page)
		.locator('input[type="file"]')
		.evaluate((el) => (el as HTMLInputElement).files?.length ?? 0);
	expect(files, 'the file selection was cleared').toBeGreaterThan(0);
});

Then('no avatar has been uploaded yet', async () => {
	expect(await entryHasAvatar(ctx.uid!), 'an avatar was uploaded').toBe(false);
});

Then('the avatar is uploaded successfully', async ({ page }) => {
	await expect(
		openDialog(page).getByText(/photo (de profil )?(mise à jour|enregistrée)|succès/i).first()
	).toBeVisible({ timeout: 20_000 });
});

Then('the entry has an avatar', async () => {
	expect(await entryHasAvatar(ctx.uid!), 'the entry has no avatar').toBe(true);
});

import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { djangoShell, clearApiCache } from './seed';
import { facilityCtx } from './facilityContext';
import { apiOrigin } from '../tests/fixtures/session';

const { Given, Then } = createBdd();

/** Backend of the site under test, read from PUBLIC_ORIGIN in .env. */
const API_ORIGIN = apiOrigin();

/**
 * Shared with the other facility features: steps such as "I open the facility
 * page for that facility" are defined once and must agree on which facility
 * "that" refers to.
 */
const ctx = facilityCtx;

/**
 * The photograph of the place, wherever the page renders it.
 *
 * Located by the media path rather than by a test id: the point of these
 * scenarios is that the picture served under place_images is the one displayed,
 * as opposed to the square avatar served under profile_images.
 */
const placePhotograph = (page: import('@playwright/test').Page) =>
	page.locator('img[src*="/media/place_images/"]');

/**
 * Picks a facility of the site under test that has no picture of its own, so
 * "no photograph is displayed" is about the page and not about leftovers from
 * an earlier scenario.
 */
Given('a facility of this site has no place picture', async ({}) => {
	const response = await fetch(`${API_ORIGIN}/api/v2/public/facilities`, {
		headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' }
	});
	expect(response.ok, `GET public/facilities -> ${response.status}`).toBeTruthy();
	const facilities = (await response.json()) as {
		uid: string;
		slug: string;
		image?: unknown;
		avatar?: unknown;
	}[];

	// Avatars are excluded too: the page falls back to the square picture when
	// there is no place image, which would satisfy a naive "an image is shown".
	const candidate = facilities.find((f) => f.slug && !f.image && !f.avatar);
	expect(candidate, 'every facility of this site has a picture').toBeTruthy();

	// Make sure nothing is left over from a previous run of these scenarios.
	await djangoShell(`
from facility.models import PlaceImage
for p in PlaceImage.objects.filter(neomodel_uid="${candidate!.uid}"):
    if p.image:
        p.image.delete(save=False)
    p.delete()
print("NO_PLACE_IMAGE")
`);
	await clearApiCache();

	ctx.uid = candidate!.uid;
	ctx.slug = candidate!.slug;
});

Then('the facility photograph is displayed', async ({ page }) => {
	await expect(placePhotograph(page).first()).toBeVisible({ timeout: 20_000 });
});

Then('no facility photograph is displayed', async ({ page }) => {
	await expect(placePhotograph(page)).toHaveCount(0);
});

/**
 * A photograph nobody can see needs describing. The alt text is what a screen
 * reader announces, so an empty one would leave the visitor with nothing.
 */
Then('the facility photograph has a text description', async ({ page }) => {
	const image = placePhotograph(page).first();
	await expect(image).toBeVisible({ timeout: 20_000 });
	const alt = await image.getAttribute('alt');
	expect(alt, 'the photograph has no alt attribute').toBeTruthy();
	expect(alt!.trim().length, 'the photograph has an empty alt attribute').toBeGreaterThan(0);
});

/**
 * An image that opens full screen in bigger-picture.
 *
 * Unmounting must be harmless. It closed the viewer unconditionally, and
 * bigger-picture's close() reads options that only open() sets: an image
 * that was never opened threw "Cannot read properties of undefined (reading
 * 'onClose')" as it was destroyed. An exception in Svelte's teardown leaves
 * the tree half destroyed -- the email image gallery, whose tiles unmount on
 * every tab switch, froze its whole page.
 */
import { describe, it, expect } from 'vitest';
import '../../app.postcss';
import { render, cleanup } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import ZoomableImage from './ZoomableImage.svelte';

const SRC =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

/**
 * Unmounts, and returns what was thrown meanwhile. Unmounting is
 * asynchronous in Svelte 5, so a throw in a teardown never reaches the
 * caller of cleanup(): it surfaces as an unhandled rejection, which is where
 * the page died from it.
 */
async function unmountErrors(): Promise<string[]> {
	const errors: string[] = [];
	const onError = (event: ErrorEvent) => {
		errors.push(event.message);
		event.preventDefault();
	};
	const onRejection = (event: PromiseRejectionEvent) => {
		errors.push(String(event.reason));
		event.preventDefault();
	};
	window.addEventListener('error', onError);
	window.addEventListener('unhandledrejection', onRejection);
	try {
		cleanup();
		await new Promise((resolve) => setTimeout(resolve, 200));
	} finally {
		window.removeEventListener('error', onError);
		window.removeEventListener('unhandledrejection', onRejection);
	}
	return errors;
}

const SIZED = { class: 'h-20 w-20' };

describe('ZoomableImage', () => {
	it('unmounts without error when it was never opened', async () => {
		render(ZoomableImage, { src: SRC, alt: 'Logo', width: 1, height: 1, ...SIZED });
		await expect.element(page.getByRole('img', { name: 'Logo' })).toBeVisible();

		expect(await unmountErrors()).toEqual([]);
	});

	it('unmounts without error while the viewer is open', async () => {
		render(ZoomableImage, { src: SRC, alt: 'Logo', width: 1, height: 1, ...SIZED });
		// The button is display:contents, so it has no box; the image is what
		// a person clicks.
		await page.getByRole('img', { name: 'Logo' }).first().click();

		expect(await unmountErrors()).toEqual([]);
	});

	it('shows the thumbnail in place when one is given', async () => {
		render(ZoomableImage, { src: SRC, thumbnail: `${SRC}#thumb`, alt: 'Logo' });

		await expect.element(page.getByRole('img', { name: 'Logo' })).toHaveAttribute('src', `${SRC}#thumb`);
	});
});

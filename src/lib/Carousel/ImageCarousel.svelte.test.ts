/**
 * Photos of one subject, one at a time, built like the team and facility carousels.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import '../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import ImageCarousel from './ImageCarousel.svelte';

const pixel = (colour: string) =>
	`data:image/svg+xml,${encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="${colour}"/></svg>`
	)}`;

const images = [pixel('red'), pixel('green'), pixel('blue')];
const alt = 'Atelier HOPE';

describe('ImageCarousel', () => {
	beforeEach(async () => {
		await page.viewport(1024, 768);
	});

	it('holds every picture, described by the alt text', async () => {
		render(ImageCarousel, { images, alt });
		await expect.element(page.getByRole('img', { name: alt }).first()).toBeVisible();
		expect(page.getByRole('img', { name: alt }).elements()).toHaveLength(images.length);
	});

	it('lets the reader move on when there is more than one picture', async () => {
		render(ImageCarousel, { images, alt });
		await expect.element(page.getByRole('button', { name: 'Next slide' })).toBeEnabled();
	});

	it('disables both arrows for a single picture', async () => {
		render(ImageCarousel, { images: [images[0]], alt });
		await expect.element(page.getByRole('img', { name: alt })).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Next slide' })).toBeDisabled();
		await expect.element(page.getByRole('button', { name: 'Previous slide' })).toBeDisabled();
	});
});

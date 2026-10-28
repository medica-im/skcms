/**
 * The sharing card's meta tags.
 *
 * Every og: value is written under its twitter: name too, image alt included,
 * as Next.js's metadata API does: X's crawler is closed, and the convention
 * among maintained generators is not to rely on its fallback to og:. The image
 * is optional (X's summary card allows it), and so is the X description: the
 * card type and og:type follow from the title alone.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import OpenGraph from './OpenGraph.svelte';
import type { OpenGraph as Card } from '$lib/interfaces/openGraph.interface';

vi.mock('$app/state', () => ({
	page: { url: new URL('https://santelyon3.fr/annuaire?types=%5B%22x%22%5D') }
}));

const card: Card = {
	title: 'Maison de santé',
	description: 'Une maison de santé à Lyon',
	twitter_description: 'Soins de proximité à Lyon',
	image_url: 'https://santelyon3.fr/media/opengraph/card.png',
	image_alt: 'La façade de la maison de santé',
	username: '@msp'
} as Card;

const og = (p: string) => document.querySelector(`meta[property="${p}"]`)?.getAttribute('content') ?? null;
const tw = (n: string) => document.querySelector(`meta[name="${n}"]`)?.getAttribute('content') ?? null;

describe('OpenGraph', () => {
	it('writes each value under its og: and its twitter: name', async () => {
		render(OpenGraph, { props: { opengraph: card } });
		await expect.poll(() => og('og:title')).toBe(card.title);
		expect(tw('twitter:title')).toBe(card.title);
		expect(og('og:description')).toBe(card.twitter_description);
		expect(tw('twitter:description')).toBe(card.twitter_description);
		expect(og('og:image')).toBe(card.image_url);
		expect(tw('twitter:image')).toBe(card.image_url);
		expect(og('og:image:alt')).toBe(card.image_alt);
		expect(tw('twitter:image:alt')).toBe(card.image_alt);
		expect(tw('twitter:site')).toBe('@msp');
		expect(tw('description')).toBe(card.description);
	});

	it('names the page it describes, without the filters in its query', async () => {
		render(OpenGraph, { props: { opengraph: card } });
		await expect.poll(() => og('og:url')).toBe('https://santelyon3.fr/annuaire');
	});

	it('declares the card from its title alone, without an X description', async () => {
		render(OpenGraph, { props: { opengraph: { ...card, twitter_description: null } as unknown as Card } });
		await expect.poll(() => tw('twitter:card')).toBe('summary');
		expect(og('og:type')).toBe('website');
	});

	it("declares the image's dimensions, so a first share shows it without waiting for the download", async () => {
		render(OpenGraph, { props: { opengraph: { ...card, image_width: 1200, image_height: 630 } } });
		await expect.poll(() => og('og:image:width')).toBe('1200');
		expect(og('og:image:height')).toBe('630');
	});

	it('shows a wide image as a large card', async () => {
		render(OpenGraph, { props: { opengraph: { ...card, image_width: 1200, image_height: 630 } } });
		await expect.poll(() => tw('twitter:card')).toBe('summary_large_image');
	});

	it('keeps the small card for a square image, which a large card would crop', async () => {
		render(OpenGraph, { props: { opengraph: { ...card, image_width: 400, image_height: 400 } } });
		await expect.poll(() => tw('twitter:card')).toBe('summary');
	});

	it('keeps the small card and writes no dimensions for an image of unknown size', async () => {
		render(OpenGraph, { props: { opengraph: card } });
		await expect.poll(() => tw('twitter:card')).toBe('summary');
		expect(og('og:image:width')).toBeNull();
		expect(og('og:image:height')).toBeNull();
	});

	it('writes no image tags for a card without an image', async () => {
		render(OpenGraph, { props: { opengraph: { ...card, image_url: null } as unknown as Card } });
		await expect.poll(() => og('og:title')).toBe(card.title);
		for (const p of ['og:image', 'og:image:alt']) expect(og(p)).toBeNull();
		for (const n of ['twitter:image', 'twitter:image:alt']) expect(tw(n)).toBeNull();
	});
});

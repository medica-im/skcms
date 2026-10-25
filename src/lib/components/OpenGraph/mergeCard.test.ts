/**
 * A page's sharing card, laid over the site's.
 *
 * A page names only what it wants to change; everything else is the site's
 * card. A page's description is what a share of that page should say, so it
 * replaces the sharing description as well as the search engines' one: spread
 * over the site card, it used to reach <meta name="description"> only, and a
 * shared prevention page showed its own title above the site's generic text.
 */
import { describe, it, expect } from 'vitest';
import { mergeCard } from './mergeCard';
import type { OpenGraph } from '$lib/interfaces/openGraph.interface';

const site: OpenGraph = {
	title: 'Maison de santé de Vedène',
	description: 'La maison de santé vous accueille sur ses 8 sites.',
	twitter_description: 'La maison de santé vous accueille sur ses 8 sites à Vedène.',
	image_url: 'https://msp-vedene.fr/media/opengraph/site.png',
	image_alt: 'La maison de santé',
	username: '@mspvedene'
};

describe('mergeCard', () => {
	it('is the site card when the page names nothing', () => {
		expect(mergeCard(site, {})).toEqual(site);
		expect(mergeCard(site, undefined)).toEqual(site);
	});

	it('takes the values the page names', () => {
		const card = mergeCard(site, {
			title: 'Cancer colorectal',
			image_url: 'https://msp-vedene.fr/throne.jpg',
			image_alt: 'Un homme assis sur un trône'
		});
		expect(card).toMatchObject({
			title: 'Cancer colorectal',
			image_url: 'https://msp-vedene.fr/throne.jpg',
			image_alt: 'Un homme assis sur un trône',
			username: '@mspvedene'
		});
	});

	it("shares the page's description, not the site's", () => {
		const card = mergeCard(site, { description: 'Il est temps de monter sur le trône.' });
		expect(card?.description).toBe('Il est temps de monter sur le trône.');
		expect(card?.twitter_description).toBe('Il est temps de monter sur le trône.');
	});

	it('keeps the site value where the page leaves a field empty', () => {
		const card = mergeCard(site, { title: undefined, description: '', image_url: null });
		expect(card).toEqual(site);
	});

	it("drops the site's image alt with the site's image", () => {
		const card = mergeCard(site, { image_url: 'https://msp-vedene.fr/throne.jpg' });
		expect(card?.image_alt).toBeNull();
	});

	it('is the page card alone on a site without one', () => {
		expect(mergeCard(undefined, { title: 'Alimentation' })).toMatchObject({ title: 'Alimentation' });
		expect(mergeCard(undefined, {})).toBeUndefined();
	});
});

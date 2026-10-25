/**
 * The one sharing card a page renders, from the root layout.
 *
 * The site's card arrives in every page's data (the root layout loads it on
 * the server); a page that wants its own values returns a `card` from its
 * load and renders nothing itself, so no page can end up with two sets of
 * tags. og:site_name carries the organization's name.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PageOpenGraph from './PageOpenGraph.svelte';

const state = vi.hoisted(() => ({ data: {} as Record<string, unknown> }));
vi.mock('$app/state', () => ({
	page: {
		get data() {
			return state.data;
		},
		url: new URL('https://msp-vedene.fr/prevention/alimentation')
	}
}));

const site = {
	title: 'Maison de santé de Vedène',
	description: 'La maison de santé.',
	twitter_description: 'La maison de santé vous accueille sur ses 8 sites.',
	image_url: 'https://msp-vedene.fr/media/opengraph/site.png',
	image_alt: 'La maison de santé',
	username: '@mspvedene'
};
const organization = { formatted_name: 'Maison de santé de Vedène' };

const og = (p: string) => document.querySelector(`meta[property="${p}"]`)?.getAttribute('content') ?? null;
const ogCount = (p: string) => document.querySelectorAll(`meta[property="${p}"]`).length;

beforeEach(() => (state.data = {}));

describe('PageOpenGraph', () => {
	it("shares the site's card on a page that names nothing", async () => {
		state.data = { openGraph: site, organization };
		render(PageOpenGraph);
		await expect.poll(() => og('og:title')).toBe(site.title);
		expect(og('og:description')).toBe(site.twitter_description);
		expect(og('og:site_name')).toBe('Maison de santé de Vedène');
	});

	it("shares a page's own card over the site's", async () => {
		state.data = {
			openGraph: site,
			organization,
			card: { title: 'Alimentation', description: 'Les bons gestes au quotidien.' }
		};
		render(PageOpenGraph);
		await expect.poll(() => og('og:title')).toBe('Alimentation');
		expect(og('og:description')).toBe('Les bons gestes au quotidien.');
		expect(og('og:image')).toBe(site.image_url);
		expect(ogCount('og:title')).toBe(1);
	});

	it('writes nothing where neither the site nor the page has a card', async () => {
		state.data = { organization };
		render(PageOpenGraph);
		await new Promise((r) => setTimeout(r, 100));
		expect(og('og:title')).toBeNull();
		expect(og('og:site_name')).toBeNull();
	});
});

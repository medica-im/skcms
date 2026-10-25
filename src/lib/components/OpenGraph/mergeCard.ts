import type { OpenGraph } from '$lib/interfaces/openGraph.interface';

/** What a page may say about itself in a share; the rest is the site's card. */
export type PageCard = Partial<Record<'title' | 'description' | 'image_url' | 'image_alt', string | null>>;

const given = (value: string | null | undefined): value is string => typeof value === 'string' && value !== '';

export function mergeCard(site: OpenGraph, page: PageCard | undefined): OpenGraph;
export function mergeCard(site: OpenGraph | undefined, page: PageCard | undefined): OpenGraph | undefined;
export function mergeCard(site: OpenGraph | undefined, page: PageCard | undefined): OpenGraph | undefined {
	const p = page ?? {};
	if (!site && !Object.values(p).some(given)) return undefined;
	return {
		...(site ?? ({} as OpenGraph)),
		...(given(p.title) && { title: p.title }),
		...(given(p.description) && { description: p.description, twitter_description: p.description }),
		// An alt describes one picture: the site's must not follow the page's image.
		...(given(p.image_url) && { image_url: p.image_url, image_alt: given(p.image_alt) ? p.image_alt : null })
	};
}

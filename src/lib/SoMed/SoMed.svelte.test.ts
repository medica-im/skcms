/**
 * The icon of each social network an entry can list.
 *
 * The backend's SocialNetworkType has eleven values and the component drew
 * five: any other rendered a link with no glyph in it, an empty button.
 */
import { describe, it, expect, vi } from 'vitest';
import '../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page as browser } from 'vitest/browser';

vi.mock('@skeletonlabs/skeleton', async (importOriginal) => ({
	...(await importOriginal<typeof import('@skeletonlabs/skeleton')>()),
	getDrawerStore: () => ({ close: () => {} })
}));

import SoMed from './SoMed.svelte';

/** SocialNetworkType in backend addressbook/models.py. */
const TYPES = ['T', 'LI', 'F', 'P', 'I', 'YT', 'TT', 'SC', 'TH', 'B', 'M'];

const network = (type: string) => ({
	id: 1,
	handle: '',
	url: `https://example.org/${type}`,
	type,
	type_display: `network ${type}`,
	roles: []
});

const glyph = (link: Element) => link.querySelector('svg path')?.getAttribute('d') ?? '';

describe('SoMed', () => {
	it.each(TYPES)('draws an icon for the network of type %s', async (type) => {
		render(SoMed, { data: [network(type)] });
		const link = browser.getByRole('link', { name: `network ${type}` });
		await expect.element(link).toBeVisible();
		expect(glyph(link.element())).not.toBe('');
	});

	it('gives each network its own glyph', async () => {
		render(SoMed, { data: TYPES.map(network) });
		await expect.element(browser.getByRole('link').first()).toBeVisible();
		const glyphs = browser
			.getByRole('link')
			.elements()
			.map((link) => glyph(link));
		expect(glyphs).toHaveLength(TYPES.length);
		expect(new Set(glyphs).size).toBe(TYPES.length);
	});
});

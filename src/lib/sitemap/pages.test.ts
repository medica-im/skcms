/**
 * A site's own pages in its sitemap, read from the menu that links to them.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('$app/paths', () => ({ base: '' }));

import { menuPaths, pageUrls } from './pages';
import type { MenuNavCat } from '$lib/interfaces/variables.interface';

const link = (href: string, extra = {}) => ({ href, label: href, keywords: '', icon: null, ...extra });

const menu = [
	{
		id: 'msp',
		title: { en: 'Clinic', fr: 'Maison de santé' },
		docsIcon: 'x',
		list: [
			// A heading over pages that explain themselves: no page of its own.
			{ id: 'about', title: { en: '', fr: '' }, list: [link('/maison-de-sante/a-propos')] }
		]
	},
	{
		id: 'education',
		title: { en: 'Education', fr: 'Éducation' },
		docsIcon: 'x',
		list: [
			{
				id: 'education-sante',
				title: { en: '', fr: '' },
				href: '/education-sante',
				list: [
					link('/education-sante'),
					link('/education-sante/parentalite', { archive: true }),
					link('/education-sante/hidden', { active: false })
				]
			}
		]
	}
] as unknown as MenuNavCat[];

describe('menuPaths', () => {
	it('lists every category page and every page the menu links to, once', () => {
		expect(menuPaths(menu)).toEqual([
			'/maison-de-sante/a-propos',
			'/education-sante',
			'/education-sante/parentalite'
		]);
	});

	it('leaves out a link the menu hides', () => {
		expect(menuPaths(menu)).not.toContain('/education-sante/hidden');
	});
});

describe('pageUrls', () => {
	it('puts each path under the origin', async () => {
		expect(await pageUrls('https://msp-vedene.fr', ['/contact', '/sites'])).toEqual([
			{ loc: 'https://msp-vedene.fr/contact' },
			{ loc: 'https://msp-vedene.fr/sites' }
		]);
	});
});

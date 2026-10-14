/**
 * The mobile drawer's links to a category's pages.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page as browser } from 'vitest/browser';

vi.mock('$app/state', () => ({
	page: {
		url: new URL('https://dev.example.org/education-sante/parentalite'),
		data: {
			organization: { category: { name: 'msp' }, contact: { websites: [] } },
			directory: { setting: { path: '/annuaire' } }
		}
	}
}));

vi.mock('$var/variables.ts', () => ({ menuNavCats: [] }));

vi.mock('@skeletonlabs/skeleton', async (importOriginal) => ({
	...(await importOriginal<typeof import('@skeletonlabs/skeleton')>()),
	getDrawerStore: () => ({ close: () => {} })
}));

import MobileSidebar from './MobileSidebar.svelte';

const navLinks = [
	{
		id: 'education-sante',
		title: { en: 'Health education', fr: 'Éducation pour la santé' },
		href: '/education-sante',
		list: [
			{ href: '/education-sante/parentalite', label: 'Parentalité', archive: true },
			{ href: '/education-sante/sommeil', label: 'Sommeil' }
		]
	}
];

describe('MobileSidebar', () => {
	beforeEach(async () => {
		await browser.viewport(390, 844);
	});

	it('marks an archived programme with the archive badge', async () => {
		render(MobileSidebar, { currentRailCategory: 'education', navLinks });
		const link = browser.getByRole('link', { name: /Parentalité/ });
		await expect.element(link.getByRole('img', { name: 'Archivé' })).toBeVisible();
	});

	it('leaves a current programme unmarked', async () => {
		render(MobileSidebar, { currentRailCategory: 'education', navLinks });
		const link = browser.getByRole('link', { name: /Sommeil/ });
		await expect.element(link).toBeVisible();
		expect(link.getByRole('img', { name: 'Archivé' }).elements()).toHaveLength(0);
	});
});

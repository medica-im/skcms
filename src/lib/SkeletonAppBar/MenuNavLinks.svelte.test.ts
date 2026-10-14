/**
 * The app bar's dropdown menus.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page as browser } from 'vitest/browser';
import { storePopup } from '@skeletonlabs/skeleton';
import { computePosition, autoUpdate, flip, shift, offset, arrow } from '@floating-ui/dom';

vi.mock('$app/state', () => ({
	page: { url: new URL('https://dev.example.org/') }
}));

vi.mock('$var/variables.ts', () => ({
	menuNavCats: [
		{
			id: 'education',
			title: { en: 'Education', fr: 'Éducation' },
			docsIcon: 'faPersonChalkboard',
			list: [
				{
					id: 'education-sante',
					title: { en: 'Health education', fr: 'Éducation pour la santé' },
					href: '/education-sante',
					list: [
						{ href: '/education-sante/parentalite', label: 'Parentalité', archive: true },
						{ href: '/education-sante/sommeil', label: 'Sommeil' }
					]
				}
			]
		}
	]
}));

import MenuNavLinks from './MenuNavLinks.svelte';

storePopup.set({ computePosition, autoUpdate, flip, shift, offset, arrow });

async function openEducationMenu() {
	render(MenuNavLinks);
	await browser.getByRole('button', { name: /Éducation/ }).click();
}

describe('MenuNavLinks', () => {
	beforeEach(async () => {
		await browser.viewport(1280, 800);
	});

	it('marks an archived programme with the archive badge', async () => {
		await openEducationMenu();
		const link = browser.getByRole('link', { name: /Parentalité/ });
		await expect.element(link.getByRole('img', { name: 'Archivé' })).toBeVisible();
	});

	it('leaves a current programme unmarked', async () => {
		await openEducationMenu();
		const link = browser.getByRole('link', { name: /Sommeil/ });
		await expect.element(link).toBeVisible();
		expect(link.getByRole('img', { name: 'Archivé' }).elements()).toHaveLength(0);
	});
});

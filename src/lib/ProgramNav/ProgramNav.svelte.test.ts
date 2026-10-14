/**
 * The list of a category's programmes shown on its pages.
 */
import { describe, it, expect } from 'vitest';
import '../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import ProgramNav from './ProgramNav.svelte';

const programsNavLinks = {
	'education-sante': {
		id: 'education-sante',
		title: { en: 'Health education', fr: 'Éducation pour la santé' },
		href: '/education-sante',
		list: [
			{ href: '/education-sante/parentalite', label: 'Parentalité', category: 'program', archive: true },
			{ href: '/education-sante/sommeil', label: 'Sommeil', category: 'program' }
		]
	}
};

describe('ProgramNav', () => {
	it('marks an archived programme with the archive badge', async () => {
		render(ProgramNav, { pathname: '/education-sante', programsNavLinks });
		const link = page.getByRole('link', { name: /Parentalité/ });
		await expect.element(link.getByRole('img', { name: 'Archivé' })).toBeVisible();
	});

	it('leaves a current programme unmarked', async () => {
		render(ProgramNav, { pathname: '/education-sante', programsNavLinks });
		const link = page.getByRole('link', { name: /Sommeil/ });
		await expect.element(link).toBeVisible();
		expect(link.getByRole('img', { name: 'Archivé' }).elements()).toHaveLength(0);
	});
});

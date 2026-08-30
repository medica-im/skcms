import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page as browser } from 'vitest/browser';

// The component reads the organization off SvelteKit's page state, which has
// no value outside a real navigation.
vi.mock('$app/state', () => ({
	page: {
		data: {
			organization: {
				category: { name: 'cpts' },
				formatted_name_definite_article: 'la CPTS Lyon 3ème'
			}
		}
	}
}));

import HealthPrograms from './HealthPrograms.svelte';

const programsNavLinks = {
	prevention: {
		id: 'prevention',
		title: { en: 'Health prevention', fr: 'Prévention en santé' },
		href: '/prevention',
		list: [
			{ href: '/prevention/canicule', label: 'Canicule', category: 'program', active: true }
		]
	}
} as never;

/**
 * The heading block, with and without its lead paragraph.
 *
 * A site may have nothing useful to say under the heading, so the paragraph is
 * optional — but "optional" has to mean the element is absent, not empty. An
 * empty <p> still takes the gap that space-y-4 puts between the heading and
 * whatever follows, which leaves the section visibly top-heavy for a paragraph
 * nobody can read.
 */
describe('HealthPrograms', () => {
	it('shows the wording for the organization category by default', async () => {
		render(HealthPrograms, { programsNavLinks });
		await expect.element(browser.getByText('Nos missions')).toBeVisible();
		await expect
			.element(browser.getByText(/se coordonnent autour de missions communes/))
			.toBeVisible();
	});

	it('takes a site-specific lead over the default', async () => {
		render(HealthPrograms, { programsNavLinks, lead: 'Une phrase propre à ce site.' });
		await expect.element(browser.getByText('Une phrase propre à ce site.')).toBeVisible();
	});

	it('renders no paragraph at all when the lead is empty', async () => {
		render(HealthPrograms, { programsNavLinks, lead: '' });
		await expect.element(browser.getByText('Nos missions')).toBeVisible();
		// the heading block holds the h2 and nothing else
		const info = document.querySelector('h2')!.parentElement!;
		expect(info.querySelectorAll('p')).toHaveLength(0);
		// and drops the gap it would otherwise reserve for that paragraph
		expect(info.className).not.toContain('space-y-4');
	});

	it('keeps the gap when there is a paragraph to separate', async () => {
		render(HealthPrograms, { programsNavLinks });
		await expect.element(browser.getByText('Nos missions')).toBeVisible();
		const info = document.querySelector('h2')!.parentElement!;
		expect(info.querySelectorAll('p')).toHaveLength(1);
		expect(info.className).toContain('space-y-4');
	});
});

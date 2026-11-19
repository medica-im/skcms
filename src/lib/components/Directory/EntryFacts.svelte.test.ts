/**
 * The entry page tells who the entry is for and how to get in, as two sections a reader
 * tells apart at a glance: « Public » (ages, audiences) and « Accès » (who may contact it,
 * the ways in, free, anonymous). It says nothing for what the entry leaves unknown: a gap
 * in the data is never shown as "no", and a section with nothing to say is not shown.
 * The level of care has its own component (CareSteps).
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page as screen } from 'vitest/browser';
import * as m from '$msgs';
import EntryFacts from './EntryFacts.svelte';
import { AA_TEXT, inScheme, legibility } from '#lib/testing/contrast.ts';
import '../../../app.postcss';

document.body.dataset.theme = 'wintry';

const none = {
	age_min: null,
	age_max: null,
	who_can_contact: null,
	access_modes: null,
	audiences: null,
	free: null,
	anonymous_care: null
};

const section = (title: string) => screen.getByRole('region', { name: title });

describe('EntryFacts', () => {
	it('shows nothing when the entry stores no facets', async () => {
		render(EntryFacts, { props: { entry: none } });
		await expect.element(screen.getByText(m.DIRECTORY_ENTRY_PUBLIC())).not.toBeInTheDocument();
		await expect.element(screen.getByText(m.DIRECTORY_ENTRY_ACCESS())).not.toBeInTheDocument();
	});

	it('puts the ages and the audiences under Public', async () => {
		render(EntryFacts, { props: { entry: { ...none, age_min: 16, audiences: ['students'] } } });
		await expect
			.element(section(m.DIRECTORY_ENTRY_PUBLIC()).getByText(m.DIRECTORY_AGE_FROM({ min: 16 })))
			.toBeVisible();
		await expect
			.element(section(m.DIRECTORY_ENTRY_PUBLIC()).getByText(m.DIRECTORY_AUDIENCE_STUDENTS()))
			.toBeVisible();
		await expect.element(screen.getByText(m.DIRECTORY_ENTRY_ACCESS())).not.toBeInTheDocument();
	});

	it('says nothing of an age of 0 and up, which is everyone', async () => {
		render(EntryFacts, { props: { entry: { ...none, age_min: 0, who_can_contact: 'anyone' } } });
		await expect.element(screen.getByText(m.DIRECTORY_ENTRY_PUBLIC())).not.toBeInTheDocument();
		await expect
			.element(screen.getByText(m.DIRECTORY_AGE_FROM({ min: 0 })))
			.not.toBeInTheDocument();
	});

	it('puts who may contact it, the ways in, free and anonymous under Accès', async () => {
		render(EntryFacts, {
			props: {
				entry: {
					...none,
					who_can_contact: 'referral',
					access_modes: ['phone', 'home_visit'],
					free: true,
					anonymous_care: false
				}
			}
		});
		const access = section(m.DIRECTORY_ENTRY_ACCESS());
		await expect.element(access.getByText(m.DIRECTORY_ACCESS_REFERRAL())).toBeVisible();
		await expect.element(access.getByText(m.DIRECTORY_MODE_PHONE())).toBeVisible();
		await expect.element(access.getByText(m.DIRECTORY_MODE_HOME_VISIT())).toBeVisible();
		await expect.element(access.getByText(m.DIRECTORY_FACET_FREE())).toBeVisible();
		await expect.element(screen.getByText(m.DIRECTORY_FACET_ANONYMOUS())).not.toBeInTheDocument();
		await expect.element(screen.getByText(m.DIRECTORY_ENTRY_PUBLIC())).not.toBeInTheDocument();
	});

	it('words open access as direct access, for a patient or a professional alike', async () => {
		render(EntryFacts, { props: { entry: { ...none, who_can_contact: 'anyone' } } });
		await expect.element(screen.getByText(m.DIRECTORY_ACCESS_ANYONE())).toBeVisible();
		expect(m.DIRECTORY_ACCESS_ANYONE()).toBe('Accès direct');
	});
});

describe('EntryFacts legibility', () => {
	for (const scheme of ['light', 'dark'] as const) {
		it(`reads at AA in ${scheme} mode`, async () => {
			await inScheme(scheme, async () => {
				render(EntryFacts, {
					props: { entry: { ...none, age_min: 16, who_can_contact: 'anyone', free: true } }
				});
				await expect.element(screen.getByText(m.DIRECTORY_ACCESS_ANYONE())).toBeVisible();
				const unreadable = [...document.querySelectorAll('section li, section h4')]
					.map((el) => ({ text: el.textContent?.trim(), ratio: legibility(el as HTMLElement) }))
					.filter(({ ratio }) => ratio < AA_TEXT);
				expect(unreadable).toEqual([]);
			});
		});
	}
});

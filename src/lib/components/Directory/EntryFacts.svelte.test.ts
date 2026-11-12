/**
 * The entry page tells who the entry is for and how to reach it, and says nothing
 * for what the entry leaves unknown: a gap in the data is never shown as "no".
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page as screen } from 'vitest/browser';
import * as m from '$msgs';
import EntryFacts from './EntryFacts.svelte';
import '../../../app.postcss';

const none = {
	age_min: null,
	age_max: null,
	who_can_contact: null,
	access_modes: null,
	care_levels: null,
	audiences: null,
	free: null,
	anonymous_care: null
};

describe('EntryFacts', () => {
	it('shows nothing when the entry stores no facets', async () => {
		render(EntryFacts, { props: { entry: none } });
		await expect.element(screen.getByText(m.DIRECTORY_ENTRY_FACTS())).not.toBeInTheDocument();
	});

	it('words the age bounds', async () => {
		render(EntryFacts, { props: { entry: { ...none, age_min: 16 } } });
		await expect.element(screen.getByText(m.DIRECTORY_AGE_FROM({ min: 16 }))).toBeVisible();
	});

	it('lists what is known and only that', async () => {
		render(EntryFacts, {
			props: {
				entry: {
					...none,
					who_can_contact: 'referral',
					access_modes: ['phone', 'home_visit'],
					audiences: ['students'],
					free: true,
					anonymous_care: false
				}
			}
		});
		await expect.element(screen.getByText(m.DIRECTORY_ACCESS_REFERRAL())).toBeVisible();
		await expect.element(screen.getByText(m.DIRECTORY_MODE_PHONE())).toBeVisible();
		await expect.element(screen.getByText(m.DIRECTORY_MODE_HOME_VISIT())).toBeVisible();
		await expect.element(screen.getByText(m.DIRECTORY_AUDIENCE_STUDENTS())).toBeVisible();
		await expect.element(screen.getByText(m.DIRECTORY_FACET_FREE())).toBeVisible();
		await expect.element(screen.getByText(m.DIRECTORY_FACET_ANONYMOUS())).not.toBeInTheDocument();
	});
});

/**
 * The type picker offers what an entry can be: a profession, an activity or a
 * service, never a category that only groups them ("médecin", "paramédical").
 * Entry creation, changing an entry's type and a directory's offered types all
 * pick through this component.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import EffectorTypeSelect from './EffectorTypeSelect.svelte';
import '../../app.postcss';

const type = (uid: string, label_fr: string, assignable: boolean) => ({
	uid,
	name_fr: label_fr,
	label_fr,
	slug_fr: label_fr,
	assignable
});

vi.mock('./data', () => ({
	getEffectorTypes: async () => [type('t-ide', 'infirmier', true), type('t-med', 'médecin', false)]
}));

/** The options the open list shows, as text. */
const shown = () => [...document.querySelectorAll('.list-item')].map((e) => e.textContent?.trim() ?? '');

describe('EffectorTypeSelect', () => {
	it('offers professions and leaves out categories', async () => {
		render(EffectorTypeSelect, { selectedEffectorType: undefined });
		// A loading select with the same placeholder stands in until the types
		// arrive; typing into it opens nothing.
		await expect.poll(() => document.querySelector('.svelte-select .loading')).toBeNull();
		// Matched by name: "i" is in both, so only `assignable` tells them apart.
		await userEvent.fill(page.getByPlaceholder('Sélectionner une catégorie'), 'i');

		await expect.poll(shown).toContain('infirmier');
		expect(shown()).not.toContain('médecin');
	});
});

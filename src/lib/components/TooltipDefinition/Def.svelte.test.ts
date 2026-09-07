import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import Def from './Def.svelte';

/**
 * The "?" that explains a term where the reader meets it.
 *
 * What this file covers is the *closed* state: the trigger the reader sees in
 * the prose, and the definition staying out of sight until asked for.
 *
 * What the definition says once opened is asserted in
 * features/lexicon-definitions.feature, not here. Opening it is Skeleton's
 * popup action, which positions the card with floating-ui — and in an isolated
 * mount there is no page for floating-ui to measure, so the card never becomes
 * visible and an assertion on its text passes or fails for reasons that have
 * nothing to do with the lexicon. The same trap map-popup-contrast.feature
 * documents: a component mounted under headless vitest reported confidently on
 * something that had never painted.
 */
describe('Def', () => {
	it('shows the term as the button, so the prose still reads', async () => {
		render(Def, { w: 'MSP' });
		await expect.element(page.getByRole('button', { name: /MSP/ })).toBeVisible();
	});

	// The popup is in the DOM from the start so aria-controls points at something
	// real, but a reader must not see it until they ask for it.
	it('keeps the definition hidden until it is opened', async () => {
		render(Def, { w: 'MSP' });
		await expect
			.element(page.getByText(/structures pluridisciplinaires/, { exact: false }))
			.not.toBeVisible();
	});

	// A page naming a term the lexicon does not have should lose its popup, not
	// its page: the old code read dict[w][0] and threw.
	it('renders nothing for an unknown term rather than throwing', async () => {
		render(Def, { w: 'INCONNU' });
		await expect.element(page.getByRole('button', { name: /INCONNU/ })).toBeVisible();
		expect(page.getByRole('link').elements()).toHaveLength(0);
	});
});

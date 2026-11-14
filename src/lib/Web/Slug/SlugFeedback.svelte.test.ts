/**
 * What a slug field says under the input, whoever owns the slug: whether it is free,
 * the warning when an existing one changes, and the free ones to pick instead.
 * Readable in light and dark mode.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page as screen } from 'vitest/browser';
import * as m from '$msgs';
import SlugFeedback from './SlugFeedback.svelte';
import type { SlugView } from './slugView.ts';
import { AA_TEXT, inScheme, legibility } from '$lib/testing/contrast.ts';
import '../../../app.postcss';

document.body.dataset.theme = 'wintry';

const view = (over: Partial<SlugView> = {}): SlugView => ({
	status: 'idle',
	message: '',
	suggestions: [],
	canConfirm: false,
	changed: false,
	warning: null,
	...over
});

describe('SlugFeedback', () => {
	it('says what the check found, and for which status', async () => {
		render(SlugFeedback, { props: { view: view({ status: 'taken', message: 'Déjà utilisée.' }), onchoose: vi.fn() } });
		await expect.element(screen.getByTestId('slug-status')).toHaveTextContent('Déjà utilisée.');
		await expect.element(screen.getByTestId('slug-status')).toHaveAttribute('data-status', 'taken');
	});

	it('shows the warning only when there is one', async () => {
		render(SlugFeedback, { props: { view: view(), onchoose: vi.fn() } });
		await expect.element(screen.getByTestId('slug-warning')).not.toBeInTheDocument();
	});

	it('offers the free slugs, and a pick is handed to the form', async () => {
		const onchoose = vi.fn();
		render(SlugFeedback, { props: { view: view({ status: 'taken', suggestions: ['le-mas-69', 'le-mas-lyon'] }), onchoose } });
		await expect.element(screen.getByText(m.SLUG_SUGGESTIONS())).toBeVisible();
		await screen.getByRole('button', { name: 'le-mas-lyon' }).click();
		expect(onchoose).toHaveBeenCalledWith('le-mas-lyon');
	});

	it('offers nothing when there are no suggestions', async () => {
		render(SlugFeedback, { props: { view: view(), onchoose: vi.fn() } });
		await expect.element(screen.getByTestId('slug-suggestions')).not.toBeInTheDocument();
	});

	const STATES: Record<string, SlugView> = {
		free: view({ status: 'free', message: 'Adresse disponible.' }),
		taken: view({ status: 'taken', message: 'Déjà utilisée.', suggestions: ['le-mas-69'], warning: 'Attention.' }),
		invalid: view({ status: 'invalid', message: 'Minuscules.' }),
		error: view({ status: 'error', message: 'Impossible.' })
	};

	for (const scheme of ['light', 'dark'] as const) {
		for (const [name, state] of Object.entries(STATES)) {
			it(`reads at AA in ${scheme} mode when ${name}: the message, the warning and the suggestions`, async () => {
				await inScheme(scheme, async () => {
					render(SlugFeedback, { props: { view: state, onchoose: vi.fn() } });
					await expect.element(screen.getByTestId('slug-status')).toBeVisible();
					const parts = [
						screen.getByTestId('slug-status'),
						...(state.warning ? [screen.getByTestId('slug-warning')] : []),
						...(state.suggestions.length
							? [screen.getByText(m.SLUG_SUGGESTIONS()), screen.getByRole('button', { name: state.suggestions[0] })]
							: [])
					];
					const unreadable = parts
						.map((part) => part.element())
						.map((el) => ({ text: el.textContent?.trim(), ratio: legibility(el) }))
						.filter(({ ratio }) => ratio < AA_TEXT);
					expect(unreadable).toEqual([]);
				});
			});
		}
	}
});

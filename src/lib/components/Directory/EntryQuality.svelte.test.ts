/**
 * What an entry is missing, shown to whoever may fix it, in edit mode, at the top of its page.
 *
 * What is missing comes first and is marked as such; each problem is a sentence naming the
 * widget that fixes it. Nothing when the entry is complete, and the box reads at AA in both
 * modes (it sits among widgets: a warning nobody can read is no warning).
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page as screen } from 'vitest/browser';
import * as m from '$msgs';
import EntryQuality from './EntryQuality.svelte';
import { AA_TEXT, inScheme, legibility } from '$lib/testing/contrast.ts';
import '../../../app.postcss';

document.body.dataset.theme = 'wintry';

const PROBLEMS = [
	{ code: 'no_description', severity: 'incomplete' },
	{ code: 'line_without_phone', severity: 'missing' },
	{ code: 'no_offers', severity: 'incomplete' }
];

describe('EntryQuality', () => {
	it('shows nothing when the entry is complete', async () => {
		render(EntryQuality, { props: { problems: [] } });
		await expect.element(screen.getByText(m.QUALITY_TITLE())).not.toBeInTheDocument();
	});

	it('lists what is missing first, under its own heading, then what is to complete', async () => {
		render(EntryQuality, { props: { problems: PROBLEMS } });
		const headings = screen.getByRole('region', { name: m.QUALITY_TITLE() }).getByRole('heading', { level: 5 }).elements();
		expect(headings.map((h) => h.textContent?.trim())).toEqual([m.QUALITY_MISSING(), m.QUALITY_INCOMPLETE()]);
		const sentences = screen.getByRole('region', { name: m.QUALITY_TITLE() }).getByRole('listitem').elements();
		expect(sentences.map((li) => li.textContent?.trim())).toEqual([
			m.QUALITY_LINE_WITHOUT_PHONE(),
			m.QUALITY_NO_DESCRIPTION(),
			m.QUALITY_NO_OFFERS()
		]);
	});

	it('names how many there are in its title', async () => {
		render(EntryQuality, { props: { problems: PROBLEMS } });
		await expect.element(screen.getByTestId('entry-quality-count')).toHaveTextContent('3');
	});

	for (const scheme of ['light', 'dark'] as const) {
		it(`reads at AA in ${scheme} mode`, async () => {
			await inScheme(scheme, async () => {
				render(EntryQuality, { props: { problems: PROBLEMS } });
				const region = screen.getByRole('region', { name: m.QUALITY_TITLE() });
				const parts = [
					...region.getByRole('heading').elements(),
					...region.getByRole('listitem').elements(),
					screen.getByTestId('entry-quality-count').element()
				];
				const unreadable = parts
					.map((el) => ({ text: el.textContent?.trim(), ratio: legibility(el as HTMLElement) }))
					.filter(({ ratio }) => ratio < AA_TEXT);
				expect(unreadable).toEqual([]);
			});
		});
	}
});

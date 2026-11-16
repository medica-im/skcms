/**
 * What an entry deals with (« Prend en charge »), as étiquettes under its name: the
 * conditions, the situations and the Need it manages, by name, in the order the backend
 * gives (conditions, situations, the Need). An entry that manages nothing shows nothing.
 * The étiquettes stay legible (AA, 16px) in both modes: most readers are over 50.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page as screen } from 'vitest/browser';
import * as m from '$msgs';
import EntryManages from './EntryManages.svelte';
import type { Managed } from '$lib/store/directoryStoreInterface.ts';
import { AA_TEXT, inScheme, legibility } from '$lib/testing/contrast.ts';
import '../../../app.postcss';

document.body.dataset.theme = 'wintry';

const TLE: Managed[] = [
	{ slug: 'spectre-de-la-schizophrenie-et-autres-troubles-psychotiques', name: 'Spectre de la schizophrénie et autres troubles psychotiques', kind: 'condition' },
	{ slug: 'tdah', name: 'TDAH', kind: 'condition' },
	{ slug: 'troubles-bipolaires-et-connexes', name: 'Troubles bipolaires et connexes', kind: 'condition' },
	{ slug: 'crise-suicidaire', name: 'Crise suicidaire', kind: 'situation' }
];

const labels = () =>
	screen
		.getByRole('list', { name: m.DIRECTORY_ENTRY_MANAGES() })
		.getByRole('listitem')
		.elements();

describe('EntryManages', () => {
	it('shows nothing when the entry manages nothing', async () => {
		render(EntryManages, { props: { managed: [] } });
		await expect.element(screen.getByText(m.DIRECTORY_ENTRY_MANAGES())).not.toBeInTheDocument();
	});

	it('shows one étiquette per condition or situation, by name, in the order given', async () => {
		render(EntryManages, { props: { managed: TLE } });
		expect(labels().map((label) => label.textContent?.trim())).toEqual([
			'Spectre de la schizophrénie et autres troubles psychotiques',
			'TDAH',
			'Troubles bipolaires et connexes',
			'Crise suicidaire'
		]);
	});

	it('writes them at 16px at least', async () => {
		render(EntryManages, { props: { managed: TLE } });
		const small = labels()
			.map((label) => parseFloat(getComputedStyle(label).fontSize))
			.filter((size) => size < 16);
		expect(small).toEqual([]);
	});

	for (const scheme of ['light', 'dark'] as const) {
		it(`reads at AA in ${scheme} mode`, async () => {
			await inScheme(scheme, async () => {
				render(EntryManages, { props: { managed: TLE } });
				const unreadable = labels()
					.map((el) => ({ text: el.textContent?.trim(), ratio: legibility(el) }))
					.filter(({ ratio }) => ratio < AA_TEXT);
				expect(unreadable).toEqual([]);
			});
		});
	}
});

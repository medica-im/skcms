/**
 * The condition and situation selector: the URL is the state. Choosing writes the
 * node's uid to `?concern=`, clearing removes it, the search also finds a synonym,
 * and "voir aussi" offers the situations a condition can lead to.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page as screen, userEvent } from 'vitest/browser';
import { writable } from 'svelte/store';
import * as m from '$msgs';
import SelectConcern from './SelectConcern.svelte';
import { choose, clear, lastQuery } from '#lib/testing/directoryFilter.ts';
import type { Concern } from '#lib/store/concernTree.ts';
import { AA_TEXT, inScheme, legibility } from '#lib/testing/contrast.ts';
import '../../../app.postcss';
// As the root layout loads it: the select's colours come from here and the theme.
import '#lib/assets/css/svelte-select.css';

document.body.dataset.theme = 'wintry';

const nav = vi.hoisted(() => ({ goto: vi.fn() }));
const state = vi.hoisted(() => ({ url: new URL('https://dev.santelyon3.fr/annuaire') }));
vi.mock('$app/navigation', () => nav);
vi.mock('$app/state', () => ({
	page: {
		get url() {
			return state.url;
		},
		data: {}
	}
}));

const concern = (uid: string, patch: Partial<Concern>): Concern => ({
	uid,
	slug: uid,
	name: uid,
	kind: 'condition',
	parent: null,
	synonyms: [],
	entries: ['e'],
	see_also: [],
	...patch
});

const CONCERNS: Concern[] = [
	concern('c-add', { name: 'Addictions', kind: 'chapter', synonyms: ['dépendance'] }),
	concern('c-alc', { name: 'Alcool', parent: 'c-add' }),
	concern('s-cri', { name: 'Crise suicidaire', kind: 'situation' })
];

const mount = (
	search = '',
	seeAlso: { concern: Concern; entries: unknown[] }[] = [],
	extra: { concerns?: Concern[]; available?: { uid: string }[] } = {}
) => {
	state.url = new URL(`https://dev.santelyon3.fr/annuaire${search}`);
	const store = writable<string | null>(null);
	render(SelectConcern, {
		props: { concerns: extra.concerns ?? CONCERNS, seeAlso, available: extra.available },
		context: new Map<string, unknown>([['selectConcern', store]])
	});
	return store;
};

beforeEach(() => nav.goto.mockClear());

describe('SelectConcern', () => {
	it('writes the chosen node to the address', async () => {
		mount();
		await choose(m.DIRECTORY_CONCERN_PLACEHOLDER(), 'Crise suicidaire');
		await expect.poll(() => lastQuery(nav.goto)?.get('concern')).toBe('s-cri');
	});

	it('lists a condition under its chapter by its own name, the chapter not repeated on every line', async () => {
		mount();
		await choose(m.DIRECTORY_CONCERN_PLACEHOLDER(), 'Alcool');
		await expect.poll(() => lastQuery(nav.goto)?.get('concern')).toBe('c-alc');
	});

	it('picks the chapter from its header', async () => {
		mount();
		await choose(m.DIRECTORY_CONCERN_PLACEHOLDER(), 'Addictions');
		await expect.poll(() => lastQuery(nav.goto)?.get('concern')).toBe('c-add');
	});

	it('finds the conditions of a chapter by a synonym of the chapter, under its header', async () => {
		mount();
		const input = screen.getByPlaceholder(m.DIRECTORY_CONCERN_PLACEHOLDER());
		await expect
			.poll(async () => {
				await userEvent.fill(input, 'dépendance');
				return [...document.querySelectorAll('.svelte-select-list .item')].map((e) =>
					e.textContent?.trim()
				);
			})
			.toEqual(['Addictions', 'Alcool']);
	});

	it('shows the picked condition by its own name', async () => {
		mount('?concern=c-alc');
		await expect
			.poll(() => document.querySelector('.svelte-select .selected-item')?.textContent?.trim())
			.toBe('Alcool');
	});

	it('wraps a long name over several lines instead of cutting it off', async () => {
		const long = 'Troubles liés à des traumatismes ou à des facteurs de stress';
		mount('', [], { concerns: [concern('c-long', { name: long })] });
		await expect
			.poll(async () => {
				await userEvent.click(screen.getByPlaceholder(m.DIRECTORY_CONCERN_PLACEHOLDER()));
				const row = document.querySelector<HTMLElement>('.svelte-select-list .item');
				return row && getComputedStyle(row).whiteSpace;
			})
			.toBe('normal');
	});

	it('finds a node by a synonym without showing the synonym as its name', async () => {
		mount();
		await choose(m.DIRECTORY_CONCERN_PLACEHOLDER(), 'Addictions');
		await expect.poll(() => lastQuery(nav.goto)?.get('concern')).toBe('c-add');
	});

	it('removes it from the address when cleared and keeps the other filters', async () => {
		mount('?concern=c-add&facility=f-1');
		await clear();
		await expect.poll(() => lastQuery(nav.goto)?.has('concern')).toBe(false);
		expect(lastQuery(nav.goto)?.get('facility')).toBe('f-1');
	});

	it('publishes the picked node to the directory', async () => {
		const store = mount('?concern=c-alc');
		await expect
			.poll(() => {
				let current;
				store.subscribe((value) => (current = value))();
				return current;
			})
			.toBe('c-alc');
	});

	it('offers "voir aussi" as buttons that pick the situation', async () => {
		mount('?concern=c-add', [{ concern: CONCERNS[2], entries: ['e', 'f'] }]);
		await expect.element(screen.getByText(m.DIRECTORY_CONCERN_SEE_ALSO())).toBeVisible();
		await screen.getByRole('button', { name: 'Crise suicidaire (2)' }).click();
		await expect.poll(() => lastQuery(nav.goto)?.get('concern')).toBe('s-cri');
	});

	describe('given what the other selectors leave', () => {
		const CHOICES: Concern[] = [
			concern('c-add', { name: 'Addictions', kind: 'chapter', entries: ['e1', 'e2'] }),
			concern('c-alc', { name: 'Alcool', parent: 'c-add', entries: ['e1'] }),
			concern('c-can', { name: 'Cannabis', parent: 'c-add', entries: ['e2'] }),
			concern('s-cri', { name: 'Crise suicidaire', kind: 'situation', entries: ['e3'] })
		];

		const offered = async (expected: string[]) => {
			await expect
				.poll(async () => {
					await userEvent.click(document.querySelector<HTMLElement>('.svelte-select input')!);
					return [...document.querySelectorAll('.svelte-select-list .item')].map((e) =>
						e.textContent?.trim()
					);
				})
				.toEqual(expected);
		};

		it('offers only the nodes some remaining entry is picked by, a chapter through its descendants', async () => {
			mount('', [], { concerns: CHOICES, available: [{ uid: 'e2' }] });
			await offered(['Addictions', 'Cannabis']);
		});

		it('keeps the picked node although nothing is left for it, so it can be unpicked', async () => {
			mount('?concern=s-cri', [], { concerns: CHOICES, available: [{ uid: 'e2' }] });
			await offered(['Crise suicidaire', 'Addictions', 'Cannabis']);
		});

		it('offers every node when the other selectors leave everything, the nodes without a chapter first', async () => {
			mount('', [], { concerns: CHOICES });
			await offered(['Crise suicidaire', 'Addictions', 'Alcool', 'Cannabis']);
		});

		it('offers a chapter left with no condition of its own as a plain line', async () => {
			const lonely = [
				concern('c-add', { name: 'Addictions', kind: 'chapter', entries: ['e9'] }),
				concern('c-alc', { name: 'Alcool', parent: 'c-add', entries: ['e1'] })
			];
			mount('', [], { concerns: lonely, available: [{ uid: 'e9' }] });
			await offered(['Addictions']);
		});
	});

	for (const scheme of ['light', 'dark'] as const) {
		it(`reads at AA in ${scheme} mode: the picked node, "voir aussi" and its buttons`, async () => {
			await inScheme(scheme, async () => {
				mount('?concern=c-add', [{ concern: CONCERNS[2], entries: ['e', 'f'] }]);
				const parts = [
					screen.getByText('Addictions', { exact: true }),
					screen.getByText(m.DIRECTORY_CONCERN_SEE_ALSO()),
					screen.getByRole('button', { name: 'Crise suicidaire (2)' })
				];
				for (const part of parts) await expect.element(part).toBeVisible();
				const unreadable = parts
					.map((part) => part.element())
					.map((el) => ({ text: el.textContent?.trim(), ratio: legibility(el) }))
					.filter(({ ratio }) => ratio < AA_TEXT);
				expect(unreadable).toEqual([]);
			});
		});
	}
});

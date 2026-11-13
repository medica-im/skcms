/**
 * The condition and situation selector: the URL is the state. Choosing writes the
 * node's uid to `?concern=`, clearing removes it, the search also finds a synonym,
 * and "voir aussi" offers the situations a condition can lead to.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page as screen } from 'vitest/browser';
import { writable } from 'svelte/store';
import * as m from '$msgs';
import SelectConcern from './SelectConcern.svelte';
import { choose, clear, lastQuery } from '$lib/testing/directoryFilter';
import type { Concern } from '$lib/store/concernTree';
import { AA_TEXT, inScheme, legibility } from '$lib/testing/contrast.ts';
import '../../../app.postcss';
// As the root layout loads it: the select's colours come from here and the theme.
import '$lib/assets/css/svelte-select.css';

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

const mount = (search = '', seeAlso: { concern: Concern; entries: unknown[] }[] = []) => {
	state.url = new URL(`https://dev.santelyon3.fr/annuaire${search}`);
	const store = writable<string | null>(null);
	render(SelectConcern, {
		props: { concerns: CONCERNS, seeAlso },
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

	it('names a condition under its chapter', async () => {
		mount();
		await choose(m.DIRECTORY_CONCERN_PLACEHOLDER(), 'Addictions › Alcool');
		await expect.poll(() => lastQuery(nav.goto)?.get('concern')).toBe('c-alc');
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
		await screen.getByText('Crise suicidaire (2)').click();
		await expect.poll(() => lastQuery(nav.goto)?.get('concern')).toBe('s-cri');
	});

	for (const scheme of ['light', 'dark'] as const) {
		it(`reads at AA in ${scheme} mode: the picked node, "voir aussi" and its buttons`, async () => {
			await inScheme(scheme, async () => {
				mount('?concern=c-add', [{ concern: CONCERNS[2], entries: ['e', 'f'] }]);
				const parts = [
					screen.getByText('Addictions', { exact: true }),
					screen.getByText(m.DIRECTORY_CONCERN_SEE_ALSO()),
					screen.getByText('Crise suicidaire (2)')
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

/**
 * The commune filter of the address book: the URL is the state. Choosing a
 * commune writes its uid to `?communes=` (a JSON list) and clearing removes the
 * parameter, leaving the other filters as they were — a shared or reloaded link
 * must reproduce the same selection.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { writable } from 'svelte/store';
import * as m from '$msgs';
import SelectCommunesR from './SelectCommunesR.svelte';
import type { Commune } from '$lib/interfaces/geography.interface.ts';
import { choose, clear, lastQuery } from '$lib/testing/directoryFilter';
import '../../../app.postcss';

const nav = vi.hoisted(() => ({ goto: vi.fn() }));
const state = vi.hoisted(() => ({ url: new URL('https://dev.santelyon3.fr/annuaire') }));
vi.mock('$app/navigation', () => nav);
vi.mock('$app/state', () => ({
	page: {
		get url() {
			return state.url;
		}
	}
}));

const communeOf = [
	{ uid: 'c-lyon3', name: 'Lyon 3e Arrondissement' },
	{ uid: 'c-villeurbanne', name: 'Villeurbanne' }
] as Commune[];

const mount = (search = '') => {
	state.url = new URL(`https://dev.santelyon3.fr/annuaire${search}`);
	render(SelectCommunesR, {
		props: { communeOf },
		context: new Map<string, unknown>([
			['selectedCommunesUids', writable<string[]>([])],
			['selectedCommunesChoices', writable(null)]
		])
	});
};

beforeEach(() => nav.goto.mockClear());

describe('SelectCommunesR', () => {
	it('writes the chosen commune to the address', async () => {
		mount();
		await choose(m.ADDRESSBOOK_COMMUNES_PLACEHOLDER(), 'Villeurbanne');
		await expect.poll(() => lastQuery(nav.goto)?.get('communes')).toBe(JSON.stringify(['c-villeurbanne']));
	});

	it('removes it from the address when cleared', async () => {
		mount(`?communes=${encodeURIComponent('["c-lyon3"]')}`);
		await clear();
		await expect.poll(() => lastQuery(nav.goto)?.has('communes')).toBe(false);
	});

	it('leaves the other filters in the address when cleared', async () => {
		mount(`?communes=${encodeURIComponent('["c-lyon3"]')}&situation=s-1`);
		await clear();
		await expect.poll(() => lastQuery(nav.goto)?.get('situation')).toBe('s-1');
	});
});

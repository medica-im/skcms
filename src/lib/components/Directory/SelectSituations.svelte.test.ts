/**
 * The situation filter of the address book: the URL is the state. Choosing a
 * situation writes its uid to `?situation=` and clearing removes the
 * parameter, leaving the other filters as they were.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { writable } from 'svelte/store';
import * as m from '$msgs';
import SelectSituations from './SelectSituations.svelte';
import { choose, clear, lastQuery } from '$lib/testing/directoryFilter';
import '../../../app.postcss';

const nav = vi.hoisted(() => ({ goto: vi.fn() }));
const state = vi.hoisted(() => ({ url: new URL('https://dev.santelyon3.fr/annuaire') }));
vi.mock('$app/navigation', () => nav);
vi.mock('$app/state', () => ({
	page: {
		get url() {
			return state.url;
		},
		data: {
			situations: [
				{ uid: 's-1', name: 'Grossesse' },
				{ uid: 's-2', name: 'Soins palliatifs' }
			]
		}
	}
}));

const mount = (search = '') => {
	state.url = new URL(`https://dev.santelyon3.fr/annuaire${search}`);
	render(SelectSituations, {
		context: new Map<string, unknown>([['selectSituation', writable(null)]])
	});
};

beforeEach(() => nav.goto.mockClear());

describe('SelectSituations', () => {
	it('writes the chosen situation to the address', async () => {
		mount();
		await choose(m.ADDRESSBOOK_SITUATIONS_PLACEHOLDER(), 'Soins palliatifs');
		await expect.poll(() => lastQuery(nav.goto)?.get('situation')).toBe('s-2');
	});

	it('removes it from the address when cleared', async () => {
		mount('?situation=s-1');
		await clear();
		await expect.poll(() => lastQuery(nav.goto)?.has('situation')).toBe(false);
	});

	it('leaves the other filters in the address when cleared', async () => {
		mount('?situation=s-1&facility=f-1');
		await clear();
		await expect.poll(() => lastQuery(nav.goto)?.get('facility')).toBe('f-1');
	});
});

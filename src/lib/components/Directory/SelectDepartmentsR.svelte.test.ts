/**
 * The department filter of the address book: the URL is the state. Choosing a
 * department writes its code to `?department=` (as JSON) and clearing removes
 * the parameter, leaving the other filters as they were.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { writable } from 'svelte/store';
import * as m from '$msgs';
import SelectDepartmentsR from './SelectDepartmentsR.svelte';
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
vi.mock('$lib/Web/data', () => ({
	getDepartments: async () => [
		{ uid: 'd-69', name: 'Rhône', code: '69', slug: 'rhone', wikidata: '' },
		{ uid: 'd-84', name: 'Vaucluse', code: '84', slug: 'vaucluse', wikidata: '' }
	]
}));

const mount = (search = '') => {
	state.url = new URL(`https://dev.santelyon3.fr/annuaire${search}`);
	render(SelectDepartmentsR, {
		props: { departmentOf: ['69', '84'] },
		context: new Map<string, unknown>([['selectedDepartment', writable(null)]])
	});
};

beforeEach(() => nav.goto.mockClear());

describe('SelectDepartmentsR', () => {
	it('writes the chosen department to the address', async () => {
		mount();
		await choose(m.ADDRESSBOOK_DEPARTMENTS_PLACEHOLDER(), 'Vaucluse - 84');
		await expect.poll(() => lastQuery(nav.goto)?.get('department')).toBe(JSON.stringify('84'));
	});

	it('removes it from the address when cleared', async () => {
		mount(`?department=${encodeURIComponent('"69"')}`);
		await clear();
		await expect.poll(() => lastQuery(nav.goto)?.has('department')).toBe(false);
	});

	it('leaves the other filters in the address when cleared', async () => {
		mount(`?department=${encodeURIComponent('"69"')}&situation=s-1`);
		await clear();
		await expect.poll(() => lastQuery(nav.goto)?.get('situation')).toBe('s-1');
	});
});

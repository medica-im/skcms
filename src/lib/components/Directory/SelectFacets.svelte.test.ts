/**
 * The facet selectors of the directory: the URL is the state. A selector shows
 * only when the entries could be narrowed by it, so a directory that stores no
 * facets shows none; choosing writes the choice to the address and leaves the
 * other filters as they were.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page as screen } from 'vitest/browser';
import { writable } from 'svelte/store';
import * as m from '$msgs';
import SelectFacets from './SelectFacets.svelte';
import { lastQuery } from '#lib/testing/directoryFilter.ts';
import { makeEntry } from '#lib/store/directoryStore.fixtures.ts';
import { NO_FACETS } from '#lib/store/facetFilters.ts';
import { AA_TEXT, inScheme, legibility } from '#lib/testing/contrast.ts';
import '../../../app.postcss';

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

const ENTRIES = [
	makeEntry({
		uid: 'a',
		facets: { who_can_contact: 'anyone', access_modes: ['phone'], age_min: 16, free: true }
	}),
	makeEntry({
		uid: 'b',
		facets: { who_can_contact: 'referral', access_modes: ['walk_in'], free: false }
	})
];

const mount = (entries = ENTRIES, search = '', base?: typeof ENTRIES) => {
	state.url = new URL(`https://dev.santelyon3.fr/annuaire${search}`);
	const store = writable(NO_FACETS);
	render(SelectFacets, {
		props: { entries, base },
		context: new Map<string, unknown>([['facetSelection', store]])
	});
	return store;
};

beforeEach(() => nav.goto.mockClear());

describe('SelectFacets', () => {
	it('shows nothing when the entries store no facets', async () => {
		mount([makeEntry({ uid: 'a' }), makeEntry({ uid: 'b' })]);
		await expect.element(screen.getByText(m.DIRECTORY_FACET_ACCESS())).not.toBeInTheDocument();
		await expect.element(screen.getByText(m.DIRECTORY_FACET_AGE())).not.toBeInTheDocument();
	});

	it('offers the values the entries carry, with how many carry each', async () => {
		mount();
		await expect.element(screen.getByRole('button', { name: `${m.DIRECTORY_ACCESS_ANYONE()} (1)` })).toBeVisible();
		await expect.element(screen.getByRole('button', { name: `${m.DIRECTORY_ACCESS_REFERRAL()} (1)` })).toBeVisible();
		await expect
			.element(screen.getByRole('button', { name: `${m.DIRECTORY_ACCESS_PROFESSIONALS()} (1)` }))
			.not.toBeInTheDocument();
	});

	it('never offers how to reach an entry: one picks a resource for a reason, then uses whatever means it offers', async () => {
		mount();
		await expect
			.element(screen.getByText(m.DIRECTORY_ACCESS_ANYONE(), { exact: false }))
			.toBeVisible();
		await expect.element(screen.getByText(m.DIRECTORY_FACET_MODES())).not.toBeInTheDocument();
		await expect
			.element(screen.getByText(m.DIRECTORY_MODE_PHONE(), { exact: false }))
			.not.toBeInTheDocument();
	});

	it('writes a chosen value to the address and leaves the other filters', async () => {
		mount(ENTRIES, '?facility=f-1');
		await screen.getByRole('button', { name: `${m.DIRECTORY_ACCESS_ANYONE()} (1)` }).click();
		await expect.poll(() => lastQuery(nav.goto)?.get('access')).toBe('anyone');
		expect(lastQuery(nav.goto)?.get('facility')).toBe('f-1');
	});

	it('removes a chosen value when it is chosen again', async () => {
		mount(ENTRIES, '?access=anyone');
		await screen.getByRole('button', { name: `${m.DIRECTORY_ACCESS_ANYONE()} (1)` }).click();
		await expect.poll(() => lastQuery(nav.goto)?.has('access')).toBe(false);
	});

	it('writes the age', async () => {
		mount();
		await screen.getByRole('spinbutton').fill('17');
		await screen
			.getByRole('spinbutton')
			.element()
			.dispatchEvent(new Event('change', { bubbles: true }));
		await expect.poll(() => lastQuery(nav.goto)?.get('age')).toBe('17');
	});

	it('titles the age selector « Âge »', async () => {
		mount();
		await expect.element(screen.getByText('Âge', { exact: true })).toBeVisible();
	});

	it('resets the age with its own button and keeps the other choices', async () => {
		mount(ENTRIES, '?age=17&facility=f-1');
		await screen.getByRole('button', { name: m.DIRECTORY_FACET_AGE_CLEAR() }).click();
		await expect.poll(() => lastQuery(nav.goto)?.has('age')).toBe(false);
		expect(lastQuery(nav.goto)?.get('facility')).toBe('f-1');
	});

	it('offers no age reset while no age is set', async () => {
		mount();
		await expect.element(screen.getByRole('spinbutton')).toBeVisible();
		await expect
			.element(screen.getByRole('button', { name: m.DIRECTORY_FACET_AGE_CLEAR() }))
			.not.toBeInTheDocument();
	});

	it('has no clear-all of its own: « Tout effacer » clears every filter', async () => {
		mount(ENTRIES, '?free=1&access=anyone');
		await expect.element(screen.getByRole('button', { name: `${m.DIRECTORY_ACCESS_ANYONE()} (1)` })).toBeVisible();
		await expect.element(screen.getByText('Effacer les critères')).not.toBeInTheDocument();
	});

	it('publishes what the address chooses to the directory', async () => {
		const store = mount(ENTRIES, '?access=referral&free=1');
		await expect
			.poll(() => {
				let current;
				store.subscribe((value) => (current = value))();
				return current;
			})
			.toMatchObject({ access: 'referral', free: true });
	});

	describe('given what the other selectors leave', () => {
		const [A, B] = ENTRIES;

		it('disables a value no remaining entry carries, and keeps the others pressable', async () => {
			mount(ENTRIES, '', [A]);
			await expect
				.element(screen.getByRole('button', { name: `${m.DIRECTORY_ACCESS_REFERRAL()} (0)` }))
				.toBeDisabled();
			await expect
				.element(screen.getByRole('button', { name: `${m.DIRECTORY_ACCESS_ANYONE()} (1)` }))
				.toBeEnabled();
		});

		it('shows no count disc on a value nothing is left for: a blue disc would say something is there', async () => {
			mount(ENTRIES, '', [A]);
			const button = screen.getByRole('button', { name: `${m.DIRECTORY_ACCESS_REFERRAL()} (0)` });
			await expect.element(button).toBeDisabled();
			expect(button.element().querySelector('.badge-icon')).toBeNull();
		});

		it('keeps a chosen value pressable at zero, so it can be removed', async () => {
			mount(ENTRIES, '?access=referral', [A]);
			await expect
				.element(screen.getByRole('button', { name: `${m.DIRECTORY_ACCESS_REFERRAL()} (0)` }))
				.toBeEnabled();
		});

		it('tells how many entries a switch leaves, like every other button', async () => {
			mount(ENTRIES);
			await expect
				.element(screen.getByRole('button', { name: `${m.DIRECTORY_FACET_FREE()} (1)` }))
				.toBeVisible();
		});

		it('disables a switch nothing remains for', async () => {
			mount(ENTRIES, '', [B]);
			await expect
				.element(screen.getByRole('button', { name: m.DIRECTORY_FACET_FREE() }))
				.toBeDisabled();
		});
	});

	describe('age bands', () => {
		const make = (uid: string, facets: NonNullable<Parameters<typeof makeEntry>[0]>['facets']) =>
			makeEntry({ uid, facets });
		const youth = make('youth', { age_min: 16, age_max: 25 });
		const adults = make('adults', { age_min: 18 });
		const children = make('children', { age_min: 0, age_max: 15 });
		const other = make('other', { age_min: 0 });
		const all = [youth, adults, children, other];
		const narrowed = [youth, adults, children];

		it('keeps the number input while no other selector narrows the list', async () => {
			mount(all);
			await expect.element(screen.getByRole('spinbutton')).toBeVisible();
			await expect.element(screen.getByRole('radio').first()).not.toBeInTheDocument();
		});

		it('becomes bands cut at the narrowed entries\' own bounds, with how many cover each', async () => {
			mount(all, '', narrowed);
			await expect.element(screen.getByRole('spinbutton')).not.toBeInTheDocument();
			await expect
				.element(screen.getByRole('radio', { name: `${m.DIRECTORY_FACET_AGE_BAND({ min: 0, max: 15 })} (1)` }))
				.toBeVisible();
			await expect
				.element(
					screen.getByRole('radio', { name: `${m.DIRECTORY_FACET_AGE_BAND({ min: 16, max: 17 })} (1)` })
				)
				.toBeVisible();
			await expect
				.element(
					screen.getByRole('radio', { name: `${m.DIRECTORY_FACET_AGE_BAND({ min: 18, max: 25 })} (2)` })
				)
				.toBeVisible();
			await expect
				.element(screen.getByRole('radio', { name: `${m.DIRECTORY_FACET_AGE_FROM({ min: 26 })} (1)` }))
				.toBeVisible();
		});

		it('shows no « Âge » title over the bands: « Tous âges » already says what they are', async () => {
			mount(all, '', narrowed);
			await expect.element(screen.getByText(m.DIRECTORY_FACET_AGE_ALL())).toBeVisible();
			const title = screen.getByText(m.DIRECTORY_FACET_AGE(), { exact: true }).element();
			expect(title.getBoundingClientRect().width).toBeLessThanOrEqual(1);
		});

		it('names a band briefly, with an en dash: « 16–17 ans »', async () => {
			mount(all, '', narrowed);
			await expect.element(screen.getByText('16–17 ans', { exact: true })).toBeVisible();
		});

		it('writes the first age of a picked band', async () => {
			mount(all, '?facility=f-1', narrowed);
			await screen
				.getByText(m.DIRECTORY_FACET_AGE_BAND({ min: 16, max: 17 }), { exact: true })
				.click();
			await expect.poll(() => lastQuery(nav.goto)?.get('age')).toBe('16');
			expect(lastQuery(nav.goto)?.get('facility')).toBe('f-1');
		});

		it('marks the band that holds the age in the address', async () => {
			mount(all, '?age=17', narrowed);
			await expect
				.element(
					screen.getByRole('radio', { name: `${m.DIRECTORY_FACET_AGE_BAND({ min: 16, max: 17 })} (1)` })
				)
				.toBeChecked();
		});

		it('« Tous âges » removes the age and keeps the other choices', async () => {
			mount(all, '?age=17&access=anyone', narrowed);
			await screen.getByText(m.DIRECTORY_FACET_AGE_ALL()).click();
			await expect.poll(() => lastQuery(nav.goto)?.has('age')).toBe(false);
			expect(lastQuery(nav.goto)?.get('access')).toBe('anyone');
		});

		it('disables a band no remaining entry covers', async () => {
			const gap = [make('young', { age_max: 10 }), make('old', { age_min: 20 })];
			mount([...gap, other], '', gap);
			await expect
				.element(
					screen.getByRole('radio', { name: `${m.DIRECTORY_FACET_AGE_BAND({ min: 11, max: 19 })} (0)` })
				)
				.toBeDisabled();
		});
	});

	for (const scheme of ['light', 'dark'] as const) {
		it(`reads at AA in ${scheme} mode: titles, chips, the age field and its reset`, async () => {
			await inScheme(scheme, async () => {
				mount(ENTRIES, '?age=17');
				const parts = [
					screen.getByText(m.DIRECTORY_FACET_ACCESS()),
					screen.getByText(m.DIRECTORY_FACET_AGE(), { exact: true }),
					screen.getByRole('button', { name: m.DIRECTORY_FACET_AGE_CLEAR() }),
					screen.getByRole('button', { name: `${m.DIRECTORY_ACCESS_ANYONE()} (1)` }),
					screen.getByRole('button', { name: `${m.DIRECTORY_ACCESS_REFERRAL()} (1)` }),
					screen.getByText(m.DIRECTORY_FACET_FREE()),
					screen.getByRole('spinbutton')
				];
				for (const part of parts) await expect.element(part).toBeVisible();
				const unreadable = parts
					.map((part) => part.element())
					.map((el) => ({ text: el.textContent?.trim() || el.tagName, ratio: legibility(el) }))
					.filter(({ ratio }) => ratio < AA_TEXT);
				expect(unreadable).toEqual([]);
			});
		});

		it(`reads at AA in ${scheme} mode: a chosen chip and the age bands, picked or not`, async () => {
			await inScheme(scheme, async () => {
				mount(ENTRIES, '?access=anyone&age=17');
				const parts = [
					screen.getByText(m.DIRECTORY_FACET_ACCESS()),
					screen.getByRole('button', { name: `${m.DIRECTORY_ACCESS_ANYONE()} (1)` }),
					screen.getByRole('button', { name: `${m.DIRECTORY_ACCESS_REFERRAL()} (1)` }),
					screen.getByText(m.DIRECTORY_FACET_AGE_ALL()),
					screen.getByText(m.DIRECTORY_FACET_AGE_FROM({ min: 16 }), { exact: true }),
					screen.getByText('1', { exact: true }).last()
				];
				for (const part of parts) await expect.element(part).toBeVisible();
				const unreadable = parts
					.map((part) => part.element())
					.map((el) => ({ text: el.textContent?.trim() || el.tagName, ratio: legibility(el) }))
					.filter(({ ratio }) => ratio < AA_TEXT);
				expect(unreadable).toEqual([]);
			});
		});
	}
});

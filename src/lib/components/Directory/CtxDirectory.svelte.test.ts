/**
 * Reactivity contract of the address book's filter chain.
 *
 * The rule these protect: **changing a selector updates the displayed list, on
 * its own, with no reload and no user action beyond the selector itself.** That
 * is the behaviour most at risk in the Svelte 5 rewrite of CtxDirectory, since
 * it depends on $derived still tracking values that arrive through context
 * stores rather than through props.
 *
 * directoryStore.test.ts already pins *what* each filter returns. These pin
 * that the result actually reaches the screen when an input changes — a
 * distinction no pure-function test can make, because a chain that computes
 * perfectly but never re-runs passes every pure test and ships a dead UI.
 *
 * They drive the context stores directly, which is what the real selector
 * components (SelectCategoriesR, SearchDirectory, …) do when a user picks
 * something.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Harness from './CtxDirectoryHarness.svelte';
import {
	makeEntry,
	makeSituation,
	organization,
	NURSE,
	DOCTOR,
	TAG_ONCO,
	TAG_GERIA
} from '$lib/store/directoryStore.fixtures.ts';

const alice = makeEntry({
	uid: 'alice',
	name: 'Alice Martin',
	type: NURSE,
	communeUid: 'commune-a',
	departmentCode: '84',
	facilityUid: 'facility-a',
	tags: [TAG_ONCO]
});
const bob = makeEntry({
	uid: 'bob',
	name: 'Bob Durand',
	type: DOCTOR,
	communeUid: 'commune-b',
	departmentCode: '69',
	facilityUid: 'facility-b',
	tags: [TAG_GERIA]
});
const claire = makeEntry({
	uid: 'claire',
	name: 'Claire Petit',
	type: NURSE,
	communeUid: 'commune-b',
	departmentCode: '69',
	facilityUid: 'facility-b',
	tags: null
});

const entries = [alice, bob, claire];

function mount(props = {}) {
	return render(Harness, { entries, organization, ...props });
}

type Screen = Awaited<ReturnType<typeof mount>>;

/** The names currently rendered, in DOM order. */
function names(screen: Screen) {
	return screen
		.getByTestId('entry')
		.elements()
		.map((el) => el.textContent);
}

/** The category headings currently rendered, in DOM order. */
function categories(screen: Screen) {
	return screen
		.getByTestId('category')
		.elements()
		.map((el) => el.textContent);
}

describe('the list follows the selectors', () => {
	it('shows every entry before anything is selected', async () => {
		const screen = await mount();
		await expect.element(screen.getByTestId('count')).toHaveTextContent('3');
	});

	it('updates when a category is selected, and again when it is cleared', async () => {
		const screen = await mount();
		const { selectCategories } = screen.component.stores;

		selectCategories.set([NURSE.uid]);
		await expect.element(screen.getByTestId('count')).toHaveTextContent('2');
		expect(names(screen)).toEqual(['Alice Martin', 'Claire Petit']);

		// Clearing must restore the full list — the regression that would leave
		// the address book stuck on a stale filter.
		selectCategories.set([]);
		await expect.element(screen.getByTestId('count')).toHaveTextContent('3');
	});

	it('updates as the search term is typed and erased', async () => {
		const screen = await mount();
		const { term } = screen.component.stores;

		term.set('ali');
		await expect.element(screen.getByTestId('count')).toHaveTextContent('1');
		expect(names(screen)).toEqual(['Alice Martin']);

		term.set('');
		await expect.element(screen.getByTestId('count')).toHaveTextContent('3');
	});

	it('updates when a commune is selected', async () => {
		const screen = await mount();
		screen.component.stores.selectCommunes.set(['commune-b']);
		await expect.element(screen.getByTestId('count')).toHaveTextContent('2');
		expect(names(screen)).toEqual(['Bob Durand', 'Claire Petit']);
	});

	it('updates when a department is selected', async () => {
		const screen = await mount();
		screen.component.stores.selectDepartment.set({ label: 'Vaucluse', value: '84' });
		await expect.element(screen.getByTestId('count')).toHaveTextContent('1');
		expect(names(screen)).toEqual(['Alice Martin']);
	});

	it('updates when a facility is selected', async () => {
		const screen = await mount();
		screen.component.stores.selectFacility.set('facility-a');
		await expect.element(screen.getByTestId('count')).toHaveTextContent('1');
		expect(names(screen)).toEqual(['Alice Martin']);
	});

	it('updates when tags are selected', async () => {
		const screen = await mount();
		screen.component.stores.selectTags.set([TAG_ONCO]);
		await expect.element(screen.getByTestId('count')).toHaveTextContent('1');
		expect(names(screen)).toEqual(['Alice Martin']);
	});
});

describe('selectors compose', () => {
	it('narrows further as a second selector is added, and widens as it is removed', async () => {
		const screen = await mount();
		const { selectCategories, selectCommunes } = screen.component.stores;

		selectCategories.set([NURSE.uid]);
		await expect.element(screen.getByTestId('count')).toHaveTextContent('2');

		selectCommunes.set(['commune-b']);
		await expect.element(screen.getByTestId('count')).toHaveTextContent('1');
		expect(names(screen)).toEqual(['Claire Petit']);

		selectCommunes.set([]);
		await expect.element(screen.getByTestId('count')).toHaveTextContent('2');
	});

	it('shows an empty list when the combination matches nothing', async () => {
		const screen = await mount();
		const { selectCategories, selectCommunes } = screen.component.stores;

		selectCategories.set([DOCTOR.uid]);
		selectCommunes.set(['commune-a']);
		await expect.element(screen.getByTestId('count')).toHaveTextContent('0');
		expect(names(screen)).toEqual([]);
	});
});

describe('the situation selector drives the upstream stage too', () => {
	// selectSituation is read by fullFilteredEntriesF, one stage earlier than
	// the other selectors, so it exercises propagation through the whole chain
	// rather than just the last link.
	const situations = [makeSituation('sit-1', ['alice'])];

	it('re-filters from the top when a situation is chosen and cleared', async () => {
		const screen = await mount({ situations });
		const { selectSituation } = screen.component.stores;

		selectSituation.set({ label: 'Situation 1', value: 'sit-1' });
		await expect.element(screen.getByTestId('count')).toHaveTextContent('1');
		expect(names(screen)).toEqual(['Alice Martin']);

		selectSituation.set(undefined);
		await expect.element(screen.getByTestId('count')).toHaveTextContent('3');
	});
});

describe('the grouped view follows too', () => {
	it('re-groups when the filtered set changes', async () => {
		const screen = await mount();

		await expect.element(screen.getByTestId('count')).toHaveTextContent('3');
		expect(categories(screen)).toEqual(['infirmier', 'medecin']);

		// Removing the only médecin must remove the whole group, not leave an
		// empty heading behind.
		screen.component.stores.selectCategories.set([NURSE.uid]);
		await expect.element(screen.getByTestId('count')).toHaveTextContent('2');
		expect(categories(screen)).toEqual(['infirmier']);
	});
});

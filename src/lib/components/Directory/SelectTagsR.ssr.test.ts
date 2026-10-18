/**
 * The tag selector rendered on the server, as the page's first HTML.
 *
 * Shown with no type chosen (every offered type connected to the mentions),
 * it is now part of the server render of a whole directory of IPAs. Bound to
 * a computed value, svelte-select never settled there: the render looped
 * forever and froze the Node server for every page and every visitor.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'svelte/server';
import { writable } from 'svelte/store';
import SelectTagsR from './SelectTagsR.svelte';
import { makeEntry, IPA, IPA_MENTIONS } from '$lib/store/directoryStore.fixtures.ts';

const entries = [makeEntry({ uid: 'ipa-1', type: IPA, tags: IPA_MENTIONS })];

vi.mock('$app/state', () => ({
	page: {
		get data() {
			return { entries };
		},
		url: new URL('https://dev.unipa.fr/annuaire/')
	}
}));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

describe('SelectTagsR on the server', () => {
	it('renders the mention selector once, without looping', () => {
		const { body } = render(SelectTagsR, {
			props: { tagOf: IPA_MENTIONS, categoryOf: [IPA] },
			context: new Map<string, unknown>([
				['selectCategories', writable<string[]>([])],
				['selectedTags', writable(null)]
			])
		});
		expect(body).toContain('placeholder="mention"');
	});
});

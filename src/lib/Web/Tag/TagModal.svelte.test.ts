/**
 * The button that opens the tags dialog fits its label. On the entry page it sits in a
 * column that stretches its children, where it spread across the whole width.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import TagModal from './TagModal.svelte';
import '../../../app.postcss';

vi.mock('../../../tag.remote.ts', () => ({ postEntryTag: vi.fn(), getTagCategories: vi.fn(), getTags: vi.fn() }));
vi.mock('$app/navigation', () => ({ invalidate: vi.fn() }));

const COLUMN = 600;

const mount = (tags: unknown) => {
	const column = document.createElement('div');
	column.className = 'flex flex-col';
	column.style.width = `${COLUMN}px`;
	document.body.appendChild(column);
	render(TagModal, { target: column, props: { tags }, context: new Map([['entryUid', 'e1']]) } as never);
	return column;
};

describe('the tags button', () => {
	for (const [label, tags] of [
		['adding the first tag', null],
		['editing the tags', [{ uid: 't', label: 'Étiquette', name: 'etiquette' }]]
	] as const) {
		it(`is as wide as its label, not its column, when ${label}`, async () => {
			const column = mount(tags);
			await expect.poll(() => column.querySelector('button')).not.toBeNull();
			const button = column.querySelector('button')!;
			expect(button.getBoundingClientRect().width).toBeLessThan(COLUMN / 2);
		});
	}
});

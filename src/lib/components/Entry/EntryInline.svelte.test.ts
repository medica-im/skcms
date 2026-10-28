/**
 * One team member, as a programme page credits them.
 *
 * People who leave keep their credit: their entry goes inactive, but the work
 * they did stays theirs, so the page still names them with their occupation.
 * Their own page answers 404, though, so a retired member is plain text — no
 * link to a page that is gone — and has no picture, which the API does not
 * send for them either.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import EntryInline from './EntryInline.svelte';
import type { EntryCredit } from '$lib/store/directoryStoreInterface';

const credit = (active: boolean): EntryCredit => ({
	entrySlug: 'charlotte-goolaerts-mg-84',
	name: 'Charlotte Goolaerts',
	effector_type: { name: 'médecin généraliste', label: 'médecin généraliste' },
	active,
	avatar: active ? { sm: '/media/sm.png', lg: '/media/lg.png', raw: '/media/raw.png' } : null
});

describe('EntryInline', () => {
	it('credits a retired member by name and occupation', async () => {
		render(EntryInline, { data: credit(false) });
		await expect.element(page.getByText('Charlotte Goolaerts, médecin généraliste')).toBeInTheDocument();
	});

	it('does not link a retired member to their page, which is gone', async () => {
		render(EntryInline, { data: credit(false) });
		await expect.element(page.getByText(/Charlotte Goolaerts/)).toBeInTheDocument();
		expect(document.body.querySelector('a')).toBeNull();
	});

	it('shows a retired member with the default avatar, like every member without a picture', async () => {
		render(EntryInline, { data: credit(false) });
		await expect.element(page.getByText(/Charlotte Goolaerts/)).toBeInTheDocument();
		expect(document.body.querySelector('figure.avatar')).not.toBeNull();
		expect(document.body.querySelector('img')).toBeNull();
	});

	it("links an active member to their page, with their picture", async () => {
		render(EntryInline, { data: credit(true) });
		await expect.element(page.getByRole('link')).toHaveAttribute('href', '/e/charlotte-goolaerts-mg-84');
		expect(document.body.querySelector('img')?.getAttribute('src')).toBe('/media/sm.png');
	});
});

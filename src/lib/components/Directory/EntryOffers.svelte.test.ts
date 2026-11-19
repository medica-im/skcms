/**
 * What an entry offers the person who comes (« Propose »), at a glance: one short chip per
 * offer, with an icon, in the order of the vocabulary. An entry that does not say shows
 * nothing; the chips stay legible (AA) in both modes. In edit mode a pen opens a dialog of
 * the whole vocabulary, to tick or untick; it saves through the entry's PATCH (owner or
 * creator, administrators, superusers: the backend's rule).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page as screen } from 'vitest/browser';
import * as m from '$msgs';
import EntryOffers from './EntryOffers.svelte';
import { OFFERS } from '#lib/store/directoryStoreInterface.ts';
import { AA_TEXT, inScheme, legibility } from '#lib/testing/contrast.ts';
import '../../../app.postcss';

document.body.dataset.theme = 'wintry';

const remote = vi.hoisted(() => ({ patchCommand: vi.fn() }));
const nav = vi.hoisted(() => ({ invalidate: vi.fn() }));
vi.mock('../../../entry.remote', () => remote);
vi.mock('$app/navigation', () => nav);

beforeEach(() => {
	remote.patchCommand.mockReset();
	nav.invalidate.mockReset();
	nav.invalidate.mockResolvedValue(undefined);
});

const chips = () =>
	screen.getByRole('list', { name: m.DIRECTORY_ENTRY_OFFERS() }).getByRole('listitem').elements();

describe('EntryOffers', () => {
	it('shows nothing when the entry does not say what it offers', async () => {
		render(EntryOffers, { props: { offers: null } });
		await expect.element(screen.getByText(m.DIRECTORY_ENTRY_OFFERS())).not.toBeInTheDocument();
	});

	it("shows UNAFAM's offers as short chips, in the order of the vocabulary", async () => {
		render(EntryOffers, {
			props: { offers: ['advocacy', 'listening', 'peer_support', 'information', 'training'] }
		});
		expect(chips().map((chip) => chip.textContent?.trim())).toEqual([
			m.DIRECTORY_OFFER_LISTENING(),
			m.DIRECTORY_OFFER_INFORMATION(),
			m.DIRECTORY_OFFER_PEER_SUPPORT(),
			m.DIRECTORY_OFFER_TRAINING(),
			m.DIRECTORY_OFFER_ADVOCACY()
		]);
		expect(chips().every((chip) => chip.querySelector('svg'))).toBe(true);
	});

	it('tells a stay day and night from a day at the hospital', async () => {
		render(EntryOffers, {
			props: { offers: ['day_hospitalisation', 'full_time_hospitalisation'] }
		});
		expect(chips().map((chip) => chip.textContent?.trim())).toEqual([
			m.DIRECTORY_OFFER_FULL_TIME_HOSPITALISATION(),
			m.DIRECTORY_OFFER_DAY_HOSPITALISATION()
		]);
		expect(m.DIRECTORY_OFFER_FULL_TIME_HOSPITALISATION()).toBe('Hospitalisation complète');
		expect(m.DIRECTORY_OFFER_DAY_HOSPITALISATION()).toBe('Hospitalisation de jour');
	});

	it('has a label and an icon for every offer of the vocabulary', async () => {
		render(EntryOffers, { props: { offers: [...OFFERS] } });
		expect(chips()).toHaveLength(OFFERS.length);
		expect(chips().every((chip) => chip.textContent?.trim() && chip.querySelector('svg'))).toBe(
			true
		);
	});

	for (const scheme of ['light', 'dark'] as const) {
		it(`reads at AA in ${scheme} mode`, async () => {
			await inScheme(scheme, async () => {
				render(EntryOffers, { props: { offers: ['listening', 'training'] } });
				const unreadable = chips()
					.map((el) => ({ text: el.textContent?.trim(), ratio: legibility(el) }))
					.filter(({ ratio }) => ratio < AA_TEXT);
				expect(unreadable).toEqual([]);
			});
		});
	}
});

describe('editing what an entry offers', () => {
	const pen = () => screen.getByRole('button', { name: m.ENTRY_OFFERS_EDIT() });
	const save = () => screen.getByRole('button', { name: m.ENTRY_OFFERS_SAVE() });
	const box = (label: string) => screen.getByRole('checkbox', { name: label, exact: true });

	it('offers no pen outside edit mode', async () => {
		render(EntryOffers, { props: { offers: ['listening'], entryUid: 'e1', editMode: false } });
		await expect.element(pen()).not.toBeInTheDocument();
	});

	it('offers the pen in edit mode even before anything is said', async () => {
		render(EntryOffers, { props: { offers: null, entryUid: 'e1', editMode: true } });
		await expect.element(pen()).toBeVisible();
	});

	it('ticks what is offered, and saves only a change', async () => {
		remote.patchCommand.mockResolvedValue({ success: true, status: 200 });
		nav.invalidate.mockImplementation(() => new Promise(() => {}));
		render(EntryOffers, { props: { offers: ['listening'], entryUid: 'e1', editMode: true } });
		await pen().click();
		await expect.element(box(m.DIRECTORY_OFFER_LISTENING())).toBeChecked();
		await expect.element(save()).toBeDisabled();
		await box(m.DIRECTORY_OFFER_TRAINING()).click();
		await save().click();
		expect(remote.patchCommand).toHaveBeenCalledWith({
			entry: 'e1',
			offers: ['listening', 'training']
		});
		await expect.element(screen.getByText(m.ENTRY_OFFERS_SAVED())).toBeVisible();
		expect(nav.invalidate).toHaveBeenCalledWith('entry:now');
	});

	it('says nothing is offered any more when every box is unticked', async () => {
		remote.patchCommand.mockResolvedValue({ success: true, status: 200 });
		render(EntryOffers, { props: { offers: ['listening'], entryUid: 'e1', editMode: true } });
		await pen().click();
		await box(m.DIRECTORY_OFFER_LISTENING()).click();
		await save().click();
		expect(remote.patchCommand).toHaveBeenCalledWith({ entry: 'e1', offers: null });
	});

	it('gives every box a 44px target', async () => {
		render(EntryOffers, { props: { offers: null, entryUid: 'e1', editMode: true } });
		await pen().click();
		const small = screen
			.getByTestId('entry-offers-dialog')
			.getByRole('checkbox')
			.elements()
			.map((el) => el.closest('label')!.getBoundingClientRect().height)
			.filter((height) => height < 44);
		expect(small).toEqual([]);
	});

	it('says so when the server refuses', async () => {
		remote.patchCommand.mockResolvedValue({ success: false, status: 403 });
		render(EntryOffers, { props: { offers: null, entryUid: 'e1', editMode: true } });
		await pen().click();
		await box(m.DIRECTORY_OFFER_LISTENING()).click();
		await save().click();
		await expect
			.element(screen.getByTestId('entry-offers-refusal'))
			.toHaveTextContent(m.ENTRY_DESCRIPTION_ERROR_NOT_ALLOWED());
	});
});

/**
 * Where an entry without premises answers (« Zone couverte »), in place of an address: the
 * country, regions, départements or communes it covers, widest first. A commune or a
 * département shows its code, the only way to tell the six Saint-Maurice apart.
 *
 * In edit mode a pen opens a dialog: a search across all four kinds, to add one place or
 * several of any kind (two départements, three communes, a region and a commune), and a
 * button to remove each. It saves through the entry's PATCH, which whoever may edit the
 * entry may send (the backend's rule).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page as screen } from 'vitest/browser';
import * as m from '$msgs';
import EntryCoverage from './EntryCoverage.svelte';
import type { Coverage } from '#lib/store/directoryStoreInterface.ts';
import '../../../app.postcss';

const remote = vi.hoisted(() => ({ patchCommand: vi.fn(), searchPlaces: vi.fn() }));
const nav = vi.hoisted(() => ({ invalidate: vi.fn() }));
vi.mock('../../../entry.remote', () => remote);
vi.mock('$app/navigation', () => nav);

const FRANCE: Coverage = {
	uid: 'fr',
	name: 'France',
	kind: 'country',
	code: 'FR',
	department: null
};
const ARA: Coverage = {
	uid: 'ara',
	name: 'Auvergne-Rhône-Alpes',
	kind: 'region',
	code: '84',
	department: null
};
const RHONE: Coverage = {
	uid: 'd69',
	name: 'Rhône',
	kind: 'department',
	code: '69',
	department: null
};
const AIN: Coverage = { uid: 'd01', name: 'Ain', kind: 'department', code: '01', department: null };
const LYON: Coverage = { uid: 'lyon', name: 'Lyon', kind: 'commune', code: null, department: '69' };
const SAINT_MAURICE_94: Coverage = {
	uid: 'sm94',
	name: 'Saint-Maurice',
	kind: 'commune',
	code: null,
	department: '94'
};
const SAINT_MAURICE_01: Coverage = {
	uid: 'sm01',
	name: 'Saint-Maurice',
	kind: 'commune',
	code: null,
	department: '01'
};

const FOUND: Record<string, Coverage[]> = {
	rhone: [RHONE, ARA],
	ain: [AIN],
	lyon: [LYON],
	'saint-maurice': [SAINT_MAURICE_01, SAINT_MAURICE_94],
	france: [FRANCE]
};

beforeEach(() => {
	remote.patchCommand.mockReset();
	remote.searchPlaces.mockReset();
	remote.searchPlaces.mockImplementation(async (q: string) => FOUND[q] ?? []);
	nav.invalidate.mockReset();
	nav.invalidate.mockResolvedValue(undefined);
});

const shown = () =>
	screen
		.getByRole('list', { name: m.DIRECTORY_ENTRY_COVERAGE() })
		.getByRole('listitem')
		.elements()
		.map((item) => item.textContent?.trim());

describe('EntryCoverage', () => {
	it('shows nothing when the entry does not say where it answers', async () => {
		render(EntryCoverage, { props: { coverage: [] } });
		await expect.element(screen.getByText(m.DIRECTORY_ENTRY_COVERAGE())).not.toBeInTheDocument();
	});

	it('shows each place, a commune and a département with their code', async () => {
		render(EntryCoverage, { props: { coverage: [FRANCE, ARA, RHONE, LYON] } });
		expect(shown()).toEqual(['France', 'Auvergne-Rhône-Alpes', 'Rhône (69)', 'Lyon (69)']);
	});

	it('tells two communes of the same name apart', async () => {
		render(EntryCoverage, { props: { coverage: [SAINT_MAURICE_01, SAINT_MAURICE_94] } });
		expect(shown()).toEqual(['Saint-Maurice (01)', 'Saint-Maurice (94)']);
	});
});

describe('editing where an entry answers', () => {
	const pen = () => screen.getByRole('button', { name: m.ENTRY_COVERAGE_EDIT() });
	const search = () => screen.getByRole('searchbox', { name: m.ENTRY_COVERAGE_SEARCH() });
	const save = () => screen.getByRole('button', { name: m.ENTRY_COVERAGE_SAVE() });
	const found = (name: string) =>
		screen.getByTestId('entry-coverage-found').getByRole('button', { name });
	const remove = (name: string) =>
		screen.getByRole('button', { name: m.ENTRY_COVERAGE_REMOVE({ name }) });

	async function add(typed: string, name: string) {
		await search().fill(typed);
		await found(name).click();
	}

	it('offers no pen outside edit mode', async () => {
		render(EntryCoverage, { props: { coverage: [RHONE], entryUid: 'e1', editMode: false } });
		await expect.element(pen()).not.toBeInTheDocument();
	});

	it('offers the pen in edit mode even before anything is said', async () => {
		render(EntryCoverage, { props: { coverage: [], entryUid: 'e1', editMode: true } });
		await expect.element(pen()).toBeVisible();
	});

	it('covers one département, and saves only a change', async () => {
		remote.patchCommand.mockResolvedValue({ success: true, status: 200 });
		nav.invalidate.mockImplementation(() => new Promise(() => {}));
		render(EntryCoverage, { props: { coverage: [], entryUid: 'e1', editMode: true } });
		await pen().click();
		await expect.element(save()).toBeDisabled();
		await add('rhone', 'Rhône (69) Département');
		await save().click();
		expect(remote.patchCommand).toHaveBeenCalledWith({ entry: 'e1', coverage: ['d69'] });
		await expect.element(screen.getByText(m.ENTRY_COVERAGE_SAVED())).toBeVisible();
		expect(nav.invalidate).toHaveBeenCalledWith('entry:now');
	});

	it('covers the whole country', async () => {
		remote.patchCommand.mockResolvedValue({ success: true, status: 200 });
		render(EntryCoverage, { props: { coverage: [], entryUid: 'e1', editMode: true } });
		await pen().click();
		await add('france', 'France Pays');
		await save().click();
		expect(remote.patchCommand).toHaveBeenCalledWith({ entry: 'e1', coverage: ['fr'] });
	});

	it('covers several départements and a commune at once', async () => {
		remote.patchCommand.mockResolvedValue({ success: true, status: 200 });
		render(EntryCoverage, { props: { coverage: [], entryUid: 'e1', editMode: true } });
		await pen().click();
		await add('rhone', 'Rhône (69) Département');
		await add('ain', 'Ain (01) Département');
		await add('saint-maurice', 'Saint-Maurice (94) Commune');
		await save().click();
		expect(remote.patchCommand).toHaveBeenCalledWith({
			entry: 'e1',
			coverage: ['d69', 'd01', 'sm94']
		});
	});

	it('does not offer a place already covered', async () => {
		render(EntryCoverage, { props: { coverage: [RHONE], entryUid: 'e1', editMode: true } });
		await pen().click();
		await search().fill('rhone');
		await expect.element(found('Auvergne-Rhône-Alpes Région')).toBeVisible();
		await expect.element(found('Rhône (69) Département')).not.toBeInTheDocument();
	});

	it('says so when nothing matches', async () => {
		render(EntryCoverage, { props: { coverage: [], entryUid: 'e1', editMode: true } });
		await pen().click();
		await search().fill('zzz');
		await expect.element(screen.getByText(m.ENTRY_COVERAGE_NONE_FOUND())).toBeVisible();
	});

	it('removes one place and keeps the others', async () => {
		remote.patchCommand.mockResolvedValue({ success: true, status: 200 });
		render(EntryCoverage, { props: { coverage: [RHONE, AIN], entryUid: 'e1', editMode: true } });
		await pen().click();
		await remove('Ain (01)').click();
		await save().click();
		expect(remote.patchCommand).toHaveBeenCalledWith({ entry: 'e1', coverage: ['d69'] });
	});

	it('clears the area when every place is removed', async () => {
		remote.patchCommand.mockResolvedValue({ success: true, status: 200 });
		render(EntryCoverage, { props: { coverage: [RHONE], entryUid: 'e1', editMode: true } });
		await pen().click();
		await remove('Rhône (69)').click();
		await expect.element(screen.getByText(m.ENTRY_COVERAGE_EMPTY())).toBeVisible();
		await save().click();
		expect(remote.patchCommand).toHaveBeenCalledWith({ entry: 'e1', coverage: [] });
	});

	it('gives every result and every remove button a 44px target', async () => {
		render(EntryCoverage, { props: { coverage: [RHONE], entryUid: 'e1', editMode: true } });
		await pen().click();
		await search().fill('saint-maurice');
		await expect.element(found('Saint-Maurice (01) Commune')).toBeVisible();
		const dialog = screen.getByTestId('entry-coverage-dialog');
		const small = dialog
			.getByRole('button')
			.elements()
			.map((el) => el.getBoundingClientRect().height)
			.filter((height) => height < 44);
		expect(small).toEqual([]);
	});

	it('says so when the server refuses', async () => {
		remote.patchCommand.mockResolvedValue({ success: false, status: 403 });
		render(EntryCoverage, { props: { coverage: [], entryUid: 'e1', editMode: true } });
		await pen().click();
		await add('lyon', 'Lyon (69) Commune');
		await save().click();
		await expect
			.element(screen.getByTestId('entry-coverage-refusal'))
			.toHaveTextContent(m.ENTRY_DESCRIPTION_ERROR_NOT_ALLOWED());
	});
});

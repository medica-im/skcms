/**
 * The facility select filters through facilityMatches, in a real browser.
 *
 * The matching rules are unit-tested in facilityOption.test.ts. What only a
 * rendered select can show is the wiring: that svelte-select calls our filter
 * with the option, so the label and per-word matching reach the list — its
 * default filter would be a plain substring of the displayed line, and "msp
 * lyon" would find nothing.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import FacilitySelect from './FacilitySelect.svelte';
import * as data from './data';
import '../../app.postcss';

const commune = (uid: string, name_fr: string) => ({
	uid,
	name_fr,
	slug_fr: name_fr.toLowerCase(),
	department: { uid: 'd69', code: '69', name: 'Rhône', slug: 'rhone', wikidata: 'Q12724' }
});

// The signed-in role, set per test; none by default.
const who = vi.hoisted(() => ({ role: undefined as string | undefined }));
vi.mock('$app/state', () => ({
	page: {
		get data() {
			return { user: who.role ? { role: who.role } : undefined };
		}
	}
}));

vi.mock('./data', () => ({
	getDepartments: async () => [{ uid: 'd69', code: '69', name: 'Rhône', slug: 'rhone', wikidata: 'Q12724' }],
	getCommunesByDpt: async () => [],
	getFacilities: vi.fn(async () => [
		{ uid: 'f1', name: 'Maison de santé du Parc', label: 'MSP du Parc', street: '12 rue de la République',
		  commune: commune('c1', 'Lyon'), effectors: null },
		{ uid: 'f2', name: "L'Hôpital Saint-Étienne", label: 'CHU Nord', street: 'Bd Leclerc',
		  commune: commune('c2', 'Villeurbanne'), effectors: null },
		{ uid: 'f3', name: null, label: null, street: '3 place Bellecour',
		  commune: commune('c1', 'Lyon'), effectors: null },
		// 86 characters displayed: the 90th percentile of production's lines.
		{ uid: 'f4', name: 'Centre hospitalier universitaire Lyon Sud', label: null,
		  street: '165 ch. Grand Revoyet', commune: commune('c3', 'Pierre-Bénite'), effectors: null },
		// 122 characters: the longest production line.
		{ uid: 'f5', name: 'Maison de santé pluriprofessionnelle des Monts du Lyonnais et du Beaujolais',
		  label: null, street: '12500 avenue des Frères Lumières', commune: commune('c1', 'Lyon'), effectors: null }
	])
}));

/** The options the open list shows, as text. */
const shown = () => [...document.querySelectorAll('.list-item')].map((e) => e.textContent?.trim() ?? '');

/**
 * Opens the facility list and types `query`. The list re-renders after each
 * keystroke, so callers wait for it with expect.poll rather than reading it
 * once: a single read raced the render under a loaded parallel run.
 */
async function search(query: string) {
	render(FacilitySelect, {
		selectedFacility: undefined,
		department: undefined,
		commune: undefined,
		facilityCount: 0
	});
	await expect.element(page.getByText('Établissements: 5')).toBeInTheDocument();
	const input = page.getByPlaceholder('Sélectionner un établissement');
	// fill, not click or type: those go through keyboard focus, which Firefox
	// withholds from a window that is not focused — the case when browsers run
	// in parallel — and the list stayed shut or the keys were lost, one run in
	// three. fill sets the value and fires the input event, which is what opens
	// and filters the list. With nothing to search, a space: facilityMatches
	// reads it as an empty query, and it still opens the list.
	await userEvent.fill(input, query || ' ');
}

const BELLECOUR = '3 place Bellecour, Lyon, Rhône';
const HOPITAL = "L'Hôpital Saint-Étienne, Bd Leclerc, Villeurbanne, Rhône";
const PARC = 'Maison de santé du Parc, 12 rue de la République, Lyon, Rhône';
const P90 = 'Centre hospitalier universitaire Lyon Sud, 165 ch. Grand Revoyet, Pierre-Bénite, Rhône';
const LONGEST =
	'Maison de santé pluriprofessionnelle des Monts du Lyonnais et du Beaujolais, 12500 avenue des Frères Lumières, Lyon, Rhône';
const ALL = [BELLECOUR, P90, HOPITAL, PARC, LONGEST];

describe('FacilitySelect search', () => {
	it('lists every facility, name first, before anything is typed', async () => {
		await search('');
		await expect.poll(shown).toEqual(ALL);
	});

	it('finds a facility by its label and its commune together', async () => {
		await search('msp lyon');
		await expect.poll(shown).toEqual([PARC]);
	});

	it('finds without accents, hyphens or apostrophes', async () => {
		await search('hopital saint etienne');
		await expect.poll(shown).toEqual([HOPITAL]);
	});

	it('shows nothing when one word matches no facility', async () => {
		await search('lyon marseille');
		await expect.poll(shown).toEqual([]);
	});

	it('shows the whole line on hover, where the list cuts it off', async () => {
		await search('');
		await expect.poll(shown).toEqual(ALL);
		const titles = [...document.querySelectorAll('.list-item [title]')].map((e) => e.getAttribute('title'));
		expect(titles).toEqual(ALL);
	});
});

/**
 * On a phone the select takes the screen's width: nested paddings had left a
 * 375px screen a 247px field. On a large screen it is wide enough for 90% of
 * production's lines (86 characters) to be read whole; longer ones are cut and
 * show in full on hover.
 */
describe('FacilitySelect width', () => {
	/** The facility field's control, and the component around it. */
	const field = () => {
		const input = document.querySelector('input[placeholder="Sélectionner un établissement"]')!;
		return {
			control: input.closest('.svelte-select')!.getBoundingClientRect().width,
			component: document.querySelector('.facility-select')!.getBoundingClientRect().width
		};
	};

	/** Whether the open list shows `line` whole rather than cut by an ellipsis. */
	const whole = (line: string) => {
		const item = [...document.querySelectorAll('.list-item .item')].find(
			(e) => e.textContent?.trim() === line
		) as HTMLElement;
		return item.scrollWidth <= item.clientWidth;
	};

	it('on a phone, spans the component but for a slim margin', async () => {
		await page.viewport(375, 800);
		await search('');
		const { control, component } = field();
		expect(component - control).toBeLessThanOrEqual(20);
	});

	it('on a large screen, shows the 90th-percentile line whole and cuts the longest', async () => {
		await page.viewport(1440, 900);
		await search('');
		await expect.poll(shown).toEqual(ALL);
		expect(whole(P90)).toBe(true);
		expect(whole(LONGEST)).toBe(false);
	});
});

/**
 * "Établissements de tous les sites": a superuser's way to every site's
 * facilities. The count beside it is taken after the department and commune
 * filters, so it cannot tell which list was loaded — on staging.santelyon3.fr
 * it read 46 either way (2026-10-08). Which list is asked for is checked here.
 */
describe('FacilitySelect, every site', () => {
	const ALL_SITES = 'Établissements de tous les sites';

	afterEach(() => {
		who.role = undefined;
	});

	it("a superuser's box asks for every site's facilities, and back", async () => {
		who.role = 'superuser';
		const getFacilities = vi.mocked(data.getFacilities);
		getFacilities.mockClear();
		render(FacilitySelect, { selectedFacility: undefined, department: undefined, commune: undefined, facilityCount: 0 });
		await expect.element(page.getByText('Établissements: 5')).toBeInTheDocument();
		expect(getFacilities).toHaveBeenLastCalledWith('site');

		await page.getByLabelText(ALL_SITES).click();
		await expect.poll(() => getFacilities.mock.calls.at(-1)).toEqual(['all']);

		await page.getByLabelText(ALL_SITES).click();
		await expect.poll(() => getFacilities.mock.calls.at(-1)).toEqual(['site']);
	});

	it('clearing the department clears the commune it held, so nothing filters unseen', async () => {
		who.role = 'superuser';
		render(FacilitySelect, {
			selectedFacility: undefined,
			department: { value: '69', label: '69 - Rhône' },
			commune: { value: 'c1', label: 'Lyon' },
			facilityCount: 0
		});
		await expect.element(page.getByText('Établissements: 3')).toBeInTheDocument();

		// The department's ✖ is the page's first.
		(document.querySelector('.clear-select') as HTMLElement).click();
		await expect.element(page.getByPlaceholder('Sélectionner un département')).toBeInTheDocument();
		await expect.element(page.getByPlaceholder("Sélectionner d'abord un département")).toBeInTheDocument();

		await expect.element(page.getByText('Établissements: 5')).toBeInTheDocument();
	});

	it('is not offered to an administrator', async () => {
		who.role = 'administrator';
		render(FacilitySelect, { selectedFacility: undefined, department: undefined, commune: undefined, facilityCount: 0 });
		await expect.element(page.getByText('Établissements: 5')).toBeInTheDocument();
		await expect.element(page.getByLabelText(ALL_SITES)).not.toBeInTheDocument();
	});
});

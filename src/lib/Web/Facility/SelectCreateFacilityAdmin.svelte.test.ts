/**
 * Creating a facility from the entry form: the dialog opens over the form and
 * Cancel closes it.
 *
 * The creation page is shown in a dialog through
 * goto(href, { shallow: true, state }), and reads its data from page.state.
 * The dialog must therefore open once goto has settled, or the page renders
 * before the state exists. The link goes through the base path (the app is
 * served under /annuaire on unipa).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '../../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { goto } from '$app/navigation';
import { testPageState } from '../../EffectorType/testState.svelte.ts';

vi.mock('$app/paths', () => ({
	resolve: (path: string) => `/annuaire/${path}`,
	base: () => '/annuaire'
}));

vi.mock('$app/state', () => ({
	get page() {
		return {
			get state() {
				return testPageState.state;
			},
			data: { user: { role: 'administrator' } },
			url: new URL('http://localhost/annuaire/web/entry')
		};
	}
}));

vi.mock('$app/navigation', () => ({
	preloadData: vi.fn(async (href: string) => {
		if (!new URL(href, 'http://localhost').pathname.startsWith('/annuaire/')) {
			throw new Error(`Attempted to preload a URL that does not belong to this app: ${href}`);
		}
		return { type: 'loaded' as const, status: 200, data: { organization: { name: 'MSP du Parc' } } };
	}),
	goto: vi.fn(async (href: string, opts?: { shallow?: boolean; state?: Record<string, unknown> }) => {
		if (!new URL(href, 'http://localhost').pathname.startsWith('/annuaire/')) {
			throw new Error(`Attempted to navigate to a URL that does not belong to this app: ${href}`);
		}
		await new Promise((r) => setTimeout(r, 10));
		if (opts?.shallow) testPageState.setState(opts.state ?? {});
	})
}));

vi.mock('../data', () => ({
	getDepartments: async () => [],
	getCommunesByDpt: async () => [],
	getFacilities: async () => []
}));

vi.mock('$routes/(common)/web/facility/create/+page.svelte', async () => ({
	default: (await import('./FacilityCreateStub.svelte')).default
}));

import SelectCreateFacilityAdmin from './SelectCreateFacilityAdmin.svelte';

const commune = { label: 'Lyon', value: 'c1' };
const department = { label: 'Rhône', value: 'd69' };

const modalTitle = () => page.getByRole('heading', { name: /Créer un établissement pour MSP du Parc/ });
const createButton = () => page.getByRole('button', { name: /Créer un établissement/ });

const keepPage = (event: Event) => event.preventDefault();
let back: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	testPageState.reset();
	vi.mocked(goto).mockClear();
	back = vi.spyOn(history, 'back').mockImplementation(() => {});
	document.addEventListener('click', keepPage, { capture: true });
});

afterEach(() => {
	back.mockRestore();
	document.removeEventListener('click', keepPage, { capture: true });
});

describe('SelectCreateFacilityAdmin', () => {
	const open = () =>
		render(SelectCreateFacilityAdmin, {
			facility: undefined,
			department,
			selectedCommune: commune,
			facilityCount: 0
		});

	it('opens the creation dialog once the shallow navigation has settled', async () => {
		await open();

		await createButton().click();

		await expect.element(modalTitle()).toBeVisible();
		expect(goto).toHaveBeenCalledWith(
			expect.stringMatching(/\/annuaire\/web\/facility\/create$/),
			expect.objectContaining({ shallow: true })
		);
	});

	it('closes the creation dialog and steps back in history on Cancel', async () => {
		await open();
		await createButton().click();
		await expect.element(modalTitle()).toBeVisible();

		await page.getByRole('button', { name: 'Annuler' }).click();

		expect(back).toHaveBeenCalledOnce();
		await expect.element(modalTitle()).not.toBeInTheDocument();
	});
});

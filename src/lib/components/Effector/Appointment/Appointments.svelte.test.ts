import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import Harness from './AppointmentsHarness.svelte';
import type { Appointment as AppointmentType } from '$lib/interfaces/appointment.interface';

/**
 * The appointment block on an entry, rendered.
 *
 * The component's whole job is to sort appointments into three groups by
 * `location` and to head two of them with an explanation. Getting that wrong
 * sends a patient to the wrong place: an appointment listed under "à domicile"
 * that is really at the office is worse than one not listed at all.
 *
 * `location` is the field the backend derives from the graph node's label
 * rather than from a property (see the backend's
 * test_appointments_in_the_payload.py), so the two ends of that derivation are
 * pinned on both sides.
 */

const appointment = (over: Partial<AppointmentType> = {}): AppointmentType => ({
	uid: 'appointment-uid-1',
	entry: 'entry-uid-1',
	url: 'https://rdv.example.test/one',
	phone: null,
	location: null,
	...over
});

const office = appointment({
	uid: 'uid-office',
	url: 'https://rdv.example.test/cabinet',
	location: 'office'
});
const houseCall = appointment({
	uid: 'uid-housecall',
	url: 'https://rdv.example.test/domicile',
	location: 'house_call'
});
const unplaced = appointment({ uid: 'uid-unplaced', url: 'https://rdv.example.test/general' });

describe('grouping by location', () => {
	it('heads the house call group with its explanation', async () => {
		render(Harness, { data: [houseCall] });

		await expect.element(page.getByText('Pour des soins à domicile')).toBeInTheDocument();
	});

	it('heads the office group with its explanation', async () => {
		render(Harness, { data: [office] });

		await expect.element(page.getByText('Pour des soins au cabinet')).toBeInTheDocument();
	});

	it('gives an unplaced appointment no heading', async () => {
		// location null means the entry did not say where, so inventing one
		// would be a claim the data does not support.
		render(Harness, { data: [unplaced] });

		await expect.element(page.getByText('Pour des soins à domicile')).not.toBeInTheDocument();
		await expect.element(page.getByText('Pour des soins au cabinet')).not.toBeInTheDocument();
		await expect.element(page.getByRole('link')).toBeInTheDocument();
	});

	it('shows all three groups at once, each under its own heading', async () => {
		// The realistic case: one practitioner offering all three.
		render(Harness, { data: [unplaced, houseCall, office] });

		await expect.element(page.getByText('Pour des soins à domicile')).toBeInTheDocument();
		await expect.element(page.getByText('Pour des soins au cabinet')).toBeInTheDocument();
		expect(page.getByRole('link').all()).toHaveLength(3);
	});

	it('does not leak an appointment into the wrong group', async () => {
		// The failure that matters: an office appointment appearing under the
		// house call heading would send a patient to the wrong address.
		render(Harness, { data: [office] });

		await expect.element(page.getByText('Pour des soins à domicile')).not.toBeInTheDocument();
		const link = page.getByRole('link');
		await expect.element(link).toHaveAttribute('href', 'https://rdv.example.test/cabinet');
	});
});

describe('when there is nothing to show', () => {
	it('renders no appointment rows for an empty list', async () => {
		render(Harness, { data: [] });

		await expect.element(page.getByRole('link')).not.toBeInTheDocument();
	});

	it('renders no appointment rows for null', async () => {
		// The backend returns null rather than [] when an entry has none.
		render(Harness, { data: null });

		await expect.element(page.getByRole('link')).not.toBeInTheDocument();
	});
});

describe('the create control', () => {
	it('is absent outside edit mode', async () => {
		render(Harness, { data: [office], editMode: false });

		await expect.element(page.getByRole('button')).not.toBeInTheDocument();
	});

	it('appears in edit mode', async () => {
		render(Harness, { data: [office], editMode: true });

		await expect.element(page.getByRole('button').first()).toBeInTheDocument();
	});
});

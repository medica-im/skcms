import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import Appointment from './Appointment.svelte';
import type { Appointment as AppointmentType } from '$lib/interfaces/appointment.interface';

/**
 * One appointment, rendered.
 *
 * An appointment is how a patient actually books, so a booking link that does
 * not reach the DOM is a patient who cannot make an appointment. The component
 * shows either a url or a phone, never both, and the choice is a branch worth
 * pinning: the backend guarantees exactly one of the two is set (the POST
 * endpoint returns 422 otherwise), and this is the half that relies on it.
 *
 * The edit controls are rendered only in edit mode. That matters beyond
 * tidiness — Put and Delete are write surfaces, and a visitor who is not in
 * edit mode must not be offered them.
 */

const appointment = (over: Partial<AppointmentType> = {}): AppointmentType => ({
	uid: 'appointment-uid-1',
	entry: 'entry-uid-1',
	url: 'https://rdv.example.test/maurice',
	phone: null,
	location: 'office',
	...over
});

describe('a url appointment', () => {
	it('links to the booking site', async () => {
		render(Appointment, { data: appointment(), editMode: false });

		const link = page.getByRole('link');
		await expect.element(link).toBeInTheDocument();
		await expect.element(link).toHaveAttribute('href', 'https://rdv.example.test/maurice');
	});

	it('shows the hostname rather than the whole url', async () => {
		// The full url is unreadable in a button; the host is what tells a
		// patient which service they are about to be sent to.
		render(Appointment, { data: appointment(), editMode: false });

		await expect.element(page.getByText('rdv.example.test')).toBeInTheDocument();
	});
});

describe('a phone appointment', () => {
	const byPhone = appointment({ url: null, phone: '+33412345678' });

	it('is a tel: link so a phone can dial it', async () => {
		render(Appointment, { data: byPhone, editMode: false });

		const link = page.getByRole('link');
		await expect.element(link).toHaveAttribute('href', 'tel:+33412345678');
	});

	it('shows the number itself', async () => {
		render(Appointment, { data: byPhone, editMode: false });

		await expect.element(page.getByText('+33412345678')).toBeInTheDocument();
	});
});

describe('when both are absent', () => {
	it('renders no link at all rather than an empty one', async () => {
		// The backend forbids this combination, so it should not arrive — but
		// an href="null" reaching a patient is worse than showing nothing.
		render(Appointment, {
			data: appointment({ url: null, phone: null }),
			editMode: false
		});

		await expect.element(page.getByRole('link')).not.toBeInTheDocument();
	});
});

describe('the edit controls', () => {
	it('are absent outside edit mode', async () => {
		render(Appointment, { data: appointment(), editMode: false });

		// Put and Delete are the only buttons this component renders.
		await expect.element(page.getByRole('button')).not.toBeInTheDocument();
	});

	it('appear in edit mode', async () => {
		render(Appointment, { data: appointment(), editMode: true });

		await expect.element(page.getByRole('button').first()).toBeInTheDocument();
	});
});

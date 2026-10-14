/**
 * A calendar of fixed events, such as a programme's workshop dates.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import '../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import EventCalendar from './EventCalendar.svelte';

const workshop = (n: number, day: string) => ({
	title: `Atelier n°${n}`,
	start: new Date(`${day}T19:00:00+02:00`),
	end: new Date(`${day}T20:00:00+02:00`)
});

const events = [workshop(1, '2025-04-22'), workshop(2, '2025-05-15'), workshop(3, '2025-06-26')];
const range = { start: new Date('2025-04-22T00:00:00+02:00'), end: new Date('2025-06-27T00:00:00+02:00') };

const button = (name: string) =>
	document.querySelector<HTMLButtonElement>(`.fc-${name}-button`);

describe('EventCalendar', () => {
	beforeEach(async () => {
		await page.viewport(1024, 768);
	});

	it('lists every event of the range at once, across months', async () => {
		render(EventCalendar, { props: { events, range } });
		await expect.element(page.getByText('Atelier n°1')).toBeInTheDocument();
		await expect.element(page.getByText('Atelier n°2')).toBeInTheDocument();
		await expect.element(page.getByText('Atelier n°3')).toBeInTheDocument();
	});

	it('does not let the list leave the range', async () => {
		render(EventCalendar, { props: { events, range } });
		await expect.element(page.getByText('Atelier n°1')).toBeInTheDocument();
		expect(button('prev')?.disabled).toBe(true);
		expect(button('next')?.disabled).toBe(true);
	});

	it('opens the month view on the first month of the range, not today', async () => {
		render(EventCalendar, { props: { events, range } });
		await expect.element(page.getByText('Atelier n°1')).toBeInTheDocument();
		button('dayGridMonth')!.click();
		await expect.element(page.getByRole('heading', { name: /avril 2025/i })).toBeInTheDocument();
		await expect.element(page.getByText('Atelier n°1')).toBeInTheDocument();
	});

	it('leaves the view buttons clickable when there is no heading', async () => {
		render(EventCalendar, { props: { events, range } });
		await page.getByRole('button', { name: 'Mois' }).click({ timeout: 5_000 });
		await expect.element(page.getByRole('heading', { name: /avril 2025/i })).toBeInTheDocument();
	});

	it('does not let the month view go back before the range', async () => {
		render(EventCalendar, { props: { events, range } });
		await expect.element(page.getByText('Atelier n°1')).toBeInTheDocument();
		button('dayGridMonth')!.click();
		await expect.element(page.getByRole('heading', { name: /avril 2025/i })).toBeInTheDocument();
		expect(button('prev')?.disabled).toBe(true);
		expect(button('next')?.disabled).toBe(false);
	});
});

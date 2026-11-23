/**
 * The week of a schedule, one row per day on a shared hour axis. The times are also written out:
 * a bar alone says nothing to a screen reader and little to someone who cannot place an hour on
 * it. « Now » is a plain line on today's row, with no label (the card's badge says it in words),
 * so it stays clean on a phone.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page as screen } from 'vitest/browser';
import ScheduleWeek from './ScheduleWeek.svelte';
import type { OpeningSchedule } from './openingHours.ts';
import '../../app.postcss';

document.body.dataset.theme = 'wintry';

const p = (opens: string, closes: string) => ({ opens, closes });
const frontDesk = [p('08:30', '11:00'), p('14:00', '17:00')];

const schedule: OpeningSchedule = {
	days: { 1: frontDesk, 2: frontDesk, 3: frontDesk, 4: frontDesk, 5: frontDesk, 6: [], 7: [] },
	holidays: 'closed'
};

const NOON = 12 * 60;

describe('ScheduleWeek', () => {
	it('has one row per day, Monday first', async () => {
		render(ScheduleWeek, { props: { schedule, today: 3, minutes: NOON } });
		const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
		for (const [i, name] of days.entries()) {
			await expect.element(screen.getByTestId(`week-row-${i + 1}`)).toHaveTextContent(name);
		}
	});

	it('writes the periods of a day out', async () => {
		render(ScheduleWeek, { props: { schedule, today: 3, minutes: NOON } });
		await expect
			.element(screen.getByTestId('week-row-1'))
			.toHaveTextContent('8:30–11:00 et 14:00–17:00');
	});

	it('says a day with no period is closed', async () => {
		render(ScheduleWeek, { props: { schedule, today: 3, minutes: NOON } });
		await expect.element(screen.getByTestId('week-row-6')).toHaveTextContent('Fermé');
		await expect.element(screen.getByTestId('week-row-7')).toHaveTextContent('Fermé');
	});

	it('marks today, and only today', async () => {
		render(ScheduleWeek, { props: { schedule, today: 3, minutes: NOON } });
		await expect.element(screen.getByTestId('week-row-3')).toHaveAttribute('aria-current', 'date');
		await expect.element(screen.getByTestId('week-row-2')).not.toHaveAttribute('aria-current');
	});

	it('draws one plain line for now, on today’s row only', async () => {
		render(ScheduleWeek, { props: { schedule, today: 3, minutes: NOON } });
		const lines = document.querySelectorAll('[data-testid="week-now"]');
		expect(lines).toHaveLength(1);
		expect(lines[0].closest('[data-testid="week-row-3"]')).not.toBeNull();
		expect(lines[0].textContent?.trim()).toBe('');
		expect(lines[0].getAttribute('aria-hidden')).toBe('true');
	});

	it('draws no line when now is off the axis', async () => {
		render(ScheduleWeek, { props: { schedule, today: 3, minutes: 6 * 60 } });
		await expect.element(screen.getByTestId('week-now')).not.toBeInTheDocument();
	});

	it('never sets text under 16px', async () => {
		render(ScheduleWeek, { props: { schedule, today: 3, minutes: NOON } });
		const small = [...document.querySelectorAll<HTMLElement>('[data-testid^="week-"] *')]
			.filter((el) => el.textContent?.trim() && el.children.length === 0)
			.map((el) => ({ text: el.textContent?.trim(), px: parseFloat(getComputedStyle(el).fontSize) }))
			.filter(({ px }) => px < 16);
		expect(small).toEqual([]);
	});

	it('draws nothing for a week with no period', async () => {
		const closed: OpeningSchedule = {
			days: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] },
			holidays: 'closed'
		};
		render(ScheduleWeek, { props: { schedule: closed, today: 3, minutes: NOON } });
		await expect.element(screen.getByTestId('week-row-1')).not.toBeInTheDocument();
	});
});

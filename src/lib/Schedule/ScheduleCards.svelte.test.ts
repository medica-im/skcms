/**
 * Several plannings of one place, shown together. Side by side on a wide screen, the same weekday
 * is on the same horizontal line in each, even when a heading wraps or a period list is longer in
 * one of them: the eye follows « mercredi » across, not down two unrelated columns.
 */
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page as screen } from 'vitest/browser';
import ScheduleCards from './ScheduleCards.svelte';
import type { ApiSchedule } from './scheduleApi.ts';
import '../../app.postcss';

document.body.dataset.theme = 'wintry';

vi.mock('./holidays.ts', () => ({
	holidaysFor: async () => ({}),
	timeZoneOf: () => 'Europe/Paris'
}));

const period = (opens: string, closes: string) => ({ opens, closes });
const weekdays = (periods: ReturnType<typeof period>[]) => ({
	'1': periods,
	'2': periods,
	'3': periods,
	'4': periods,
	'5': periods
});

const frontDesk: ApiSchedule = {
	uid: 'a',
	entry: 'e',
	channel: 'on_site',
	label: "Accueil physique avec un intitulé si long qu'il passe sur plusieurs lignes dans sa colonne",
	holidays: 'closed',
	days: weekdays([period('08:30', '11:00'), period('14:00', '17:00')])
};
const phone: ApiSchedule = {
	uid: 'b',
	entry: 'e',
	channel: 'phone',
	label: 'Accueil téléphonique',
	holidays: 'closed',
	days: weekdays([period('09:00', '11:00'), period('15:00', '17:00')])
};

const tops = (isoDay: number) =>
	[...document.querySelectorAll(`[data-testid="week-row-${isoDay}"]`)].map((row) =>
		Math.round(row.getBoundingClientRect().top)
	);

describe('ScheduleCards', () => {
	it('puts the same weekday of two plannings on the same line on a wide screen', async () => {
		await screen.viewport(1400, 1400);
		render(ScheduleCards, { props: { schedules: [frontDesk, phone], zone: 'metropole' } });
		await expect.element(screen.getByTestId('week-row-1').first()).toBeVisible();
		for (const isoDay of [1, 3, 5, 7]) {
			const [first, second] = tops(isoDay);
			expect(second, `day ${isoDay}`).toBe(first);
		}
	});

	it('stacks the plannings on a narrow screen', async () => {
		await screen.viewport(500, 1400);
		render(ScheduleCards, { props: { schedules: [frontDesk, phone], zone: 'metropole' } });
		await expect.element(screen.getByTestId('week-row-1').first()).toBeVisible();
		const [first, second] = tops(1);
		expect(second).toBeGreaterThan(first);
	});

	it('draws one colored edge per channel so the plannings are told apart', async () => {
		await screen.viewport(1400, 1400);
		render(ScheduleCards, { props: { schedules: [frontDesk, phone], zone: 'metropole' } });
		const cards = [...document.querySelectorAll<HTMLElement>('[data-testid="schedule-card"]')];
		const edge = cards.map((card) => getComputedStyle(card).borderTopColor);
		expect(edge).toHaveLength(2);
		expect(edge[0]).not.toBe(edge[1]);
	});
});

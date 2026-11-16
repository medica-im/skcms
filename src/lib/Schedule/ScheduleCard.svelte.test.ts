/**
 * A schedule card. An ordinary schedule lists its days and says whether it is open now; one that
 * is open every hour of every day, holidays included, says so in one line, « 24 h/24 · 7 j/7 »,
 * since a list of seven identical days and an « Ouvert » that is always true tell it badly. The
 * line reads at AA in both modes.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page as screen } from 'vitest/browser';
import * as m from '$msgs';
import ScheduleCard from './ScheduleCard.svelte';
import { AA_TEXT, inScheme, legibility } from '$lib/testing/contrast.ts';
import '../../app.postcss';

document.body.dataset.theme = 'wintry';

vi.mock('./holidays.ts', () => ({ holidaysFor: async () => ({}), timeZoneOf: () => 'Europe/Paris' }));

const day = (periods: { opens: string; closes: string }[]) => periods;
const ALL = [{ opens: '00:00', closes: '24:00' }];
const week = (each: ReturnType<typeof day>) => ({ 1: each, 2: each, 3: each, 4: each, 5: each, 6: each, 7: each });

const schedule = (days: Record<string, { opens: string; closes: string }[]>, holidays: 'open' | 'closed') => ({
	uid: 's1',
	entry: 'e1',
	channel: 'phone' as const,
	label: 'Écoute téléphonique',
	holidays,
	days
});

describe('ScheduleCard', () => {
	it('says 24 h/24 · 7 j/7 in one line for a line that never closes', async () => {
		render(ScheduleCard, { props: { schedule: schedule(week(ALL), 'open'), zone: 'metropole' } });
		await expect.element(screen.getByTestId('schedule-round-the-clock')).toHaveTextContent(m.SCHEDULE_ROUND_THE_CLOCK());
		await expect.element(screen.getByText(m.SCHEDULE_HOLIDAYS_INCLUDED())).toBeVisible();
		await expect.element(screen.getByTestId('schedule-status')).not.toBeInTheDocument();
		await expect.element(screen.getByText('Tous les jours', { exact: false })).not.toBeInTheDocument();
	});

	it('lists the days of a schedule that closes, even when it is open all day on weekdays', async () => {
		render(ScheduleCard, {
			props: { schedule: schedule({ ...week([]), 1: ALL, 2: ALL, 3: ALL, 4: ALL, 5: ALL }, 'open'), zone: 'metropole' }
		});
		await expect.element(screen.getByTestId('schedule-round-the-clock')).not.toBeInTheDocument();
		await expect.element(screen.getByText('Lundi au vendredi', { exact: false })).toBeVisible();
	});

	it('lists the days when it closes on public holidays, as before', async () => {
		render(ScheduleCard, { props: { schedule: schedule(week(ALL), 'closed'), zone: 'metropole' } });
		await expect.element(screen.getByTestId('schedule-round-the-clock')).not.toBeInTheDocument();
		await expect.element(screen.getByText('Fermé les jours fériés.')).toBeVisible();
	});

	for (const scheme of ['light', 'dark'] as const) {
		it(`reads at AA in ${scheme} mode`, async () => {
			await inScheme(scheme, async () => {
				render(ScheduleCard, { props: { schedule: schedule(week(ALL), 'open'), zone: 'metropole' } });
				const parts = [
					screen.getByTestId('schedule-round-the-clock').element(),
					screen.getByText(m.SCHEDULE_HOLIDAYS_INCLUDED()).element(),
					screen.getByRole('heading', { name: 'Écoute téléphonique' }).element()
				];
				const unreadable = parts
					.map((el) => ({ text: el.textContent?.trim(), ratio: legibility(el as HTMLElement) }))
					.filter(({ ratio }) => ratio < AA_TEXT);
				expect(unreadable).toEqual([]);
			});
		});
	}
});

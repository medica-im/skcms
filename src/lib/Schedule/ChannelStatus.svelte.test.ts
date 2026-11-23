/**
 * « The phone reception is open », said from the hours it is given, in the place's time zone, and
 * closed on a public holiday when those hours say so. It holds no hours of its own: which hours
 * apply is the page's to decide.
 */
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page as screen } from 'vitest/browser';
import ChannelStatus from './ChannelStatus.svelte';
import type { OpeningSchedule } from './openingHours.ts';
import '../../app.postcss';

let now = new Date('2026-11-23T09:30:00Z'); // Monday 10:30 in Paris
vi.mock('#lib/store/dateTimeStore.ts', () => ({ dateTime: { subscribe: (fn: (d: Date) => void) => (fn(now), () => {}) } }));
vi.mock('./holidays.ts', () => ({
	holidaysFor: async () => ({ '2026-11-24': 'Un jour férié' }),
	timeZoneOf: () => 'Europe/Paris'
}));

const p = (opens: string, closes: string) => ({ opens, closes });
const phone: OpeningSchedule = {
	days: { 1: [p('09:00', '11:00'), p('15:00', '17:00')], 2: [p('09:00', '11:00')], 3: [], 4: [], 5: [], 6: [], 7: [] },
	holidays: 'closed'
};

const props = (opening: OpeningSchedule) => ({ opening, zone: 'metropole', open: 'ouvert', closed: 'fermé' });

describe('ChannelStatus', () => {
	it('says open inside a period', async () => {
		render(ChannelStatus, { props: props(phone) });
		await expect.element(screen.getByTestId('channel-status')).toHaveTextContent('ouvert');
	});

	it('says closed between two periods', async () => {
		now = new Date('2026-11-23T12:00:00Z'); // Monday 13:00
		render(ChannelStatus, { props: props(phone) });
		await expect.element(screen.getByTestId('channel-status')).toHaveTextContent('fermé');
	});

	it('says closed on a public holiday the hours close on', async () => {
		now = new Date('2026-11-24T09:30:00Z'); // Tuesday 10:30, a holiday here
		render(ChannelStatus, { props: props(phone) });
		await expect.element(screen.getByTestId('channel-status')).toHaveTextContent('fermé');
	});

	it('says open on that holiday when the hours stay open on holidays', async () => {
		now = new Date('2026-11-24T09:30:00Z');
		render(ChannelStatus, { props: props({ ...phone, holidays: 'open' }) });
		await expect.element(screen.getByTestId('channel-status')).toHaveTextContent('ouvert');
	});
});

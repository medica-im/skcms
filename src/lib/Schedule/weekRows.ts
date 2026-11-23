import type { IsoDay, OpeningSchedule } from './openingHours.ts';

export type Block = { opens: string; closes: string; left: number; width: number };
export type DayRow = { isoDay: IsoDay; blocks: Block[] };
export type WeekLayout = { start: number; end: number; ticks: number[]; rows: DayRow[] };

const ISO_DAYS: IsoDay[] = [1, 2, 3, 4, 5, 6, 7];

const minutesOf = (time: string) => {
	const [h, m] = time.split(':');
	return parseInt(h, 10) * 60 + parseInt(m, 10);
};

const share = (minutes: number, start: number, end: number) => ((minutes - start) / (end - start)) * 100;

/** The week drawn on one time axis, so the same hour lines up from one day to the next. */
export const weekRows = (schedule: OpeningSchedule): WeekLayout | null => {
	const periods = ISO_DAYS.flatMap((day) => schedule.days[day]);
	if (periods.length === 0) return null;
	const start = Math.floor(Math.min(...periods.map((p) => minutesOf(p.opens))) / 60) * 60;
	const end = Math.ceil(Math.max(...periods.map((p) => minutesOf(p.closes))) / 60) * 60;
	const ticks = Array.from({ length: (end - start) / 60 + 1 }, (_, i) => start / 60 + i);
	const rows = ISO_DAYS.map((isoDay) => ({
		isoDay,
		blocks: schedule.days[isoDay].map((p) => {
			const left = share(minutesOf(p.opens), start, end);
			return { ...p, left, width: share(minutesOf(p.closes), start, end) - left };
		})
	}));
	return { start, end, ticks, rows };
};

export const nowOffset = (layout: WeekLayout, minutes: number): number | null =>
	minutes < layout.start || minutes > layout.end ? null : share(minutes, layout.start, layout.end);

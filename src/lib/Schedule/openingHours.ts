import type { PublicHolidays } from './schedule.interface.ts';

export type IsoDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Period = { opens: string; closes: string };
export type OpeningSchedule = {
	days: Record<IsoDay, Period[]>;
	holidays: 'closed' | 'open';
};
export type Change = { opens: boolean; isoDay: IsoDay; time: string; daysAhead: number };
export type DayGroup = { from: IsoDay; to: IsoDay; periods: Period[] };

const DAY_MINUTES = 24 * 60;
const HORIZON_DAYS = 8;
const ISO_DAYS: IsoDay[] = [1, 2, 3, 4, 5, 6, 7];
const WEEKDAYS: Record<string, IsoDay> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

type LocalMoment = { dateKey: string; isoDay: IsoDay; minutes: number };

const minutesOf = (time: string) => {
	const [h, m] = time.split(':');
	return parseInt(h, 10) * 60 + parseInt(m, 10);
};

const timeOf = (minutes: number) =>
	`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

const localMoment = (instant: Date, timeZone: string): LocalMoment => {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		weekday: 'short',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23'
	}).formatToParts(instant);
	const get = (type: string) => parts.find((x) => x.type === type)!.value;
	return {
		dateKey: `${get('year')}-${get('month')}-${get('day')}`,
		isoDay: WEEKDAYS[get('weekday')],
		minutes: parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10)
	};
};

export const isoDayAt = (instant: Date, timeZone: string): IsoDay => localMoment(instant, timeZone).isoDay;

const shiftDate = (dateKey: string, days: number) => {
	const [y, m, d] = dateKey.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

const shiftDay = (isoDay: IsoDay, days: number) => (((isoDay - 1 + days) % 7) + 1) as IsoDay;

const periodsOn = (
	schedule: OpeningSchedule,
	dateKey: string,
	isoDay: IsoDay,
	holidays: PublicHolidays
): Period[] => {
	if (schedule.holidays === 'closed' && dateKey in holidays) return [];
	return schedule.days[isoDay];
};

export const isOpen = (
	schedule: OpeningSchedule,
	instant: Date,
	holidays: PublicHolidays,
	timeZone: string
): boolean => {
	const now = localMoment(instant, timeZone);
	return periodsOn(schedule, now.dateKey, now.isoDay, holidays).some(
		(p) => minutesOf(p.opens) <= now.minutes && now.minutes < minutesOf(p.closes)
	);
};

const openIntervals = (
	schedule: OpeningSchedule,
	now: LocalMoment,
	holidays: PublicHolidays
): [number, number][] => {
	const intervals: [number, number][] = [];
	for (let ahead = 0; ahead < HORIZON_DAYS; ahead++) {
		const dateKey = shiftDate(now.dateKey, ahead);
		const isoDay = shiftDay(now.isoDay, ahead);
		for (const p of periodsOn(schedule, dateKey, isoDay, holidays)) {
			intervals.push([ahead * DAY_MINUTES + minutesOf(p.opens), ahead * DAY_MINUTES + minutesOf(p.closes)]);
		}
	}
	intervals.sort((a, b) => a[0] - b[0]);
	const merged: [number, number][] = [];
	for (const interval of intervals) {
		const last = merged[merged.length - 1];
		if (last && interval[0] <= last[1]) last[1] = Math.max(last[1], interval[1]);
		else merged.push([...interval]);
	}
	return merged;
};

export const nextChange = (
	schedule: OpeningSchedule,
	instant: Date,
	holidays: PublicHolidays,
	timeZone: string
): Change | null => {
	const now = localMoment(instant, timeZone);
	const intervals = openIntervals(schedule, now, holidays);
	const current = intervals.find(([start, end]) => start <= now.minutes && now.minutes < end);
	if (current) {
		const end = current[1];
		if (end >= HORIZON_DAYS * DAY_MINUTES) return null;
		const midnight = end % DAY_MINUTES === 0;
		const daysAhead = midnight ? end / DAY_MINUTES - 1 : Math.floor(end / DAY_MINUTES);
		return {
			opens: false,
			isoDay: shiftDay(now.isoDay, daysAhead),
			time: midnight ? '24:00' : timeOf(end % DAY_MINUTES),
			daysAhead
		};
	}
	const upcoming = intervals.find(([start]) => start > now.minutes);
	if (!upcoming) return null;
	const daysAhead = Math.floor(upcoming[0] / DAY_MINUTES);
	return {
		opens: true,
		isoDay: shiftDay(now.isoDay, daysAhead),
		time: timeOf(upcoming[0] % DAY_MINUTES),
		daysAhead
	};
};

export const summarize = (schedule: OpeningSchedule): DayGroup[] => {
	const groups: DayGroup[] = [];
	for (const day of ISO_DAYS) {
		const periods = schedule.days[day];
		if (periods.length === 0) continue;
		const last = groups[groups.length - 1];
		if (last && last.to === day - 1 && JSON.stringify(last.periods) === JSON.stringify(periods)) {
			last.to = day;
		} else {
			groups.push({ from: day, to: day, periods });
		}
	}
	return groups;
};

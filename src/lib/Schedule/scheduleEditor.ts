import type { IsoDay, Period } from './openingHours.ts';
import { ISO_DAYS, copy } from './scheduleApi.ts';

export const DAY_NAMES: Record<IsoDay, string> = {
	1: 'lundi',
	2: 'mardi',
	3: 'mercredi',
	4: 'jeudi',
	5: 'vendredi',
	6: 'samedi',
	7: 'dimanche'
};

const minutes = (time: string) => {
	const [h, m] = time.split(':');
	return parseInt(h, 10) * 60 + parseInt(m, 10);
};

const time = (total: number) =>
	`${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;

const MIDNIGHT = 24 * 60;

export const nextPeriod = (periods: Period[]): Period | null => {
	if (periods.length === 0) return { opens: '09:00', closes: '12:00' };
	const start = Math.max(...periods.map((p) => minutes(p.closes)));
	if (start >= MIDNIGHT) return null;
	return { opens: time(start), closes: time(Math.min(start + 120, MIDNIGHT)) };
};

export const periodsError = (periods: Period[]): string | null => {
	if (periods.some((p) => !p.opens || !p.closes)) return 'Renseignez tous les horaires.';
	if (periods.some((p) => minutes(p.closes) <= minutes(p.opens))) {
		return 'Chaque plage doit se terminer après son début.';
	}
	const sorted = [...periods].sort((a, b) => minutes(a.opens) - minutes(b.opens));
	for (let i = 1; i < sorted.length; i++) {
		if (minutes(sorted[i].opens) < minutes(sorted[i - 1].closes)) {
			return 'Les plages se chevauchent.';
		}
	}
	return null;
};

export const draftError = (days: Record<IsoDay, Period[]>): string | null => {
	for (const day of ISO_DAYS) {
		const error = periodsError(days[day]);
		if (error) return `${DAY_NAMES[day][0].toUpperCase()}${DAY_NAMES[day].slice(1)} : ${error}`;
	}
	return null;
};

export const applyToDays = (
	days: Record<IsoDay, Period[]>,
	selected: IsoDay[],
	periods: Period[]
): Record<IsoDay, Period[]> => {
	const next = copy(days);
	for (const day of selected) next[day] = copy(periods);
	return next;
};

export const sharedPeriods = (days: Record<IsoDay, Period[]>, selected: IsoDay[]): Period[] | null => {
	if (selected.length === 0) return [];
	const first = JSON.stringify(days[selected[0]]);
	if (selected.some((day) => JSON.stringify(days[day]) !== first)) return null;
	return copy(days[selected[0]]);
};

export const shortcutDays = (name: 'weekdays' | 'everyday'): IsoDay[] =>
	name === 'weekdays' ? [1, 2, 3, 4, 5] : [...ISO_DAYS];

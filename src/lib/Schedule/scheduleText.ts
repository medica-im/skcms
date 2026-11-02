import type { Change, IsoDay, Period } from './openingHours.ts';
import { DAY_NAMES } from './scheduleEditor.ts';

const capitalized = (text: string) => `${text[0].toUpperCase()}${text.slice(1)}`;

export const formatPeriods = (periods: Period[]): string => {
	if (periods.length === 1 && periods[0].opens === '00:00' && periods[0].closes === '24:00') return '24h/24';
	const items = periods.map((p) => `${p.opens}–${p.closes}`);
	if (items.length < 2) return items.join('');
	return `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`;
};

export const formatDays = (from: IsoDay, to: IsoDay): string => {
	if (from === 1 && to === 7) return 'Tous les jours';
	if (from === to) return capitalized(DAY_NAMES[from]);
	if (to === from + 1) return `${capitalized(DAY_NAMES[from])} et ${DAY_NAMES[to]}`;
	return `${capitalized(DAY_NAMES[from])} au ${DAY_NAMES[to]}`;
};

export const describeChange = (change: Change | null): string | null => {
	if (!change) return null;
	const verb = change.opens ? 'ouvre' : 'ferme';
	const time = change.time === '24:00' ? 'minuit' : change.time;
	if (change.daysAhead === 0) return `${verb} à ${time}`;
	if (change.daysAhead === 1) return `${verb} demain à ${time}`;
	return `${verb} ${DAY_NAMES[change.isoDay]} à ${time}`;
};

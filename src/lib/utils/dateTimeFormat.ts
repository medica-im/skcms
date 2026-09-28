/**
 * Dates as ordered lists show them: relative while recent, absolute after.
 * The rules and why: see dateTimeFormat.test.ts. Intl only.
 */
import { toTime, type DateTimeValue } from './dateTimeSort';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const capitalize = (text: string, locale: string) =>
	text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);

/** Local midnight of the day `date` falls on, `offset` days later. */
const startOfDay = (date: Date, offset = 0) =>
	new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset).getTime();

/**
 * "Maintenant", "Il y a 5 minutes", "Aujourd’hui, 14:30", "Hier, 09:05", or
 * "24 oct. 2026"; null when there is no date. Calendar days are local time.
 */
export function formatListDateTime(
	value: DateTimeValue,
	{ locale, now = new Date() }: { locale: string; now?: Date }
): string | null {
	const time = toTime(value);
	if (time === null) return null;

	const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
	const clock = new Intl.DateTimeFormat(locale, { timeStyle: 'short' });
	const ago = now.getTime() - time;

	if (Math.abs(ago) < MINUTE) return capitalize(relative.format(0, 'second'), locale);
	if (ago > 0 && ago < HOUR) {
		return capitalize(relative.format(-Math.floor(ago / MINUTE), 'minute'), locale);
	}
	if (time >= startOfDay(now) && time < startOfDay(now, 1)) {
		return `${capitalize(relative.format(0, 'day'), locale)}, ${clock.format(time)}`;
	}
	if (time >= startOfDay(now, -1) && time < startOfDay(now)) {
		return `${capitalize(relative.format(-1, 'day'), locale)}, ${clock.format(time)}`;
	}
	return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(time);
}

/** The exact moment written out, for a tooltip: "lundi 28 septembre 2026 à 14:30". */
export function formatFullDateTime(value: DateTimeValue, locale: string): string | null {
	const time = toTime(value);
	if (time === null) return null;
	return new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'short' }).format(time);
}

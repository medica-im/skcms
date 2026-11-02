import type { IsoDay, OpeningSchedule, Period } from './openingHours.ts';

export type Channel = 'on_site' | 'phone' | 'sms' | 'online';
export type HolidayRule = 'closed' | 'open';

export type ApiSchedule = {
	uid: string;
	entry: string;
	channel: Channel;
	label: string | null;
	holidays: HolidayRule;
	days: Record<string, Period[]>;
};

export type ScheduleDraft = {
	channel: Channel;
	label: string;
	holidays: HolidayRule;
	days: Record<IsoDay, Period[]>;
};

export const ISO_DAYS: IsoDay[] = [1, 2, 3, 4, 5, 6, 7];

// Not structuredClone: that refuses the proxy Svelte's $state puts around a draft.
export const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export const emptyDays = (): Record<IsoDay, Period[]> => ({ 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] });

export const toOpeningSchedule = (schedule: ApiSchedule): OpeningSchedule => {
	const days = emptyDays();
	for (const day of ISO_DAYS) days[day] = schedule.days[String(day)] ?? [];
	return { days, holidays: schedule.holidays };
};

export const toDraft = (schedule: ApiSchedule): ScheduleDraft => ({
	channel: schedule.channel,
	label: schedule.label ?? '',
	holidays: schedule.holidays,
	days: copy(toOpeningSchedule(schedule).days)
});

export const toPayload = (entry: string, draft: ScheduleDraft) => ({
	entry,
	channel: draft.channel,
	label: draft.label.trim() || null,
	holidays: draft.holidays,
	days: Object.fromEntries(ISO_DAYS.filter((day) => draft.days[day].length > 0).map((day) => [day, draft.days[day]]))
});

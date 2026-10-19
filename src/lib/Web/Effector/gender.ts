import type { Labels } from '$lib/interfaces/label.interace.ts';
import type { Nature } from '$lib/store/directoryStoreInterface';

export type Gender = 'F' | 'M' | 'N';

/** The grammatical genders a person may be given, for an entry of this nature. */
export const gendersFor = (nature: Nature | null | undefined): Gender[] =>
	nature === 'service' || nature === 'activity' ? [] : ['F', 'M'];

/** What a service's or an activity's effector is given: its label has one form. */
export const FIXED_GENDER: Gender = 'N';

/** The profession's word for a woman and for a man, as the entry page will show it. */
export function professionWords(labels: Labels | undefined, uid: string | undefined): { F: string; M: string } | null {
	const singular = uid ? labels?.[uid]?.S : undefined;
	return singular?.F && singular?.M ? { F: singular.F, M: singular.M } : null;
}

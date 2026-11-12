export type AgeRange = { kind: 'from'; min: number } | { kind: 'upTo'; max: number } | { kind: 'range'; min: number; max: number };

/** The age bounds of an entry as the page words them; null when neither is known. */
export const ageRange = (min: number | null | undefined, max: number | null | undefined): AgeRange | null => {
	if (min != null && max != null) return { kind: 'range', min, max };
	if (min != null) return { kind: 'from', min };
	if (max != null) return { kind: 'upTo', max };
	return null;
};

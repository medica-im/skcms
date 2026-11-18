export type AgeRange =
	| { kind: 'from'; min: number }
	| { kind: 'upTo'; max: number }
	| { kind: 'range'; min: number; max: number };

/** The age bounds of an entry as the page words them; null when neither is known. A lower bound of 0 is none. */
export const ageRange = (
	lower: number | null | undefined,
	max: number | null | undefined
): AgeRange | null => {
	const min = lower === 0 ? null : lower;
	if (min != null && max != null) return { kind: 'range', min, max };
	if (min != null) return { kind: 'from', min };
	if (max != null) return { kind: 'upTo', max };
	return null;
};

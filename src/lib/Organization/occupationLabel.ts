/**
 * Choosing what an occupation button says.
 *
 * Effector type names can be very long ("communauté professionnelle
 * territoriale de santé") and overflow the small buttons on mobile, so the
 * button shows the shortest form that is still grammatically correct and the
 * tooltip explains it in full.
 *
 * Extracted from Occupations.svelte so the rule can be exercised directly by
 * features/occupation-labels.feature instead of only through the rendered page.
 */

/**
 * An all-caps string is an invariable acronym ("CPTS", "IPA", "CMP"), never a
 * gendered occupation name. Requires at least two letters so a stray initial
 * does not qualify, and ignores dots and hyphens ("C.M.P.").
 *
 * "All caps" means no lower-case letter anywhere — testing "differs from its
 * lower-case form" would wrongly match any capitalised phrase such as
 * "Unité de soins de longue durée".
 */
export function isAcronym(text: string | null | undefined): boolean {
	if (!text) return false;
	const letters = text.replace(/[^\p{L}]/gu, '');
	return letters.length >= 2 && !/\p{Ll}/u.test(letters);
}

/**
 * The button text: the shortest invariable form available.
 *
 * Only acronyms may override the flexed label, because they stay correct
 * whatever the gender and number of the group. Any other short label ("kiné",
 * "podologue") is a singular masculine form and would be wrong for a plural or
 * feminine group, so the flexed label wins in every other case.
 *
 * Both fields are checked because some types are recorded the other way round,
 * with the acronym in `name` rather than `label`.
 */
export function buttonLabel(
	flexed: string,
	name: string | null | undefined,
	rawLabel: string | null | undefined
): string {
	const acronyms = [rawLabel, name].filter(isAcronym) as string[];
	if (!acronyms.length) return flexed;
	const shortest = acronyms.reduce((a, b) => (b.length < a.length ? b : a));
	return shortest.length < flexed.length ? shortest : flexed;
}

/**
 * The tooltip: the long form that explains an abbreviated button, i.e.
 * whichever of name/label is not an acronym.
 */
export function tooltipLabel(
	flexed: string,
	name: string | null | undefined,
	rawLabel: string | null | undefined
): string {
	const long = [name, rawLabel].find((t) => t && !isAcronym(t));
	return long || name || flexed;
}

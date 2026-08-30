import * as m from '$msgs';
import { cptsPostgres } from '$lib/constants';

// The same set of programme links is framed differently depending on what the
// organization is: an MSP delivers care and presents these as what it offers
// beyond consultations, while a CPTS coordinates professionals across a
// territory and presents them as its missions. Keeping the wording here rather
// than in each skvar means a new site of a known category gets it for free.

export interface ProgramsCopy {
	title: string;
	lead: string;
}

export const programsCopy = (
	category: string | undefined,
	formattedNameDefiniteArticle: string,
	// A site that has nothing to add under the heading passes an empty string to
	// drop the paragraph. Passing nothing keeps the wording for its category,
	// which is what lets a site inherit sensible copy without stating any.
	lead?: string
): ProgramsCopy => {
	const withLead = (title: string, fallback: string): ProgramsCopy => ({
		title,
		lead: lead === undefined ? fallback : lead
	});

	if (category === cptsPostgres) {
		return withLead(
			'Nos missions',
			`Les professionnels de ${formattedNameDefiniteArticle} se coordonnent autour de missions communes, afin d'améliorer l'accès aux soins et le parcours des habitants du territoire.`
		);
	}
	// Unknown categories fall back to the MSP wording: it is the older and the
	// more general of the two, and an empty heading would be worse.
	return withLead(
		'Actions santé',
		`En plus des habituelles séances et consultations, les professionnels de ${formattedNameDefiniteArticle} agissent pour votre santé en vous proposant un ensemble de services et de programmes dédiés au dépistage, à la prévention et aux soins.`
	);
};

/**
 * The bare noun for a list of these links — a footer column head, where
 * "Nos missions" would read as a sentence rather than a label.
 *
 * Same split as programsCopy: a CPTS calls them missions, everyone else calls
 * them programmes.
 */
export const programsHeading = (category: string | undefined): string =>
	category === cptsPostgres ? m.MISSIONS() : m.OUTPATIENT_CLINIC_PROGRAMS();

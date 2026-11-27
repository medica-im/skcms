import * as m from '$msgs';

/** A rule the backend raised for an entry (backend/src/directory/quality.py). */
export interface QualityProblem {
	code: string;
	severity: 'missing' | 'incomplete' | string;
}

/**
 * The roles shown the "À corriger sur cette fiche" box on an entry page. Superusers only for
 * now; `null` gives it back to everyone the backend lets read it: the entry's owner or creator,
 * administrators and superusers.
 */
export const QUALITY_BOX_ROLES: readonly string[] | null = ['superuser'];

export const showsQualityBox = (
	role: string | undefined,
	roles: readonly string[] | null = QUALITY_BOX_ROLES
): boolean => !!role && (roles === null || roles.includes(role));

/** One rule of the directory report, with the entries that break it. */
export interface RuleReport {
	code: string;
	severity: 'missing' | 'incomplete' | string;
	entries: {
		uid: string;
		slug: string | null;
		name: string;
		label: string | null;
		type: string | null;
	}[];
}

const TEXT: Record<string, () => string> = {
	no_contact: m.QUALITY_NO_CONTACT,
	no_description: m.QUALITY_NO_DESCRIPTION,
	no_offers: m.QUALITY_NO_OFFERS,
	no_access: m.QUALITY_NO_ACCESS,
	phone_format: m.QUALITY_PHONE_FORMAT,
	acronym_without_full_name: m.QUALITY_ACRONYM_WITHOUT_FULL_NAME,
	hours_in_description: m.QUALITY_HOURS_IN_DESCRIPTION,
	no_location: m.QUALITY_NO_LOCATION,
	no_coverage: m.QUALITY_NO_COVERAGE,
	no_porteur: m.QUALITY_NO_PORTEUR,
	line_without_phone: m.QUALITY_LINE_WITHOUT_PHONE,
	line_access_not_phone: m.QUALITY_LINE_ACCESS_NOT_PHONE,
	no_on_site_hours: m.QUALITY_NO_ON_SITE_HOURS,
	emergency_not_emergency: m.QUALITY_EMERGENCY_NOT_EMERGENCY,
	caarud_without_harm_reduction: m.QUALITY_CAARUD_WITHOUT_HARM_REDUCTION,
	sexual_health_without_screening: m.QUALITY_SEXUAL_HEALTH_WITHOUT_SCREENING,
	clinic_without_hospitalisation: m.QUALITY_CLINIC_WITHOUT_HOSPITALISATION,
	day_hospital_without_day_hospitalisation: m.QUALITY_DAY_HOSPITAL_WITHOUT_DAY_HOSPITALISATION,
	etp_without_education: m.QUALITY_ETP_WITHOUT_EDUCATION,
	porteur_listed: m.QUALITY_PORTEUR_LISTED,
	porteur_without_siren: m.QUALITY_PORTEUR_WITHOUT_SIREN,
	offer_needs_a_place: m.QUALITY_OFFER_NEEDS_A_PLACE,
	training_without_website: m.QUALITY_TRAINING_WITHOUT_WEBSITE
};

/** The codes this page words: every rule of backend/src/directory/quality.py. */
export const QUALITY_RULES = Object.keys(TEXT);

/** The sentence for a rule; the code itself for one added to the backend before this page knows it. */
export const qualityText = (code: string): string => TEXT[code]?.() ?? code;

const SEVERITIES = ['missing', 'incomplete'] as const;

/** Items grouped by severity, what is missing first; a severity with nothing is left out. */
export const bySeverity = <T extends { severity: string }>(
	items: T[]
): { severity: string; items: T[] }[] =>
	SEVERITIES.map((severity) => ({
		severity,
		items: items.filter((item) => item.severity === severity)
	})).filter((group) => group.items.length);

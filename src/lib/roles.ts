import type { Role } from '$lib/interfaces/v2/invitee';
import * as m from '$msgs';

/**
 * How a role is shown.
 *
 * These three maps were copy-pasted into eight components, which is how the
 * fourth one ends up disagreeing with the other three. The role's `name`
 * (`superuser`, `staff`, …) is the identifier the backend authorises against;
 * everything here is presentation, and lives on this side because a label is a
 * view concern and has to exist in every language the UI speaks.
 *
 * The backend's `access_role.label` column is *not* the source of these. It
 * holds one French string per role, is never serialised to any endpoint, and
 * has already drifted from what the UI shows — `Équipe` there against
 * `Équipier` here, `Administration` against `Administrateur`. Adding a
 * `short_label` column beside it would double a divergence that already
 * exists, and still could not answer what a role is called in English.
 */

/** Full label. Use where there is room: headings, form options, detail rows. */
export const roleLabels: Record<Role, string> = {
	superuser: m['ROLE.SUPERUSER'](),
	administrator: m['ROLE.ADMINISTRATOR'](),
	staff: m['ROLE.STAFF'](),
	registered: m['ROLE.REGISTERED'](),
	anonymous: m['ROLE.ANONYMOUS']()
};

/**
 * Abbreviated label, for badges, chips and table cells.
 *
 * "Utilisateur enregistré" in a `badge-sm` either wraps to two lines or pushes
 * the card wider than its neighbours, which is what prompted this. Anything
 * whose width is set by its container should use these; anything a user reads
 * once, to learn what a role *is*, should use the full label above.
 */
export const roleShortLabels: Record<Role, string> = {
	superuser: m['ROLE.SUPERUSER_SHORT'](),
	administrator: m['ROLE.ADMINISTRATOR_SHORT'](),
	staff: m['ROLE.STAFF_SHORT'](),
	registered: m['ROLE.REGISTERED_SHORT'](),
	anonymous: m['ROLE.ANONYMOUS_SHORT']()
};

/**
 * Skeleton variant per role, so the same role is the same colour everywhere.
 *
 * Ordered by privilege rather than by palette: error for superuser, warning
 * for administrator, then primary and secondary. The colour carries meaning
 * once it is consistent, which it was not while five copies of this existed.
 */
export const roleVariants: Record<Role, string> = {
	superuser: 'variant-filled-error',
	administrator: 'variant-filled-warning',
	// success rather than primary: `primary` is the theme's own accent, and the
	// site ships ten selectable themes whose primary ranges from pale mint
	// (134 208 203) to light periwinkle (168 190 241) — on those the white
	// badge text had too little contrast to read. `success` is a green in every
	// theme and stays dark enough for white text throughout.
	//
	// It carries no "this is good" meaning here; the colours are only telling
	// the five roles apart at a glance.
	staff: 'variant-filled-success',
	registered: 'variant-filled-secondary',
	anonymous: 'variant-ghost-surface'
};

/** The full label, falling back to the raw name for a role we do not know. */
export function roleLabel(role: string): string {
	return roleLabels[role as Role] ?? role;
}

/** The short label, falling back to the raw name for a role we do not know. */
export function roleShortLabel(role: string): string {
	return roleShortLabels[role as Role] ?? role;
}

/** The badge variant, falling back to a neutral one. */
export function roleVariant(role: string): string {
	return roleVariants[role as Role] ?? 'variant-ghost-surface';
}

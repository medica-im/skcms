/** What a form shows about a slug (a facility's address, an entry's), and whether it may be confirmed. */

export type SlugCheck = {
	slug: string | null;
	free: boolean;
	reason: 'invalid' | 'taken' | null;
	suggestions: string[];
};

export type SlugStatus = 'idle' | 'checking' | 'free' | 'taken' | 'invalid' | 'error';

export type SlugView = {
	status: SlugStatus;
	message: string;
	suggestions: string[];
	/** Only an address the server just said is free can be confirmed. */
	canConfirm: boolean;
	/** An existing slug that is being changed. */
	changed: boolean;
	warning: string | null;
};

/** What a slug's owner is called in the messages; `changed: null` says nothing when the slug changes. */
export type SlugWording = { taken: string; changed: string | null };

/** The facility's: its old address stops working, there is no redirect. */
export const FACILITY_WORDING: SlugWording = {
	taken: 'Cette adresse est déjà utilisée par un autre établissement.',
	changed: 'L’ancienne adresse cessera de fonctionner : les liens déjà partagés seront rompus.'
};

type Input = {
	typed: string;
	/** The slug as saved; null while creating. */
	original: string | null;
	check: SlugCheck | null;
	pending: boolean;
	failed: boolean;
	/** The field has the focus: its person may still be typing. */
	focused?: boolean;
	wording?: SlugWording;
};

/** Words and single hyphens, then one hyphen left over: the next word is coming. */
const TRAILING_HYPHEN = /^[a-z0-9]+(?:-[a-z0-9]+)*-$/;

const view = (status: SlugStatus, message: string, over: Partial<SlugView> = {}): SlugView => ({
	status,
	message,
	suggestions: [],
	canConfirm: false,
	changed: false,
	warning: null,
	...over
});

export function slugView({ typed, original, check, pending, failed, focused = false, wording = FACILITY_WORDING }: Input): SlugView {
	const slug = typed.trim();
	const changed = original !== null && slug !== original;
	const warning = changed ? wording.changed : null;

	if (original !== null && slug === original && !pending) {
		return view('free', 'Adresse inchangée.', { canConfirm: true });
	}
	// Not an error until the field is left: it is where typing stops mid-word.
	if (focused && TRAILING_HYPHEN.test(slug)) return view('idle', '', { changed, warning });
	if (pending) return view('checking', 'Vérification…', { changed, warning });
	if (failed) return view('error', 'Vérification impossible, réessayez.', { changed, warning });
	if (!slug) return view('invalid', 'Indiquez une adresse.', { changed, warning });
	if (!check || check.slug !== slug) return view('idle', '', { changed, warning });
	if (check.free) return view('free', 'Adresse disponible.', { canConfirm: true, changed, warning });
	if (check.reason === 'taken') {
		return view('taken', wording.taken, {
			suggestions: check.suggestions,
			changed,
			warning
		});
	}
	const hyphenMisplaced = /^-|-$|--/.test(slug);
	const message = hyphenMisplaced
		? 'Un tiret ne peut pas commencer ni finir l’adresse, ni être doublé.'
		: 'Utilisez des minuscules sans accent, des chiffres et des tirets.';
	return view('invalid', message, {
		suggestions: check.suggestions,
		changed,
		warning
	});
}

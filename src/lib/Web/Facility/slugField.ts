/** What the facility form shows about its address (slug), and whether it may be confirmed. */

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
	/** An existing facility whose address is being changed. */
	changed: boolean;
	warning: string | null;
};

type Input = {
	typed: string;
	/** The facility's address as saved; null for a new facility. */
	original: string | null;
	check: SlugCheck | null;
	pending: boolean;
	failed: boolean;
};

const view = (status: SlugStatus, message: string, over: Partial<SlugView> = {}): SlugView => ({
	status,
	message,
	suggestions: [],
	canConfirm: false,
	changed: false,
	warning: null,
	...over
});

export function slugView({ typed, original, check, pending, failed }: Input): SlugView {
	const slug = typed.trim();
	const changed = original !== null && slug !== original;
	const warning = changed ? 'L’ancienne adresse cessera de fonctionner : les liens déjà partagés seront rompus.' : null;

	if (original !== null && slug === original && !pending) {
		return view('free', 'Adresse inchangée.', { canConfirm: true });
	}
	if (pending) return view('checking', 'Vérification…', { changed, warning });
	if (failed) return view('error', 'Vérification impossible, réessayez.', { changed, warning });
	if (!slug) return view('invalid', 'Indiquez une adresse.', { changed, warning });
	if (!check || check.slug !== slug) return view('idle', '', { changed, warning });
	if (check.free) return view('free', 'Adresse disponible.', { canConfirm: true, changed, warning });
	if (check.reason === 'taken') {
		return view('taken', 'Cette adresse est déjà utilisée par un autre établissement.', {
			suggestions: check.suggestions,
			changed,
			warning
		});
	}
	return view('invalid', 'Utilisez des minuscules, des chiffres et des tirets.', {
		suggestions: check.suggestions,
		changed,
		warning
	});
}

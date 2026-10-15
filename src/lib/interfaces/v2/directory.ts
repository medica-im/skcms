/** A directory as the "Annuaires" page shows it (GET /api/v2/directories). */
export interface DirectorySettings {
	uid: string;
	name: string;
	display_name: string | null;
	/** The organization's entry (OWNED_BY); null when the directory has none. */
	owner: { uid: string; label: string | null } | null;
	/** Whether the owner shows in the directory's lists. */
	list_owner_entry: boolean;
	/** The categories offered at entry creation; empty: every one. */
	effector_types: { uid: string; label: string | null }[];
	/** The site's own directory: always public, so it takes no minimum role. */
	main: boolean;
	/** The least role that may list it when reached as a sibling (?directory=). */
	minimum_role: MinimumRole;
}

export type MinimumRole = 'anonymous' | 'staff' | 'administrator' | 'superuser';

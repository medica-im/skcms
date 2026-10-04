/** A directory as the superuser "Annuaires" page shows it (GET /api/v2/directories). */
export interface DirectorySettings {
	uid: string;
	name: string;
	display_name: string | null;
	/** The organization's entry (OWNED_BY); null when the directory has none. */
	owner: { uid: string; label: string | null } | null;
	/** Whether the owner shows in the directory's lists. */
	list_owner_entry: boolean;
}

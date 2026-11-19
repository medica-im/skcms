import type { Nature } from '#lib/store/directoryStoreInterface.ts';

/** The page title of an entry, and its full name below it when the title is a short one. */
export const entryTitle = ({
	name,
	label,
	nature
}: {
	name: string;
	label: string | null | undefined;
	nature: Nature | null | undefined;
}): { title: string; subtitle: string | null } => {
	const organisation = nature === 'service' || nature === 'activity';
	if (organisation && label && label !== name) return { title: label, subtitle: name };
	return { title: name, subtitle: null };
};

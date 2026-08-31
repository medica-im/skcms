import { variables } from '$lib/utils/constants';
import type { ProgramsNavLinks } from '$lib/interfaces/variables.interface';

export interface Crumb {
	label: string;
	href: string;
	/**
	 * True only for the page actually being read. A sub-page's trail ends at
	 * the programme above it, and that crumb is a parent — it has to stay
	 * clickable, because it is the way back up.
	 */
	current: boolean;
}

/**
 * The path from the home page down to the current programme page.
 *
 * Built from programsNavLinks rather than from the URL segments, so every
 * crumb carries the name the rest of the site uses for that page — rename a
 * programme in variables.ts and the breadcrumb renames with it. A segment the
 * nav data does not know about (the deeper pages under vaccins and
 * sante-mentale) ends the trail instead of being guessed at from its slug.
 */
export const programTrail = (
	pathname: string,
	programsNavLinks: ProgramsNavLinks,
	lang: string = variables.DEFAULT_LANGUAGE
): Crumb[] => {
	const trail: Crumb[] = [{ label: 'Accueil', href: '/', current: false }];
	const path = pathname.split('?')[0].replace(/\/+$/, '');
	const rootPath = '/' + path.split('/')[1];

	// A category's href is optional — a section that is only a heading over its
	// pages has none. Such a category can never match rootPath, so anything
	// found here has a real href; the local const is what says so to the type
	// checker, which cannot narrow through the find.
	const category = Object.values(programsNavLinks).find((c) => c.href === rootPath);
	if (!category?.href) return trail;
	const categoryHref = category.href;

	trail.push({
		label: category.title[lang as keyof typeof category.title],
		href: categoryHref,
		current: path === categoryHref
	});

	if (path === rootPath) return trail;

	// Only a programme the category actually lists; anything deeper stops here.
	const programme = category.list.find((l) => l.href === path && l.active !== false);
	if (programme) trail.push({ label: programme.label, href: programme.href, current: true });
	else {
		// A sub-page: name the programme it sits under, if that is listed.
		const parent = category.list.find(
			(l) => path.startsWith(l.href + '/') && l.active !== false
		);
		// A parent, not the current page: keep it a link.
		if (parent) trail.push({ label: parent.label, href: parent.href, current: false });
	}

	return trail;
};

import type { ProgramsNavLinks } from './interfaces/variables.interface';

// A route may legitimately be absent from programsNavLinks: a site keeps a
// page it has not filled in yet, or inherits one from the skvar it was forked
// from. These helpers only feed a footer-level "see also" list, so an unlisted
// path means "no siblings to show", never a reason to fail the whole page.

/**
 * Is the reader on this programme — its own page, or a page inside it?
 *
 * A sub-page is inside its programme, not beside it. ProgramNav offers the
 * *other* programmes of a category, and matching the URL exactly made a
 * sub-page's parent look like one of those others: the foot of a Santé mentale
 * sub-page offered "Notre programme de parcours pluriprofessionnels : Santé
 * mentale", a link back into the page the reader was already inside.
 *
 * Containment rather than a list of known sub-pages, so a new route is covered
 * the moment it exists and needs registering nowhere. The trailing "/" is what
 * keeps it a containment test: without it "/prevention/vaccination" would count
 * as being inside "/prevention/vaccins"... and so would every programme whose
 * slug merely starts with another's.
 */
const isOnProgram = (url: string, programHref: string) =>
	url === programHref || url.startsWith(programHref + '/');

export const programCount = (path: string, programsNavLinks: ProgramsNavLinks
) => {
	const cat = Object.values(programsNavLinks).find(e => e.href == path);
	if (!cat) {
		return 0;
	}
	const count = cat.list.filter(e => e.active != false && e.category == 'program').length;
	return count
};

export const getIsOther = (url: string, programsNavLinks: ProgramsNavLinks) => {
	const rootPath = "/" + url.split("/")[1]
	const prog = Object.values(programsNavLinks).find(e => e.href === rootPath);
	if (!prog) {
		return false;
	}
	// Containment, matching getProgram: from inside a sub-page the reader is on
	// a programme, so the rest of the category is "other" there too.
	const progArray = prog.list.filter((e) => isOnProgram(url, e.href) && e.category == "program");
	if (typeof progArray != "undefined"
		&& progArray != null
		&& progArray.length != null
		&& progArray.length > 0)
		return true;
	else
		return false;
};

export const getProgram = (url: string, programsNavLinks: ProgramsNavLinks) => {
	const rootPath = "/" + url.split("/")[1]
	const prog = Object.values(programsNavLinks).find(e => e.href === rootPath);
	if (!prog) {
		return { id: '', title: {}, list: [] };
	}
	const dict = {
		id: prog.id,
		title: prog.title,
		list: prog.list.filter((e) => !isOnProgram(url, e.href) && e.category == "program" && e.active != false)
	}
	return dict;
};

export const getAllPrograms = (programsNavLinks: ProgramsNavLinks) => {
	let programArray = [];
	for (let p of Object.values(programsNavLinks)) {
		programArray.push(getProgram(p.href, programsNavLinks))
	}
	return programArray
};

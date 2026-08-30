import type { ProgramsNavLinks } from './interfaces/variables.interface';

// A route may legitimately be absent from programsNavLinks: a site keeps a
// page it has not filled in yet, or inherits one from the skvar it was forked
// from. These helpers only feed a footer-level "see also" list, so an unlisted
// path means "no siblings to show", never a reason to fail the whole page.

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
	const progArray = prog.list.filter((e) => e.href == url && e.category == "program");
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
		list: prog.list.filter((e) => e.href != url && e.category == "program" && e.active != false)
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

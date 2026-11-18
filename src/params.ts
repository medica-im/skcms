import { defineParams } from '@sveltejs/kit/params';

// Excludes 'web' and other reserved paths from being matched as a facility
const reserved = [
	'e',
	'web',
	'api',
	'signin',
	'signout',
	'dashboard',
	'contact',
	'sites',
	'test',
	'ghost',
	'mentions-legales',
	'calendrier',
	'association'
];

const matchFacility = (param: string) => {
	return !reserved.includes(param);
};

export const params = defineParams({
	facility: (param) => (matchFacility(param) ? param : undefined)
});

import type { ParamMatcher } from '@sveltejs/kit';

// Excludes 'web' and other reserved paths from being matched as a facility
const reserved = ['web', 'api', 'signin', 'signout', 'dashboard', 'contact', 'sites', 'test', 'ghost'];

export const match: ParamMatcher = (param) => {
    return !reserved.includes(param);
};

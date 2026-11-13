import { AUDIENCES, CARE_LEVELS, WHO_CAN_CONTACT } from './directoryStoreInterface.ts';
import type { FacetSelection } from './facetFilters.ts';

const MAX_AGE = 120;

const only = <T extends string>(vocabulary: readonly T[], raw: string | null): T[] =>
	vocabulary.filter((value) => (raw ?? '').split(',').includes(value));

/** The facet selection a page URL carries; anything the vocabulary or the age range does not allow is ignored. */
export const facetsFromParams = (params: URLSearchParams): FacetSelection => {
	const age = Number(params.get('age'));
	const access = params.get('access');
	return {
		age: params.get('age') && Number.isInteger(age) && age >= 0 && age <= MAX_AGE ? age : null,
		access: WHO_CAN_CONTACT.find((value) => value === access) ?? null,
		careLevels: only(CARE_LEVELS, params.get('levels')),
		audiences: only(AUDIENCES, params.get('audiences')),
		free: params.get('free') === '1',
		anonymous: params.get('anonymous') === '1'
	};
};

/** Writes the selection into `params`, only what is chosen; the other parameters are left alone. */
export const facetsToParams = (selection: FacetSelection, params: URLSearchParams): void => {
	const set = (name: string, value: string | null) =>
		value === null || value === '' ? params.delete(name) : params.set(name, value);
	set('age', selection.age === null ? null : String(selection.age));
	set('access', selection.access);
	set('levels', selection.careLevels.join(','));
	set('audiences', selection.audiences.join(','));
	set('free', selection.free ? '1' : null);
	set('anonymous', selection.anonymous ? '1' : null);
};

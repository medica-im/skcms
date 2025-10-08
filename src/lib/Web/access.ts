import type { SelectType } from '$lib/interfaces/select.ts';
import { getByValue } from '$lib/utils/utils';

export const accessSelectTypes: SelectType[] = [
    { value: 'W', label: 'Tout le monde' },
    { value: 'M', label: 'Membres' },
    { value: 'A', label: 'Administrateurs' }
];

export const accessMap = new Map([
    ["W",  ['anonymous', 'staff', 'administrator', 'superuser']],
    ["M", ['staff', 'administrator', 'superuser']],
    ["A", ['administrator', 'superuser']]
]

);

export const getRoles = (access: string|undefined) => {
    if ( access ) {
        return accessMap.get(access)
     }
};

export const getAccess = (roles: string[]) => {
    console.log(JSON.stringify([...accessMap.entries()]))
    return getByValue(accessMap, roles)
}

export const getSelectedAccess = (roles: string[]|undefined) => {
    if (!roles) return
    console.log(`roles:${roles} type: ${typeof(roles)}`);
	const access = getAccess(roles);
        console.log(`access:${access}`);
		const selectedAccess = accessSelectTypes.find(e=>e.value==access);
        console.log(`selectedAccess: ${selectedAccess}`);
		return selectedAccess
	}
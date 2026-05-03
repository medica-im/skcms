import * as m from '$msgs';

export interface AccessOption {
	value: string;
	label: string;
}

export const allAccessOptions: AccessOption[] = [
	{ value: 'anonymous', label: m['ACCESS.CHOICES.PUBLIC']() },
	{ value: 'staff', label: m['ACCESS.CHOICES.TEAM']() },
	{ value: 'administrator', label: m['ACCESS.CHOICES.ADMIN']() },
	{ value: 'superuser', label: m['ACCESS.CHOICES.SUPERUSER']() }
];

export const accessDescriptions: Record<string, string> = {
	anonymous: m['ACCESS.ENTRY.PUBLIC'](),
	staff: m['ACCESS.ENTRY.TEAM'](),
	administrator: m['ACCESS.ENTRY.ADMIN'](),
	superuser: m['ACCESS.ENTRY.SUPERUSER']()
};

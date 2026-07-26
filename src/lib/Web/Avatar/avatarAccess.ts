import * as m from '$msgs';

export interface AvatarAccessOption {
	value: string;
	label: string;
	description: string;
}

/**
 * The chosen level is the minimum role required to see the picture:
 * viewers at that level or with higher privilege see it, others get the
 * fallback placeholder. Enforced server-side in api.utils.scrub_avatar().
 */
export const avatarAccessOptions: AvatarAccessOption[] = [
	{
		value: 'anonymous',
		label: m['ACCESS.CHOICES.PUBLIC'](),
		description: m.AVATAR_ACCESS_PUBLIC()
	},
	{
		value: 'staff',
		label: m['ACCESS.CHOICES.TEAM'](),
		description: m.AVATAR_ACCESS_TEAM()
	},
	{
		value: 'administrator',
		label: m['ACCESS.CHOICES.ADMIN'](),
		description: m.AVATAR_ACCESS_ADMIN()
	}
];

export const DEFAULT_AVATAR_ACCESS = 'anonymous';

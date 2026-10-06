import type { EmailDelivery } from '$lib/interfaces/v2/invitee';

/**
 * Each invitation with the latest pushed delivery when there is one, the
 * loaded one otherwise. Untouched invitations stay the same objects.
 */
export function withLatest<T extends { uid: string; emailDelivery?: EmailDelivery | null }>(
	list: T[] | undefined,
	latest: Record<string, EmailDelivery>
): T[] | undefined {
	return list?.map((invitee) =>
		latest[invitee.uid] ? { ...invitee, emailDelivery: latest[invitee.uid] } : invitee
	);
}

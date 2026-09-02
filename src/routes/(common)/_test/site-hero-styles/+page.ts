import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

// A design fixture, not a page of the site: it mimics /sites/[slug] with
// invented data so hero treatments can be compared side by side without a
// tenant's content being present. Guarded rather than merely unlinked, since
// an unlinked route is still served.
export function load() {
	if (!dev) error(404, 'Not found');
	return {};
}

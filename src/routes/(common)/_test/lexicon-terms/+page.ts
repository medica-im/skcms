import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

// A fixture for the BDD suite, not a page of the site. Guarded rather than
// merely unlinked: an unlinked route is still served, and this one is invented
// prose written to carry every lexicon case at once.
export function load() {
	if (!dev) error(404, 'Not found');
	return {};
}

import { dev } from '$app/env';
import { error } from '@sveltejs/kit';

// A fixture for tests/concern-select-touch.spec.ts, not a page of the site.
// Guarded rather than merely unlinked: an unlinked route is still served, and
// this one renders invented conditions.
export function load() {
	if (!dev) error(404, 'Not found');
	return {};
}

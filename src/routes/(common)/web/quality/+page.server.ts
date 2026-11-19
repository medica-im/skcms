import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { variables } from '#lib/utils/constants.ts';
import { authReq } from '#lib/utils/request.ts';
import type { DirectorySettings } from '#lib/interfaces/v2/directory.ts';
import type { RuleReport } from '#lib/Web/Quality/quality.ts';
import type { PageServerLoad } from './$types';

// Superusers and administrators; the backend refuses everyone else too, and a directory that is
// not this site's. This guard spares the others a broken page.
const ROLES = ['superuser', 'administrator'];

export const load: PageServerLoad = async ({ url, locals, parent, cookies }) => {
	const session = await locals.auth();
	if (!session) {
		redirect(303, resolve(`signin?redirectTo=${url.pathname}`));
	}

	const { user } = await parent();
	if (!ROLES.includes(user?.role ?? '')) {
		error(403, 'Access restricted to superusers and administrators');
	}

	// The site's directories, then the quality of each: null for one the report could not be had
	// for, which the page says in words rather than showing as a directory with nothing to fix.
	const listed = await fetch(authReq(`${variables.BASE_URI}/api/v2/directories`, 'GET', cookies));
	if (!listed.ok) {
		console.error(`directories fetch answered ${listed.status}`);
		return { reports: null };
	}

	const directories = (await listed.json()) as DirectorySettings[];

	const reports = await Promise.all(
		directories.map(async (directory) => {
			const response = await fetch(
				authReq(
					`${variables.BASE_URI}/api/v2/directories/${encodeURIComponent(directory.name)}/quality`,
					'GET',
					cookies
				)
			);

			if (!response.ok) console.error(`quality of ${directory.name} answered ${response.status}`);
			return {
				name: directory.name,
				label: directory.display_name ?? directory.name,
				rules: response.ok ? ((await response.json()) as RuleReport[]) : null
			};
		})
	);
	return { reports };
};

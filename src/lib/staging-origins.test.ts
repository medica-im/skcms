import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { STAGING_ORIGINS, basePathFor, type SiteName } from '../../tests/sites/sites';

/**
 * The staging address each site's browser checks use, against images.yml.
 *
 * scripts/check-staging.sh crawls every staging site in a browser after a
 * release (tests/staging). The specs reach a site through STAGING_ORIGINS,
 * while the release scripts read images.yml: two lists of the same addresses,
 * so this test keeps them one. A staging site added to images.yml without an
 * entry here would be released and never checked.
 */

const IMAGES = resolve(__dirname, '../../images.yml');
const STAGING_COMPOSE = 'docker-compose-staging.yml';

/** Every staging image's address, read the way the release scripts read it. */
function stagingImageOrigins(): string[] {
	return execFileSync(
		'yq',
		[
			'-r',
			`.images[] | select(.compose_file == "${STAGING_COMPOSE}") | (.origin // ("https://" + .name))`,
			IMAGES
		],
		{ encoding: 'utf8' }
	)
		.split('\n')
		.filter(Boolean);
}

/** The address a spec browses for a site on staging: its origin and base path. */
const stagingAddress = (site: SiteName) => `${STAGING_ORIGINS[site]}${basePathFor(site)}`;

describe('STAGING_ORIGINS', () => {
	it('names every staging site of images.yml', () => {
		const known = (Object.keys(STAGING_ORIGINS) as SiteName[]).map(stagingAddress);
		expect(known.sort()).toEqual(stagingImageOrigins().sort());
	});
});

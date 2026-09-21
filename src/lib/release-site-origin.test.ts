import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Where a site is actually served, as against what it is called.
 *
 * `images.yml` keys every entry by `name`, and for all but one that name is
 * also the hostname a visitor reaches. The exception is the base-path instance:
 * it is called `staging.ipa.medica.im` and is served at
 * `staging.unipa.fr/annuaire`, because it is a section of that WordPress site
 * rather than a site at its own root. Its own root 404s by design.
 *
 * Two release steps need the served address and both took the name instead, so
 * both were quietly wrong for that one site:
 *
 *   - the cache clear searched Redis for `*v2:*staging.ipa.medica.im*` and
 *     matched nothing, because Django builds its keys from the Host header and
 *     the keys read `:1:v2:entries:staging.unipa.fr:ipa:anonymous`. The script
 *     ends that pipeline in `xargs -r`, which prints nothing when there is
 *     nothing to delete, so "no such hostname" and "redis is down" produced the
 *     same message — and the message blamed redis, which was healthy;
 *   - the link check crawled `https://staging.ipa.medica.im/`, a 404, on every
 *     release.
 *
 * `origin` already existed for exactly this and was set on no entry, so
 * `linkcheck_site` fell back to the name. These tests pin the field, the one
 * entry that needs it, and the two different slices of it the two steps want:
 * the link check crawls the whole URL, while a cache key carries the host alone.
 */

const ROOT = resolve(__dirname, '../..');
const IMAGES = resolve(ROOT, 'images.yml');
const STAGING = resolve(ROOT, 'scripts/release-staging.sh');

/** Read one entry's field the way the scripts do, through yq. */
function field(name: string, key: string): string {
	return execFileSync(
		'yq',
		['-r', `.images[] | select(.name == "${name}") | .${key} // ""`, IMAGES],
		{ encoding: 'utf8' }
	).trim();
}

/** Every entry in images.yml, by name. */
function names(): string[] {
	return execFileSync('yq', ['-r', '.images[].name', IMAGES], { encoding: 'utf8' })
		.split('\n')
		.filter(Boolean);
}

describe('where images.yml says each site is served', () => {
	it('gives the base-path sites the address they actually answer on', () => {
		// The whole bug in one assertion. These entries are sections of another
		// site, so their name is not a hostname that answers: both are built
		// with BASE_PATH and their own roots 404 by design.
		expect(field('staging.ipa.medica.im', 'origin')).toBe('https://staging.unipa.fr/annuaire');
		expect(field('ipa.medica.im', 'origin')).toBe('https://production.unipa.fr/annuaire');
	});

	it('leaves every other entry to fall back to its name', () => {
		// `origin` is for the exceptions. Setting it everywhere would be a second
		// copy of the hostname to keep in step with the name, which is the kind
		// of duplication that let this diverge in the first place.
		//
		// The exceptions are exactly the unipa pair: production.unipa.fr is the
		// temporary host for the unipa.fr cutover, and both entries move to
		// https://unipa.fr/annuaire together when that lands.
		const withOrigin = names().filter((n) => field(n, 'origin') !== '');
		expect(withOrigin.sort()).toEqual(['ipa.medica.im', 'staging.ipa.medica.im']);
	});

	it('names a host that resolves, not a path', () => {
		// The cache clear needs the host on its own: Django's key is built from
		// the Host header, so `staging.unipa.fr` with no `/annuaire`. A test
		// rather than a comment because the two steps slice the same field
		// differently and only one of them is visible in a release log.
		const origin = field('staging.ipa.medica.im', 'origin');
		const host = new URL(origin).host;
		expect(host).toBe('staging.unipa.fr');
		expect(origin).toContain('/annuaire');
	});
});

describe('release-staging.sh uses it', () => {
	const script = readFileSync(STAGING, 'utf8');

	it('clears the cache by the served host, not the entry name', () => {
		// The failing line was `--pattern '*v2:*$name*'`. What matters is that
		// the pattern is built from the resolved host; naming the variable is
		// how this test stays readable when the surrounding code moves.
		const clear = script.slice(
			script.indexOf('clear_site_cache() {'),
			script.indexOf('# --- Link check')
		);
		expect(clear).toMatch(/--pattern '\*v2:\*\$\{?host\}?\*'/);
		expect(clear).not.toMatch(/--pattern '\*v2:\*\$\{?name\}?\*'/);
	});

	it('tells a missing hostname apart from a redis that is down', () => {
		// These were indistinguishable, and the message chose the wrong one: it
		// asked whether redis was up while redis was healthy and holding six
		// keys for that very site under a different name. A release log that
		// blames the wrong component is worse than one that says nothing.
		const clear = script.slice(
			script.indexOf('clear_site_cache() {'),
			script.indexOf('# --- Link check')
		);
		// Anchored on the command, not the word: /ping/i matched "stopping" in a
		// comment and passed before the code existed.
		expect(clear).toMatch(/redis-cli\s+PING/);
	});

	it('resolves the origin once, for both steps', () => {
		// Two readers of the same field, so it is read in one place. A second
		// `yq ... .origin` somewhere else is how the two would drift apart
		// again.
		// The quotes are backslash-escaped inside the shell string, so match the
		// field name alone rather than the whole yq expression.
		const reads = script.match(/\.origin /g) ?? [];
		expect(reads).toHaveLength(1);
	});
});

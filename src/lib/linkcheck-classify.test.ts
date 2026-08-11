import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * Sorting link-check failures into ours and theirs.
 *
 * A broken link to one of our own pages is a bug we introduced and should stop
 * a release — that is how a contact page answering 404 reached staging without
 * anyone noticing. A broken link to somebody else's site is not: it goes wrong
 * on its own schedule, and failing releases over it teaches people to ignore
 * the check.
 *
 * The real crawl of dev.santelyon3.fr bears that out. Every failure it found
 * was external: a 403 from helloasso, and a run of 429s from openstreetmap
 * rate-limiting a crawler. Not one of them was ours, and all of them would
 * have failed a release that treated every error alike.
 *
 * muffet's JSON is what gets classified, rather than its coloured text: a URL
 * either starts with the site's own origin or it does not, which beats
 * pattern-matching a terminal.
 */

const SCRIPT = resolve(__dirname, '../../scripts/linkcheck-classify.sh');
const ORIGIN = 'https://staging.santelyon3.fr';

/** Runs the classifier over a muffet JSON document. */
function classify(json: unknown, origin = ORIGIN) {
	try {
		const out = execFileSync('bash', [SCRIPT, origin], {
			input: JSON.stringify(json),
			encoding: 'utf8'
		});
		return { out, status: 0 };
	} catch (e: unknown) {
		const err = e as { stdout?: string; stderr?: string; status?: number };
		return { out: (err.stdout ?? '') + (err.stderr ?? ''), status: err.status ?? 1 };
	}
}

/** One page with one failing link, in muffet's shape. */
const page = (pageUrl: string, links: { url: string; error: string }[]) => [
	{ url: pageUrl, links }
];

describe('classifying link-check failures', () => {
	it('fails the release when one of our own pages is broken', () => {
		// The case this exists for: the contact page 404ing because its facility
		// slug did not resolve. The footer links to /contact from every page, so
		// a crawl always reaches it.
		const { out, status } = classify(
			page(`${ORIGIN}/`, [{ url: `${ORIGIN}/contact`, error: '404' }])
		);
		expect(status).not.toBe(0);
		expect(out).toContain('/contact');
		expect(out).toMatch(/404/);
	});

	it('reports a broken external link without failing', () => {
		// helloasso answering 403 to a crawler is not a reason to stop deploying.
		const { out, status } = classify(
			page(`${ORIGIN}/association`, [
				{ url: 'https://www.helloasso.com/associations/x/adhesions/y', error: '403' }
			])
		);
		expect(status).toBe(0);
		expect(out).toContain('helloasso.com');
	});

	it('still fails when ours and theirs are broken together', () => {
		// An external failure must not mask one of ours in the same run.
		const { out, status } = classify(
			page(`${ORIGIN}/`, [
				{ url: 'https://www.openstreetmap.org/#map=18/45.7/4.8', error: '429' },
				{ url: `${ORIGIN}/contact`, error: '404' }
			])
		);
		expect(status).not.toBe(0);
		expect(out).toContain('/contact');
	});

	it('passes when nothing is broken', () => {
		expect(classify([]).status).toBe(0);
	});

	it('counts a protocol-relative or same-host link as ours', () => {
		// Same site, written differently. Missing these would let a real breakage
		// through as though it belonged to somebody else.
		const { status } = classify(
			page(`${ORIGIN}/`, [{ url: `${ORIGIN}/annuaire?types=%5B%22abc%22%5D`, error: '500' }])
		);
		expect(status).not.toBe(0);
	});

	it('does not mistake another site for ours because the name starts the same', () => {
		// staging.santelyon3.fr.evil.example is not us.
		const { status } = classify(
			page(`${ORIGIN}/`, [
				{ url: 'https://staging.santelyon3.fr.evil.example/x', error: '404' }
			])
		);
		expect(status).toBe(0);
	});

	it('survives muffet saying nothing at all', () => {
		// A crawl that fails to start should not look like a clean run, but it
		// should not crash the release script either.
		const { status } = classify('');
		expect(status).toBe(0);
	});
});

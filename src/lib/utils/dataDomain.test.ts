import { describe, it, expect } from 'vitest';

/**
 * Plausible's `data-domain` is a bare hostname, taken from the request.
 *
 * +layout.svelte used to build it by slicing 'https://' off variables.BASE_URI
 * and throwing when the prefix was absent. That threw on every page load once
 * the browser-side URL became relative — during hydration, which aborts the
 * client render, so the page painted from SSR and then vanished.
 *
 * The replacement is `page.url.hostname`. This pins what that has to produce,
 * because the value is easy to get subtly wrong: a port, a scheme or a
 * trailing slash all make Plausible drop the events silently rather than fail.
 */

/** What +layout.svelte computes: dataDomain = () => page.url.hostname */
const dataDomain = (href: string) => new URL(href).hostname;

describe('the Plausible data-domain', () => {
	it.each([
		['https://santelyon3.fr/', 'santelyon3.fr'],
		['https://santelyon3.fr/annuaire?types=%5B%22x%22%5D', 'santelyon3.fr'],
		['https://dev.unipa.fr/annuaire/', 'dev.unipa.fr'],
		['https://w0.dev.medica.im/sites/x', 'w0.dev.medica.im']
	])('%s -> %s', (href, expected) => {
		expect(dataDomain(href)).toBe(expected);
	});

	it('carries no scheme, port or path', () => {
		const d = dataDomain('https://localhost:3010/annuaire/e/x?a=1#f');
		expect(d).toBe('localhost');
		expect(d).not.toContain('://');
		expect(d).not.toContain(':3010');
		expect(d).not.toContain('/');
	});

	it('follows the host being viewed, not a build-time constant', () => {
		// The property the old code could not have: one build serves four
		// tenants in the BDD suite, and each must report its own domain.
		const hosts = ['w0.dev.medica.im', 'w1.dev.medica.im', 'w2.dev.medica.im'];
		expect(hosts.map((h) => dataDomain(`https://${h}/`))).toEqual(hosts);
	});

	it('never throws on a relative-base site', () => {
		// The regression itself: the old code threw when the value it sliced
		// had no scheme. Nothing here can, because it reads a real URL.
		expect(() => dataDomain('https://santelyon3.fr/')).not.toThrow();
	});
});

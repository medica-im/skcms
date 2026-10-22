import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * One Node version for dev and for the images.
 *
 * Dev runs on the VPS's own Node (the dev server, vitest, Playwright, test-all),
 * the images on the Dockerfile's base. Nothing tied the two: the VPS moved to
 * Node 24 while staging and production stayed on 22, so a difference between
 * them would only have shown after a deploy. package.json's `engines` is the
 * version; the Dockerfile follows it, and pnpm refuses another (.npmrc
 * engine-strict).
 */

const ROOT = resolve(__dirname, '../..');
const read = (path: string) => readFileSync(resolve(ROOT, path), 'utf8');

const engines: string = JSON.parse(read('package.json')).engines?.node ?? '';
const major = (version: string) => Number(/(\d+)/.exec(version)?.[1]);

describe('the Node version', () => {
	it('is declared in package.json', () => {
		expect(engines).toMatch(/^>=\d+ <\d+$/);
	});

	it('is the one every stage of the Dockerfile starts from', () => {
		const bases = [...read('Dockerfile').matchAll(/^FROM node:(\S+)/gm)].map((m) => m[1]);
		expect(bases.length).toBeGreaterThan(0);
		for (const base of bases) expect(major(base), `FROM node:${base}`).toBe(major(engines));
	});

	it('is the one this machine runs the tests with', () => {
		expect(major(process.version)).toBe(major(engines));
	});

	it('is refused when another is used', () => {
		expect(read('.npmrc')).toMatch(/^engine-strict=true$/m);
	});

	it('takes the latest patch of the base at every build', () => {
		// Without --pull, docker reuses whatever node image was pulled last on
		// this machine, so security fixes reach the images only by accident.
		expect(read('scripts/build-image.sh')).toMatch(/docker build[^\n]*\\\n(\s+[^\n]*\\\n)*\s+--pull\b|docker build --pull\b/);
	});
});

/**
 * The facet selection lives in the page URL, like the other selectors: a link
 * to a filtered directory shows the same list. A value the vocabulary does not
 * know is ignored, never trusted: a stale or hand-edited link must not crash
 * the page or silently filter on a word nobody stores.
 */
import { describe, it, expect } from 'vitest';
import { NO_FACETS } from './facetFilters.ts';
import { facetsFromParams, facetsToParams } from './facetUrl.ts';

const params = (query: string) => new URLSearchParams(query);

describe('reading', () => {
	it('no parameter is no selection', () => {
		expect(facetsFromParams(params(''))).toEqual(NO_FACETS);
	});

	it('reads every selector', () => {
		expect(
			facetsFromParams(
				params('age=16&access=referral&levels=emergency&audiences=students,parents&free=1&anonymous=1')
			)
		).toEqual({
			age: 16,
			access: 'referral',
			careLevels: ['emergency'],
			audiences: ['students', 'parents'],
			free: true,
			anonymous: true
		});
	});

	it('keeps age 0', () => {
		expect(facetsFromParams(params('age=0')).age).toBe(0);
	});

	it('ignores what the vocabulary or the age range does not allow', () => {
		const read = facetsFromParams(params('age=abc&access=everyone&audiences=parents,teleport&levels=&free=yes'));
		expect(read).toEqual({ ...NO_FACETS, audiences: ['parents'] });
		expect(facetsFromParams(params('age=-3')).age).toBeNull();
		expect(facetsFromParams(params('age=121')).age).toBeNull();
		expect(facetsFromParams(params('age=16.5')).age).toBeNull();
	});

	it('ignores how to reach an entry, which an older link may still carry', () => {
		expect(facetsFromParams(params('modes=phone'))).toEqual(NO_FACETS);
	});
});

describe('writing', () => {
	it('writes only what is chosen and leaves other parameters alone', () => {
		const url = new URLSearchParams('situation=abc&age=40');
		facetsToParams({ ...NO_FACETS, access: 'anyone', audiences: ['students', 'parents'], free: true }, url);
		expect(url.get('situation')).toBe('abc');
		expect(url.has('age')).toBe(false);
		expect(url.get('access')).toBe('anyone');
		expect(url.get('audiences')).toBe('students,parents');
		expect(url.get('free')).toBe('1');
		expect(url.has('anonymous')).toBe(false);
	});

	it('round-trips', () => {
		const selection = {
			age: 0,
			access: 'professionals' as const,
			careLevels: ['primary' as const, 'secondary' as const],
			audiences: ['older_adults' as const],
			free: false,
			anonymous: true
		};
		const url = new URLSearchParams();
		facetsToParams(selection, url);
		expect(facetsFromParams(url)).toEqual(selection);
	});
});

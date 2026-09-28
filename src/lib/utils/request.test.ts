import { describe, expect, it } from 'vitest';
import type { Cookies } from '@sveltejs/kit';
import { authMultipartReq, authReq } from './request';

/**
 * A multipart upload must not name its own Content-Type.
 *
 * fetch writes `multipart/form-data; boundary=...` itself when the body is a
 * FormData, and the boundary is what tells the server where each part ends.
 * A request that sets `multipart/form-data` by hand has no boundary, and
 * FastAPI answers 422 "field required" for a file that was in fact sent.
 */

function cookies(values: Record<string, string>): Cookies {
	return {
		getAll: () => Object.entries(values).map(([name, value]) => ({ name, value }))
	} as unknown as Cookies;
}

const SESSION = {
	'authjs.session-token': 'abc',
	'__Secure-authjs.session-token': '',
	'other-cookie': 'leak'
};

describe('authMultipartReq', () => {
	it('lets fetch write the multipart boundary', () => {
		const body = new FormData();
		body.append('file', new File(['x'], 'a.png', { type: 'image/png' }));

		const request = authMultipartReq('https://api.example.org/x', 'POST', cookies(SESSION), body);

		expect(request.headers.get('content-type')).toMatch(/^multipart\/form-data; boundary=/);
	});

	it('forwards the session cookie and nothing else', () => {
		const request = authMultipartReq('https://api.example.org/x', 'POST', cookies(SESSION), new FormData());

		expect(request.headers.get('cookie')).toBe('authjs.session-token=abc');
	});
});

describe('authReq', () => {
	it('forwards the session cookie the same way', () => {
		const request = authReq('https://api.example.org/x', 'GET', cookies(SESSION));

		expect(request.headers.get('cookie')).toBe('authjs.session-token=abc');
	});
});

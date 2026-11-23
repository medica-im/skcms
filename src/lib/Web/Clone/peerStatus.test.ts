/**
 * Which source instances can be picked: those whose backend answers now.
 *
 * The registry says which peers exist, not which are up. A peer whose backend
 * is stopped still has its frontend and its nginx, so its pages load and then
 * fail on the first API call (a 502 on /api/v2/organization, 2026-11-23). It is
 * asked the question the clone itself will depend on: does its API answer.
 */
import { describe, it, expect, vi } from 'vitest';
import { peerStatus, unreachableMessage, isGatewayFailure } from './peerStatus.ts';

const answering = (status: number) =>
	vi.fn(async (_url: string, _init: RequestInit) => new Response('{}', { status }));

describe('peerStatus', () => {
	it('is online when the peer’s API answers', async () => {
		expect(await peerStatus('https://dev.example.org', answering(200))).toEqual({ online: true });
	});

	it('asks the peer’s organization, which every page of it needs first', async () => {
		const fetchFn = answering(200);
		await peerStatus('https://dev.example.org/', fetchFn);
		expect(fetchFn.mock.calls[0][0]).toBe('https://dev.example.org/api/v2/organization');
	});

	it('is offline, with the status, when the peer’s proxy has no backend to reach', async () => {
		expect(await peerStatus('https://dev.example.org', answering(502))).toEqual({
			online: false,
			status: 502
		});
	});

	it('is offline, without a status, when nothing answers at all', async () => {
		const down = vi.fn(async () => {
			throw new TypeError('fetch failed');
		});
		expect(await peerStatus('https://dev.example.org', down)).toEqual({
			online: false,
			status: null
		});
	});

	it('does not follow a redirect to somewhere else and call that online', async () => {
		const fetchFn = answering(301);
		expect(await peerStatus('https://dev.example.org', fetchFn)).toEqual({
			online: false,
			status: 301
		});
		expect(fetchFn.mock.calls[0][1]).toMatchObject({ redirect: 'manual' });
	});
});

describe('isGatewayFailure', () => {
	it.each([502, 503, 504])('takes %i for a backend that is not there', (status) => {
		expect(isGatewayFailure(status)).toBe(true);
	});

	it.each([200, 400, 401, 403, 404, 500])('does not take %i for one', (status) => {
		expect(isGatewayFailure(status)).toBe(false);
	});
});

describe('unreachableMessage', () => {
	it('names the instance and says its backend is probably offline', () => {
		const message = unreachableMessage('dev.example.org', 502);
		expect(message).toContain('dev.example.org');
		expect(message).toContain('502');
	});

	it('says so when nothing answered, with no status to quote', () => {
		const message = unreachableMessage('dev.example.org', null);
		expect(message).toContain('dev.example.org');
		expect(message).not.toContain('null');
	});
});

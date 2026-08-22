/**
 * How an avatar's URL is built.
 *
 * Three sources in priority order (the size asked for, then the raw picture,
 * then a placeholder), which used to be inline in Avatar.svelte.
 *
 * Note what is *not* here: any cache-busting parameter. A replaced picture is
 * stored under a filename of its own by the backend (api/routers/avatar.py), so
 * its URL differs on its own and ordinary caching is correct. That property is
 * pinned in the backend suite — src/tests/api/test_avatar_filename.py — because
 * that is where it can actually be broken.
 */
import { describe, it, expect } from 'vitest';
import { base } from '$app/paths';
import { avatarSrc } from './avatarUrl.ts';

const BASE = 'https://example.test';

const avatar = {
	raw: '/media/avatars/abc-1f2e3d4c.jpg',
	lg: '/media/avatars/abc-1f2e3d4c.lg.jpg',
	sm: '/media/avatars/abc-1f2e3d4c.sm.jpg'
};

describe('avatarSrc', () => {
	it('uses the size asked for', () => {
		expect(avatarSrc(avatar, 'lg', BASE)).toBe(`${BASE}${base}${avatar.lg}`);
		expect(avatarSrc(avatar, 'sm', BASE)).toBe(`${BASE}${base}${avatar.sm}`);
	});

	it('falls back to the raw picture when that size is missing', () => {
		const rawOnly = { raw: avatar.raw, lg: '', sm: '' };
		expect(avatarSrc(rawOnly, 'lg', BASE)).toBe(`${BASE}${base}${avatar.raw}`);
	});

	it('falls back to the placeholder when there is no picture', () => {
		expect(avatarSrc(undefined, 'lg', BASE)).toContain('default_profile_picture.png');
		expect(avatarSrc(null, 'sm', BASE)).toContain('default_profile_picture.png');
	});

	it('adds nothing to the stored path', () => {
		// A query string here would make every render a cache miss for a picture
		// that has not changed.
		expect(avatarSrc(avatar, 'lg', BASE)).not.toContain('?');
	});
});

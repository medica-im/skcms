import { describe, it, expect } from 'vitest';
import { grantableRoles, maySuspend } from './grantable';

/**
 * What the page offers has to agree with what the endpoint allows.
 *
 * These cases are the frontend half of the matrix in the backend's
 * src/tests/api/test_role_change.py: every role offered here must be one that
 * file expects a 200 for, and every role withheld one it expects a 403 for.
 * The endpoint stays the guard — this is only about not offering a control
 * that will certainly be refused.
 */
describe('which roles are offered', () => {
	it('lets an administrator promote a staff user, but not to superuser', () => {
		const offered = grantableRoles('administrator', 'staff');
		expect(offered).toContain('administrator');
		expect(offered).not.toContain('superuser');
	});

	it('offers an administrator nothing on another administrator', () => {
		// Two administrators are peers. Offering a demotion here would put a
		// control on screen that the endpoint refuses in both directions.
		expect(grantableRoles('administrator', 'administrator')).toEqual([]);
	});

	it('offers an administrator nothing on a superuser', () => {
		expect(grantableRoles('administrator', 'superuser')).toEqual([]);
	});

	it('does not let an administrator demote somebody else', () => {
		// Only a superuser, or the user themselves, demotes.
		expect(grantableRoles('administrator', 'administrator')).not.toContain('staff');
	});

	it('lets a superuser grant anything to anyone', () => {
		const offered = grantableRoles('superuser', 'administrator');
		expect(offered).toContain('superuser');
		expect(offered).toContain('staff');
		expect(offered).toContain('registered');
	});

	it('offers nothing at all below administrator', () => {
		expect(grantableRoles('staff', 'registered')).toEqual([]);
		expect(grantableRoles('registered', 'registered')).toEqual([]);
		expect(grantableRoles('anonymous', 'staff')).toEqual([]);
	});

	it('never offers anonymous, which is the absence of access', () => {
		expect(grantableRoles('superuser', 'staff')).not.toContain('anonymous');
	});
});

describe('who may suspend', () => {
	it('is a superuser and nobody else', () => {
		expect(maySuspend('superuser')).toBe(true);
		expect(maySuspend('administrator')).toBe(false);
		expect(maySuspend('staff')).toBe(false);
	});
});

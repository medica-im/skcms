export interface Token {
	refresh?: string;
	access?: string;
}

export interface Access {
    endpoint: string;
	permissions: number;
}

export interface Role {
	id: number;
	name: string;
	label: string;
	description: string
}

export interface User {
	uid: string;
	name: string;
	email: string;
	picture: string;
	full_name: string|null;
	role: string;
	effector: string|null;
	gender: string|null;
	/**
	 * Suspension withholds privileges without ending the identity: signing in
	 * still works and `role` comes back null, which on its own is
	 * indistinguishable from an account that was never granted anything. This
	 * is what lets the dashboard tell the two apart and explain itself.
	 */
	suspended?: boolean;
	suspensionReason?: string|null;
}

export interface UserResponse {
	user?: User;
}

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
	name: string;
	email: string;
	picture: string;
	full_name: string|null;
	role: string|null;
	effector: string|null;
	gender: string|null;
}

export interface UserResponse {
	user?: User;
}

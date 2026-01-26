import { browser } from '$app/environment';
import type { Token, User, UserResponse } from '$lib/interfaces/user.interface';
import type { CustomError } from '$lib/interfaces/error.interface';
const refreshUrl = '/api/v1/accounts/token/refresh/';

export const browserGet = (key: string): string | undefined => {
	if (browser) {
		const item = localStorage.getItem(key);
		if (item) {
			return item;
		}
	}
	return;
};

export const browserSet = (key: string, value: string): void => {
	if (browser) {
		localStorage.setItem(key, value);
	}
};

export const post = async (
	fetch,
	url: string,
	body: unknown
): Promise<[object, Array<CustomError>]> => {
	try {
		const headers = {};
		if (!(body instanceof FormData)) {
			headers['Content-Type'] = 'application/json';
			body = JSON.stringify(body);
			const token = browserGet('refreshToken');
			if (token) {
				headers['Authorization'] = `Bearer ${token}`;
			}
			const res = await fetch(url, {
				method: 'POST',
				body,
				headers
			});
			const response = await res.json();
			if (response.errors) {
				const errors: Array<CustomError> = [];
				for (const p in response.errors) {
					errors.push({ error: response.errors[p] });
				}
				return [{}, errors];
			}
			return [response, []];
		}
	} catch (error) {
		console.error(`Error outside: ${error}`);
		const errors: Array<CustomError> = [{ error: 'An unknown error occurred.' }, { error: error }];
		return [{}, errors];
	}
};

const accessRefresh = async () => {
	let response;
	try {
		response = await fetch(refreshUrl, {
			method: 'POST',
			mode: 'cors',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				refresh: `${browserGet('refreshToken')}`
			})
		});
	} catch (error) {
		console.error('There was an error', error);
	}
	if (response?.ok) {
		const _accessRefresh: Token = await response.json();
		return _accessRefresh;
	}else {
        console.log(`Request Utils HTTP Response Code: ${response?.status}`)
    }
};

export async function getCurrentUser(fetch): Promise<[User, CustomError[]]>;
export async function getCurrentUser(fetch, mode: "optional"): Promise<[User | undefined, CustomError[]]>;
export async function getCurrentUser(fetch, mode?: "optional") {
	const _accessRefresh = await accessRefresh();
	const url = '/api/v1/accounts/user/';
	if (_accessRefresh.access) {
		const res = await fetch(url, {
			headers: {
				Authorization: `Bearer ${_accessRefresh.access}`
			}
		});
		if (res.status === 400) {
			const data = await res.json();
			const error = data.user.error[0];
			return [undefined, error];
		}
		const response = await res.json();
		return [response.user, []];
	} else {
		return [undefined, [{ error: 'Refresh token is invalid...' }]];
	}
};

function removeRefreshToken() {
	localStorage.removeItem('refreshToken');
}

export const handlePostRequestsWithPermissions = async (
	fetch,
	targetUrl: string,
	body: unknown,
	method = 'POST'
): Promise<[any, Array<CustomError>]> => {
	const _accessRefresh = await accessRefresh();
	let fetchDict;
	if (method == 'GET') {
		fetchDict = {
			method: method,
			mode: 'cors',
			headers: {
				Authorization: `Bearer ${_accessRefresh.access}`,
				'Content-Type': 'application/json'
			},
		}
	} else {
		fetchDict = {
			method: method,
			mode: 'cors',
			headers: {
				Authorization: `Bearer ${_accessRefresh.access}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		}
	}
	const jres = await fetch(targetUrl, fetchDict);
	if (method === 'PATCH') {
		if (jres.status !== 200) {
			const data = await jres.json();
			console.error(`Data: ${data}`);
			const errs = data.errors;
			console.error(errs);
			return [{}, errs];
		}
		return [await jres.json(), []];
	} else if (method === 'GET') {
		if (jres.status !== 200) {
			const data = await jres.json();
			console.error(`Data: ${data}`);
			const errs = data.errors;
			console.error(errs);
			return [{}, errs];
		}
		return [await jres.json(), []];
	} else if (method === 'POST') {
		if (jres.status !== 201) {
			const data = await jres.json();
			console.error(`Data: ${data}`);
			const errs = data.errors;
			console.error(errs);
			return [{}, errs];
		}
		return [jres.json(), []];
	}
};

export const handleRequestsWithPermissions = async (
	fetch,
	targetUrl: string): Promise<[any, CustomError]> => {
	let refreshToken;
	if (browser) {
		refreshToken = browserGet('refreshToken')
	}
	let _accessRefresh;
	if (refreshToken) {
		_accessRefresh = await accessRefresh();
	}
	let fetchDict;
	if (_accessRefresh) {
		fetchDict = {
			method: 'GET',
			mode: 'cors',
			headers: {
				Authorization: `Bearer ${_accessRefresh.access}`,
				'Content-Type': 'application/json',
			},
		};
	} else {
		fetchDict = {
			method: 'GET',
			mode: 'cors',
			headers: {
				'Content-Type': 'application/json',
			},
		};
	}
	try {
		const res = await fetch(targetUrl, fetchDict);
		if (res.ok) {
			return [await res.json(), {} as CustomError];
		} else {
			return [{}, res.status as CustomError];
		}
	} catch (error) {
		console.error(`handleRequestsWithPermissions: error while fetching ${targetUrl} : `, error);
		return [{}, error as CustomError]
	}
};
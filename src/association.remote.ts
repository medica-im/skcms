import { getRequestEvent, form } from '$app/server';
import * as z from "zod";
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';

// ── Board Members ──

const CreateBoardMember = z.object({
	entry_uid: z.string(),
	effector_uid: z.string().min(1),
	start: z.string().min(1),
	stop: z.string().optional(),
});

export const createBoardMember = form(CreateBoardMember, async (data) => {
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/board-members`;
	const body: Record<string, unknown> = {
		entry_uid: data.entry_uid,
		effector_uid: data.effector_uid,
		start: data.start,
	};
	if (data.stop) body.stop = data.stop;
	const request = authReq(url, 'POST', cookies, JSON.stringify(body));
	const response = await fetch(request);
	if (!response.ok) {
		return {
			success: false,
			status: response.status,
			text: response.statusText,
			response: await response.json()
		};
	}
	return {
		success: true,
		status: response.status,
		text: response.statusText
	};
});

const UpdateBoardMember = z.object({
	uid: z.string(),
	start: z.string().optional(),
	stop: z.string().optional(),
});

export const updateBoardMember = form(UpdateBoardMember, async (data) => {
	const { cookies } = getRequestEvent();
	const body: Record<string, unknown> = {};
	if (data.start) body.start = data.start;
	if (data.stop) body.stop = data.stop;
	const url = `${variables.BASE_URI}/api/v2/board-members/${data.uid}`;
	const request = authReq(url, 'PATCH', cookies, JSON.stringify(body));
	const response = await fetch(request);
	if (!response.ok) {
		return {
			success: false,
			status: response.status,
			text: response.statusText,
			response: await response.json()
		};
	}
	return {
		success: true,
		status: response.status,
		text: response.statusText
	};
});

const DeleteBoardMember = z.object({
	uid: z.string(),
});

export const deleteBoardMember = form(DeleteBoardMember, async (data) => {
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/board-members/${data.uid}`;
	const request = authReq(url, 'DELETE', cookies);
	const response = await fetch(request);
	if (!response.ok) {
		return {
			success: false,
			status: response.status,
			text: response.statusText,
			response: await response.json()
		};
	}
	return {
		success: true,
		status: response.status,
		text: response.statusText
	};
});

// ── Officers ──

const CreateOfficer = z.object({
	entry_uid: z.string(),
	effector_uid: z.string().min(1),
	role_uid: z.string().min(1),
	role_label: z.string().optional(),
	start: z.string().min(1),
	stop: z.string().optional(),
});

export const createOfficer = form(CreateOfficer, async (data) => {
	const { cookies } = getRequestEvent();
	const body: Record<string, unknown> = {
		entry_uid: data.entry_uid,
		effector_uid: data.effector_uid,
		role_uid: data.role_uid,
		start: data.start,
	};
	if (data.role_label) body.role_label = data.role_label;
	if (data.stop) body.stop = data.stop;
	const request = authReq(
		`${variables.BASE_URI}/api/v2/officers`,
		'POST',
		cookies,
		JSON.stringify(body)
	);
	const response = await fetch(request);
	if (!response.ok) {
		return {
			success: false,
			status: response.status,
			text: response.statusText,
			response: await response.json()
		};
	}
	return {
		success: true,
		status: response.status,
		text: response.statusText
	};
});

const UpdateOfficer = z.object({
	uid: z.string(),
	role_label: z.string().optional(),
	start: z.string().optional(),
	stop: z.string().optional(),
});

export const updateOfficer = form(UpdateOfficer, async (data) => {
	const { cookies } = getRequestEvent();
	const body: Record<string, unknown> = {};
	if (data.role_label !== undefined) body.role_label = data.role_label;
	if (data.start) body.start = data.start;
	if (data.stop) body.stop = data.stop;
	const url = `${variables.BASE_URI}/api/v2/officers/${data.uid}`;
	const request = authReq(url, 'PATCH', cookies, JSON.stringify(body));
	const response = await fetch(request);
	if (!response.ok) {
		return {
			success: false,
			status: response.status,
			text: response.statusText,
			response: await response.json()
		};
	}
	return {
		success: true,
		status: response.status,
		text: response.statusText
	};
});

const DeleteOfficer = z.object({
	uid: z.string(),
});

export const deleteOfficer = form(DeleteOfficer, async (data) => {
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/officers/${data.uid}`;
	const request = authReq(url, 'DELETE', cookies);
	const response = await fetch(request);
	if (!response.ok) {
		return {
			success: false,
			status: response.status,
			text: response.statusText,
			response: await response.json()
		};
	}
	return {
		success: true,
		status: response.status,
		text: response.statusText
	};
});

// ── Organization Roles ──

const CreateOrganizationRole = z.object({
	label: z.string().min(1),
});

export const createOrganizationRole = form(CreateOrganizationRole, async (data) => {
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/organization-roles`;
	const request = authReq(url, 'POST', cookies, JSON.stringify(data));
	const response = await fetch(request);
	if (!response.ok) {
		return {
			success: false,
			status: response.status,
			text: response.statusText,
			response: await response.json()
		};
	}
	return {
		success: true,
		status: response.status,
		text: response.statusText
	};
});

const UpdateOrganizationRole = z.object({
	uid: z.string(),
	label: z.string().min(1),
});

export const updateOrganizationRole = form(UpdateOrganizationRole, async (data) => {
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/organization-roles/${data.uid}`;
	const request = authReq(url, 'PATCH', cookies, JSON.stringify({ label: data.label }));
	const response = await fetch(request);
	if (!response.ok) {
		return {
			success: false,
			status: response.status,
			text: response.statusText,
			response: await response.json()
		};
	}
	return {
		success: true,
		status: response.status,
		text: response.statusText
	};
});

const DeleteOrganizationRole = z.object({
	uid: z.string(),
});

export const deleteOrganizationRole = form(DeleteOrganizationRole, async (data) => {
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/organization-roles/${data.uid}`;
	const request = authReq(url, 'DELETE', cookies);
	const response = await fetch(request);
	if (!response.ok) {
		return {
			success: false,
			status: response.status,
			text: response.statusText,
			response: await response.json()
		};
	}
	return {
		success: true,
		status: response.status,
		text: response.statusText
	};
});

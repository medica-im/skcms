import { redirect, invalid } from '@sveltejs/kit';
import { getRequestEvent, form, command } from '$app/server';
import * as z from "zod";
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';

const boolString = z.string().transform((val) => val === 'true').pipe(z.boolean());

const CreateEffectorType = z.object({
	name_fr: z.string().min(1, "Vous devez indiquer un nom."),
	label_fr: z.string().min(1, "Vous devez indiquer un libellé."),
	slug_fr: z.string().min(1, "Vous devez indiquer un permalien.").regex(
		/^[a-z0-9]+(?:-[a-z0-9]+)*$/,
		"Un permalien ne peut contenir que des caractères minuscules, des chiffres et des tirets."
	),
	definition_fr: z.string().optional(),
	synonyms_fr: z.string().optional(),
	effector_type_uid: z.string().optional(),
	isHCW: boolString,
	isRPPS: boolString,
	unique_ID: z.string().optional(),
	concept_en: z.string().optional(),
	concept_fr: z.string().optional(),
});

export const createEffectorType = form(CreateEffectorType, async (data, issue) => {
	const { cookies } = getRequestEvent();
	const body: Record<string, unknown> = {
		name_fr: data.name_fr,
		label_fr: data.label_fr,
		slug_fr: data.slug_fr,
	};
	if (data.definition_fr) body.definition_fr = data.definition_fr;
	if (data.synonyms_fr) {
		body.synonyms_fr = data.synonyms_fr.split(',').map(s => s.trim()).filter(Boolean);
	}
	if (data.effector_type_uid) body.effector_type_uid = data.effector_type_uid;
	body.isHCW = data.isHCW;
	body.isRPPS = data.isRPPS;
	if (data.isHCW) {
		if (data.unique_ID) body.unique_ID = data.unique_ID;
		if (data.concept_en) body.concept_en = data.concept_en;
		if (data.concept_fr) body.concept_fr = data.concept_fr;
	}

	const url = `${variables.BASE_URI}/api/v2/effector-types`;
	const request = authReq(url, 'POST', cookies, JSON.stringify(body));
	const response = await fetch(request);
	const json = await response.json();
	if (!response.ok) {
		console.error(response.status, response.statusText);
		invalid(json.detail?.message ?? json.detail ?? response.statusText);
	}
	return {
		success: true,
		status: response.status,
		text: response.statusText,
		response: json,
	};
});

const UpdateEffectorType = z.object({
	uid: z.string(),
	name_fr: z.string().min(1, "Vous devez indiquer un nom."),
	label_fr: z.string().min(1, "Vous devez indiquer un libellé."),
	slug_fr: z.string().min(1, "Vous devez indiquer un permalien.").regex(
		/^[a-z0-9]+(?:-[a-z0-9]+)*$/,
		"Un permalien ne peut contenir que des caractères minuscules, des chiffres et des tirets."
	),
	definition_fr: z.string().optional(),
	synonyms_fr: z.string().optional(),
	effector_type_uid: z.string().optional(),
	isHCW: boolString,
	isRPPS: boolString,
	unique_ID: z.string().optional(),
	concept_en: z.string().optional(),
	concept_fr: z.string().optional(),
});

export const updateEffectorType = form(UpdateEffectorType, async (data) => {
	const { cookies } = getRequestEvent();
	const { uid, ...rest } = data;
	const body: Record<string, unknown> = {
		name_fr: rest.name_fr,
		label_fr: rest.label_fr,
		slug_fr: rest.slug_fr,
	};
	if (rest.definition_fr !== undefined) body.definition_fr = rest.definition_fr || null;
	if (rest.synonyms_fr) {
		body.synonyms_fr = rest.synonyms_fr.split(',').map(s => s.trim()).filter(Boolean);
	} else {
		body.synonyms_fr = null;
	}
	if (rest.effector_type_uid) body.effector_type_uid = rest.effector_type_uid;
	body.isHCW = rest.isHCW;
	body.isRPPS = rest.isRPPS;
	if (rest.isHCW) {
		body.unique_ID = rest.unique_ID || null;
		body.concept_en = rest.concept_en || null;
		body.concept_fr = rest.concept_fr || null;
	}

	const url = `${variables.BASE_URI}/api/v2/effector-types/${uid}`;
	const request = authReq(url, 'PATCH', cookies, JSON.stringify(body));
	const response = await fetch(request);
	const json = await response.json();
	console.log("updateEffectorType response", JSON.stringify(json));
	if (!response.ok) {
		console.error(response.status, response.statusText);
		return {
			success: false,
			status: response.status,
			text: response.statusText,
			data: json,
		};
	}
	redirect(303, `/web/effector-types?edited=${uid}&t=${Date.now()}`);
});

const DeleteEffectorType = z.object({
	uid: z.string(),
});

export const deleteEffectorType = form(DeleteEffectorType, async (data) => {
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/effector-types/${data.uid}`;
	const request = authReq(url, 'DELETE', cookies);
	const response = await fetch(request);
	if (!response.ok) {
		return {
			success: false,
			status: response.status,
			text: response.statusText,
		};
	}
	return {
		success: true,
		status: response.status,
		text: response.statusText,
	};
});

const DisconnectParent = z.object({
	uid: z.string(),
});

export const disconnectEffectorTypeParent = command(DisconnectParent, async (data) => {
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/effector-types/${data.uid}/effector-type`;
	const request = authReq(url, 'DELETE', cookies);
	const response = await fetch(request);
	if (!response.ok) {
		console.error(response.status, response.statusText);
		return {
			success: false,
			status: response.status,
			text: response.statusText,
		};
	}
	return {
		success: true,
		status: response.status,
		text: response.statusText,
	};
});

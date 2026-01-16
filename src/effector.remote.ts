import { error, redirect } from '@sveltejs/kit';
import { getRequestEvent, query, form, command } from '$app/server';
import * as z from "zod";
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';
import type { Effector } from '$lib/interfaces/v2/effector.ts';

const RoleEnum = z.enum(['anonymous', 'staff', 'administrator' , 'superuser']);
const genderEnum = z.enum(['F', 'M', 'N']);

const effectorGet = z.object({
    uid: z.string(),
    rpps: z.string().nullable(),
    name_fr: z.string(),
    label_fr: z.string(),
    slug_fr: z.string(),
    gender: genderEnum.nullable(),
    createdAt: z.int(),
    updatedAt: z.int(),
});

export const getEffectors = query(z.string().nullable(), async (directory) => {
    const { cookies } = getRequestEvent();
    const params = directory ? `?directory=${encodeURIComponent(directory)}` : '';
    const url = `${variables.BASE_URI}/api/v2/effectors${params}`;
    console.log("getEffectors url", url);
    const request = authReq(url, 'GET', cookies);
    const response = await fetch(request);
    if (response.ok == false) {
        console.error(response.status)
        console.error(response.statusText)
        throw Error(`${response.status} ${response.text}`)
    } else {
        return await response.json() as Effector[]
    }
 });

const Patch = z.object({
    effector: z.string().regex(/^[0-9a-fA-F]{32}$/).optional(),
    //roles: z.array(RoleEnum),
    rpps: z.nullable(z.coerce.number().int().gte(10000000000).lte(99999999999)).optional(),
    spoken_languages: z.nullable(z.array(z.string())).optional()
});

export const patchCommand = command(Patch, async (data) => {
    console.log(JSON.stringify(data));
    const effector_uid = data.effector;
    delete data.effector;
    const { cookies } = getRequestEvent();
    const url = `${variables.BASE_URI}/api/v2/effectors/${effector_uid}`;
    const request = authReq(url, 'PATCH', cookies, JSON.stringify(data));
    const response = await fetch(request);
    if (response.ok == false) {
        console.error(response.status)
        console.error(response.statusText)
        return {
            success: false,
            status: response.status,
            text: response.statusText
        }
    } else {
        return {
            success: true,
            status: response.status,
            text: response.statusText
        }
    }
});

const effectorPatch = z.object({
    effector: z.string().regex(/^[0-9a-fA-F]{32}$/).optional(),
    name_fr: z.string(),
    label_fr: z.string(),
    slug_fr: z.string(),
    gender: genderEnum
});

export const updateEffector = form(effectorPatch, async (data) => {
    console.log(JSON.stringify(data));
    const effector_uid = data.effector;
    delete data.effector;
    const { cookies } = getRequestEvent();
    const url = `${variables.BASE_URI}/api/v2/effectors/${effector_uid}`;
    const request = authReq(url, 'PATCH', cookies, JSON.stringify(data));
    const response = await fetch(request);
    if (response.ok == false) {
        console.error(response.status)
        console.error(response.statusText)
        return {
            success: false,
            status: response.status,
            text: response.statusText
        }
    } else {
        const json = await response.json();
        return {
            success: true,
            status: response.status,
            text: response.statusText,
            data: json
        }
    }
});

const effectorPost = z.object({
    name_fr: z.string(),
    label_fr: z.string(),
    slug_fr: z.string(),
    gender: genderEnum
});

export const createEffector = form(effectorPost, async (data) => {
    console.log(`form data: ${JSON.stringify(data)}`);
    const { cookies } = getRequestEvent();
    const url = `${variables.BASE_URI}/api/v2/effectors`;
    const request = authReq(url, 'POST', cookies, JSON.stringify(data));
    const response = await fetch(request);
    if (response.ok == false) {
        console.error(JSON.stringify(response))
        return {
            success: false,
            status: response.status,
            text: response.statusText
        }
    } else {
        const json = await response.json()
        return {
            success: true,
            status: response.status,
            text: response.statusText,
            data: json
        }
    }
});
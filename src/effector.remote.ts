import { error, redirect } from '@sveltejs/kit';
import { getRequestEvent, query, form, command } from '$app/server';
import * as z from "zod";
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';

const RoleEnum = z.enum(['anonymous', 'staff', 'administrator' , 'superuser']);

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
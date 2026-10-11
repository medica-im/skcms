import * as z from 'zod';

const blankToNull = (value: string | number | undefined) =>
	value == undefined || String(value).trim() === '' ? null : Number(value);

/** An empty coordinate field is sent as null: the facility has no position. */
export const latitude = z.preprocess(blankToNull, z.number().min(-90).max(90).nullable());
export const longitude = z.preprocess(blankToNull, z.number().min(-180).max(180).nullable());

import { z } from 'zod/v4';

export const phoneSchema = z.object({
    id: z.number(),
    type: z.enum(["M", "MW", "W", "F", "S", "AS"]),
    phone: z.string(),
});

export type PhoneSchema = typeof phoneSchema;
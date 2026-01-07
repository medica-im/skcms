import { signOut } from "$lib/auth.ts";
import type { Actions } from "./$types";

export const actions = { default: signOut } satisfies Actions
import { signIn } from "$lib/auth.ts"
import type { Actions } from "./$types"
 
export const actions: Actions = { default: signIn }
import { signOut } from "$lib/auth.ts"
import type { Actions } from "./$types"
 
export const actions: Actions = { default: signOut }
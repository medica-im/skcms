import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async (event) => {
  //console.log(event.cookies.getAll())
  return {
    session: await event.locals.auth(),
  }
}
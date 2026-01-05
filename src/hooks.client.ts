import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // if route matches "/banana" return banana
  if (event.url.pathname.startsWith('/banana')) {
    console.log("banana");
    localStorage.setItem('banana', 'banana');
      return resolve(event)
  }

  // otherwise use the default behavior
  return resolve(event)
}
import { PUBLIC_ORIGIN } from '$env/static/public';
import { browser } from '$app/environment';

export const ORIGIN = (import.meta.env.DEV && browser) ? '' : PUBLIC_ORIGIN;

import { PUBLIC_ORIGIN } from '$env/static/public';
import { browser } from '$app/environment';

export const ORIGIN = browser ? '' : PUBLIC_ORIGIN;

import { variables } from '$lib/utils/constants';

/**
 * robots.txt, generated per site rather than shipped as a static file.
 *
 * The dev hostnames are publicly resolvable and hold real certificates, so
 * crawlers reach them like any other site. `<meta name="robots" content=
 * "noindex">` in the root layout keeps those pages out of search results, but
 * only for HTML a crawler has already fetched — it does not reduce the crawl
 * itself, and does not apply to the raw `/src/*.ts` modules Vite serves in dev.
 *
 * A route, not `static/robots.txt`: everything in static/ is copied verbatim
 * into every build, so a `Disallow: /` there would silently deindex production
 * on the next deploy. Reading VITE_NOINDEX — the same flag the layout's meta
 * tag uses — keeps the two in step by construction.
 */
export function GET() {
	const body = variables.NOINDEX
		? // Dev: stay out entirely.
			'User-agent: *\nDisallow: /\n'
		: // Production: an empty Disallow is the explicit "crawl everything".
			'User-agent: *\nDisallow:\n';

	return new Response(body, {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			// Short: flipping a site between dev and production should not leave
			// a stale rule cached at the edge for a day.
			'cache-control': 'public, max-age=300'
		}
	});
}

// Nothing here depends on the request, so it can be prerendered in a build.
export const prerender = true;

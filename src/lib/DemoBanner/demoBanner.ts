/**
 * The banner a demonstration site shows on every page, if this site is one.
 *
 * Read from the skvar branch, like siteMenu.ts: only a demo site's branch has
 * `(var)/demo.ts`, so `null` is the normal case. The text is the site's own,
 * since what is fictional about it is the site's to say.
 *
 * Through $var and import.meta.glob, for the reasons siteMenu.ts gives: a
 * build-time constant of the branch checked out, and a test site server reads
 * its own tenant's worktree.
 */
const modules = import.meta.glob<{ demoBanner?: string }>('$var/demo.ts', { eager: true });

export const demoBanner: string | null = Object.values(modules)[0]?.demoBanner ?? null;

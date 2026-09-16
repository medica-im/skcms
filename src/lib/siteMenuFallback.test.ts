import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * That a site without a parent is left exactly as it was.
 *
 * The parent-site menu is per-site data in the skvar submodule, which is one
 * branch per tenant. Eight sites share this repository, so the risk in the
 * whole feature is not that unipa renders wrongly — that is visible the moment
 * anyone looks — but that one of the other seven quietly changes: a footer that
 * stops rendering, a logo that starts pointing somewhere else. Nobody is
 * looking at those while unipa is being worked on.
 *
 * Read from source rather than rendered, for the same reason
 * santelyon3-contact-load.test.ts reads from git: a rendering test would only
 * cover whichever branch the submodule happened to be sitting on, and would
 * pass by being skipped on every other. These assertions hold on every
 * checkout.
 */

const ROOT = resolve(__dirname, '../..');
const read = (path: string) => readFileSync(resolve(ROOT, path), 'utf8');

describe('the shared components without a parent site', () => {
	it('keeps the old footer branches intact', () => {
		// The new branch is added before the category test, not in place of it:
		// unipa is typed `cpts` like several standalone sites, so replacing that
		// test would have changed theirs too.
		const layout = read('src/routes/+layout.svelte');
		expect(layout).toContain('{#if siteMenu}');
		expect(layout).toContain('category.name=="msp"');
		expect(layout).toContain('category.name=="cpts"');
		expect(layout).toContain('<Footer />');
		expect(layout).toContain('<AddressbookFooter/>');
	});

	it('keeps the original app bar logo link for sites with no parent', () => {
		// The `{:else}` arm is the markup that shipped before this feature: one
		// anchor wrapping logo and title. It must stay reachable, and it must
		// still carry the category-driven logo choice.
		const appBar = read('src/lib/SkeletonAppBar/SkeletonAppBar.svelte');
		expect(appBar).toContain('title={m.NAVBAR_GO_HOME()}');
		expect(appBar).toContain('<OutpatientClinicLogo />');
		expect(appBar).toContain('icon={faAddressBook}');
	});

	it('falls back to this app’s own contact and sites links', () => {
		// `?? base` and `?? true`, so a site with no parent emits exactly the
		// URL it emitted before. A bare `siteMenu.footer.contactHref` would be
		// undefined there, and `href={undefined}` renders a link to the current
		// page — a dead control rather than a visible error.
		const mobile = read('src/lib/SkeletonAppBar/MobileSidebar.svelte');
		expect(mobile).toContain('siteMenu?.footer.contactHref ?? `${base}/contact`');
		expect(mobile).toContain('siteMenu?.footer.showSites ?? true');
	});

	it('keeps the Navigate popup for sites with no parent', () => {
		// The popup is dropped where the parent's menu occupies the bar, so its
		// own links need no per-link guard — but it has to stay whole for every
		// site that still relies on it, which is all the others.
		const appBar = read('src/lib/SkeletonAppBar/SkeletonAppBar.svelte');
		expect(appBar).toContain('{#if !siteMenu}');
		expect(appBar).toContain('m.NAVBAR_NAVIGATE()');
		expect(appBar).toContain('href="{base}/sites"');
		expect(appBar).toContain('href="{base}/contact"');
	});

	it('reads the menu from skvar, so it is absent unless that site has one', () => {
		// The glob is what makes this per-site. Hardcoding a site name here, or
		// importing the file directly, would make every site carry unipa's menu
		// — and a direct import would not even compile on a branch without it.
		const loader = read('src/lib/SiteMenu/siteMenu.ts');
		expect(loader).toContain('import.meta.glob');
		expect(loader).toContain('routes/(skvar)/(var)/siteMenu.ts');
		expect(loader).toMatch(/siteMenu:\s*SiteMenu\s*\|\s*null/);

		// No site named in the code itself. Comments may name one — explaining
		// which site forced a decision is the useful half of a comment — so the
		// check is on the source with them stripped.
		const code = loader
			.replace(/\/\*[\s\S]*?\*\//g, '')
			.replace(/\/\/.*$/gm, '');
		expect(code).not.toMatch(/unipa|gadagne|santelyon|annuaire\.medica/i);
	});

	it('leaves the shared nav data and its consumers alone', () => {
		// The programme menu that the standalone sites drive from
		// $var/variables.ts is a separate mechanism, and this feature must not
		// have touched it.
		const files = execFileSync(
			'git',
			['diff', '--name-only', 'main...HEAD'],
			{ cwd: ROOT, encoding: 'utf8' }
		)
			.split('\n')
			.filter(Boolean);

		const untouchable = [
			'src/lib/Footer/Footer.svelte',
			'src/lib/Footer/AddressbookFooter.svelte',
			'src/lib/SkeletonAppBar/Sidebar.svelte',
			'src/lib/SkeletonAppBar/MenuNavLinks.svelte',
			'src/lib/Drawer/Drawer.svelte',
			'src/lib/Search/Search.svelte'
		];

		expect(files.filter((f) => untouchable.includes(f))).toEqual([]);
	});

	it('keeps tenant names out of the shared components', () => {
		// The boundary this whole feature rests on: anything generalizable lives
		// in src/lib and knows no tenant; anything belonging to one site lives in
		// its skvar branch. A site name reaching the shared side is how a second
		// parent-site project would start having to work around the first.
		//
		// Comments may name a site — explaining which one forced a decision is
		// the useful half of a comment — so they are stripped before checking.
		const tenants = /unipa|gadagne|santelyon|annuaire\.medica/i;
		const strip = (src: string) =>
			src
				.replace(/<!--[\s\S]*?-->/g, '')
				.replace(/\/\*[\s\S]*?\*\//g, '')
				.replace(/^\s*\/\/.*$/gm, '');

		for (const file of [
			'src/lib/SiteMenu/siteMenu.ts',
			'src/lib/SiteMenu/ParentSiteNav.svelte',
			'src/lib/SiteMenu/ParentSiteTree.svelte',
			'src/lib/SiteMenu/ParentSiteFooter.svelte',
			'src/lib/interfaces/siteMenu.interface.ts',
			'src/lib/SkeletonAppBar/SkeletonAppBar.svelte',
			'src/lib/SkeletonAppBar/MobileSidebar.svelte',
			'src/app.postcss'
		]) {
			expect(strip(read(file)), `${file} names a tenant in code`).not.toMatch(tenants);
		}
	});

	it('lets a site declare its own theme rather than the app bar knowing it', () => {
		// The theme file itself stays in src/lib/themes — tailwind resolves its
		// config before skvar is in the picture, so a theme on a swapped
		// submodule would make every other branch need one too. What must not
		// leak is *which* theme a site uses: that is the site's own data.
		const appBar = read('src/lib/SkeletonAppBar/SkeletonAppBar.svelte');
		expect(appBar).toContain('siteMenu?.parentSite.theme');
	});

	it('shows the tree whole, in the drawer and the footer alike', () => {
		// A disclosure version existed briefly and read worse than the height it
		// saved was worth. What replaced it in the footer is columns, not a
		// second behaviour — so there is no `collapsible` mode to drift.
		const tree = read('src/lib/SiteMenu/ParentSiteTree.svelte');
		expect(tree).not.toContain('aria-expanded');
		expect(tree).not.toContain('collapsible');

		const footer = read('src/lib/SiteMenu/ParentSiteFooter.svelte');
		expect(footer).not.toContain('collapsible');
		// Five columns from lg is what keeps a whole tree from running long.
		expect(footer).toContain('lg:grid-cols-5');
	});

	it('stops the footer repeating links the tree already carries', () => {
		// The footer used to list the directory and contact as its own links
		// while the parent's menu above carried contact and the tree below ended
		// with the directory — one footer reading as two competing menus.
		const footer = read('src/lib/SiteMenu/ParentSiteFooter.svelte');
		expect(footer).not.toContain('SITES_TITLE');
		expect(footer).not.toContain('CONTACT_TITLE');
		// The legal notice survives, inside the tree, via the shared helper.
		expect(footer).toContain('menuWithOwnPages');
	});
});

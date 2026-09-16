import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * The WordPress menu importer.
 *
 * The directory at unipa.fr/annuaire is a section of a WordPress site, and its
 * app bar has to carry that site's menu. WordPress will not hand it over: the
 * `wp/v2/menus` and `wp/v2/menu-items` endpoints answer 401 `rest_cannot_view`
 * without a credential, and `wp/v2/pages` — which is public — is a flat list of
 * pages, not the menu. So the tree is scraped from the rendered home page,
 * where it sits in `<nav id="site-navigation">`.
 *
 * Two properties of that scrape are worth pinning, because both failed in a
 * throwaway prototype and neither is visible by reading the output:
 *
 * 1. The nesting must come from the `<ul>`/`<li>` structure. WordPress also
 *    stamps each item with a `menu-item-depth-N` class, and reading only those
 *    is much easier — but a flat pass over them attaches every depth-2 item to
 *    whichever depth-1 item came last in document order, which is not
 *    necessarily its parent. The prototype put all three of LES CONTRIBUTIONS,
 *    COMMUNIQUÉS DE PRESSE and PRESSE & PARUTIONS under LA FORMATION on that
 *    basis, and the result looked entirely plausible.
 *
 * 2. Re-running the importer must not undo hand curation. The committed file is
 *    the override — hiding an item or renaming it is an edit to the generated
 *    tree, not a second file layered on top — so an import that simply
 *    overwrites silently reinstates everything that was deliberately dropped.
 *    Whoever re-runs it would have to notice in the diff, every time.
 *
 * The script is Python (invoked by scripts/wp-menu-import.sh) because parsing
 * HTML is its job, not node's. It is exercised here through its CLI rather than
 * imported, which keeps this a test of the thing that actually runs.
 */

const SCRIPT = resolve(__dirname, '../../scripts/wp_menu_import.py');

/**
 * A cut-down copy of unipa.fr's menu markup, kept faithful to the real page in
 * the three ways that broke a first attempt at this:
 *
 *   - a `<div>` sits between an `<li>` and the `<ul>` holding its children, so
 *     a parser that expects the list to be an immediate child finds nothing;
 *   - an item that only opens a submenu has an `<a>` with **no href** — it is a
 *     heading, not a link — and dropping those takes their children with them;
 *   - labels are wrapped in a `<span>` rather than being the anchor's own text.
 *
 * It also keeps the trap in property 1: a depth-2 group followed by a further
 * depth-1 sibling, which a flat pass over the depth classes mis-attaches.
 */
const NAV_HTML = `
<nav id="site-navigation" class="main-nav">
  <div id="mega-menu-wrap">
  <ul id="primary-menu" class="menu">
    <li class="mega-menu-item nav-item menu-item-depth-0 has-submenu">
      <a class="menu-link main-menu-link item-title"><span>QUI SOMMES-NOUS ?</span></a>
      <div class="sub-nav-wrap">
        <ul class="menu-depth-1 sub-menu sub-nav-group">
          <li class="mega-menu-item sub-nav-item menu-item-depth-1">
            <a class="menu-link sub-menu-link" href="https://dev.unipa.fr/le-metier/"><span>LE MÉTIER</span></a>
          </li>
          <li class="mega-menu-item sub-nav-item menu-item-depth-1 has-submenu">
            <a class="menu-link sub-menu-link" href="https://dev.unipa.fr/la-formation/"><span>LA FORMATION</span></a>
            <div class="sub-nav-wrap">
              <ul class="menu-depth-2 sub-sub-menu">
                <li class="mega-menu-item sub-nav-item menu-item-depth-2">
                  <a href="https://dev.unipa.fr/les-contributions/"><span>LES CONTRIBUTIONS</span></a>
                </li>
              </ul>
            </div>
          </li>
          <li class="mega-menu-item sub-nav-item menu-item-depth-1">
            <a class="menu-link sub-menu-link" href="https://dev.unipa.fr/nos-actions/"><span>NOS ACTIONS</span></a>
          </li>
        </ul>
      </div>
    </li>
    <li class="mega-menu-item nav-item menu-item-depth-0">
      <a class="menu-link main-menu-link item-title" href="https://dev.unipa.fr/contact/"><span>CONTACT</span></a>
    </li>
    <li class="mega-menu-item nav-item menu-item-depth-0">
      <a class="menu-link main-menu-link item-title" href="/annuaire/"><span>ANNUAIRE</span></a>
    </li>
  </ul>
  </div>
</nav>`;

/**
 * Run the importer over some HTML, optionally merging onto an existing file.
 * Returns the parsed tree the script emits as JSON.
 */
function runImport(html: string, existing?: unknown) {
	const args = [SCRIPT, '--emit-json', '--site-url', 'https://dev.unipa.fr', '--base-path', '/annuaire'];
	if (existing !== undefined) args.push('--merge-json', JSON.stringify(existing));
	const out = execFileSync('python3', args, { input: html, encoding: 'utf8' });
	return JSON.parse(out);
}

/** Depth-first lookup by label, so assertions read as the menu reads. */
function find(items: any[], label: string): any | undefined {
	for (const item of items ?? []) {
		if (item.label === label) return item;
		const hit = find(item.children ?? [], label);
		if (hit) return hit;
	}
	return undefined;
}

describe('scraping the parent site menu', () => {
	it('reads the tree from the list nesting, not the depth classes', () => {
		const { items } = runImport(NAV_HTML);

		// The trap: LES CONTRIBUTIONS belongs to LA FORMATION. A flat pass over
		// `menu-item-depth-N` attaches it to NOS ACTIONS, the depth-1 item that
		// follows it in document order.
		const formation = find(items, 'LA FORMATION');
		expect(formation?.children?.map((c: any) => c.label)).toEqual(['LES CONTRIBUTIONS']);

		const actions = find(items, 'NOS ACTIONS');
		expect(actions?.children ?? []).toEqual([]);
	});

	it('keeps the top level flat and in order', () => {
		const { items } = runImport(NAV_HTML);
		expect(items.map((i: any) => i.label)).toEqual(['QUI SOMMES-NOUS ?', 'CONTACT', 'ANNUAIRE']);
	});

	it('keeps an item that only opens a submenu, and its children', () => {
		// The real menu's top-level entries are headings: an <a> with no href at
		// all, whose only job is to open the panel below it. Requiring an href
		// dropped them *and everything beneath them* — the first run against the
		// live page produced five top-level items and no children whatsoever,
		// which looks like a site with a flat menu rather than a parsing failure.
		const { items } = runImport(NAV_HTML);
		const heading = find(items, 'QUI SOMMES-NOUS ?');
		expect(heading.href).toBe('');
		expect(heading.children.map((c: any) => c.label)).toEqual([
			'LE MÉTIER',
			'LA FORMATION',
			'NOS ACTIONS'
		]);
	});

	it('marks parent-site pages external and our own pages not', () => {
		const { items } = runImport(NAV_HTML);
		expect(find(items, 'CONTACT')).toMatchObject({ external: true });

		// The parent menu links to us. Following that link back out to WordPress
		// and in again would be a round trip for a page we already serve.
		expect(find(items, 'ANNUAIRE')).toMatchObject({ href: '/annuaire/', external: false });
	});
});

describe('re-running the import over a curated file', () => {
	it('keeps an item that was hidden by hand', () => {
		const existing = {
			items: [{ label: 'CONTACT', href: 'https://dev.unipa.fr/contact/', hidden: true }]
		};
		const { items } = runImport(NAV_HTML, existing);
		expect(find(items, 'CONTACT')).toMatchObject({ hidden: true });
	});

	it('keeps a label that was renamed by hand', () => {
		// The curated tree mirrors the real one's shape: the merge walks the two
		// in step, so an item listed at the wrong depth is simply never met.
		const existing = {
			items: [
				{
					label: 'QUI SOMMES-NOUS ?',
					href: '',
					children: [{ label: 'Le métier', href: 'https://dev.unipa.fr/le-metier/' }]
				}
			]
		};
		const { items } = runImport(NAV_HTML, existing);

		// Matched on href, so the rename survives even though the parent site
		// still shouts its own label in capitals.
		expect(find(items, 'Le métier')).toBeTruthy();
		expect(find(items, 'LE MÉTIER')).toBeUndefined();
	});

	it('renames a heading, which has no href to match on', () => {
		// Headings are matched by position among their href-less siblings. Using
		// the label as the key would break exactly this case: the rename would
		// stop the item matching itself on the next run, and the parent site's
		// label would come back.
		const existing = { items: [{ label: 'Qui sommes-nous', href: '' }] };
		const { items } = runImport(NAV_HTML, existing);
		expect(items[0].label).toBe('Qui sommes-nous');
	});

	it('preserves overrides on nested items too', () => {
		const existing = {
			items: [
				{
					label: 'QUI SOMMES-NOUS ?',
					href: '',
					children: [
						{ label: 'Le métier', href: 'https://dev.unipa.fr/le-metier/' },
						{ label: 'LA FORMATION', href: 'https://dev.unipa.fr/la-formation/', hidden: true }
					]
				}
			]
		};
		const { items } = runImport(NAV_HTML, existing);
		expect(find(items, 'Le métier')).toBeTruthy();
		expect(find(items, 'LA FORMATION')).toMatchObject({ hidden: true });
	});

	it('picks up an item the parent site has added since', () => {
		// Curation must not freeze the menu: an entry absent from the committed
		// file is new upstream, and arrives visible.
		const existing = {
			items: [{ label: 'CONTACT', href: 'https://dev.unipa.fr/contact/', hidden: true }]
		};
		const { items } = runImport(NAV_HTML, existing);
		const added = find(items, 'QUI SOMMES-NOUS ?');
		expect(added).toBeTruthy();
		expect(added.hidden ?? false).toBe(false);
	});

	it('drops an item the parent site has removed', () => {
		const existing = {
			items: [{ label: 'ANCIENNE PAGE', href: 'https://dev.unipa.fr/ancienne-page/' }]
		};
		const { items } = runImport(NAV_HTML, existing);
		expect(find(items, 'ANCIENNE PAGE')).toBeUndefined();
	});
});

describe('how a parent-site label is shown', () => {
	it('sentence-cases a shouted label', async () => {
		const { displayLabel } = await import('$lib/SiteMenu/siteMenu');
		expect(displayLabel('QUI SOMMES-NOUS ?')).toBe('Qui sommes-nous ?');
		expect(displayLabel('BOÎTE À OUTILS')).toBe('Boîte à outils');
	});

	it('leaves an acronym in capitals', () => {
		// "Ipa" reads as a mistake: it is the profession the whole site is about.
		return import('$lib/SiteMenu/siteMenu').then(({ displayLabel }) => {
			expect(displayLabel('IPA : UN MÉTIER INNOVANT')).toBe('IPA : un métier innovant');
		});
	});

	it('capitalises the first letter even when it is accented', async () => {
		// toUpperCase on a lone accented char is the kind of thing that works in
		// one locale and not another; pinning it is cheaper than reasoning twice.
		const { displayLabel } = await import('$lib/SiteMenu/siteMenu');
		expect(displayLabel('ÉVÉNEMENTS')).toBe('Événements');
	});
});

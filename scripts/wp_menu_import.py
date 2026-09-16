#!/usr/bin/env python3
"""Build the parent site's menu tree from its rendered home page.

WordPress will not serve its menus: `wp/v2/menus` and `wp/v2/menu-items` answer
401 `rest_cannot_view` without a credential, and `wp/v2/pages` — which is public
— is a flat list of pages rather than the menu. The rendered page carries the
whole tree in `<nav id="site-navigation">`, so that is what is read here. No
credential is needed and nothing has to be provisioned on the WordPress side.

The nesting comes from the `<ul>`/`<li>` structure. WordPress also stamps every
item with a `menu-item-depth-N` class and reading those is far easier, but a
flat pass over them attaches each deep item to whichever shallower item came
last in document order — which is not necessarily its parent. That produces a
plausible-looking tree with items under the wrong heading.

Re-running this must not undo hand curation. The committed file *is* the
override — an item is hidden or renamed by editing the generated tree — so the
previous output is merged in by href: a `hidden` flag and an edited `label` both
survive, while items added upstream appear and items removed upstream disappear.

Used through scripts/wp-menu-import.sh, which fetches the page and writes the
TypeScript module. Kept separate so the parsing can be tested on its own, which
is what src/lib/wpMenuImport.test.ts does.
"""

import argparse
import json
import sys
from html import unescape
from html.parser import HTMLParser
from urllib.parse import urlparse


class MenuParser(HTMLParser):
    """Collect the menu tree from `<nav id="site-navigation">`.

    A single pass with an explicit stack. `<li>` opens an item, `<ul>` descends,
    and the first `<a>` inside an item supplies its label and href — the first
    because a mega-menu item may also contain an icon or a description link,
    none of which name the item.

    Two things the real markup does that a tidier page would not:

    A submenu is wrapped in a `<div>` between the `<li>` and its `<ul>`, so the
    list is not an immediate child of the item it belongs to. The stack handles
    this by itself — the `<div>` is simply not one of the tags it tracks.

    An item that only opens a submenu carries an `<a>` with **no href**: it is a
    heading, not a link. Those are kept, because dropping them takes their whole
    subtree with them; `href` is left empty and the renderer shows plain text.
    """

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = []
        # Items whose children are still being read, outermost first.
        self.stack = []
        # Where new items are appended: the root, or some item's children.
        self.targets = [self.root]
        self.in_nav = False
        self.nav_depth = 0
        # Set while reading the text of an item's first <a>.
        self.capturing = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)

        if not self.in_nav:
            if tag == "nav" and attrs.get("id") == "site-navigation":
                self.in_nav = True
                self.nav_depth = 1
            return

        # Track nesting so the matching </nav> can be recognised.
        if tag == "nav":
            self.nav_depth += 1

        if tag == "ul":
            # Descend into the current item's children. Outside any item this is
            # the menu's own list, whose target is already the root.
            if self.stack:
                self.targets.append(self.stack[-1].setdefault("children", []))
            else:
                self.targets.append(self.root)
            return

        if tag == "li":
            self.stack.append({"label": "", "href": "", "seen_anchor": False})
            return

        # The first anchor names the item, whether or not it links anywhere: a
        # heading that only opens a submenu has no href, and keying off the href
        # would let the *next* anchor — one of the children, read before this
        # item closes — overwrite the label.
        if tag == "a" and self.stack and not self.stack[-1]["seen_anchor"]:
            self.stack[-1]["seen_anchor"] = True
            self.stack[-1]["href"] = attrs.get("href", "")
            self.capturing = self.stack[-1]

    def handle_data(self, data):
        if self.capturing is not None:
            self.capturing["label"] += data

    def handle_endtag(self, tag):
        if not self.in_nav:
            return

        if tag == "a":
            self.capturing = None
            return

        if tag == "ul":
            if len(self.targets) > 1:
                self.targets.pop()
            return

        if tag == "li":
            if self.stack:
                item = self.stack.pop()
                item.pop("seen_anchor", None)
                item["label"] = " ".join(item["label"].split())
                # A label is enough. An item with no href is a heading that
                # opens a submenu, and requiring one discards its children too.
                # An <li> that names nothing is a separator or a widget.
                if item["label"]:
                    self.targets[-1].append(item)
            return

        if tag == "nav":
            self.nav_depth -= 1
            if self.nav_depth == 0:
                self.in_nav = False


def normalise(items, site_url, base_path):
    """Mark each item as internal or external and tidy its href.

    A link to the parent site is external: following it leaves this app. A link
    the parent menu makes to *us* is not — the menu's own entry for the
    directory would otherwise send a visitor out to WordPress and straight back
    in again.
    """
    site_host = urlparse(site_url).netloc
    out = []

    for item in items:
        href = unescape(item["href"]).strip()
        parsed = urlparse(href)
        host = parsed.netloc

        if not href:
            # A heading that only opens a submenu. It goes nowhere, so it is
            # neither internal nor external.
            internal = True
        elif host and host != site_host:
            # Somewhere else entirely — another domain in the parent's menu.
            internal = False
        elif base_path and (parsed.path or "/").startswith(base_path):
            # Ours, whether written absolutely or as a bare path.
            internal = True
            href = parsed.path or href
        else:
            internal = False

        entry = {
            "label": unescape(item["label"]),
            "href": href,
            "external": not internal,
        }
        children = normalise(item.get("children", []), site_url, base_path)
        if children:
            entry["children"] = children
        out.append(entry)

    return out


def merge(scraped, existing):
    """Re-apply hand curation to a freshly scraped tree.

    Matched on href: the label is the field most likely to have been edited, so
    it cannot also be the key. An item missing from `existing` is new upstream
    and arrives visible; an item missing from `scraped` is gone upstream and is
    dropped, curation included.

    Headings have no href, so they are matched on position among their
    href-less siblings instead. Falling back to the label would defeat the
    purpose — renaming a heading would stop it matching itself next time — and
    an empty string cannot key a dictionary shared by all of them.
    """
    by_href = {}
    headings = []
    for item in existing or []:
        if item.get("href"):
            by_href[item["href"]] = item
        else:
            headings.append(item)

    out = []
    heading_index = 0

    for item in scraped:
        if item["href"]:
            prior = by_href.get(item["href"])
        else:
            prior = headings[heading_index] if heading_index < len(headings) else None
            heading_index += 1
        merged = dict(item)

        if prior is not None:
            if prior.get("label"):
                merged["label"] = prior["label"]
            if prior.get("hidden"):
                merged["hidden"] = True

        children = merge(item.get("children", []), (prior or {}).get("children", []))
        if children:
            merged["children"] = children
        out.append(merged)

    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--site-url", required=True, help="Origin of the parent site.")
    ap.add_argument("--base-path", default="", help="Where this app is mounted, e.g. /annuaire.")
    ap.add_argument("--merge-json", help="Previous tree, to re-apply curation from.")
    ap.add_argument("--emit-json", action="store_true", help="Print JSON rather than TypeScript.")
    args = ap.parse_args()

    parser = MenuParser()
    parser.feed(sys.stdin.read())

    items = normalise(parser.root, args.site_url, args.base_path)

    if not items:
        print(
            "No menu found: the page has no <nav id=\"site-navigation\">, or its "
            "markup has changed. Check the fetched HTML before trusting an empty "
            "menu — an unnoticed empty import silently blanks the app bar.",
            file=sys.stderr,
        )
        sys.exit(1)

    if args.merge_json:
        prior = json.loads(args.merge_json)
        items = merge(items, prior.get("items", []))

    if args.emit_json:
        json.dump({"items": items}, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
    else:
        json.dump(items, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")


if __name__ == "__main__":
    main()

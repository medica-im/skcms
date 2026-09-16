<script lang="ts">
	/**
	 * The parent site's menu as a tree.
	 *
	 * Always fully expanded, in the drawer and in the footer alike. The menu is a
	 * handful of entries three levels deep — small enough to read whole — and a
	 * closed branch hides the very thing someone opened the menu to find.
	 * Expanding is an interaction standing in front of every navigation, while
	 * the scroll or the column that replaces it costs nothing.
	 *
	 * A disclosure version of this existed briefly and was dropped: it read
	 * worse than the space it saved was worth.
	 *
	 * Recursive rather than three hand-written levels: the previous version
	 * repeated the same markup per depth, which is how the levels drifted apart
	 * — headings ended up at `text-sm` and 60% opacity while links were full
	 * size, so depth read as importance rather than as structure. Here every
	 * row is the same row, and only the guides to its left say where it sits.
	 *
	 * The guides are borders on the wrapper, not characters in the text: a
	 * box-drawing glyph would be read out by a screen reader and would not line
	 * up once a long label wraps, which most of these do on a phone.
	 */
	import { page } from '$app/state';
	import type { SiteMenuItem } from '$lib/interfaces/siteMenu.interface';
	import { displayLabel } from '$lib/SiteMenu/siteMenu';
	// Importing itself rather than `<svelte:self>`, which Svelte 5 deprecates.
	import ParentSiteTree from '$lib/SiteMenu/ParentSiteTree.svelte';

	let {
		items,
		depth = 0,
		onNavigate,
		sectionHeadings = false,
		flowIntoParent = false
	}: {
		items: SiteMenuItem[];
		depth?: number;
		onNavigate: () => void;
		/**
		 * Style the top level as footer section headings — small caps, bold —
		 * the way every other footer in the app titles a column.
		 *
		 * For the footer, where the seven top-level entries are laid out in
		 * columns and have to read as seven separate divisions rather than one
		 * long list. The drawer leaves this off: there the tree is a single
		 * scrolling column and uniform rows are what make the guides legible.
		 */
		sectionHeadings?: boolean;
		/**
		 * Let the caller's own layout place the top-level entries.
		 *
		 * The list wrapper would otherwise be a single box, so the whole menu
		 * would land in one column of the footer's column set. `display:
		 * contents` takes the <ul> out of the box tree without removing it from
		 * the accessibility tree: the <li>s flow as the caller's own children,
		 * and the list is still a list.
		 */
		flowIntoParent?: boolean;
	} = $props();

	/** The top level of a tree asked to title its sections. */
	const isSection = $derived(sectionHeadings && depth === 0);

	/**
	 * Whether a row points at the page being read.
	 *
	 * Only our own pages can match: an entry on the parent site is a different
	 * document served by a different application, so `external` is never
	 * current no matter what its URL says. That also keeps the parent's own
	 * behaviour — it marks nothing as current — intact for its own entries.
	 *
	 * Compared against the pathname with any trailing slash removed, since the
	 * app's own links are written both ways ('/annuaire/' for the home, and
	 * '/annuaire/mentions-legales' without).
	 */
	const trim = (path: string) => path.replace(/\/+$/, '') || '/';
	const current = (item: SiteMenuItem) =>
		!item.external && !!item.href && trim(item.href) === trim(page.url.pathname);
</script>

<ul class="list-none m-0 p-0 {flowIntoParent && depth === 0 ? 'contents' : ''}">
	{#each items as item, i (item.label)}
		{@const last = i === items.length - 1}
		<!--
			`break-inside-avoid` matters only where this tree is laid out in CSS
			columns (the footer): without it a heading can sit at the foot of one
			column with its children at the head of the next, which reads as two
			unrelated groups. Harmless everywhere else.
		-->
		<li class="relative break-inside-avoid {depth > 0 ? 'pl-5' : ''}">
			{#if depth > 0}
				<!--
					The vertical line of this level, and the elbow into this row.

					The line is the `<li>`'s own left border, stopped halfway down
					on the last child so the branch visibly ends rather than
					trailing into the space below it. The elbow is a short
					horizontal rule at the row's centre line.
				-->
				<span
					class="absolute left-0 top-0 w-px bg-surface-400/40 {last ? 'h-[calc(1.4rem+1px)]' : 'h-full'}"
					aria-hidden="true"
				></span>
				<span
					class="absolute left-0 top-[1.4rem] h-px w-3 bg-surface-400/40"
					aria-hidden="true"
				></span>
			{/if}

			{#if item.href}
				<!--
					`aria-current="page"` as well as the weight: bold alone says
					nothing to a screen reader, and this is the one place in the
					menu where the styling carries meaning rather than decoration.
				-->
				<a
					href={item.href}
					rel={item.external ? 'noopener' : undefined}
					aria-current={current(item) ? 'page' : undefined}
					class="anchor block {isSection
						? 'text-sm font-semibold uppercase pb-1 mb-2'
						: 'min-h-11 py-2'} pr-2 leading-relaxed {current(item)
						? 'font-semibold'
						: ''}"
					onclick={onNavigate}
				>
					{displayLabel(item.label)}
				</a>
			{:else}
				<!--
					A heading: an entry the parent site uses to open a panel, with
					no page of its own. Same size and family as everything else —
					only the colour and the missing underline say it is not a
					link, which is the same signal every other non-link carries.
				-->
				{#if isSection}
					<!--
						`<h6 class="text-sm font-semibold uppercase">` is how every
						other footer in this app titles a column — see
						Footer.svelte and AddressbookFooter.svelte. Reused rather
						than restyled so the parent-site footer does not become a
						third convention.
					-->
					<h6 class="pr-2 pb-1 mb-2 text-sm font-semibold uppercase leading-relaxed">
						{displayLabel(item.label)}
					</h6>
				{:else}
					<span class="block min-h-11 py-2 pr-2 leading-relaxed">
						{displayLabel(item.label)}
					</span>
				{/if}
			{/if}

			{#if item.children?.length}
				<ParentSiteTree items={item.children} depth={depth + 1} {onNavigate} {sectionHeadings} />
			{/if}
		</li>
	{/each}
</ul>

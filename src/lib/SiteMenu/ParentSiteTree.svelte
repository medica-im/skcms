<script lang="ts">
	/**
	 * The parent site's menu as a tree, for the mobile drawer.
	 *
	 * Fully expanded, with no collapse control. The menu is fourteen entries
	 * three levels deep — small enough to read whole — and a closed branch on a
	 * phone hides the very thing the drawer was opened to find. Expanding is a
	 * second interaction before any navigation can happen; the scroll that
	 * replaces it is free.
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
		onNavigate
	}: {
		items: SiteMenuItem[];
		depth?: number;
		onNavigate: () => void;
	} = $props();

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

<ul class="list-none m-0 p-0">
	{#each items as item, i (item.label)}
		{@const last = i === items.length - 1}
		<li class="relative {depth > 0 ? 'pl-5' : ''}">
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
					class="anchor block min-h-11 py-2 pr-2 leading-relaxed {current(item)
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
				<span class="block min-h-11 py-2 pr-2 leading-relaxed">
					{displayLabel(item.label)}
				</span>
			{/if}

			{#if item.children?.length}
				<ParentSiteTree items={item.children} depth={depth + 1} {onNavigate} />
			{/if}
		</li>
	{/each}
</ul>

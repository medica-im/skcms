<script lang="ts">
	/**
	 * The parent site's menu, as dropdown buttons in the app bar.
	 *
	 * Rendered only where this app is embedded in another site — the data comes
	 * from the skvar submodule and is absent everywhere else, so this component
	 * is never mounted on a standalone site.
	 *
	 * Three levels deep at most, which is what the source menu has. The third
	 * level is rendered as an indented group inside its parent's card rather
	 * than as a nested popup: a popup opening another popup is awkward to use
	 * with a mouse and impossible with a finger.
	 */
	import { popup } from '@skeletonlabs/skeleton';
	import Fa from 'svelte-fa';
	import { faCaretDown } from '@fortawesome/free-solid-svg-icons';
	import type { SiteMenuItem } from '$lib/interfaces/siteMenu.interface';
	import { displayLabel } from '$lib/SiteMenu/siteMenu';

	let { items }: { items: SiteMenuItem[] } = $props();

	/**
	 * An item with children opens a panel; one without is a plain link. A
	 * heading carries no href at all, so the two cases are not the same test.
	 */
	const hasChildren = (item: SiteMenuItem) => (item.children?.length ?? 0) > 0;

	/**
	 * Popup targets have to be unique on the page and are referenced from an
	 * attribute, so they cannot carry the accents and spaces a label has.
	 */
	const targetId = (item: SiteMenuItem, index: number) =>
		`parent-menu-${index}-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

</script>

<!--
	`!px-2.5` against Skeleton's `px-4`: six items at the parent site's own
	wording are about 80px wider than the bar has to give at 1440, and the row
	wrapped — a second line of menu on every page. Horizontal padding is the
	part of a button that costs width without costing reach, so it goes before
	anything else does.

	`min-h-11` stays on every one of them. 44px is the floor for this site's
	readers, not a nicety, and a menu that has to be tapped is exactly where it
	matters — see the note on the hamburger in SkeletonAppBar.svelte.
-->
{#each items as item, index (item.label)}
	{#if hasChildren(item)}
		<button
			class="btn !px-2.5 hover:variant-soft-primary min-h-11"
			use:popup={{ event: 'click', target: targetId(item, index) }}
		>
			<span>{displayLabel(item.label)}</span>
			<span class="opacity-50"><Fa icon={faCaretDown} /></span>
		</button>
		<div class="card p-4 w-fit max-w-md shadow-xl" data-popup={targetId(item, index)}>
			<nav class="list-nav">
				<ul>
					{#each item.children ?? [] as child (child.label)}
						<li>
							{#if hasChildren(child)}
								<!--
									A third level. The group's own name is a heading
									rather than a link when it has no href of its own,
									which is how the source menu treats it.
								-->
								{#if child.href}
									<a
										class="min-h-11 flex items-center"
										href={child.href}
										rel={child.external ? 'noopener' : undefined}
									>
										{displayLabel(child.label)}
									</a>
								{:else}
									<span class="block px-4 pt-2 text-sm font-semibold opacity-60">
										{displayLabel(child.label)}
									</span>
								{/if}
								<ul class="pl-4">
									{#each child.children ?? [] as grandchild (grandchild.label)}
										<li>
											<a
												class="min-h-11 flex items-center"
												href={grandchild.href}
												rel={grandchild.external ? 'noopener' : undefined}
											>
												{displayLabel(grandchild.label)}
											</a>
										</li>
									{/each}
								</ul>
							{:else}
								<a
									class="min-h-11 flex items-center"
									href={child.href}
									rel={child.external ? 'noopener' : undefined}
								>
									{displayLabel(child.label)}
								</a>
							{/if}
						</li>
					{/each}
				</ul>
			</nav>
		</div>
	{:else}
		<a
			class="btn !px-2.5 hover:variant-soft-primary min-h-11"
			href={item.href}
			rel={item.external ? 'noopener' : undefined}
		>
			{displayLabel(item.label)}
		</a>
	{/if}
{/each}

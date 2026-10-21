<script lang="ts">
	import Fa from 'svelte-fa';
	import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';
	import { PAGE_SIZES, type PageSize } from '$lib/utils/paginate';

	let {
		page,
		pages,
		size,
		total,
		onpage,
		onsize
	}: {
		page: number;
		pages: number;
		size: number;
		total: number;
		onpage: (page: number) => void;
		onsize: (size: PageSize) => void;
	} = $props();
</script>

{#if total > PAGE_SIZES[0]}
	<nav data-testid="pagination" class="flex flex-wrap items-center justify-between gap-3 py-3">
		<label class="flex items-center gap-2 text-sm">
			<span>{m.PAGINATION_PER_PAGE()}</span>
			<select
				class="select w-auto min-h-11"
				value={size}
				onchange={(e) => onsize(Number(e.currentTarget.value) as PageSize)}
			>
				{#each PAGE_SIZES as offered (offered)}
					<option value={offered}>{offered}</option>
				{/each}
			</select>
		</label>
		<div class="flex items-center gap-2">
			<button
				type="button"
				class="btn min-h-11 variant-ghost"
				disabled={page <= 1}
				onclick={() => onpage(page - 1)}
			>
				<Fa icon={faChevronLeft} />
				<span>{m.PAGINATION_PREVIOUS()}</span>
			</button>
			<span class="text-sm whitespace-nowrap">{m.PAGINATION_PAGE({ page, pages })}</span>
			<button
				type="button"
				class="btn min-h-11 variant-ghost"
				disabled={page >= pages}
				onclick={() => onpage(page + 1)}
			>
				<span>{m.PAGINATION_NEXT()}</span>
				<Fa icon={faChevronRight} />
			</button>
		</div>
	</nav>
{/if}

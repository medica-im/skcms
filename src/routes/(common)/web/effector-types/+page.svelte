<script lang="ts">
	import { page } from '$app/state';
	import CreateEffectorTypeModal from '$lib/EffectorType/EffectorTypeModal.svelte';
	import CreateEffectorType from '$routes/(common)/web/effector-types/create/+page.svelte';
	import EditEffectorTypeModal from '$lib/EffectorType/EditEffectorTypeModal.svelte';
	import DeleteEffectorTypeModal from '$lib/EffectorType/DeleteEffectorTypeModal.svelte';
	import EffectorTypeRow from '$lib/EffectorType/EffectorTypeRow.svelte';
	import { preloadData, pushState, goto } from '$app/navigation';
	import { faPlus } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import * as m from '$msgs';
	import { normalize } from '$lib/helpers/stringHelpers.ts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let effectorTypes = $derived(data.effectorTypes);
	let searchTerm = $state('');
	let filteredEffectorTypes = $derived.by(() => {
		if (!searchTerm.trim()) return effectorTypes;
		const term = normalize(searchTerm);
		return effectorTypes?.filter((et) =>
			normalize(et.name_fr).includes(term) ||
			normalize(et.label_fr).includes(term) ||
			et.synonyms_fr?.some(s => normalize(s).includes(term))
		);
	});
	let editModal: EditEffectorTypeModal;
	let deleteModal: DeleteEffectorTypeModal;
	let createOpen: boolean = $state(false);
</script>

<div class="container mx-auto p-4">
	<header class="mb-6 flex justify-between items-center">
		<div>
			<h1 class="h1 mb-2">{m.EFFECTOR_TYPE_TITLE()}</h1>
			<p class="text-surface-600">
				{filteredEffectorTypes?.length ?? 0} type{(filteredEffectorTypes?.length ?? 0) > 1 ? 's' : ''}
			</p>
		</div>
		<a
			href="/web/effector-types/create"
			onclick={async (e) => {
				if (e.shiftKey || e.metaKey || e.ctrlKey) return;
				e.preventDefault();
				const { href } = e.currentTarget;
				const result = await preloadData(href);
				if (result.type === 'loaded' && result.status === 200) {
					createOpen = true;
					pushState(href, { selected: result.data });
				} else {
					goto(href);
				}
			}}
		>
			<button class="btn variant-filled-primary" title={m.EFFECTOR_TYPE_CREATE()}>
				<span><Fa icon={faPlus} /></span>
				<span class="hidden lg:block">{m.EFFECTOR_TYPE_CREATE()}</span>
			</button>
		</a>
	</header>

	<!-- Search -->
	<div class="mb-4 max-w-sm">
		<input
			type="search"
			class="input"
			placeholder="{m.EFFECTOR_TYPE_COL_NAME()} / {m.EFFECTOR_TYPE_COL_LABEL()} / {m.EFFECTOR_TYPE_COL_SYNONYMS()}..."
			bind:value={searchTerm}
		/>
	</div>

	<!-- Column Headers (large screens only) -->
	<div class="hidden lg:grid lg:grid-cols-[1fr_1fr_1.5fr_1fr_72px] lg:items-center lg:gap-4 px-3 pb-2 text-sm font-semibold text-surface-500">
		<span>{m.EFFECTOR_TYPE_COL_NAME()}</span>
		<span>{m.EFFECTOR_TYPE_COL_LABEL()}</span>
		<span>{m.EFFECTOR_TYPE_COL_SYNONYMS()}</span>
		<span>{m.EFFECTOR_TYPE_COL_PARENT()}</span>
		<span class="text-center">{m.EFFECTOR_TYPE_COL_ACTIONS()}</span>
	</div>

	<div class="grid grid-cols-1 gap-2">
		{#each filteredEffectorTypes ?? [] as effectorType (effectorType.uid)}
			<EffectorTypeRow
				{effectorType}
				onEdit={(et) => editModal.handleEdit(et)}
				onDelete={(et) => deleteModal.handleDelete(et)}
			/>
		{/each}
	</div>
</div>

{#if createOpen}
	<CreateEffectorTypeModal onresult={() => {}} title={m.EFFECTOR_TYPE_CREATE()}>
		<CreateEffectorType data={page.state.selected ?? data} onclose={() => {
			createOpen = false;
			history.back();
		}} />
	</CreateEffectorTypeModal>
{/if}

<EditEffectorTypeModal bind:this={editModal} />
<DeleteEffectorTypeModal bind:this={deleteModal} />

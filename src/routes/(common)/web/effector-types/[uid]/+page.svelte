<script lang="ts">
	import { page } from '$app/state';
	import EditEffectorTypeModal from '$lib/EffectorType/EditEffectorTypeModal.svelte';
	import DeleteEffectorTypeModal from '$lib/EffectorType/DeleteEffectorTypeModal.svelte';
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faPenToSquare, faTrash, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
	import meshLogo from '$lib/assets/images/meshLogo.jpg';
	import UuidHex from '$lib/Uuid/UuidHex.svelte';
	import type { EffectorType } from '$lib/interfaces/v2/effector';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let et: EffectorType = $derived(data.effectorType);

	let editModal: EditEffectorTypeModal;
	let deleteModal: DeleteEffectorTypeModal;
</script>

<div class="max-w-screen-lg mx-auto p-4">
	<!-- Back link -->
	<a href="/web/effector-types" class="btn btn-sm variant-ghost-surface mb-4">
		<Fa icon={faArrowLeft} class="mr-2" />
		{m.EFFECTOR_TYPE_TITLE()}
	</a>

	<div class="card p-6 variant-ghost">
		<!-- Header -->
		<header class="flex justify-between items-start mb-6">
			<h1 class="h2">{et.name_fr}</h1>
			<div class="flex gap-2">
				<button onclick={() => editModal.handleEdit(et)} class="btn btn-sm variant-ghost-secondary">
					<Fa icon={faPenToSquare} class="mr-1" />
					{m.EDIT()}
				</button>
				<button onclick={() => deleteModal.handleDelete(et)} class="btn btn-sm variant-ghost-error">
					<Fa icon={faTrash} class="mr-1" />
					{m.DELETE()}
				</button>
			</div>
		</header>

		<!-- Fields grid -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-4">
			<!-- UID -->
			<div class="lg:col-span-2">
				<dt class="text-sm font-semibold text-surface-500">UID</dt>
				<dd class="font-mono text-sm flex items-center gap-2">{et.uid} <UuidHex data={et.uid} /></dd>
			</div>

			<!-- Name -->
			<div>
				<dt class="text-sm font-semibold text-surface-500">{m.EFFECTOR_TYPE_COL_NAME()} [Fr]</dt>
				<dd>{et.name_fr}</dd>
			</div>
			<div>
				<dt class="text-sm font-semibold text-surface-500">{m.EFFECTOR_TYPE_COL_NAME()} [En]</dt>
				<dd class="text-surface-600">{et.name_en || '—'}</dd>
			</div>

			<!-- Label -->
			<div>
				<dt class="text-sm font-semibold text-surface-500">{m.EFFECTOR_TYPE_COL_LABEL()} [Fr]</dt>
				<dd>{et.label_fr}</dd>
			</div>
			<div>
				<dt class="text-sm font-semibold text-surface-500">{m.EFFECTOR_TYPE_COL_LABEL()} [En]</dt>
				<dd class="text-surface-600">{et.label_en || '—'}</dd>
			</div>

			<!-- Slug -->
			<div>
				<dt class="text-sm font-semibold text-surface-500">{m.EFFECTOR_TYPE_SLUG()} [Fr]</dt>
				<dd class="font-mono text-sm">{et.slug_fr || '—'}</dd>
			</div>
			<div>
				<dt class="text-sm font-semibold text-surface-500">{m.EFFECTOR_TYPE_SLUG()} [En]</dt>
				<dd class="font-mono text-sm text-surface-600">{et.slug_en || '—'}</dd>
			</div>

			<!-- Definition -->
			<div>
				<dt class="text-sm font-semibold text-surface-500">{m.EFFECTOR_TYPE_DEFINITION()} [Fr]</dt>
				<dd>{et.definition_fr || '—'}</dd>
			</div>
			<div>
				<dt class="text-sm font-semibold text-surface-500">{m.EFFECTOR_TYPE_DEFINITION()} [En]</dt>
				<dd class="text-surface-600">{et.definition_en || '—'}</dd>
			</div>

			<!-- Synonyms -->
			<div>
				<dt class="text-sm font-semibold text-surface-500">{m.EFFECTOR_TYPE_COL_SYNONYMS()} [Fr]</dt>
				<dd>{et.synonyms_fr?.join(', ') || '—'}</dd>
			</div>
			<div>
				<dt class="text-sm font-semibold text-surface-500">{m.EFFECTOR_TYPE_COL_SYNONYMS()} [En]</dt>
				<dd class="text-surface-600">{et.synonyms_en?.join(', ') || '—'}</dd>
			</div>

			<!-- Parent -->
			<div>
				<dt class="text-sm font-semibold text-surface-500">{m.EFFECTOR_TYPE_COL_PARENT()}</dt>
				<dd>
					{#if et.effector_type_uid && et.effector_type_label_fr}
						<a href="/web/effector-types/{et.effector_type_uid}" class="anchor">
							{et.effector_type_label_fr}
						</a>
					{:else}
						<span class="text-surface-400">{m.EFFECTOR_TYPE_NO_PARENT()}</span>
					{/if}
				</dd>
			</div>

			<!-- Labels -->
			<div>
				<dt class="text-sm font-semibold text-surface-500">{m.EFFECTOR_TYPE_COL_LABELS()}</dt>
				<dd class="flex gap-2 mt-1">
					<span class="badge variant-filled-surface px-2 py-0.5 text-xs font-medium">EffectorType</span>
					{#if et.isHCW}
						<span class="badge variant-filled-tertiary px-2 py-0.5 text-xs font-medium">HCW</span>
					{/if}
					{#if et.isRPPS}
						<span class="badge variant-filled-warning px-2 py-0.5 text-xs font-medium">RPPS</span>
					{/if}
				</dd>
			</div>
		</div>

		<!-- HCW Section -->
		{#if et.isHCW}
			<hr class="my-6" />
			<h3 class="h4 mb-4">HCW</h3>
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-x-10 gap-y-4">
				<div>
					<dt class="text-sm font-semibold text-surface-500">{m.EFFECTOR_TYPE_MESH_UNIQUE_ID()}</dt>
					<dd class="flex items-center gap-2">
						{#if et.unique_ID}
							<span class="font-mono text-sm">{et.unique_ID}</span>
							<a
								href="https://meshb.nlm.nih.gov/record/ui?ui={et.unique_ID}"
								target="_blank"
								rel="noopener noreferrer"
								class="btn btn-sm variant-ghost-surface p-1"
								title="MeSH"
							>
								<img src={meshLogo} alt="MeSH" class="h-5 w-auto" />
							</a>
						{:else}
							<span class="text-surface-400">—</span>
						{/if}
					</dd>
				</div>
				<div>
					<dt class="text-sm font-semibold text-surface-500">{m.EFFECTOR_TYPE_CONCEPT()} [Fr]</dt>
					<dd>{et.concept_fr || '—'}</dd>
				</div>
				<div>
					<dt class="text-sm font-semibold text-surface-500">{m.EFFECTOR_TYPE_CONCEPT()} [En]</dt>
					<dd class="text-surface-600">{et.concept_en || '—'}</dd>
				</div>
			</div>
		{/if}
	</div>
</div>

<EditEffectorTypeModal bind:this={editModal} />
<DeleteEffectorTypeModal bind:this={deleteModal} />

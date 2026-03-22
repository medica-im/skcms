<script lang="ts">
	import type { EffectorType } from '$lib/interfaces/v2/effector';
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faPenToSquare, faTrash } from '@fortawesome/free-solid-svg-icons';

	let { effectorType, onEdit, onDelete }: {
		effectorType: EffectorType;
		onEdit?: (effectorType: EffectorType) => void;
		onDelete?: (effectorType: EffectorType) => void;
	} = $props();
</script>

<div
	id={effectorType.uid}
	class="card variant-ghost p-3 flex flex-col gap-3 lg:grid lg:grid-cols-[1fr_1fr_1.5fr_1fr_72px] lg:items-center lg:gap-4 hover:variant-soft transition-colors"
>
	<!-- Name -->
	<span class="font-semibold truncate">
		<span class="lg:hidden text-sm text-surface-500">{m.EFFECTOR_TYPE_COL_NAME()}: </span>
		{effectorType.name_fr}
	</span>

	<!-- Label -->
	<span class="truncate">
		<span class="lg:hidden text-sm text-surface-500">{m.EFFECTOR_TYPE_COL_LABEL()}: </span>
		{effectorType.label_fr}
	</span>

	<!-- Synonyms -->
	<span class="text-sm text-surface-600">
		<span class="lg:hidden text-surface-500">{m.EFFECTOR_TYPE_COL_SYNONYMS()}: </span>
		{effectorType.synonyms_fr?.join(', ') || '—'}
	</span>

	<!-- Parent -->
	<span class="text-sm">
		<span class="lg:hidden text-surface-500">{m.EFFECTOR_TYPE_COL_PARENT()}: </span>
		{#if effectorType.effector_type_uid && effectorType.effector_type_label_fr}
			<a
				href="#{effectorType.effector_type_uid}"
				class="anchor"
			>
				{effectorType.effector_type_label_fr}
			</a>
		{:else}
			<span class="text-surface-400">—</span>
		{/if}
	</span>

	<!-- Actions -->
	<div class="flex items-center gap-1 lg:justify-center">
		<button onclick={() => onEdit?.(effectorType)} class="btn-icon btn-icon-sm variant-ghost-secondary">
			<Fa icon={faPenToSquare} />
		</button>
		<button onclick={() => onDelete?.(effectorType)} class="btn-icon btn-icon-sm variant-ghost-error">
			<Fa icon={faTrash} />
		</button>
	</div>
</div>

<script lang="ts">
	import { updateEffectorType } from '$src/effectorType.remote.ts';
	import { disconnectEffectorTypeParent } from '$src/effectorType.remote.ts';
	import { goto } from '$app/navigation';
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faCheck, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
	import Select from 'svelte-select';
	import NoOptions from '$lib/Web/NoOptions.svelte';
	import type { EffectorType } from '$lib/interfaces/v2/effector';

	interface Props {
		data: {
			effectorTypes?: EffectorType[];
			effectorType: EffectorType;
		};
	}

	let { data }: Props = $props();
	let effectorType = $derived(data.effectorType);
	let result = $derived(updateEffectorType.for(effectorType.uid)?.result);

	let allEffectorTypes: EffectorType[] = $derived(data.effectorTypes ?? []);
	let parentOptions = $derived(
		allEffectorTypes
			.filter((et) => et.uid !== effectorType.uid)
			.map((et) => ({ value: et.uid, label: et.label_fr }))
	);

	let name_fr = $state(data.effectorType?.name_fr || '');
	let label_fr = $state(data.effectorType?.label_fr || '');
	let slug_fr = $state(data.effectorType?.slug_fr || '');
	let definition_fr = $state(data.effectorType?.definition_fr || '');
	let synonyms_fr = $state(data.effectorType?.synonyms_fr?.join(', ') || '');
	let selectedParent: { value: string; label: string } | undefined = $state(
		data.effectorType?.effector_type_uid
			? { value: data.effectorType.effector_type_uid, label: data.effectorType.effector_type_label_fr || '' }
			: undefined
	);

	let originalParentUid = data.effectorType?.effector_type_uid;
	let isHCW = $state(data.effectorType?.isHCW ?? false);
	let isRPPS = $state(data.effectorType?.isRPPS ?? false);
	let unique_ID = $state(data.effectorType?.unique_ID || '');
	let concept_en = $state(data.effectorType?.concept_en || '');
	let concept_fr = $state(data.effectorType?.concept_fr || '');

	let hasChanges = $derived(
		name_fr !== (data.effectorType?.name_fr || '') ||
		label_fr !== (data.effectorType?.label_fr || '') ||
		slug_fr !== (data.effectorType?.slug_fr || '') ||
		definition_fr !== (data.effectorType?.definition_fr || '') ||
		synonyms_fr !== (data.effectorType?.synonyms_fr?.join(', ') || '') ||
		(selectedParent?.value ?? '') !== (data.effectorType?.effector_type_uid ?? '') ||
		isHCW !== (data.effectorType?.isHCW ?? false) ||
		isRPPS !== (data.effectorType?.isRPPS ?? false) ||
		unique_ID !== (data.effectorType?.unique_ID || '') ||
		concept_en !== (data.effectorType?.concept_en || '') ||
		concept_fr !== (data.effectorType?.concept_fr || '')
	);

	function toggleHCW() {
		isHCW = !isHCW;
		if (!isHCW) isRPPS = false;
	}

	function toggleRPPS() {
		if (!isHCW) return;
		isRPPS = !isRPPS;
	}

	const disabled = $derived(
		!name_fr || !label_fr || !slug_fr ||
		!hasChanges ||
		Boolean(updateEffectorType.for(effectorType.uid).pending) ||
		result?.success
	);

	async function handleSubmit() {
		if (!selectedParent && originalParentUid) {
			await disconnectEffectorTypeParent({ uid: effectorType.uid });
		}
	}


</script>

<div class="grid grid-cols-1 rounded-lg h-full w-full p-4 items-center gap-4">
	<div class="place-items-center">
		<h3 class="h3">{m.EFFECTOR_TYPE_EDIT()}</h3>
	</div>

	<form
		{...updateEffectorType.for(effectorType.uid)}
		onsubmit={handleSubmit}
		class="grid grid-cols-1 gap-4 w-full"
	>
		<input type="hidden" name="uid" value={effectorType.uid} />
		<input type="hidden" name="effector_type_uid" value={selectedParent?.value ?? ''} />

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-10">
			<!-- Left column -->
			<div class="grid grid-cols-1 gap-4">
				<!-- Name -->
				<label class="label">
					<span>{m.EFFECTOR_TYPE_COL_NAME()} *</span>
					<input type="text" name="name_fr" bind:value={name_fr} class="input" required />
				</label>

				<!-- Label -->
				<label class="label">
					<span>{m.EFFECTOR_TYPE_COL_LABEL()} *</span>
					<input type="text" name="label_fr" bind:value={label_fr} class="input" required />
				</label>

				<!-- Slug -->
				<label class="label">
					<span>{m.EFFECTOR_TYPE_SLUG()} *</span>
					<input type="text" name="slug_fr" bind:value={slug_fr} class="input" required />
				</label>

				<!-- Synonyms -->
				<label class="label">
					<span>{m.EFFECTOR_TYPE_COL_SYNONYMS()}</span>
					<input name="synonyms_fr" type="text" bind:value={synonyms_fr} class="input" placeholder="synonyme1, synonyme2, ..." />
				</label>
			</div>

			<!-- Right column -->
			<div class="grid grid-cols-1 gap-4">
				<!-- Definition -->
				<label class="label">
					<span>{m.EFFECTOR_TYPE_DEFINITION()}</span>
					<textarea name="definition_fr" bind:value={definition_fr} class="textarea" rows="3"></textarea>
				</label>

				<!-- Parent -->
				<div class="grid grid-cols-1 gap-2">
					<label class="label">
						<span>{m.EFFECTOR_TYPE_COL_PARENT()}</span>
					</label>
					<div class="svelte-select svelte-select-glow w-full">
						<Select
							items={parentOptions}
							bind:value={selectedParent}
							placeholder={m.EFFECTOR_TYPE_PARENT_PLACEHOLDER()}
							clearable={true}
						><NoOptions slot="empty" /></Select>
					</div>
				</div>

				<!-- Neo4j Labels -->
				<div class="grid grid-cols-1 gap-2">
					<span class="label">Labels</span>
					<input type="hidden" name="isHCW" value={String(isHCW)} />
					<input type="hidden" name="isRPPS" value={String(isRPPS)} />
					<div class="flex gap-2 flex-wrap">
						<span class="chip variant-filled-surface cursor-default opacity-75">EffectorType</span>
						<button
							type="button"
							class="chip {isHCW ? 'variant-filled-primary' : 'variant-ghost-surface'}"
							onclick={toggleHCW}
						>HCW</button>
						<button
							type="button"
							class="chip {isRPPS ? 'variant-filled-primary' : 'variant-ghost-surface'} {!isHCW ? 'opacity-40 cursor-not-allowed' : ''}"
							onclick={toggleRPPS}
							disabled={!isHCW}
						>RPPS</button>
					</div>
				</div>
			</div>
		</div>

		<!-- HCW fields -->
		{#if isHCW}
			<input type="hidden" name="unique_ID" value={unique_ID} />
			<input type="hidden" name="concept_en" value={concept_en} />
			<input type="hidden" name="concept_fr" value={concept_fr} />
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
				<label class="label">
					<span>{m.EFFECTOR_TYPE_MESH_UNIQUE_ID()}</span>
					<input type="text" bind:value={unique_ID} class="input" />
				</label>
				<label class="label">
					<span>{m.EFFECTOR_TYPE_CONCEPT()} [Fr]</span>
					<input type="text" bind:value={concept_fr} class="input" />
				</label>
				<label class="label">
					<span>{m.EFFECTOR_TYPE_CONCEPT()} [En]</span>
					<input type="text" bind:value={concept_en} class="input" />
				</label>
			</div>
		{/if}

		<!-- Submit -->
		<div class="flex gap-8">
			<div class="flex gap-2 items-center">
				{#if result?.success === true}
					<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
				{:else if result?.success === false}
					<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span>
					<span class="text-base">{result?.text}</span>
					<span class="text-base">{result?.data?.message}</span>
				{/if}
			</div>
			<div class="w-auto justify-center">
				<button type="submit" class="btn variant-filled-primary w-min" {disabled}>
					{updateEffectorType.for(effectorType.uid).pending ? m.LOADING() : m.EFFECTOR_TYPE_EDIT()}
				</button>
			</div>
			<div class="w-auto justify-center">
				<button
					type="button"
					class="variant-filled-error btn w-min"
					onclick={() => goto('/web/effector-types')}
				>
					{#if result?.success}{m.CLOSE()}{:else}{m.CANCEL()}{/if}
				</button>
			</div>
		</div>
	</form>
</div>

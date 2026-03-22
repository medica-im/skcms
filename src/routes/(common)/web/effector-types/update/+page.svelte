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

	const disabled = $derived(
		!name_fr || !label_fr || !slug_fr ||
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
		class="grid grid-cols-1 gap-4 w-full max-w-xl"
	>
		<input type="hidden" name="uid" value={effectorType.uid} />
		<input type="hidden" name="effector_type_uid" value={selectedParent?.value ?? ''} />

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

		<!-- Definition -->
		<label class="label">
			<span>{m.EFFECTOR_TYPE_DEFINITION()}</span>
			<textarea name="definition_fr" bind:value={definition_fr} class="textarea" rows="3"></textarea>
		</label>

		<!-- Synonyms -->
		<label class="label">
			<span>{m.EFFECTOR_TYPE_COL_SYNONYMS()}</span>
			<input name="synonyms_fr" type="text" bind:value={synonyms_fr} class="input" placeholder="synonyme1, synonyme2, ..." />
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
					{#if result?.success}{m.CANCEL()}{:else}{m.CANCEL()}{/if}
				</button>
			</div>
		</div>
	</form>
</div>

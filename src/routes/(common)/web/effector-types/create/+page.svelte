<script lang="ts">
	import { createEffectorType } from '$src/effectorType.remote.ts';
	import { goto } from '$app/navigation';
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faCheck, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
	import Select from 'svelte-select';
	import NoOptions from '$lib/Web/NoOptions.svelte';
	import type { EffectorType } from '$lib/interfaces/v2/effector';

	let { data, onclose }: { data: any; onclose?: () => void } = $props();

	const formKey = crypto.randomUUID();
	let result = $derived(createEffectorType.for(formKey)?.result);

	let effectorTypes: EffectorType[] = $derived(data.effectorTypes ?? []);
	let parentOptions = $derived(
		effectorTypes.map((et) => ({ value: et.uid, label: et.label_fr }))
	);

	let name_fr = $state('');
	let label_fr = $state('');
	let slug_fr = $state('');
	let definition_fr = $state('');
	let synonyms_fr = $state('');
	let selectedParent: { value: string; label: string } | undefined = $state();
	let isHCW = $state(false);
	let isRPPS = $state(false);
	let unique_ID = $state('');
	let concept_en = $state('');
	let concept_fr = $state('');

	function toggleHCW() {
		isHCW = !isHCW;
		if (!isHCW) isRPPS = false;
	}

	function toggleRPPS() {
		if (!isHCW) return;
		isRPPS = !isRPPS;
	}

	const disabled = $derived(
		!name_fr || !label_fr || !slug_fr || Boolean(createEffectorType.for(formKey).pending)
	);
</script>

<div class="grid grid-cols-1 rounded-lg h-full w-full p-4 items-center gap-4">
	<div class="place-items-center">
		<h3 class="h3">{m.EFFECTOR_TYPE_CREATE()}</h3>
	</div>

	<form
		{...createEffectorType.for(formKey)}
		class="grid grid-cols-1 gap-4 w-full max-w-xl"
	>
		<!-- Hidden parent field -->
		<input type="hidden" name="effector_type_uid" value={selectedParent?.value ?? ''} />

		<!-- Name -->
		<label class="label">
			<span>{m.EFFECTOR_TYPE_COL_NAME()} *</span>
			<input
				{...createEffectorType.for(formKey).fields.name_fr.as('text')}
				bind:value={name_fr}
				class="input"
				required
			/>
			{#each createEffectorType.for(formKey).fields.name_fr.issues() as iss}
				<p class="text-error-500 text-sm">{iss.message}</p>
			{/each}
		</label>

		<!-- Label -->
		<label class="label">
			<span>{m.EFFECTOR_TYPE_COL_LABEL()} *</span>
			<input
				{...createEffectorType.for(formKey).fields.label_fr.as('text')}
				bind:value={label_fr}
				class="input"
				required
			/>
			{#each createEffectorType.for(formKey).fields.label_fr.issues() as iss}
				<p class="text-error-500 text-sm">{iss.message}</p>
			{/each}
		</label>

		<!-- Slug -->
		<label class="label">
			<span>{m.EFFECTOR_TYPE_SLUG()} *</span>
			<input
				{...createEffectorType.for(formKey).fields.slug_fr.as('text')}
				bind:value={slug_fr}
				class="input"
				required
			/>
			{#each createEffectorType.for(formKey).fields.slug_fr.issues() as iss}
				<p class="text-error-500 text-sm">{iss.message}</p>
			{/each}
		</label>

		<!-- Definition -->
		<label class="label">
			<span>{m.EFFECTOR_TYPE_DEFINITION()}</span>
			<textarea
				name="definition_fr"
				bind:value={definition_fr}
				class="textarea"
				rows="3"
			></textarea>
		</label>

		<!-- Synonyms -->
		<label class="label">
			<span>{m.EFFECTOR_TYPE_COL_SYNONYMS()}</span>
			<input
				name="synonyms_fr"
				type="text"
				bind:value={synonyms_fr}
				class="input"
				placeholder="synonyme1, synonyme2, ..."
			/>
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

		<!-- HCW fields -->
		{#if isHCW}
			<input type="hidden" name="unique_ID" value={unique_ID} />
			<input type="hidden" name="concept_en" value={concept_en} />
			<input type="hidden" name="concept_fr" value={concept_fr} />
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
		{/if}

		<!-- Submit -->
		<div class="flex flex-wrap gap-8 justify-end">
			<div class="flex gap-2 items-center">
				{#if result?.success && !name_fr}
					<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
				{:else if result?.success === false}
					<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span>
					<span class="text-base">{result?.response?.detail || result?.text}</span>
				{/if}
				{#each createEffectorType.for(formKey).fields.allIssues() as iss}
					<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span>
					<span class="text-base">{iss.message}</span>
				{/each}
			</div>
			<div class="w-auto justify-center">
				<button type="submit" class="btn variant-filled-primary w-min" {disabled}>
					{createEffectorType.for(formKey).pending ? m.LOADING() : m.EFFECTOR_TYPE_CREATE()}
				</button>
			</div>
			<div class="w-auto justify-center">
				<button
					type="button"
					class="variant-filled-error btn w-min"
					onclick={() => {
						if (onclose) onclose();
						else goto('/web/effector-types');
					}}
				>{#if result?.success}{m.CANCEL()}{:else}{m.CANCEL()}{/if}</button>
			</div>
		</div>
	</form>
</div>

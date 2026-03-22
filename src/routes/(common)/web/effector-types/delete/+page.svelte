<script lang="ts">
	import { deleteEffectorType } from '$src/effectorType.remote.ts';
	import { goto } from '$app/navigation';
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faCheck, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
	import type { EffectorType } from '$lib/interfaces/v2/effector';

	interface Props {
		data: {
			effectorType: EffectorType;
		};
	}

	let { data }: Props = $props();
	let effectorType = $derived(data.effectorType);
	let result = $derived(deleteEffectorType.for(effectorType.uid)?.result);

	const disabled = $derived(
		Boolean(deleteEffectorType.for(effectorType.uid).pending) || result?.success
	);
</script>

<div class="grid grid-cols-1 rounded-lg h-full w-full p-4 items-center gap-4">
	<div class="place-items-center">
		<h3 class="h3">{m.EFFECTOR_TYPE_DELETE()}</h3>
		<p>{m.EFFECTOR_TYPE_DELETE_CONFIRM()} <strong>{effectorType.label_fr}</strong> ?</p>
	</div>

	<form
		{...deleteEffectorType.for(effectorType.uid)}
		class="grid grid-cols-1 gap-4 w-full max-w-xl"
	>
		<input type="hidden" name="uid" value={effectorType.uid} />

		<!-- Submit -->
		<div class="flex gap-8">
			<div class="flex gap-2 items-center">
				{#if result?.success === true}
					<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
				{:else if result?.success === false}
					<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span>
					<span class="text-base">{result?.text}</span>
				{/if}
			</div>
			<div class="w-auto justify-center">
				<button type="submit" class="btn variant-filled-error w-min" {disabled}>
					{deleteEffectorType.for(effectorType.uid).pending ? m.LOADING() : m.EFFECTOR_TYPE_DELETE()}
				</button>
			</div>
			<div class="w-auto justify-center">
				<button
					type="button"
					class="variant-filled-surface btn w-min"
					onclick={() => goto('/web/effector-types')}
				>
					{#if result?.success}{m.CANCEL()}{:else}{m.CANCEL()}{/if}
				</button>
			</div>
		</div>
	</form>
</div>

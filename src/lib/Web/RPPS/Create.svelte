<script lang="ts">
	import { onMount } from 'svelte';
	import * as m from '$msgs';
	import { patchCommand } from '../../../effector.remote';
	import { invalidate } from '$app/navigation';
	import {
		faPlus,
		faCheck,
		faWindowClose,
		faPenToSquare,
		faExclamationCircle,
		faTrashCanArrowUp
	} from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import { JsonView } from '@zerodevx/svelte-json-view';
	import type { Email } from '$lib/interfaces/email.interface.ts';
	import Select from 'svelte-select';
	import Dialog from '../Dialog.svelte';
	import { getEffectorUid } from '$lib/components/Directory/context';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import { validate } from '$lib/Web/RPPS/validate.ts';
	import type { Validation } from '$lib/Web/RPPS/validate.ts';

	import type { FormResult } from '$lib/interfaces/v2/form';

	let res = $state();

	const uid = getEffectorUid();

	let dialog: HTMLDialogElement;

	let result: FormResult | undefined = $state();
	let rpps: number | null = $state(null);
	let commandData = $derived({
		effector: uid,
		rpps: rpps ? rpps : null
	});
	let validation: Validation|undefined = $state();
	let disabled: boolean = $derived(!!patchCommand.pending || !Boolean(rpps));

	onMount(async () => {
		rpps = null;
	});
</script>

<button
	onclick={async () => {
		result = undefined;
		rpps = null;
		dialog.showModal();
	}}
	class="btn-icon btn-icon-sm variant-ghost-surface"
	title="Créer"><Fa icon={faPlus} /></button
>

<Dialog bind:dialog>
	<div class="rounded-lg h-96 w-96 p-4 variant-ghost-secondary items-center place-items-center">
		<!--div class="text-wrap p-2">
		<p class="text-sm">{JSON.stringify(selectedLocation?.value)}</p>
		<div class="wrap">
		<JsonView json={commandData} />
		</div>
		</div-->
		<div class="grid grid-cols-1 item-center place-items-center gap-6 w-full">
			<h3 class="h3">RPPS</h3>
			<label class="flex label place-self-start place-items-center space-x-2 w-full">
				<span>RPPS</span>
				<input
					oninput={() => {validation=undefined}}
					class="input {validation?.success==false ? 'input-error' : ''}"
					name="rpps"
					inputmode="numeric"
					placeholder=""
					bind:value={rpps}
				/>
				</label>
				{#if validation?.message}
				<p>{validation.message}</p>
				{/if}
			<div class="flex w-full items-center">
				<div class="w-1/3">
					{#if result?.success}
						<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
					{:else if result && !result?.success}
						<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span
						>{result.text}
					{/if}
				</div>
				<div class="w-2/3">
					<div class="flex gap-2">
						<button
							onclick={async () => {
								if (rpps) {
									validation = validate(rpps);
								}
								try {
									result = await patchCommand(commandData);
									if (result?.success) {
										disabled = true;
										invalidate('entry:now');
									}
								} catch (error) {
									console.error(`error:${error}`);
									console.error(JSON.stringify(result));
								}
							}}
							type="submit"
							class="variant-filled-secondary btn w-min"
							{disabled}>Envoyer</button
						>
						<button
							type="button"
							class="variant-filled-error btn w-min"
							onclick={() => {
								dialog.close();
							}}
							>{#if result?.success || disabled}Fermer{:else}Annuler{/if}</button
						>
					</div>
				</div>
			</div>
		</div>
	</div>
</Dialog>

<style lang="postcss">
	.wrap {
		font-family: monospace;
		font-size: 8px;
		--jsonBorderLeft: 2px dashed red;
		--jsonValColor: blue;
	}
</style>
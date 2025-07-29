<script lang="ts">
    	import { invalidate, invalidateAll } from '$app/navigation';
    import {
		faCheck,
	} from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
    import { enhance, applyAction } from '$app/forms';
    import type { Phone } from '$lib/interfaces/phone.interface.ts';
    import Select from 'svelte-select';
	import type { SelectType } from '$lib/interfaces/select.ts';
    let { data } : { data: Phone} = $props();


    const types = {
        'M':'Mobile',
        'MW': 'Mobile Work',
        'W': 'Work',
        'F': 'Fax',
        'S': 'Skype',
        'AS': 'Answering service'
    };
    const getItems = () => {
        const items = [];
        for (const [key, value] of Object.entries(types)) {
            items.push({label: value, value: key})
        };
        return items
    };
    let success: boolean = $state(false);
    let _id: string|undefined = $state(data.id.toString());
    let _type: string|undefined = $state(data.type);
    let _phone: string|undefined = $state(data.phone);
    let selectedType: SelectType|undefined = $state({label: types[data.type], value: data.type});
    let disabled: boolean = $derived(selectedType.value==data.type && _phone==data.phone);
</script>

<div class="rounded-lg p-4 variant-ghost-secondary gap-2 items-center place-items-center">
		<form
			method="POST"
			action="/web/phone/update"
			use:enhance={({ formElement, formData, action, cancel }) => {
				//manipulateForm(formData);
				return async ({ result, update }) => {
					console.log(`result.type: ${result.type}`);
					await applyAction(result);
					console.log(`result:${JSON.stringify(result)}`);
                    if (result.type==='success') {
						success=true;
                        invalidateAll();
					};
				};
			}}
			class=""
		>
			<div class="p-2 space-y-4 justify-items-stretch gap-6">
				<div class="p-2 space-y-2 w-full">
					<label class="flex label place-self-start place-items-center space-x-2 w-full">
						<span>ID</span>
						<input
							oninput={() => {}}
							class="input hidden"
							name="id"
							type="text"
							placeholder=""
							bind:value={_id}
						/>
                        <div class="badge variant-ghost-surface">{data.id}</div>
					</label>
					<label class="flex label place-self-start place-items-center space-x-2 w-full">
						<span>Téléphone:</span>
						<input
							oninput={() => {}}
							class="input"
							name="phone"
							type="text"
							placeholder=""
							bind:value={_phone}
						/>
					</label>
					<label class="flex label place-self-start place-items-center space-x-2 w-full">
						<span>Type:</span>
						<input
							oninput={() => {}}
							class="input hidden"
							name="type"
							type="text"
							placeholder=""
							bind:value={_type}
						/>
                        <Select items={getItems()} bind:value={selectedType} />

					</label>
				</div>
			</div>
			<div class="flex gap-8">
			<div class="w-auto justify-center">
					<button type="submit" class="variant-filled-secondary btn w-min" {disabled}
						>Envoyer</button
					>
            </div>
            <div>
                    {#if success}<span class="badge-icon variant-filled-success"><Fa icon={faCheck}/></span>{/if}
				</div>
				<!--div class="w-auto justify-center">
					<button type="button" class="variant-filled-error btn w-min" onclick={()=>{showEntryCreationForm=false}}
						>Annuler</button
					>
				</div-->
			</div>
		</form>
	</div>
<script lang="ts">
	import { page } from '$app/state';
	import { validateIsMember } from '$lib/Web/Effector/validate.ts';

	interface InputClass {
		isMember: string;
	}
	interface ValidateForm {
		isMember: boolean;
	}
	interface IsRequired {
		isMember: boolean
	}
	let {
		inputClass = $bindable(),
		isMember = $bindable(),
		validateForm = $bindable(),
		isRequired
	} : {
		inputClass: InputClass;
		isMember: boolean | undefined;
		validateForm: ValidateForm;
		isRequired: IsRequired;
	} = $props();

	let orgRadio: string | undefined = $state();
	let arr = [
		{ label: 'Oui', value: 'yes', data: true },
		{ label: 'Non', value: 'no', data: false }
	];
	const onInput = (data: boolean) => {
		console.log("oninput", data);
		isMember = data;
		validateIsMember(data, inputClass, isRequired, validateForm);
	}
</script>

<div class="py-2 space-y-2">
	<div>
		Cette personne est-elle membre de {page.data.organization.formatted_name}?
	</div>
	<div class="flex items-center space-x-4">
		{#each arr as row}
			<label class="flex items-center space-x-2">
				<input
					class="radio {inputClass.isMember}"
					type="radio"
					value={row.value}
					bind:group={orgRadio}
					onchange={()=>onInput(row.data)}
				/>
				<p>{row.label}</p>
			</label>
		{/each}
	</div>
</div>

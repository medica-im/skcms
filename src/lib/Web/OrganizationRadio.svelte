<script lang="ts">
	import { page } from '$app/state';

	let {
		inputClass,
		data = $bindable()
	}: { inputClass: string; data: boolean | undefined } = $props();
	
	let orgRadio: string | undefined = $state();

	$effect(() => {
		if (orgRadio == 'yes') {
			data = true;
		} else if (orgRadio == 'no') {
			data = false;
		} else {
			data = undefined;
		}
	});
</script>

<div class="py-2 space-y-2">
	<div>
		Cette personne est-elle membre de {page.data.organization.formatted_name}?
	</div>
	<div class="flex items-center space-x-4">
		<label class="flex items-center space-x-2">
			<input
				class="radio {inputClass}"
				type="radio"
				value="yes"
				bind:group={orgRadio}
			/>
			<p>Oui</p>
		</label>
		<label class="flex items-center space-x-2">
			<input
				class="radio {inputClass}"
				type="radio"
				value="no"
				bind:group={orgRadio}
			/>
			<p>Non</p>
		</label>
	</div>
</div>

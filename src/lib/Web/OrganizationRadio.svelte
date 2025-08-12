<script lang="ts">
	import { page } from '$app/state';

	let {
		inputClass,
		memberOfOrg = $bindable()
	}: { inputClass: string; memberOfOrg: boolean | undefined } = $props();
	let orgRadio: string | undefined = $state();

	$effect(() => {
		memberOfOrg = orgRadio == 'yes';
	});
</script>

<div class="py-2 space-y-2">
	<div>
		Cette personne est-elle membre de {page.data.organization.formatted_name_definite_article}?
	</div>
	<div class="flex items-center space-x-4">
		<label class="flex items-center space-x-2">
			<input
				class="radio {inputClass}"
				type="radio"
				name="radio-direct"
				value="yes"
				bind:group={orgRadio}
			/>
			<p>Oui</p>
		</label>
		<label class="flex items-center space-x-2">
			<input
				class="radio {inputClass}"
				type="radio"
				name="radio-direct"
				value="no"
				bind:group={orgRadio}
			/>
			<p>Non</p>
		</label>
	</div>
</div>

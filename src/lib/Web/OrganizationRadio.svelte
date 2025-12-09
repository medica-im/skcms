<script lang="ts">
	import { page } from '$app/state';

	let { inputClass, data = $bindable() }: { inputClass: string; data: boolean | undefined } =
		$props();

	let orgRadio: string | undefined = $state();
	let arr = [
		{ label: 'Oui', value: 'yes', data: true },
		{ label: 'Non', value: 'no', data: false }
	];
</script>

<div class="py-2 space-y-2">
	<div>
		Cette personne est-elle membre de {page.data.organization.formatted_name}?
	</div>
	<div class="flex items-center space-x-4">
		{#each arr as row}
			<label class="flex items-center space-x-2">
				<input
					class="radio {inputClass}"
					type="radio"
					value={row.value}
					bind:group={orgRadio}
					oninput={(e) => {
						const { target } = e;
						console.log('target.value', target.value);
						console.log('raw.data', row.data);
						data = row.data;
					}}
				/>
				<p>{row.label}</p>
			</label>
		{/each}
	</div>
</div>

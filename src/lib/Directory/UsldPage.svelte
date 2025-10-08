<script lang="ts">
	import { JsonView } from '@zerodevx/svelte-json-view';
	import EffectorContact from '../components/Directory/EffectorContact.svelte';
	let { data } = $props();
	let count = 0;
	const dictionary = {
		usld_permanent_bed: {
			S: `${count} lit permanent`,
			P: `${count} lits permanents`
		}
	};

	function label(k) {
		let count = data.careHomeData[k];
		const dictionary = {
			usld_permanent_bed: {
				S: `${count} lit permanent`,
				P: `${count} lits permanents`
			}
		};
		if (count > 1) {
			return dictionary[k]['P'];
		} else {
			return dictionary[k]['S'];
		}
	}
</script>

<div class="grid grid-cols-1 p-4 gap-4 place-items-center justify-center">
	<EffectorContact data={data.fullentry} />
	<div class="grid grids-cols-1 gap-6 w-fit ">
		<h2 class="h2">Hébergement</h2>
		<div class="card variant-ringed p-4 gap-6">
			<h5 class="h5">USLD</h5>
			<!--JsonView json={data.careHomeData}/-->
			{#if Object.keys(data.careHomeData).includes('usld_permanent_bed')}
				<div class="flex flex-wrap gap-6">
					{label('usld_permanent_bed')}
				</div>
			{/if}
		</div>
	</div>
</div>

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
	<!--
		EffectorContact takes the page's data, not the entry: it reads
		data.fullentry and data.memberships. Passing the fullentry itself left
		data.fullentry undefined, and reading .uid off it threw during SSR — so
		every USLD entry answered 500 while every EHPAD one, which passes the
		right shape below, was fine. Kept identical to CareHomePage.
	-->
	<EffectorContact data={{ fullentry: data.fullentry, memberships: data.memberships }} />
	<div class="grid grids-cols-1 gap-6 w-fit ">
		<h2 class="h2">Hébergement</h2>
		<div class="card variant-ringed p-4 gap-6">
			<h5 class="h5">USLD</h5>
			<!--JsonView json={data.careHomeData}/-->
			<!--
				Guarded like CareHomePage does. fetchCareHome returns null for
				anything it could not fetch, so Object.keys() on it throws
				"Cannot convert undefined or null to object" during SSR and takes
				the whole page down — over a bed count. An entry whose care home
				record is missing should still show its contact details.
			-->
			{#if data.careHomeData && Object.keys(data.careHomeData).includes('usld_permanent_bed')}
				<div class="flex flex-wrap gap-6">
					{label('usld_permanent_bed')}
				</div>
			{/if}
		</div>
	</div>
</div>

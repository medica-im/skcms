<script lang="ts">
	import { page } from '$app/state';
	import { distanceEffectorsF } from '../store/directoryStore';
	import { getAddressFeature } from '$lib/components/Directory/context.ts';
	import { PUBLIC_LOCALE } from '$env/static/public';

	let { uid }: { uid: string } = $props();

	let locale = PUBLIC_LOCALE || 'en-US';
	let addressFeature = getAddressFeature();
	let distanceEffectors = $derived(distanceEffectorsF(page.data.entries, $addressFeature));

	function humanize(d: number) {
		const result = { unit: 'km', smallUnit: 'm', factor: 1000, smallBorder: 0.9 };
		const formatter = new Intl.NumberFormat(locale, { maximumSignificantDigits: 2 });
		if (d < result.smallBorder) {
			let distance = d * result.factor;
			if (distance < 40) return `< 50 ${result.smallUnit}`;

			distance = Math.round(distance / 50) * 50;
			return `${formatter.format(distance)} ${result.smallUnit}`;
		}
		return `${formatter.format(d)} ${result.unit}`;
	}
</script>

{#if distanceEffectors?.hasOwnProperty(uid)}
	{humanize(distanceEffectors[uid] / 1000)}
{/if}

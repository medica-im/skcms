<script lang="ts">
	import { getDistanceEffectors } from '$lib/components/Directory/context.ts';
	import { PUBLIC_LOCALE } from '$env/static/public';

	let { uid }: { uid: string } = $props();

	let locale = PUBLIC_LOCALE || 'en-US';

	let distanceEffectors = getDistanceEffectors();

	function humanize(d) {
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

{#await distanceEffectors.load()}
{:then}
	{#if $distanceEffectors?.hasOwnProperty(uid)}
		{humanize($distanceEffectors[uid] / 1000)}
	{/if}
{/await}

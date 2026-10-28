<script lang="ts">
	import { page } from '$app/state';
	import type { OpenGraph } from '$lib/interfaces/openGraph.interface';

	let { opengraph }: { opengraph: OpenGraph } = $props();
	const { title, image_url, image_alt, image_width, image_height, description, twitter_description, username } =
		$derived(opengraph);
	const url = $derived(`${page.url.origin}${page.url.pathname}`);
	const sized = $derived(!!image_url && !!image_width && !!image_height);
	const twitterCard = $derived(sized && image_width! > image_height! ? 'summary_large_image' : 'summary');
</script>

{#if title}
	<meta name="twitter:card" content={twitterCard} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={url} />
	<meta property="og:title" content={title} />
	<meta name="twitter:title" content={title} />
{/if}
{#if image_url}
	<meta property="og:image" content={image_url} />
	<meta name="twitter:image" content={image_url} />
	{#if sized}
		<meta property="og:image:width" content={String(image_width)} />
		<meta property="og:image:height" content={String(image_height)} />
	{/if}
	{#if image_alt}
		<meta property="og:image:alt" content={image_alt} />
		<meta name="twitter:image:alt" content={image_alt} />
	{/if}
{/if}
{#if description}
	<meta name="description" content={description} />
{/if}
{#if twitter_description}
	<meta property="og:description" content={twitter_description} />
	<meta name="twitter:description" content={twitter_description} />
{/if}
{#if username}
	<meta name="twitter:site" content={username} />
{/if}

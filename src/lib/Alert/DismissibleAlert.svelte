<script lang="ts">
	import type { Snippet } from 'svelte';
	import Fa from 'svelte-fa';
	import { faXmark } from '@fortawesome/free-solid-svg-icons';

	let {
		visible = $bindable(true),
		variant = 'variant-ghost-primary',
		onclose,
		children
	}: {
		visible?: boolean;
		variant?: string;
		onclose?: () => void;
		children: Snippet;
	} = $props();

	function close() {
		const confirmed = confirm(
			"Cette alerte n'apparaîtra plus lors de vos prochaines visites. Vous pourrez effacer les cookies et les données de sites sur votre appareil pour la faire réapparaître."
		);
		if (!confirmed) return;
		visible = false;
		onclose?.();
	}
</script>

{#if visible}
	<aside class="dismissible-alert {variant}">
		<button onclick={close} class="close-btn" aria-label="Fermer">
			<Fa icon={faXmark} />
		</button>
		<div class="alert-content">
			{@render children()}
		</div>
	</aside>
{/if}

<style lang="postcss">
	.dismissible-alert {
		position: relative;
		padding: 1.5rem 2.5rem 1.5rem 1.5rem;
		border-radius: var(--theme-rounded-container);
	}
	.close-btn {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		padding: 0.25rem;
		cursor: pointer;
		background: none;
		border: none;
		opacity: 0.5;
		transition: opacity 0.15s;
		line-height: 1;
	}
	.close-btn:hover {
		opacity: 1;
	}
	.alert-content {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
</style>

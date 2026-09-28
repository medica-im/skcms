<script lang="ts">
	import { copy } from 'svelte-copy';
	import Fa from 'svelte-fa';
	import { faCheck, faCopy } from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';

	/**
	 * Copies `text` and says so for a moment, in place of its label: without the
	 * confirmation nothing on screen changes, and people click again.
	 */
	let {
		text,
		label,
		classes = 'btn variant-soft-primary',
		mono = false,
		title = undefined
	}: { text: string; label: string; classes?: string; mono?: boolean; title?: string } = $props();

	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	function onCopy() {
		copied = true;
		clearTimeout(timer);
		timer = setTimeout(() => (copied = false), 2000);
	}
</script>

<button
	type="button"
	class="{classes} min-h-11"
	use:copy={{ text, onCopy }}
	{title}
	data-testid="copy-button"
	data-copy-text={text}
>
	<span><Fa icon={copied ? faCheck : faCopy} /></span>
	<span class:font-mono={mono} aria-live="polite">{copied ? m.EMAIL_IMAGE_COPIED() : label}</span>
</button>

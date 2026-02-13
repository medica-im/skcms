<script lang="ts">
    import { onMount } from 'svelte'
    import Modal from '$lib/Modal.svelte'
    import type { Snippet } from 'svelte'
    import type { SelectType } from '$lib/interfaces/select.ts';

  interface Props {
    title: string
    children: Snippet
    onresult: (result: boolean) => void
    selectedFacility: SelectType | undefined;
  }

  let { title, children, onresult, selectedFacility }: Props = $props()

  let modal: Modal

  onMount(() => {
    modal.open()
  })

  export function open() {
    modal.open()
  }

  function close(result: boolean) {
    modal.close()
    onresult(result)
  }
</script>

<Modal bind:this={modal} onclose={() => onresult(false)} dialogClass="max-w-full sm:max-w-[90vw] lg:max-w-5xl">
  <div class="sm:flex sm:items-start">
    {#if children}
      {@render children()}
    {/if}
  </div>
</Modal>

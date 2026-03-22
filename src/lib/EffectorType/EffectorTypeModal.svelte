<script lang="ts">
    import { onMount } from 'svelte'
    import Modal from '$lib/Modal.svelte'
    import type { Snippet } from 'svelte'

  interface Props {
    title: string
    children?: Snippet
    onresult: (result: boolean) => void
    dialogClass?: string
  }

  let { title, children, onresult, dialogClass = 'sm:max-w-lg' }: Props = $props()

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

<Modal bind:this={modal} onclose={() => onresult(false)} {dialogClass}>
  <div class="sm:flex sm:items-start">
    {#if children}
      {@render children()}
    {/if}
  </div>
</Modal>

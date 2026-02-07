<script lang="ts">
    import { onMount } from 'svelte'
    import Modal from '$lib/Modal.svelte'
    import type { Snippet } from 'svelte'
    import type { Effector } from '$lib/interfaces/v2/effector.ts';
    import type { SelectType } from '$lib/interfaces/select.ts';

  interface Props {
    title: string
    description?: string
    label?: string
    labelColor?: string
    children?: Snippet
    onresult: (result: boolean) => void
  }

  let { title, description, label, labelColor, children, onresult }: Props = $props()

  let modal: Modal

  onMount(() => {
    modal.open()
  })

  export function open() {
    modal.open()
  }

  // ensure the dialog is closed and return the result
  function close(result: boolean) {
    modal.close()
    onresult(result)
  }
</script>

<Modal bind:this={modal} onclose={() => onresult(false)}>
  <div class="sm:flex sm:items-start">
    {#if children}
      {@render children()}
    {/if}
    <!--div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
      <h3 class="text-base font-semibold leading-6 text-gray-900" id="modal-title">{title}</h3>
      <div class="mt-2">
        <p class="text-sm text-gray-500">
          {description}
        </p>
      </div>
    </div-->
  </div>		
</Modal>
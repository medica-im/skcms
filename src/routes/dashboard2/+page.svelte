<script lang="ts">
  import { page } from "$app/state"
</script>

{#if page.data.session}
  <h1>Protected page</h1>
  <p>
    This is a protected content. You can access this content because you are
    signed in.
  </p>
  <p>Session expiry: {page.data.session}</p>
{:else}
  <h1>Access Denied</h1>
{/if}
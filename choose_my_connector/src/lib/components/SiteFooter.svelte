<script lang="ts">
  import type { SessionAccount } from "$lib/types/account";

  export let sessionAccount: SessionAccount | null = null;
  export let onReportClick: (() => void) | undefined;
  export let onLoginClick: (() => void) | undefined;
  export let onLogoutClick: (() => void) | undefined;
  export let reportHref: string | null = "/#report";
  export let loginHref: string | null = "/?login=1";

  const handleLogout = () => {
    onLogoutClick?.();
  };
</script>

<footer class="site-footer">
  <p class="brand-title">Parametric</p>
  <p class="muted">Built for engineers who want fewer tabs and faster decisions.</p>
  <div class="footer-links">
    {#if onReportClick}
      <button class="ghost-button" type="button" on:click={onReportClick}>Report an issue</button>
    {:else if reportHref}
      <a class="ghost-button link-button" href={reportHref}>Report an issue</a>
    {/if}

    {#if sessionAccount}
      <button class="ghost-button" type="button" on:click={handleLogout}>Log out</button>
    {:else if onLoginClick}
      <button class="ghost-button" type="button" on:click={onLoginClick}>Log in</button>
    {:else if loginHref}
      <a class="ghost-button link-button" href={loginHref}>Log in</a>
    {/if}
  </div>
</footer>

<style>
  .site-footer {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
    padding: 18px 16px;
    border-radius: 16px;
    border: 1px solid var(--border);
    background: color-mix(in srgb, var(--panel) 96%, transparent);
    box-shadow: var(--card-shadow);
  }

  .footer-links {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .brand-title {
    margin: 0;
    font-weight: 700;
    font-size: 1.05rem;
  }

  .muted {
    color: var(--text-muted);
    margin: 0;
  }

  .ghost-button {
    border-radius: 999px;
    font-weight: 700;
    border: 1px solid var(--border);
    padding: 10px 16px;
    cursor: pointer;
    background: color-mix(in srgb, var(--panel) 80%, transparent);
    color: var(--text-primary);
    transition: transform 0.15s ease, box-shadow 0.2s ease, background-color 0.2s ease, color 0.2s ease;
    text-decoration: none;
  }

  .ghost-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 30px rgba(12, 26, 75, 0.12);
  }

  .link-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    color: inherit;
  }
</style>

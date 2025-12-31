<script lang="ts">
  export let data: {
    account: { displayName: string | null; email: string; isAdmin: boolean };
  };
</script>

<section class="page-shell">
  <div class="page-container">
    <header class="panelized">
      <p class="eyebrow">Admin dashboard</p>
      <h1 class="hero-title">Welcome back{data.account.displayName ? `, ${data.account.displayName}` : ""}.</h1>
      <p class="lede">Admin tooling will live here. For now, this is a protected placeholder.</p>
    </header>
  </div>
</section>

<style>
  .page-shell {
    min-height: 100vh;
    padding: 28px 18px;
    background: var(--page-gradient);
    color: var(--text-primary);
  }

  .page-container {
    max-width: 960px;
    margin: 0 auto;
  }

  .panelized {
    border-radius: 18px;
    border: 1px solid var(--border);
    background: color-mix(in srgb, var(--panel) 94%, transparent);
    box-shadow: var(--card-shadow);
    padding: 32px;
  }

  .eyebrow {
    display: inline-flex;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent-strong);
  }

  .hero-title {
    margin: 12px 0 8px;
    font-size: clamp(1.8rem, 3vw, 2.4rem);
  }

  .lede {
    color: var(--text-muted);
    margin: 0;
  }
</style>

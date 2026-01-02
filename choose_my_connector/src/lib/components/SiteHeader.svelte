<script lang="ts">
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";
  import type { SessionAccount } from "$lib/types/account";

  export let sessionAccount: SessionAccount | null = null;
  export let showAdminButton = false;
  export let isAuthLoading = false;
  export let brandHref = "/";
  export let accountHref = "/account";
  export let loginHref: string | null = "/?login=1";
  export let onLoginClick: (() => void) | undefined;
  export let onLogoutClick: (() => void) | undefined;

  let avatarFailed = false;

  const getInitials = (account: SessionAccount) => {
    const source = account.displayName?.trim() || account.email;
    const parts = source.split(/[.\s@_-]+/).filter(Boolean);
    const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
    return initials.join("") || "A";
  };

  const handleLogout = () => {
    onLogoutClick?.();
  };
</script>

<header class="top-bar">
  <a class="brand brand-link" href={brandHref}>
    <div class="brand-icon">P</div>
    <div>
      <p class="brand-title">Parametric</p>
    </div>
  </a>
  <div class="top-actions">
    <ThemeToggle />
    <a class="secondary-button" href="/trends">Engineering trends</a>
    {#if showAdminButton}
      <a class="secondary-button" href="/admin">Admin dashboard</a>
    {/if}
    {#if sessionAccount}
      <a class="account-chip" href={accountHref}>
        <div class="account-avatar" aria-hidden="true">
          {#if sessionAccount.avatarUrl && !avatarFailed}
            <img
              alt={`${sessionAccount.displayName ?? sessionAccount.email} profile`}
              src={sessionAccount.avatarUrl}
              on:error={() => {
                avatarFailed = true;
              }}
            />
          {:else}
            <span>{getInitials(sessionAccount)}</span>
          {/if}
        </div>
        <div class="account-meta">
          <p class="account-name">{sessionAccount.displayName ?? sessionAccount.email}</p>
          {#if sessionAccount.isAdmin}
            <span class="admin-badge">Admin</span>
          {:else}
            <span class="account-email">{sessionAccount.email}</span>
          {/if}
        </div>
      </a>
      <button class="ghost-button top-actions__logout" type="button" on:click={handleLogout} disabled={isAuthLoading}>
        Log out
      </button>
    {:else}
      {#if onLoginClick}
        <button class="primary-button top-actions__login" type="button" on:click={onLoginClick} disabled={isAuthLoading}>
          Log In / Create Account
        </button>
      {:else if loginHref}
        <a class="primary-button top-actions__login link-button" href={loginHref}>Log In / Create Account</a>
      {/if}
    {/if}
  </div>
</header>

<style>
  .top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 18px;
    border: 1px solid var(--border);
    border-radius: 16px;
    background: color-mix(in srgb, var(--panel) 94%, transparent);
    box-shadow: var(--card-shadow);
    backdrop-filter: blur(12px);
    flex-wrap: wrap;
    width: 100%;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .brand-link {
    text-decoration: none;
    color: inherit;
  }

  .brand-icon {
    background: linear-gradient(135deg, var(--accent), var(--accent-strong));
    color: #fff;
    font-weight: 700;
    letter-spacing: 0.08em;
    font-size: 0.9rem;
    padding: 10px 12px;
    border-radius: 12px;
    box-shadow: var(--glow);
  }

  .brand-title {
    margin: 0;
    font-weight: 700;
    font-size: 1.05rem;
  }

  .top-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-left: auto;
    justify-content: flex-end;
  }

  .account-chip {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: color-mix(in srgb, var(--panel) 90%, transparent);
    text-decoration: none;
    color: inherit;
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  .account-chip:hover {
    border-color: color-mix(in srgb, var(--accent) 30%, var(--border));
    background: color-mix(in srgb, var(--panel) 94%, transparent);
  }

  .account-chip:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent) 42%, var(--border));
    outline-offset: 2px;
  }

  .account-avatar {
    width: 36px;
    height: 36px;
    border-radius: 999px;
    overflow: hidden;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, rgba(79, 123, 191, 0.45), rgba(56, 189, 248, 0.4));
    color: #0f172a;
    font-weight: 700;
  }

  .account-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .account-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .account-name {
    font-size: 0.85rem;
    font-weight: 600;
    margin: 0;
  }

  .account-email {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .admin-badge {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #0f172a;
    background: rgba(250, 204, 21, 0.5);
    padding: 2px 6px;
    border-radius: 999px;
  }

  .top-actions__login {
    order: 2;
  }

  .top-actions__logout {
    order: 3;
  }

  .link-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    color: inherit;
  }

  .ghost-button,
  .primary-button,
  .secondary-button {
    border-radius: 999px;
    font-weight: 700;
    border: 1px solid transparent;
    padding: 10px 16px;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.2s ease, background-color 0.2s ease, color 0.2s ease;
  }

  .ghost-button {
    border-color: var(--border);
    background: color-mix(in srgb, var(--panel) 80%, transparent);
    color: var(--text-primary);
  }

  .ghost-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 30px rgba(12, 26, 75, 0.12);
  }

  .primary-button {
    background: linear-gradient(135deg, var(--accent), var(--accent-strong));
    color: #fff;
    box-shadow: var(--glow);
  }

  .primary-button:hover {
    transform: translateY(-1px);
  }

  .secondary-button {
    border-color: var(--border);
    color: var(--text-primary);
    background: color-mix(in srgb, var(--panel) 88%, transparent);
  }

  .secondary-button:hover {
    transform: translateY(-1px);
  }
</style>

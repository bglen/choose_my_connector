<script lang="ts">
  import { dev } from "$app/environment";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import SiteHeader from "$lib/components/SiteHeader.svelte";
  import type { SessionAccount } from "$lib/types/account";

  type AccountProfile = {
    id: number;
    email: string;
    displayName: string | null;
    firstName: string;
    lastName: string;
    isAdmin: boolean;
    createdAt: string | null;
  };

  export let data: { sessionAccount: SessionAccount | null; profile: AccountProfile | null };

  let sessionAccount: SessionAccount | null = data.sessionAccount ?? null;
  let profile: AccountProfile | null = data.profile ?? null;
  let isAuthLoading = false;
  let isSaving = false;
  let isDeleting = false;
  let showDeleteConfirm = false;
  let feedback: { message: string; tone: "neutral" | "success" | "error" } = {
    message: "",
    tone: "neutral"
  };

  let form = profile
    ? {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        isAdmin: profile.isAdmin
      }
    : { firstName: "", lastName: "", email: "", isAdmin: false };

  $: showAdminButton = dev || !!sessionAccount?.isAdmin;
  $: fullName = [form.firstName, form.lastName].filter(Boolean).join(" ").trim();
  $: accountStatus = profile?.isAdmin ? "Admin" : "Member";

  onMount(async () => {
    if (!sessionAccount) {
      await fetchSession();
    }
  });

  async function fetchSession() {
    isAuthLoading = true;
    try {
      const res = await fetch("/api/auth/session");
      if (!res.ok) {
        sessionAccount = null;
        profile = null;
        return;
      }

      const payload = await res.json();
      sessionAccount = payload.account ?? null;
      if (sessionAccount) {
        await refreshProfile();
      }
    } catch (error) {
      console.error("Session check failed", error);
      sessionAccount = null;
      profile = null;
    } finally {
      isAuthLoading = false;
    }
  }

  async function refreshProfile() {
    try {
      const res = await fetch("/api/account");
      if (!res.ok) return;
      const payload = await res.json();
      if (!payload.account) return;

      profile = payload.account;
      form = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        isAdmin: profile.isAdmin
      };

      sessionAccount = {
        id: payload.account.id,
        email: payload.account.email,
        displayName: payload.account.displayName,
        avatarUrl: sessionAccount?.avatarUrl ?? null,
        isAdmin: payload.account.isAdmin
      };
    } catch (error) {
      console.error("Profile refresh failed", error);
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      sessionAccount = null;
      profile = null;
      goto("/");
    } catch (error) {
      console.error("Logout failed", error);
    }
  }

  async function saveProfile() {
    if (!sessionAccount) {
      feedback = { message: "You need to be signed in to update your account.", tone: "error" };
      return;
    }

    isSaving = true;
    feedback = { message: "", tone: "neutral" };
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        feedback = { message: payload.error ?? "Could not update account.", tone: "error" };
        return;
      }

      profile = payload.account;
      sessionAccount = {
        id: payload.account.id,
        email: payload.account.email,
        displayName: payload.account.displayName,
        avatarUrl: sessionAccount?.avatarUrl ?? null,
        isAdmin: payload.account.isAdmin
      };

      form = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        isAdmin: profile.isAdmin
      };

      feedback = { message: "Account details updated.", tone: "success" };
    } catch (error) {
      feedback = { message: "Could not update account.", tone: "error" };
      console.error("Account update failed", error);
    } finally {
      isSaving = false;
    }
  }

  async function deleteAccount() {
    if (!sessionAccount) return;
    isDeleting = true;
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        feedback = { message: payload.error ?? "Could not delete account.", tone: "error" };
        return;
      }

      sessionAccount = null;
      profile = null;
      goto("/");
    } catch (error) {
      console.error("Delete failed", error);
      feedback = { message: "Could not delete account.", tone: "error" };
    } finally {
      isDeleting = false;
    }
  }
</script>

<svelte:head>
  <title>Account · Parametric</title>
</svelte:head>

<div class="page-shell">
  <div class="page-container">
    <SiteHeader
      {sessionAccount}
      {isAuthLoading}
      {showAdminButton}
      onLogoutClick={logout}
    />

    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Account</p>
        <h1>Account control center</h1>
        <p class="muted">
          Review and edit your profile, keep your contact info current, and close your account when needed.
        </p>
        {#if sessionAccount && profile}
          <div class="pill-row">
            <span class="pill">Signed in as {sessionAccount.email}</span>
            <span class={`pill ${sessionAccount.isAdmin ? "pill-admin" : "pill-muted"}`}>
              {accountStatus}
            </span>
            {#if profile.createdAt}
              <span class="pill">
                Joined {new Date(profile.createdAt).toLocaleDateString()}
              </span>
            {/if}
          </div>
        {/if}
      </div>
      {#if !sessionAccount}
        <div class="hero-actions">
          <a class="primary-button link-button" href="/?login=1">Log In / Create Account</a>
        </div>
      {/if}
    </section>

    {#if sessionAccount && profile}
      <div class="panels-grid">
        <section class="panel highlight">
          <div class="panel-header">
            <p class="label">Profile snapshot</p>
            <h2>{fullName || "Name not set"}</h2>
            <p class="muted">{profile.email}</p>
          </div>
          <div class="overview-grid">
            <div>
              <p class="label">Account status</p>
              <p class="value {sessionAccount.isAdmin ? "accent" : ""}">{accountStatus}</p>
              <p class="muted">Admins can access the control panel.</p>
            </div>
            <div>
              <p class="label">Created</p>
              <p class="value">
                {profile.createdAt ? new Date(profile.createdAt).toLocaleString() : "Unknown"}
              </p>
              <p class="muted">Sessions refresh automatically after changes.</p>
            </div>
          </div>
        </section>

        <section class="panel form-panel">
          <div class="panel-header">
            <p class="label">Edit details</p>
            <h2>Contact details</h2>
            <p class="muted">Update your name and sign-in email.</p>
          </div>

          <form class="form" on:submit|preventDefault={saveProfile}>
            <div class="field-grid">
              <label>
                <span>First name</span>
                <input
                  name="firstName"
                  autocomplete="given-name"
                  placeholder="Ada"
                  bind:value={form.firstName}
                />
              </label>
              <label>
                <span>Last name</span>
                <input
                  name="lastName"
                  autocomplete="family-name"
                  placeholder="Lovelace"
                  bind:value={form.lastName}
                />
              </label>
              <label class="full-width">
                <span>Email</span>
                <input
                  name="email"
                  type="email"
                  autocomplete="email"
                  placeholder="you@example.com"
                  bind:value={form.email}
                  required
                />
              </label>
            </div>

            <div class="form-actions">
              <div class="feedback {feedback.tone}">
                {#if feedback.message}
                  {feedback.message}
                {/if}
              </div>
              <button class="primary-button" type="submit" disabled={isSaving}>
                {#if isSaving}
                  Saving…
                {:else}
                  Save changes
                {/if}
              </button>
            </div>
          </form>
        </section>

        <section class="panel danger-panel">
          <div class="panel-header">
            <p class="label danger-label">Danger zone</p>
            <h2>Delete account</h2>
            <p class="muted">
              This removes your sessions and access. You’ll need to register again to come back.
            </p>
          </div>
          <div class="danger-actions">
            {#if showDeleteConfirm}
              <div class="confirm-box">
                <p class="muted">
                  Are you sure? This action cannot be undone.
                </p>
                <div class="actions">
                  <button class="ghost-button" type="button" on:click={() => (showDeleteConfirm = false)}>
                    Cancel
                  </button>
                  <button
                    class="danger-button"
                    type="button"
                    on:click={deleteAccount}
                    disabled={isDeleting}
                  >
                    {#if isDeleting}
                      Deleting…
                    {:else}
                      Yes, delete my account
                    {/if}
                  </button>
                </div>
              </div>
            {:else}
              <button class="danger-button" type="button" on:click={() => (showDeleteConfirm = true)}>
                Delete account
              </button>
            {/if}
          </div>
        </section>
      </div>
    {:else}
      <section class="panel empty-panel">
        <h2>Sign in to manage your account</h2>
        <p class="muted">Log in to view or update your name, email, and admin access.</p>
        <div class="actions">
          <a class="primary-button link-button" href="/?login=1">Log In / Create Account</a>
        </div>
      </section>
    {/if}

    <SiteFooter {sessionAccount} onLogoutClick={logout} />
  </div>
</div>

<style>
  .page-shell {
    min-height: 100vh;
    background: var(--page-gradient);
    color: var(--text-primary);
  }

  .page-container {
    width: 100%;
    margin: 0;
    padding: 28px clamp(18px, 4vw, 40px) 72px;
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  .hero {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    align-items: center;
    gap: 20px;
    border-radius: 24px;
    padding: clamp(20px, 3vw, 32px);
    border: 1px solid var(--border);
    background: linear-gradient(135deg, color-mix(in srgb, var(--panel) 90%, transparent), color-mix(in srgb, var(--panel) 82%, transparent));
    box-shadow: var(--card-shadow);
  }

  .hero-copy h1 {
    margin: 6px 0 8px;
    font-size: clamp(2rem, 3vw, 2.5rem);
  }

  .hero-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    flex-wrap: wrap;
  }

  .panels-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 18px;
  }

  .panel {
    border-radius: 20px;
    border: 1px solid var(--border);
    background: color-mix(in srgb, var(--panel) 94%, transparent);
    box-shadow: var(--card-shadow);
    padding: clamp(18px, 2.5vw, 28px);
    display: grid;
    gap: 14px;
  }

  .highlight {
    background: radial-gradient(circle at 10% 10%, rgba(125, 211, 252, 0.08), transparent 32%),
      color-mix(in srgb, var(--panel) 90%, transparent);
  }

  .panel-header h2 {
    margin: 4px 0 6px;
  }

  .overview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px;
  }

  .label {
    margin: 0;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    font-size: 0.75rem;
  }

  .value {
    margin: 2px 0 4px;
    font-weight: 700;
    font-size: 1.1rem;
  }

  .value.accent {
    color: var(--accent-strong);
  }

  .muted {
    color: var(--text-muted);
    margin: 0;
  }

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent-strong);
    margin: 0;
  }

  .pill-row {
    margin-top: 10px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: color-mix(in srgb, var(--panel) 85%, transparent);
    font-weight: 600;
    color: var(--text-primary);
  }

  .pill-admin {
    color: #facc15;
    background: rgba(250, 204, 21, 0.14);
    border-color: rgba(250, 204, 21, 0.3);
  }

  .pill-muted {
    color: var(--text-muted);
  }

  .form {
    display: grid;
    gap: 14px;
  }

  .field-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px;
  }

  label span {
    display: block;
    margin-bottom: 6px;
    font-weight: 600;
  }

  input {
    width: 100%;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: color-mix(in srgb, var(--panel) 90%, transparent);
    color: var(--text-primary);
    font-size: 0.98rem;
  }

  input:focus {
    outline: 2px solid color-mix(in srgb, var(--accent-strong), transparent 40%);
    outline-offset: 2px;
  }

  .full-width {
   grid-column: 1 / -1;
  }

  .form-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .feedback {
    min-height: 20px;
    font-weight: 600;
    color: var(--text-muted);
  }

  .feedback.success {
    color: #34d399;
  }

  .feedback.error {
    color: #f87171;
  }

  .danger-panel {
    border-color: rgba(248, 113, 113, 0.35);
    background: color-mix(in srgb, var(--panel) 92%, transparent);
  }

  .danger-label {
    color: #f87171;
  }

  .danger-actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .confirm-box {
    border: 1px dashed rgba(248, 113, 113, 0.4);
    padding: 14px;
    border-radius: 12px;
    background: rgba(248, 113, 113, 0.06);
  }

  .actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .ghost-button,
  .primary-button,
  .secondary-button,
  .danger-button {
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
    text-decoration: none;
  }

  .ghost-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 30px rgba(12, 26, 75, 0.12);
  }

  .primary-button {
    background: linear-gradient(135deg, var(--accent), var(--accent-strong));
    color: #fff;
    box-shadow: var(--glow);
    text-decoration: none;
  }

  .primary-button:hover {
    transform: translateY(-1px);
  }

  .secondary-button {
    border-color: var(--border);
    color: var(--text-primary);
    background: color-mix(in srgb, var(--panel) 88%, transparent);
    text-decoration: none;
  }

  .secondary-button:hover {
    transform: translateY(-1px);
  }

  .danger-button {
    background: linear-gradient(135deg, #f87171, #ef4444);
    color: #fff;
    box-shadow: 0 8px 30px rgba(248, 113, 113, 0.3);
  }

  .danger-button:hover {
    transform: translateY(-1px);
  }

  .link-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    color: inherit;
  }

  .empty-panel h2 {
    margin: 0;
  }

  @media (max-width: 720px) {
    .hero-actions {
      justify-content: flex-start;
    }
  }
</style>

<script lang="ts">
  import { theme } from "$lib/stores/theme";

  export let className = "";
</script>

<button
  aria-pressed={$theme === "dark"}
  class={`theme-toggle ${className}`.trim()}
  type="button"
  on:click={theme.toggle}
>
  <span class="theme-toggle__icon" aria-hidden="true">{$theme === "dark" ? "🌙" : "☀️"}</span>
  <span>{$theme === "light" ? "Dark mode" : "Light mode"}</span>
</button>

<style>
  .theme-toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border-radius: 999px;
    border: 1px solid var(--border);
    padding: 9px 14px;
    background: color-mix(in srgb, var(--panel) 92%, transparent);
    color: var(--text-primary);
    font-weight: 700;
    font-size: 0.9rem;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
  }

  .theme-toggle:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
    background: color-mix(in srgb, var(--panel) 96%, transparent);
    box-shadow: var(--glow);
  }

  .theme-toggle:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent) 45%, var(--border));
    outline-offset: 3px;
  }

  .theme-toggle__icon {
    font-size: 1.05rem;
  }
</style>

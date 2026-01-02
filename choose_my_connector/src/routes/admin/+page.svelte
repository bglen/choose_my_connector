<script lang="ts">
  import { dev } from "$app/environment";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import SiteHeader from "$lib/components/SiteHeader.svelte";
  import type { SessionAccount } from "$lib/types/account";

  type Category = "esc" | "battery" | "motor";

  type TableColumn = {
    key: string;
    label: string;
    description?: string;
    type?: "text" | "number";
    helper?: string;
  };

  type TableRow = {
    id?: number;
    name?: string | null;
    manufacturer?: string | null;
    cadUrl?: string | null;
    datasheetUrl?: string | null;
    purchaseUrl?: string | null;
    notes?: string | null;
    [key: string]: string | number | null | undefined;
  };

  const categoryOptions: Record<Category, { id: Category; label: string }> = {
    esc: {
      id: "esc",
      label: "ESCs"
    },
    battery: {
      id: "battery",
      label: "Batteries"
    },
    motor: {
      id: "motor",
      label: "Motors"
    }
  };

  export let data: { account: SessionAccount | null };
  let sessionAccount: SessionAccount | null = data.account ?? null;
  let isAuthLoading = false;
  $: showAdminButton = dev || !!sessionAccount?.isAdmin;

  let selectedCategory: Category = "esc";
  let columnsByCategory: Record<Category, TableColumn[]> = { esc: [], battery: [], motor: [] };
  let activeColumns: TableColumn[] = [];
  let sortBy: string = "name";
  let sortDirection: "asc" | "desc" = "asc";
  let gridColumns = `repeat(${activeColumns.length + 1}, minmax(140px, 1fr))`;
  let gridMinWidth = (activeColumns.length + 1) * 170;
  let isLoading = false;
  let savingRowId: number | "new" | null = null;
  let errorMessage = "";
  let successMessage = "";

  let escEntries: TableRow[] = [];
  let batteryEntries: TableRow[] = [];
  let motorEntries: TableRow[] = [];

  let newEntry: TableRow = {};

  function createBlankEntry(columns: TableColumn[] = []): TableRow {
    const entry: TableRow = {};
    if (Array.isArray(columns)) {
      columns.forEach((column) => {
        entry[column.key] = "";
      });
    }
    return entry;
  }

  const setEntries = (category: Category, entries: TableRow[]) => {
    if (category === "esc") {
      escEntries = entries;
    } else if (category === "battery") {
      batteryEntries = entries;
    } else {
      motorEntries = entries;
    }
  };

  const normalizeForSort = (value: unknown) => {
    if (value === null || value === undefined || value === "") return "";
    if (typeof value === "number") return value;
    return value.toString().toLowerCase();
  };

  const sortEntries = (entries: TableRow[], key: string, direction: "asc" | "desc") => {
    const sorted = [...entries].sort((a, b) => {
      const aValue = normalizeForSort(a[key]);
      const bValue = normalizeForSort(b[key]);

      if (typeof aValue === "number" && typeof bValue === "number") {
        return direction === "asc" ? aValue - bValue : bValue - aValue;
      }

      return direction === "asc"
        ? `${aValue}`.localeCompare(`${bValue}`)
        : `${bValue}`.localeCompare(`${aValue}`);
    });

    return sorted;
  };

  $: {
    activeColumns = columnsByCategory[selectedCategory] ?? [];
    if (!activeColumns.find((column) => column.key === sortBy)) {
      sortBy = activeColumns[0]?.key ?? "name";
    }
    gridColumns = `repeat(${activeColumns.length + 1}, minmax(140px, 1fr))`;
    gridMinWidth = (activeColumns.length + 1) * 170;
  }

  $: currentEntries =
    selectedCategory === "esc" ? escEntries : selectedCategory === "battery" ? batteryEntries : motorEntries;

  $: displayedEntries = sortEntries(currentEntries, sortBy, sortDirection);

  const switchCategory = (category: Category) => {
    selectedCategory = category;
    const cols = columnsByCategory[category];
    sortBy = cols[0]?.key ?? "name";
    sortDirection = "asc";
    newEntry = createBlankEntry(cols);
    successMessage = "";
    errorMessage = "";
    loadEntries(category);
  };

  const handleSort = (key: string) => {
    if (sortBy === key) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
      return;
    }
    sortBy = key;
    sortDirection = "asc";
  };

  const logout = async () => {
    isAuthLoading = true;
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      sessionAccount = null;
      goto("/");
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      isAuthLoading = false;
    }
  };

  const loadEntries = async (category: Category = selectedCategory) => {
    isLoading = true;
    errorMessage = "";
    try {
      const response = await fetch(`/api/admin/products?category=${category}`);
      if (!response.ok) {
        throw new Error("Failed to load products.");
      }
      const data = await response.json();
      const rows = Array.isArray(data.rows) ? data.rows : [];

      let columns = Array.isArray(data.columns) ? data.columns : [];
      if (!columns.length && rows.length) {
        columns = Object.keys(rows[0] || {})
          .filter((key) => key !== "id")
          .map((key) => ({
            key,
            label: key,
            type:
              typeof rows.find((row) => row[key] !== null && row[key] !== undefined && row[key] !== "")?.[key] ===
              "number"
                ? "number"
                : "text"
          }));
      }

      columnsByCategory = { ...columnsByCategory, [category]: columns };
      setEntries(category, rows);
      if (category === selectedCategory) {
        if (!columns.find((column: TableColumn) => column.key === sortBy)) {
          sortBy = columns[0]?.key ?? "name";
        }
        newEntry = createBlankEntry(columns);
      }
    } catch (error) {
      console.error(error);
      errorMessage = "Unable to load product data.";
    } finally {
      isLoading = false;
    }
  };

  const saveRow = async (row: TableRow, isNew: boolean) => {
    successMessage = "";
    errorMessage = "";
    if (!row.name || !row.name.toString().trim()) {
      errorMessage = "Name is required to save.";
      return;
    }

    if (!isNew && !row.id) {
      errorMessage = "Missing product id for update.";
      return;
    }

    savingRowId = isNew ? "new" : row.id ?? null;
    errorMessage = "";
    successMessage = "";

    const payload: Record<string, unknown> = { category: selectedCategory };
    activeColumns.forEach((column) => {
      payload[column.key] = row[column.key];
    });
    if (!isNew && row.id) {
      payload.id = row.id;
    }

    try {
      const response = await fetch("/api/admin/products", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Unable to save product.");
      }

      successMessage = isNew ? "Added a new product." : "Saved changes.";
      await loadEntries();
      if (isNew) {
        newEntry = createBlankEntry(selectedCategory);
      }
    } catch (error) {
      console.error(error);
      errorMessage = error instanceof Error ? error.message : "Unable to save product.";
    } finally {
      savingRowId = null;
    }
  };

  const handleDelete = async (row: TableRow) => {
    if (!row.id) return;
    if (!confirm(`Delete ${row.name ?? "this product"}?`)) return;
    savingRowId = row.id;
    errorMessage = "";
    successMessage = "";

    try {
      const response = await fetch("/api/admin/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, category: selectedCategory })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Unable to delete product.");
      }
      await loadEntries();
      successMessage = "Product deleted.";
    } catch (error) {
      console.error(error);
      errorMessage = error instanceof Error ? error.message : "Unable to delete product.";
    } finally {
      savingRowId = null;
    }
  };

  const updateCell = (rowId: number | undefined, key: string, value: string) => {
    if (rowId === undefined) return;
    const updated = currentEntries.map((entry) =>
      entry.id === rowId ? { ...entry, [key]: value } : entry
    );
    setEntries(selectedCategory, updated);
  };

  const updateNewCell = (key: string, value: string) => {
    newEntry = { ...newEntry, [key]: value };
  };

  const handleEnter = (event: KeyboardEvent, row: TableRow, isNew = false) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveRow(row, isNew);
    }
  };

  onMount(loadEntries);
</script>

<svelte:head>
  <title>Admin · Database Editor</title>
</svelte:head>

<div class="page-shell">
  <div class="page-container">
    <SiteHeader
      sessionAccount={sessionAccount}
      isAuthLoading={isAuthLoading}
      showAdminButton={showAdminButton}
      onLogoutClick={logout}
    />

    <section class="flex w-full flex-col gap-8 px-4 py-8 sm:px-6">
      <header class="flex flex-col gap-4">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-slate-400">Admin</p>
            <h1 class="text-3xl font-semibold text-slate-100">Database spreadsheet</h1>
            <p class="mt-1 text-sm text-slate-300">
              Pick a category and edit cells inline. Hit Enter to save a row or use the buttons in the
              actions column.
            </p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-200">
            <p class="font-semibold text-slate-100">Keyboard tips</p>
            <ul class="mt-2 space-y-1 text-slate-300">
              <li>↵ Save highlighted row</li>
              <li>Tab / Shift+Tab to move between cells</li>
              <li>Click column headers to sort</li>
            </ul>
          </div>
        </div>
        <div class="flex flex-wrap gap-3">
          {#each Object.values(categoryOptions) as option}
            <button
              class={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                selectedCategory === option.id
                  ? "border-sky-400 bg-sky-500/20 text-sky-100 shadow-[0_10px_30px_rgba(56,189,248,0.25)]"
                  : "border-slate-700 text-slate-200 hover:border-slate-500"
              }`}
              type="button"
              on:click={() => switchCategory(option.id)}
            >
              {option.label}
            </button>
          {/each}
        </div>
      </header>

      <section class="spreadsheet-card rounded-3xl p-5 shadow-[0_24px_70px_rgba(15,23,42,0.2)] sm:p-6 relative">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-slate-100">Spreadsheet view</h2>
            <p class="text-sm text-slate-300">Edit any cell then press Enter to push changes.</p>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
              type="button"
              on:click={() => loadEntries()}
              disabled={isLoading}
            >
              Refresh
            </button>
          </div>
        </div>

        <div class="alert-stack" aria-live="polite">
          {#if errorMessage}
            <div class="alert error">{errorMessage}</div>
          {/if}
          {#if successMessage}
            <div class="alert success">{successMessage}</div>
          {/if}
        </div>

        <div class="mt-6 overflow-x-auto rounded-2xl spreadsheet-scroll">
          <div
            class="sheet-header"
            style={`grid-template-columns: ${gridColumns}; min-width: ${gridMinWidth}px;`}
          >
            {#if !activeColumns.length}
              <div class="p-4 text-sm text-slate-300">No columns found for this category.</div>
            {:else}
              {#each activeColumns as column, idx}
                <button
                  class={`sheet-head-cell ${sortBy === column.key ? "active" : ""} ${column.description ? "has-tooltip" : ""} ${idx === 0 ? "frozen" : ""}`}
                  type="button"
                  on:click={() => handleSort(column.key)}
                  aria-label={column.description ? `${column.label}: ${column.description}` : column.label}
                >
                  <span class="head-label">
                    {column.label}
                    {#if column.description}
                      <span class="tooltip">{column.description}</span>
                    {/if}
                  </span>
                  <span class="sort-indicator">
                    {#if sortBy === column.key}
                      {sortDirection === "asc" ? "↑" : "↓"}
                    {:else}
                      ·
                    {/if}
                  </span>
                </button>
              {/each}
              <div class="sheet-head-cell actions">Actions</div>
            {/if}
          </div>

          {#if activeColumns.length}
            <div
              class="sheet-row new-row"
              style={`grid-template-columns: ${gridColumns}; min-width: ${gridMinWidth}px;`}
            >
              {#each activeColumns as column, idx}
                <div class={`sheet-cell ${idx === 0 ? "frozen" : ""}`}>
                  <input
                    class="sheet-input"
                    placeholder={column.description || column.helper || column.label}
                    value={newEntry[column.key] ?? ""}
                    on:input={(event) => updateNewCell(column.key, event.currentTarget.value)}
                    on:keydown={(event) => handleEnter(event as KeyboardEvent, newEntry, true)}
                    type={column.type === "number" ? "number" : "text"}
                  />
                </div>
              {/each}
              <div class="sheet-cell actions">
                <button
                  class="primary-chip"
                  type="button"
                  on:click={() => saveRow(newEntry, true)}
                  disabled={savingRowId === "new"}
                >
                  {savingRowId === "new" ? "Saving..." : "Add row"}
                </button>
              </div>
            </div>
          {/if}

          {#if isLoading}
            <div class="p-4 text-sm text-slate-300">Loading product data…</div>
          {:else if !displayedEntries.length}
            <div class="p-4 text-sm text-slate-300">
              No {categoryOptions[selectedCategory].label.toLowerCase()} yet. Add a row above to get started.
            </div>
          {:else}
            {#each displayedEntries as row (row.id)}
              <div
                class="sheet-row"
                style={`grid-template-columns: ${gridColumns}; min-width: ${gridMinWidth}px;`}
              >
                {#each activeColumns as column, idx}
                  <div class={`sheet-cell ${idx === 0 ? "frozen" : ""}`}>
                    <input
                      class="sheet-input"
                    value={row[column.key] ?? ""}
                    on:input={(event) => updateCell(row.id, column.key, event.currentTarget.value)}
                    on:keydown={(event) => handleEnter(event as KeyboardEvent, row)}
                    type={column.type === "number" ? "number" : "text"}
                  />
                  </div>
                {/each}
                <div class="sheet-cell actions">
                  <button
                    class="ghost-chip"
                    type="button"
                    on:click={() => saveRow(row, false)}
                    disabled={savingRowId === row.id}
                  >
                    {savingRowId === row.id ? "Saving..." : "Save"}
                  </button>
                  <button
                    class="danger-chip"
                    type="button"
                    on:click={() => handleDelete(row)}
                    disabled={savingRowId === row.id}
                  >
                    Delete
                  </button>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </section>
    </section>

    <SiteFooter sessionAccount={sessionAccount} onLogoutClick={logout} />
  </div>
</div>

<style>
  .page-shell {
    min-height: 100vh;
    background: radial-gradient(circle at 10% 20%, rgba(56, 189, 248, 0.07), transparent 25%),
      radial-gradient(circle at 80% 0%, rgba(129, 140, 248, 0.08), transparent 28%),
      var(--page-gradient);
    color: var(--text-primary);
    --shell-pad: clamp(16px, 3vw, 32px);
  }

  .page-container {
    width: 100%;
    padding: 28px var(--shell-pad) 72px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    align-items: stretch;
  }

  .spreadsheet-card,
  .spreadsheet-scroll {
    width: 100%;
  }

  .spreadsheet-card {
    width: calc(100vw - 2 * var(--shell-pad));
    margin-left: calc(-1 * var(--shell-pad));
    margin-right: calc(-1 * var(--shell-pad));
    background: var(--surface-strong);
    border: 1px solid var(--grid-border);
  }

  :global(:root) {
    --surface: #ffffff;
    --surface-alt: #f8fafc;
    --surface-strong: #ffffff;
    --grid-border: rgba(148, 163, 184, 0.35);
    --accent-soft: rgba(14, 165, 233, 0.12);
    --accent-border: rgba(14, 165, 233, 0.55);
    --accent-shadow: rgba(14, 165, 233, 0.2);
    --accent-strong: #0ea5e9;
    --text-primary: #0f172a;
    --text-muted: rgba(15, 23, 42, 0.7);
    --input-bg: #ffffff;
    --input-border: rgba(148, 163, 184, 0.6);
    --tooltip-bg: #0f172a;
    --tooltip-text: #e2e8f0;
    --tooltip-border: rgba(15, 23, 42, 0.2);
    --error-bg: rgba(248, 113, 113, 0.15);
    --error-border: rgba(248, 113, 113, 0.5);
    --error-text: #991b1b;
    --success-bg: rgba(34, 197, 94, 0.15);
    --success-border: rgba(34, 197, 94, 0.5);
    --success-text: #065f46;
  }

  @media (prefers-color-scheme: dark) {
    :global(:root) {
      --surface: rgba(15, 23, 42, 0.6);
      --surface-alt: rgba(15, 23, 42, 0.5);
      --surface-strong: rgba(15, 23, 42, 0.8);
      --grid-border: rgba(148, 163, 184, 0.2);
      --accent-soft: rgba(56, 189, 248, 0.1);
      --accent-border: rgba(56, 189, 248, 0.5);
      --accent-shadow: rgba(56, 189, 248, 0.2);
      --accent-strong: #38bdf8;
      --text-primary: #e2e8f0;
      --text-muted: rgba(226, 232, 240, 0.7);
      --input-bg: rgba(30, 41, 59, 0.75);
      --input-border: rgba(148, 163, 184, 0.25);
      --tooltip-bg: rgba(15, 23, 42, 0.95);
      --tooltip-text: #e2e8f0;
      --tooltip-border: rgba(148, 163, 184, 0.25);
      --error-bg: rgba(248, 113, 113, 0.14);
      --error-border: rgba(248, 113, 113, 0.4);
      --error-text: #fecdd3;
      --success-bg: rgba(52, 211, 153, 0.14);
      --success-border: rgba(52, 211, 153, 0.4);
      --success-text: #bbf7d0;
    }
  }

  .sheet-header,
  .sheet-row {
    display: grid;
    width: 100%;
    gap: 1px;
    background: linear-gradient(90deg, var(--grid-border), transparent);
  }

  .sheet-header {
    position: sticky;
    top: 0;
    z-index: 2;
    background: linear-gradient(180deg, var(--surface-strong), var(--surface));
  }

  .sheet-head-cell {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 10px;
    background: var(--surface-strong);
    color: var(--text-primary);
    font-weight: 600;
    font-size: 13px;
    letter-spacing: 0.01em;
    border: none;
    cursor: pointer;
    text-align: left;
    position: relative;
  }

  .sheet-head-cell.active {
    background: var(--accent-soft);
    color: var(--accent-strong);
  }

  .sheet-row {
    background: var(--surface);
  }

  .sheet-row:nth-child(even) {
    background: var(--surface-alt);
  }

  .sheet-row.new-row {
    background: var(--accent-soft);
    border-block: 1px solid var(--accent-border);
  }

  .sheet-cell {
    background: var(--surface);
    padding: 10px 8px;
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .sheet-head-cell.frozen,
  .sheet-cell.frozen {
    position: sticky;
    left: 0;
    z-index: 3;
    background: var(--surface-strong);
    box-shadow: 4px 0 10px rgba(0, 0, 0, 0.12);
  }

  .sheet-row.new-row .sheet-cell.frozen {
    background: var(--accent-soft);
  }

  .sheet-cell.actions {
    justify-content: flex-end;
    gap: 6px;
  }

  .sheet-input {
    width: 100%;
    border: 1px solid var(--input-border);
    background: var(--input-bg);
    color: var(--text-primary);
    border-radius: 10px;
    padding: 8px 10px;
    font-size: 13px;
    transition: border 0.15s ease, box-shadow 0.15s ease;
  }

  .sheet-input:focus {
    outline: none;
    border-color: var(--accent-border);
    box-shadow: 0 0 0 2px var(--accent-shadow);
  }

  .sort-indicator {
    font-size: 12px;
    color: var(--text-muted);
  }

  .head-label {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .has-tooltip .tooltip {
    visibility: hidden;
    opacity: 0;
    position: absolute;
    left: 0;
    bottom: -8px;
    transform: translateY(100%);
    background: var(--tooltip-bg);
    color: var(--tooltip-text);
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid var(--tooltip-border);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
    min-width: 220px;
    max-width: 320px;
    font-size: 12px;
    line-height: 1.4;
    z-index: 5;
    transition: opacity 0.12s ease, visibility 0.12s ease;
    pointer-events: none;
  }

  .has-tooltip:hover .tooltip,
  .has-tooltip:focus-visible .tooltip {
    visibility: visible;
    opacity: 1;
  }

  .alert-stack {
    position: absolute;
    top: -18px;
    right: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
  }

  .alert {
    padding: 10px 14px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 600;
    border: 1px solid transparent;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
  }

  .alert.error {
    background: var(--error-bg);
    border-color: var(--error-border);
    color: var(--error-text);
  }

  .alert.success {
    background: var(--success-bg);
    border-color: var(--success-border);
    color: var(--success-text);
  }

  .spreadsheet-scroll {
    background: var(--surface-strong);
    border: 1px solid var(--grid-border);
  }

  .primary-chip,
  .ghost-chip,
  .danger-chip {
    padding: 8px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 700;
    transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
  }

  .primary-chip {
    background: linear-gradient(120deg, #22d3ee, #0ea5e9);
    color: #0b1222;
    border: none;
  }

  .ghost-chip {
    background: rgba(148, 163, 184, 0.12);
    border: 1px solid rgba(148, 163, 184, 0.35);
    color: #e2e8f0;
  }

  .danger-chip {
    background: rgba(248, 113, 113, 0.14);
    border: 1px solid rgba(248, 113, 113, 0.35);
    color: #fecdd3;
  }

  .primary-chip:hover,
  .ghost-chip:hover,
  .danger-chip:hover {
    transform: translateY(-1px);
  }

  @media (max-width: 900px) {
    .sheet-header,
    .sheet-row {
      overflow-x: auto;
    }

    .sheet-cell {
      min-width: 160px;
    }
  }
</style>

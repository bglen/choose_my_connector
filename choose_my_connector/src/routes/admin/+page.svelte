<script lang="ts">
  import { onMount } from "svelte";

  type Category = "esc" | "battery" | "motor";

  type BaseEntry = {
    id: number;
    name: string;
    manufacturer?: string | null;
    cadUrl?: string | null;
    datasheetUrl?: string | null;
    purchaseUrl?: string | null;
    notes?: string | null;
  };

  type EscEntry = BaseEntry & {
    continuousCurrent?: number | null;
    burstCurrent?: number | null;
    minVoltage?: number | null;
    maxVoltage?: number | null;
    weight?: number | null;
  };

  type BatteryEntry = BaseEntry & {
    chemistry?: string | null;
    cellCount?: number | null;
    capacityMah?: number | null;
    dischargeC?: number | null;
    voltage?: number | null;
    weight?: number | null;
  };

  type MotorEntry = BaseEntry & {
    kvRating?: number | null;
    statorSize?: string | null;
    maxPower?: number | null;
    voltage?: number | null;
    weight?: number | null;
  };

  type FormState = {
    id?: number;
    name: string;
    manufacturer: string;
    cadUrl: string;
    datasheetUrl: string;
    purchaseUrl: string;
    notes: string;
    continuousCurrent: string;
    burstCurrent: string;
    minVoltage: string;
    maxVoltage: string;
    escWeight: string;
    chemistry: string;
    cellCount: string;
    capacityMah: string;
    dischargeC: string;
    batteryVoltage: string;
    batteryWeight: string;
    kvRating: string;
    statorSize: string;
    maxPower: string;
    motorVoltage: string;
    motorWeight: string;
  };

  const emptyForm: FormState = {
    name: "",
    manufacturer: "",
    cadUrl: "",
    datasheetUrl: "",
    purchaseUrl: "",
    notes: "",
    continuousCurrent: "",
    burstCurrent: "",
    minVoltage: "",
    maxVoltage: "",
    escWeight: "",
    chemistry: "",
    cellCount: "",
    capacityMah: "",
    dischargeC: "",
    batteryVoltage: "",
    batteryWeight: "",
    kvRating: "",
    statorSize: "",
    maxPower: "",
    motorVoltage: "",
    motorWeight: ""
  };

  const categoryOptions: { id: Category; label: string; description: string }[] = [
    {
      id: "esc",
      label: "ESCs",
      description: "Current ratings, voltage range, and weight."
    },
    {
      id: "battery",
      label: "Batteries",
      description: "Chemistry, cells, capacity, discharge, and weight."
    },
    {
      id: "motor",
      label: "Motors",
      description: "KV, stator size, power, voltage, and weight."
    }
  ];

  let selectedCategory: Category = "esc";
  let isLoading = false;
  let isSaving = false;
  let errorMessage = "";
  let successMessage = "";
  let form: FormState = { ...emptyForm };

  let escEntries: EscEntry[] = [];
  let batteryEntries: BatteryEntry[] = [];
  let motorEntries: MotorEntry[] = [];

  const loadEntries = async () => {
    isLoading = true;
    errorMessage = "";

    try {
      const response = await fetch(`/api/admin/products?category=${selectedCategory}`);
      if (!response.ok) {
        throw new Error("Failed to load products.");
      }
      const data = await response.json();
      if (selectedCategory === "esc") {
        escEntries = data;
      } else if (selectedCategory === "battery") {
        batteryEntries = data;
      } else {
        motorEntries = data;
      }
    } catch (error) {
      console.error(error);
      errorMessage = "Unable to load product data.";
    } finally {
      isLoading = false;
    }
  };

  const resetForm = () => {
    form = { ...emptyForm };
  };

  const switchCategory = (category: Category) => {
    selectedCategory = category;
    resetForm();
    successMessage = "";
    errorMessage = "";
    loadEntries();
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      errorMessage = "Product name is required.";
      return;
    }

    isSaving = true;
    errorMessage = "";
    successMessage = "";

    const payload: Record<string, unknown> = {
      id: form.id,
      category: selectedCategory,
      name: form.name,
      manufacturer: form.manufacturer,
      cadUrl: form.cadUrl,
      datasheetUrl: form.datasheetUrl,
      purchaseUrl: form.purchaseUrl,
      notes: form.notes
    };

    if (selectedCategory === "esc") {
      payload.continuousCurrent = form.continuousCurrent;
      payload.burstCurrent = form.burstCurrent;
      payload.minVoltage = form.minVoltage;
      payload.maxVoltage = form.maxVoltage;
      payload.weight = form.escWeight;
    } else if (selectedCategory === "battery") {
      payload.chemistry = form.chemistry;
      payload.cellCount = form.cellCount;
      payload.capacityMah = form.capacityMah;
      payload.dischargeC = form.dischargeC;
      payload.voltage = form.batteryVoltage;
      payload.weight = form.batteryWeight;
    } else {
      payload.kvRating = form.kvRating;
      payload.statorSize = form.statorSize;
      payload.maxPower = form.maxPower;
      payload.voltage = form.motorVoltage;
      payload.weight = form.motorWeight;
    }

    try {
      const response = await fetch("/api/admin/products", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Unable to save product.");
      }

      successMessage = form.id ? "Product updated." : "Product added.";
      resetForm();
      await loadEntries();
    } catch (error) {
      console.error(error);
      errorMessage = error instanceof Error ? error.message : "Unable to save product.";
    } finally {
      isSaving = false;
    }
  };

  const handleEdit = (entry: EscEntry | BatteryEntry | MotorEntry) => {
    form = {
      ...emptyForm,
      id: entry.id,
      name: entry.name ?? "",
      manufacturer: entry.manufacturer ?? "",
      cadUrl: entry.cadUrl ?? "",
      datasheetUrl: entry.datasheetUrl ?? "",
      purchaseUrl: entry.purchaseUrl ?? "",
      notes: entry.notes ?? "",
      continuousCurrent: "continuousCurrent" in entry ? entry.continuousCurrent?.toString() ?? "" : "",
      burstCurrent: "burstCurrent" in entry ? entry.burstCurrent?.toString() ?? "" : "",
      minVoltage: "minVoltage" in entry ? entry.minVoltage?.toString() ?? "" : "",
      maxVoltage: "maxVoltage" in entry ? entry.maxVoltage?.toString() ?? "" : "",
      escWeight: "weight" in entry ? entry.weight?.toString() ?? "" : "",
      chemistry: "chemistry" in entry ? entry.chemistry ?? "" : "",
      cellCount: "cellCount" in entry ? entry.cellCount?.toString() ?? "" : "",
      capacityMah: "capacityMah" in entry ? entry.capacityMah?.toString() ?? "" : "",
      dischargeC: "dischargeC" in entry ? entry.dischargeC?.toString() ?? "" : "",
      batteryVoltage: "voltage" in entry ? entry.voltage?.toString() ?? "" : "",
      batteryWeight: "weight" in entry ? entry.weight?.toString() ?? "" : "",
      kvRating: "kvRating" in entry ? entry.kvRating?.toString() ?? "" : "",
      statorSize: "statorSize" in entry ? entry.statorSize ?? "" : "",
      maxPower: "maxPower" in entry ? entry.maxPower?.toString() ?? "" : "",
      motorVoltage: "voltage" in entry ? entry.voltage?.toString() ?? "" : "",
      motorWeight: "weight" in entry ? entry.weight?.toString() ?? "" : ""
    };
    successMessage = "";
    errorMessage = "";
  };

  const handleDelete = async (entry: BaseEntry) => {
    if (!confirm(`Delete ${entry.name}?`)) return;
    isSaving = true;
    errorMessage = "";
    successMessage = "";

    try {
      const response = await fetch("/api/admin/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entry.id, category: selectedCategory })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Unable to delete product.");
      }

      if (form.id === entry.id) {
        resetForm();
      }
      await loadEntries();
      successMessage = "Product deleted.";
    } catch (error) {
      console.error(error);
      errorMessage = error instanceof Error ? error.message : "Unable to delete product.";
    } finally {
      isSaving = false;
    }
  };

  onMount(loadEntries);
</script>

<svelte:head>
  <title>Admin · Product Manager</title>
</svelte:head>

<section class="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
  <header class="flex flex-col gap-3">
    <p class="text-sm uppercase tracking-[0.32em] text-slate-400">Admin</p>
    <h1 class="text-3xl font-semibold text-slate-100">ESC, battery, and motor manager</h1>
    <p class="max-w-3xl text-sm text-slate-300">
      Choose a category to manage product data. Use the form to add new entries or edit existing
      items, including CAD, datasheet, and purchase links.
    </p>
  </header>

  <div class="flex flex-wrap gap-3">
    {#each categoryOptions as option}
      <button
        class={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
          selectedCategory === option.id
            ? "border-sky-400 bg-sky-500/20 text-sky-100"
            : "border-slate-700 text-slate-300 hover:border-slate-500"
        }`}
        type="button"
        on:click={() => switchCategory(option.id)}
      >
        {option.label}
      </button>
    {/each}
  </div>

  <div class="rounded-2xl border border-slate-800 bg-slate-950/40 px-5 py-4 text-sm text-slate-300">
    <p class="font-semibold text-slate-100">
      {categoryOptions.find((option) => option.id === selectedCategory)?.label}
    </p>
    <p class="mt-1">
      {categoryOptions.find((option) => option.id === selectedCategory)?.description}
    </p>
  </div>

  <div class="grid gap-8 lg:grid-cols-[1.1fr_1.4fr]">
    <section class="rounded-3xl border border-white/10 bg-slate-950/40 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.35)]">
      <div class="flex items-center justify-between gap-4">
        <h2 class="text-lg font-semibold text-slate-100">{form.id ? "Edit product" : "Add new product"}</h2>
        {#if form.id}
          <button
            class="rounded-full border border-slate-700 px-4 py-1 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
            type="button"
            on:click={resetForm}
          >
            Clear edit
          </button>
        {/if}
      </div>

      <div class="mt-6 grid gap-4">
        <label class="flex flex-col gap-2 text-sm text-slate-200">
          Product name
          <input
            class="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white"
            placeholder="e.g. 35A BLHeli ESC"
            bind:value={form.name}
          />
        </label>

        <label class="flex flex-col gap-2 text-sm text-slate-200">
          Manufacturer
          <input
            class="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white"
            placeholder="Hobbywing"
            bind:value={form.manufacturer}
          />
        </label>

        {#if selectedCategory === "esc"}
          <div class="grid gap-4 md:grid-cols-2">
            <label class="flex flex-col gap-2 text-sm text-slate-200">
              Continuous current (A)
              <input
                class="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white"
                placeholder="35"
                bind:value={form.continuousCurrent}
              />
            </label>
            <label class="flex flex-col gap-2 text-sm text-slate-200">
              Burst current (A)
              <input
                class="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white"
                placeholder="45"
                bind:value={form.burstCurrent}
              />
            </label>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <label class="flex flex-col gap-2 text-sm text-slate-200">
              Min voltage (V)
              <input
                class="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white"
                placeholder="7.4"
                bind:value={form.minVoltage}
              />
            </label>
            <label class="flex flex-col gap-2 text-sm text-slate-200">
              Max voltage (V)
              <input
                class="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white"
                placeholder="25.2"
                bind:value={form.maxVoltage}
              />
            </label>
          </div>

          <label class="flex flex-col gap-2 text-sm text-slate-200">
            Weight (g)
            <input
              class="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white"
              placeholder="25"
              bind:value={form.escWeight}
            />
          </label>
        {:else if selectedCategory === "battery"}
          <div class="grid gap-4 md:grid-cols-2">
            <label class="flex flex-col gap-2 text-sm text-slate-200">
              Chemistry
              <input
                class="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white"
                placeholder="LiPo"
                bind:value={form.chemistry}
              />
            </label>
            <label class="flex flex-col gap-2 text-sm text-slate-200">
              Cell count
              <input
                class="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white"
                placeholder="6"
                bind:value={form.cellCount}
              />
            </label>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <label class="flex flex-col gap-2 text-sm text-slate-200">
              Capacity (mAh)
              <input
                class="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white"
                placeholder="1300"
                bind:value={form.capacityMah}
              />
            </label>
            <label class="flex flex-col gap-2 text-sm text-slate-200">
              Discharge C rating
              <input
                class="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white"
                placeholder="75"
                bind:value={form.dischargeC}
              />
            </label>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <label class="flex flex-col gap-2 text-sm text-slate-200">
              Nominal voltage (V)
              <input
                class="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white"
                placeholder="22.2"
                bind:value={form.batteryVoltage}
              />
            </label>
            <label class="flex flex-col gap-2 text-sm text-slate-200">
              Weight (g)
              <input
                class="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white"
                placeholder="180"
                bind:value={form.batteryWeight}
              />
            </label>
          </div>
        {:else}
          <div class="grid gap-4 md:grid-cols-2">
            <label class="flex flex-col gap-2 text-sm text-slate-200">
              KV rating
              <input
                class="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white"
                placeholder="1950"
                bind:value={form.kvRating}
              />
            </label>
            <label class="flex flex-col gap-2 text-sm text-slate-200">
              Stator size
              <input
                class="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white"
                placeholder="2306"
                bind:value={form.statorSize}
              />
            </label>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <label class="flex flex-col gap-2 text-sm text-slate-200">
              Max power (W)
              <input
                class="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white"
                placeholder="950"
                bind:value={form.maxPower}
              />
            </label>
            <label class="flex flex-col gap-2 text-sm text-slate-200">
              Voltage (V)
              <input
                class="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white"
                placeholder="22.2"
                bind:value={form.motorVoltage}
              />
            </label>
          </div>

          <label class="flex flex-col gap-2 text-sm text-slate-200">
            Weight (g)
            <input
              class="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white"
              placeholder="32"
              bind:value={form.motorWeight}
            />
          </label>
        {/if}

        <div class="grid gap-4">
          <label class="flex flex-col gap-2 text-sm text-slate-200">
            CAD file URL
            <input
              class="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white"
              placeholder="https://..."
              bind:value={form.cadUrl}
            />
          </label>
          <label class="flex flex-col gap-2 text-sm text-slate-200">
            Datasheet URL
            <input
              class="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white"
              placeholder="https://..."
              bind:value={form.datasheetUrl}
            />
          </label>
          <label class="flex flex-col gap-2 text-sm text-slate-200">
            Purchase URL
            <input
              class="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white"
              placeholder="https://..."
              bind:value={form.purchaseUrl}
            />
          </label>
        </div>

        <label class="flex flex-col gap-2 text-sm text-slate-200">
          Notes
          <textarea
            class="min-h-[110px] rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white"
            placeholder="Optional notes for internal context."
            bind:value={form.notes}
          ></textarea>
        </label>

        {#if errorMessage}
          <div class="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        {/if}
        {#if successMessage}
          <div class="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {successMessage}
          </div>
        {/if}

        <button
          class="rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          on:click={handleSubmit}
          disabled={isSaving}
        >
          {form.id ? "Save changes" : "Add product"}
        </button>
      </div>
    </section>

    <section class="rounded-3xl border border-white/10 bg-slate-950/40 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.35)]">
      <div class="flex items-center justify-between gap-4">
        <h2 class="text-lg font-semibold text-slate-100">Existing products</h2>
        <button
          class="rounded-full border border-slate-700 px-4 py-1 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
          type="button"
          on:click={loadEntries}
          disabled={isLoading}
        >
          Refresh
        </button>
      </div>

      {#if isLoading}
        <p class="mt-6 text-sm text-slate-300">Loading product data…</p>
      {:else if selectedCategory === "esc" && !escEntries.length}
        <p class="mt-6 text-sm text-slate-300">No ESC entries found yet.</p>
      {:else if selectedCategory === "battery" && !batteryEntries.length}
        <p class="mt-6 text-sm text-slate-300">No battery entries found yet.</p>
      {:else if selectedCategory === "motor" && !motorEntries.length}
        <p class="mt-6 text-sm text-slate-300">No motor entries found yet.</p>
      {:else}
        <div class="mt-6 space-y-4">
          {#if selectedCategory === "esc"}
            {#each escEntries as entry}
              <article class="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 class="text-base font-semibold text-slate-100">{entry.name}</h3>
                    <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{entry.manufacturer || "Unknown manufacturer"}</p>
                  </div>
                  <div class="flex gap-2">
                    <button
                      class="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
                      type="button"
                      on:click={() => handleEdit(entry)}
                    >
                      Edit
                    </button>
                    <button
                      class="rounded-full border border-red-500/60 px-3 py-1 text-xs font-semibold text-red-200 transition hover:border-red-400"
                      type="button"
                      on:click={() => handleDelete(entry)}
                      disabled={isSaving}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div class="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
                  <span>Continuous current: {entry.continuousCurrent ?? "—"} A</span>
                  <span>Burst current: {entry.burstCurrent ?? "—"} A</span>
                  <span>Voltage: {entry.minVoltage ?? "—"}–{entry.maxVoltage ?? "—"} V</span>
                  <span>Weight: {entry.weight ?? "—"} g</span>
                </div>
              </article>
            {/each}
          {:else if selectedCategory === "battery"}
            {#each batteryEntries as entry}
              <article class="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 class="text-base font-semibold text-slate-100">{entry.name}</h3>
                    <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{entry.manufacturer || "Unknown manufacturer"}</p>
                  </div>
                  <div class="flex gap-2">
                    <button
                      class="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
                      type="button"
                      on:click={() => handleEdit(entry)}
                    >
                      Edit
                    </button>
                    <button
                      class="rounded-full border border-red-500/60 px-3 py-1 text-xs font-semibold text-red-200 transition hover:border-red-400"
                      type="button"
                      on:click={() => handleDelete(entry)}
                      disabled={isSaving}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div class="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
                  <span>Chemistry: {entry.chemistry ?? "—"}</span>
                  <span>Cells: {entry.cellCount ?? "—"}</span>
                  <span>Capacity: {entry.capacityMah ?? "—"} mAh</span>
                  <span>Discharge: {entry.dischargeC ?? "—"} C</span>
                  <span>Voltage: {entry.voltage ?? "—"} V</span>
                  <span>Weight: {entry.weight ?? "—"} g</span>
                </div>
              </article>
            {/each}
          {:else}
            {#each motorEntries as entry}
              <article class="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 class="text-base font-semibold text-slate-100">{entry.name}</h3>
                    <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{entry.manufacturer || "Unknown manufacturer"}</p>
                  </div>
                  <div class="flex gap-2">
                    <button
                      class="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
                      type="button"
                      on:click={() => handleEdit(entry)}
                    >
                      Edit
                    </button>
                    <button
                      class="rounded-full border border-red-500/60 px-3 py-1 text-xs font-semibold text-red-200 transition hover:border-red-400"
                      type="button"
                      on:click={() => handleDelete(entry)}
                      disabled={isSaving}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div class="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
                  <span>KV: {entry.kvRating ?? "—"}</span>
                  <span>Stator: {entry.statorSize ?? "—"}</span>
                  <span>Max power: {entry.maxPower ?? "—"} W</span>
                  <span>Voltage: {entry.voltage ?? "—"} V</span>
                  <span>Weight: {entry.weight ?? "—"} g</span>
                </div>
              </article>
            {/each}
          {/if}
        </div>
      {/if}
    </section>
  </div>
</section>

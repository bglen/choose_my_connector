<script lang="ts">
  import { browser } from "$app/environment";
  import { onMount } from "svelte";
  import { DISTRIBUTORS } from "$lib/constants/distributors";

  type DistributorLink = { distributor: string; purchaseUrl: string };
  type SeriesResult = {
    id: number;
    name: string;
    manufacturer?: string | null;
    connectionType?: string | null;
    waterproof?: number | null;
    panelMount?: number | null;
    pitch?: number | null;
    maxCurrent?: number | null;
    maxVoltage?: number | null;
    datasheetUrl?: string | null;
    cadUrl?: string | null;
    imageUrl?: string | null;
    notes?: string | null;
    distributorLinks?: DistributorLink[];
  };

  type PartPurchaseLink = { distributor: string; url: string; slug?: string };
  type PricePreview = { distributor?: string; minQty?: number; unitPrice?: number; currency?: string | null };
  type PartResult = {
    id: number;
    seriesId: number;
    partNumber?: string | null;
    positions?: number | null;
    rows?: number | null;
    pitch?: number | null;
    datasheetUrl?: string | null;
    cadUrl?: string | null;
    ecadUrl?: string | null;
    imageUrl?: string | null;
    purchaseLinks?: PartPurchaseLink[];
    lowestPrice?: PricePreview | null;
  };

  type SeriesFilters = {
    types: string[];
    distributors: string[];
    waterproof: "" | "1" | "0";
    panel: "" | "1" | "0";
    minContacts: number | "";
    maxContacts: number | "";
    current: number | "";
    voltage: number | "";
  };

  type PartFilters = {
    query: string;
    positions: number | "";
    rows: number | "";
  };

  const connectionTypes: string[] = ["Wire-to-board", "Wire-to-wire", "Board-to-board"];
  const fallbackImage = "/images/default_connector.jpg";

  const defaultSeriesFilters: SeriesFilters = {
    types: [],
    distributors: [],
    waterproof: "",
    panel: "",
    minContacts: "",
    maxContacts: "",
    current: "",
    voltage: ""
  };

  let seriesFilters: SeriesFilters = { ...defaultSeriesFilters };
  let seriesResults: SeriesResult[] = [];
  let hasSearchedSeries = false;
  let seriesErrorMessage = "";
  let isSearchingSeries = false;
  let searchSection: HTMLElement | null = null;

  let selectedSeries: SeriesResult | null = null;

  let partFilters: PartFilters = { query: "", positions: "", rows: "" };
  let partResults: PartResult[] = [];
  let hasSearchedParts = false;
  let partErrorMessage = "";
  let isSearchingParts = false;
  let selectedPart: PartResult | null = null;

  let showReportForm = false;
  let isSubmittingReport = false;
  let reportError = "";
  let reportSuccess = "";
  let reportForm = {
    connectorName: "",
    context: "",
    details: "",
    email: ""
  };
  let theme: "light" | "dark" = "light";

  const toNumber = (value: string | number | null) => {
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  };

  type SeriesNumericKey = "minContacts" | "maxContacts" | "current" | "voltage";

  function setSeriesNumberFilter(key: SeriesNumericKey, rawValue: string | number) {
    const numeric = toNumber(rawValue);

    if (numeric === null) {
      seriesFilters = { ...seriesFilters, [key]: "" };
      return;
    }

    let value = Math.max(0, numeric);

    if (key === "maxContacts") {
      const minVal = toNumber(seriesFilters.minContacts as number | "");
      if (minVal !== null && value < minVal) value = minVal;
    }

    if (key === "minContacts") {
      const maxVal = toNumber(seriesFilters.maxContacts as number | "");
      if (maxVal !== null && maxVal < value) {
        seriesFilters = { ...seriesFilters, [key]: value, maxContacts: value };
        return;
      }
    }

    seriesFilters = { ...seriesFilters, [key]: value };
  }

  function setPartNumberFilter(key: "positions" | "rows", rawValue: string | number) {
    const numeric = toNumber(rawValue);
    partFilters = { ...partFilters, [key]: numeric === null ? "" : Math.max(0, numeric) };
  }

  function applyTheme(nextTheme: "light" | "dark") {
    theme = nextTheme;

    if (browser) {
      document.documentElement.dataset.theme = nextTheme;
      localStorage.setItem("cmc-theme", nextTheme);
    }
  }

  function toggleTheme() {
    applyTheme(theme === "light" ? "dark" : "light");
  }

  onMount(() => {
    if (!browser) return;

    const saved = localStorage.getItem("cmc-theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(saved ?? (prefersDark ? "dark" : "light"));
  });

  function scrollToSearch() {
    searchSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function buildSeriesSearchParams() {
    const params = new URLSearchParams();

    if (seriesFilters.types.length) {
      seriesFilters.types.forEach((type) => params.append("type", type));
    }

    if (seriesFilters.distributors.length) {
      seriesFilters.distributors.forEach((distributor) => params.append("distributor", distributor));
    }

    (["waterproof", "panel"] as const).forEach((key) => {
      const value = seriesFilters[key];
      if (value !== "") params.append(key, String(value));
    });
    (["minContacts", "maxContacts", "current", "voltage"] as const).forEach((key) => {
      const value = seriesFilters[key];
      if (value !== "" && value !== null && value !== undefined) {
        params.append(key, String(value));
      }
    });

    return params;
  }

  function buildPartSearchParams() {
    const params = new URLSearchParams();

    if (!selectedSeries?.id) return params;

    params.set("seriesId", String(selectedSeries.id));

    if (partFilters.query.trim()) params.set("q", partFilters.query.trim());
    if (partFilters.positions !== "") params.set("positions", String(partFilters.positions));
    if (partFilters.rows !== "") params.set("rows", String(partFilters.rows));

    return params;
  }

  function toggleType(type: string) {
    const hasType = seriesFilters.types.includes(type);
    seriesFilters = {
      ...seriesFilters,
      types: hasType ? seriesFilters.types.filter((t) => t !== type) : [...seriesFilters.types, type]
    };
  }

  function toggleDistributor(slug: string) {
    const hasDistributor = seriesFilters.distributors.includes(slug);
    seriesFilters = {
      ...seriesFilters,
      distributors: hasDistributor
        ? seriesFilters.distributors.filter((value) => value !== slug)
        : [...seriesFilters.distributors, slug]
    };
  }

  async function searchSeries() {
    const params = buildSeriesSearchParams();
    seriesErrorMessage = "";
    isSearchingSeries = true;

    try {
      const res = await fetch(`/api/search?${params.toString()}`);

      if (!res.ok) {
        seriesErrorMessage = "Search failed — please try again.";
        seriesResults = [];
        return;
      }

      seriesResults = await res.json();
      hasSearchedSeries = true;
    } catch (error) {
      console.error("Search error", error);
      seriesErrorMessage = "Unable to reach the search API.";
      seriesResults = [];
    } finally {
      isSearchingSeries = false;
    }
  }

  async function searchParts() {
    if (!selectedSeries?.id) {
      partErrorMessage = "Choose a connector series first.";
      return;
    }

    const params = buildPartSearchParams();
    partErrorMessage = "";
    isSearchingParts = true;

    try {
      const res = await fetch(`/api/parts?${params.toString()}`);

      if (!res.ok) {
        partErrorMessage = "Part search failed — please try again.";
        partResults = [];
        hasSearchedParts = true;
        return;
      }

      partResults = await res.json();
      hasSearchedParts = true;

      if (selectedPart) {
        selectedPart = partResults.find((entry) => entry.id === selectedPart?.id) ?? null;
      }
    } catch (error) {
      console.error("Part search error", error);
      partErrorMessage = "Unable to reach the part search API.";
      partResults = [];
    } finally {
      isSearchingParts = false;
    }
  }

  function selectSeries(series: SeriesResult) {
    selectedSeries = series;
    selectedPart = null;
    partResults = [];
    partFilters = { query: "", positions: "", rows: "" };
    hasSearchedParts = false;
    partErrorMessage = "";
    searchParts();
  }

  function clearSeriesSelection() {
    selectedSeries = null;
    selectedPart = null;
    partResults = [];
    partFilters = { query: "", positions: "", rows: "" };
    hasSearchedParts = false;
    partErrorMessage = "";
  }

  function selectPart(part: PartResult) {
    selectedPart = part;
  }

  function clearPartFilters() {
    partFilters = { query: "", positions: "", rows: "" };
  }

  async function submitReport() {
    reportError = "";
    reportSuccess = "";
    isSubmittingReport = true;

    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportForm)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        reportError = data.error || "We couldn't send that report. Please try again.";
        return;
      }

      reportSuccess = "Thanks — your report was sent.";
      reportForm = {
        connectorName: "",
        context: "",
        details: "",
        email: ""
      };
    } catch (error) {
      console.error("Report error", error);
      reportError = "We couldn't send that report. Please try again.";
    } finally {
      isSubmittingReport = false;
    }
  }
</script>

<div class="page-shell">
  <div class="page-glow page-glow--left"></div>
  <div class="page-glow page-glow--right"></div>

  <div class="page-container">
    <section class="hero-panel">
      <h1 class="hero-title">Search millions of electrical connectors easilly.</h1>
      <p class="lede">
        Find the right part - even if you don't know what to search for.
      </p>
      <div class="hero-actions hero-actions--inline">
        <input
          class="hero-search"
          type="text"
          placeholder="Describe your application needs"
          aria-label="Describe your application needs"
        />
      </div>
      <div class="hero-stats">
        <div class="stat-flow">
          <div class="stat-chip">Choose a series</div>
          <span class="stat-arrow" aria-hidden="true">→</span>
          <div class="stat-chip">Pick a part</div>
          <span class="stat-arrow" aria-hidden="true">→</span>
          <div class="stat-chip">Download ECAD data</div>
        </div>
      </div>
    </section>

    <section class="stack" id="search" bind:this={searchSection}>
      <div class="content-stack space-y-6">
        <section class="panelized space-y-4 rounded-xl bg-slate-50 p-5 shadow-sm ring-1 ring-slate-200">
          <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 1</p>
              <h2 class="text-lg font-semibold text-slate-900">Choose a connector series</h2>
              <p class="text-sm text-slate-700">Filter down the families, then pick the one you want to buy parts from.</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button class="ghost-button" type="button" on:click={toggleTheme}>
                {theme === "light" ? "Dark mode" : "Light mode"}
              </button>
              {#if selectedSeries}
                <button
                  class="self-start rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                  type="button"
                  on:click={clearSeriesSelection}
                >
                  Change series
                </button>
              {/if}
            </div>
          </div>

          {#if selectedSeries}
            <div class="flex gap-4 rounded-lg bg-white p-4 ring-1 ring-slate-200">
              <div class="flex h-16 w-16 items-center justify-center overflow-hidden rounded bg-slate-50 ring-1 ring-slate-200">
                <img
                  alt={selectedSeries.name}
                  class="h-full w-full object-contain"
                  src={selectedSeries.imageUrl || fallbackImage}
                  on:error={(event) => {
                    const target = event.target;
                    if (target instanceof HTMLImageElement && target.src !== location.origin + fallbackImage) {
                      target.src = fallbackImage;
                    }
                  }}
                />
              </div>
              <div class="flex-1 space-y-1">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="text-base font-semibold text-slate-900">{selectedSeries.name}</p>
                  {#if selectedSeries.manufacturer}
                    <span class="text-sm text-slate-600">· {selectedSeries.manufacturer}</span>
                  {/if}
                </div>
                {#if selectedSeries.connectionType}
                  <p class="text-sm text-slate-700">{selectedSeries.connectionType}</p>
                {/if}
                <p class="text-xs text-slate-500">Now search for the specific part within this family.</p>
              </div>
            </div>
          {:else}
            <div class="filters space-y-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <label class="block space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <span class="text-sm font-semibold text-slate-800">Connection type</span>
                  <div class="space-y-2">
                    {#each connectionTypes as type}
                      <label class="flex items-center gap-2 text-sm text-slate-800">
                        <input
                          type="checkbox"
                          class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={seriesFilters.types.includes(type)}
                          on:change={() => toggleType(type)}
                        />
                        <span>{type.replaceAll("-", " ")}</span>
                      </label>
                    {/each}
                  </div>
                  <p class="text-xs text-slate-500">Click to select any mating styles you want to include.</p>
                </label>

                <label class="block space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <span class="text-sm font-semibold text-slate-800">Distributors</span>
                  <div class="space-y-2">
                    {#each DISTRIBUTORS as distributor}
                      <label class="flex items-center gap-2 text-sm text-slate-800">
                        <input
                          type="checkbox"
                          class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={seriesFilters.distributors.includes(distributor.slug)}
                          on:change={() => toggleDistributor(distributor.slug)}
                        />
                        <span>{distributor.label}</span>
                      </label>
                    {/each}
                  </div>
                  <p class="text-xs text-slate-500">Limit results to series with purchase links from these sellers.</p>
                </label>
              </div>

              <div class="grid gap-4 md:grid-cols-2" aria-label="Environmental filters">
                <label class="block space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <span class="text-sm font-semibold text-slate-800">Waterproof</span>
                  <select
                    class="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    bind:value={seriesFilters.waterproof}
                  >
                    <option value="">Waterproof?</option>
                    <option value="1">Yes</option>
                    <option value="0">No</option>
                  </select>
                  <p class="text-xs text-slate-500">Surface sealed, IP-rated families for outdoor or harsh environments.</p>
                </label>

                <label class="block space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <span class="text-sm font-semibold text-slate-800">Panel mount</span>
                  <select
                    class="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    bind:value={seriesFilters.panel}
                  >
                    <option value="">Panel Mount?</option>
                    <option value="1">Yes</option>
                    <option value="0">No</option>
                  </select>
                  <p class="text-xs text-slate-500">Limit to connectors with mounting hardware for front or rear panels.</p>
                </label>
              </div>

              <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4" aria-label="Electrical and contact ranges">
                <label class="block space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <span class="text-sm font-semibold text-slate-800">Minimum contacts</span>
                  <input
                    class="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    type="number"
                    min="0"
                    placeholder="Min contacts"
                    bind:value={seriesFilters.minContacts}
                    on:input={(event) =>
                      setSeriesNumberFilter("minContacts", (event.currentTarget as HTMLInputElement).value)
                    }
                  />
                  <p class="text-xs text-slate-500">Use min positions to match the smallest pole count you can support.</p>
                </label>

                <label class="block space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <span class="text-sm font-semibold text-slate-800">Maximum contacts</span>
                  <input
                    class="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    type="number"
                    min={seriesFilters.minContacts === "" ? 0 : seriesFilters.minContacts}
                    placeholder="Max contacts"
                    bind:value={seriesFilters.maxContacts}
                    on:input={(event) =>
                      setSeriesNumberFilter("maxContacts", (event.currentTarget as HTMLInputElement).value)
                    }
                  />
                  <p class="text-xs text-slate-500">Cap the position count to keep row/column layouts manageable.</p>
                </label>

                <label class="block space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <span class="text-sm font-semibold text-slate-800">Minimum current (A)</span>
                  <input
                    class="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    type="number"
                    min="0"
                    placeholder="Min current (A)"
                    bind:value={seriesFilters.current}
                    on:input={(event) =>
                      setSeriesNumberFilter("current", (event.currentTarget as HTMLInputElement).value)
                    }
                  />
                  <p class="text-xs text-slate-500">Enter the per-contact current you need to avoid undersized series.</p>
                </label>

                <label class="block space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <span class="text-sm font-semibold text-slate-800">Minimum voltage (V)</span>
                  <input
                    class="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    type="number"
                    min="0"
                    placeholder="Min voltage (V)"
                    bind:value={seriesFilters.voltage}
                    on:input={(event) =>
                      setSeriesNumberFilter("voltage", (event.currentTarget as HTMLInputElement).value)
                    }
                  />
                  <p class="text-xs text-slate-500">Set the minimum voltage rating to screen out low-insulation options.</p>
                </label>
              </div>

              <div class="flex flex-wrap gap-3">
                <button
                  class="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  on:click={searchSeries}
                  disabled={isSearchingSeries}
                >
                  {isSearchingSeries ? "Searching..." : "Search series"}
                </button>
                <button
                  class="rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                  type="button"
                  on:click={() => {
                    seriesFilters = { ...defaultSeriesFilters };
                    seriesResults = [];
                    hasSearchedSeries = false;
                    seriesErrorMessage = "";
                  }}
                >
                  Clear filters
                </button>
              </div>
            </div>

            <div class="space-y-3">
              {#if seriesErrorMessage}
                <p class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{seriesErrorMessage}</p>
              {/if}

              {#if hasSearchedSeries && seriesResults.length === 0 && !seriesErrorMessage}
                <p class="text-sm text-slate-600">No connector series matched those filters.</p>
              {:else if seriesResults.length === 0 && !seriesErrorMessage}
                <p class="text-sm text-slate-600">Start searching to see connector series.</p>
              {/if}

              {#each seriesResults as item}
                <div class="space-y-3 rounded-lg border border-slate-200 p-4 shadow-sm">
                  <div class="flex flex-col gap-4 sm:flex-row">
                    <div class="flex h-24 w-24 items-center justify-center overflow-hidden rounded bg-white ring-1 ring-slate-200">
                      <img
                        class="h-full w-full object-contain"
                        src={item.imageUrl || fallbackImage}
                        alt={item.name}
                        on:error={(event) => {
                          const target = event.target;
                          if (target instanceof HTMLImageElement && target.src !== location.origin + fallbackImage) {
                            target.src = fallbackImage;
                          }
                        }}
                      />
                    </div>

                    <div class="flex-1 space-y-2">
                      <div class="flex flex-wrap items-center gap-2">
                        <h3 class="text-lg font-semibold text-slate-900">{item.name}</h3>
                        {#if item.manufacturer}
                          <span class="text-sm font-medium text-slate-600">· {item.manufacturer}</span>
                        {/if}
                        <button
                          class="ml-auto rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          type="button"
                          on:click={() => selectSeries(item)}
                        >
                          Select this series
                        </button>
                      </div>

                      {#if item.connectionType}
                        <p class="text-sm text-slate-700">{item.connectionType}</p>
                      {/if}

                      <div class="grid gap-2 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
                        {#if item.pitch !== null && item.pitch !== undefined}
                          <p>Pitch: {item.pitch} mm</p>
                        {/if}
                        {#if item.maxCurrent !== null && item.maxCurrent !== undefined}
                          <p>Up to {item.maxCurrent} A per contact</p>
                        {/if}
                        {#if item.maxVoltage !== null && item.maxVoltage !== undefined}
                          <p>Up to {item.maxVoltage} V</p>
                        {/if}
                        {#if item.waterproof !== null && item.waterproof !== undefined}
                          <p>Waterproof: {item.waterproof ? "Yes" : "No"}</p>
                        {/if}
                        {#if item.panelMount !== null && item.panelMount !== undefined}
                          <p>Panel mount: {item.panelMount ? "Yes" : "No"}</p>
                        {/if}
                      </div>

                      {#if item.notes}
                        <p class="text-sm text-slate-600">{item.notes}</p>
                      {/if}

                      {#if item.distributorLinks && item.distributorLinks.length}
                        <div class="flex flex-wrap gap-2">
                          {#each item.distributorLinks as link}
                            <a
                              class="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 transition hover:border-blue-300 hover:bg-blue-100"
                              href={link.purchaseUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Buy at {link.distributor}
                            </a>
                          {/each}
                        </div>
                      {/if}

                      <div class="flex flex-wrap gap-3 text-sm font-semibold text-blue-700">
                        {#if item.datasheetUrl}
                          <a class="hover:underline" href={item.datasheetUrl} target="_blank" rel="noreferrer">
                            Datasheet
                          </a>
                        {/if}
                        {#if item.cadUrl}
                          <a class="hover:underline" href={item.cadUrl} target="_blank" rel="noreferrer">CAD</a>
                        {/if}
                      </div>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </section>

        {#if selectedSeries}
          <section class="panelized space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 2</p>
                <h2 class="text-lg font-semibold text-slate-900">
                  Search parts in {selectedSeries.name}
                </h2>
                <p class="text-sm text-slate-700">
                  Look up the exact connector part number, then pick it to see purchase and CAD/ECAD links.
                </p>
              </div>
              <div class="flex gap-2">
                <button
                  class="rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                  type="button"
                  on:click={() => {
                    clearPartFilters();
                    searchParts();
                  }}
                >
                  Reset part filters
                </button>
                <button
                  class="rounded bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-80"
                  type="button"
                  on:click={searchParts}
                  disabled={isSearchingParts}
                >
                  {isSearchingParts ? "Searching..." : "Search parts"}
                </button>
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-3">
              <label class="space-y-1">
                <span class="text-sm font-semibold text-slate-800">Part number</span>
                <input
                  class="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  placeholder="e.g. XH-2P header"
                  bind:value={partFilters.query}
                />
                <p class="text-xs text-slate-500">Partial matches work — type any part of the code.</p>
              </label>
              <label class="space-y-1">
                <span class="text-sm font-semibold text-slate-800">Positions</span>
                <input
                  class="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  type="number"
                  min="0"
                  placeholder="Contact count"
                  bind:value={partFilters.positions}
                  on:input={(event) =>
                    setPartNumberFilter("positions", (event.currentTarget as HTMLInputElement).value)
                  }
                />
                <p class="text-xs text-slate-500">Match the pin count for your mating pair.</p>
              </label>
              <label class="space-y-1">
                <span class="text-sm font-semibold text-slate-800">Rows</span>
                <input
                  class="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  type="number"
                  min="0"
                  placeholder="Rows"
                  bind:value={partFilters.rows}
                  on:input={(event) => setPartNumberFilter("rows", (event.currentTarget as HTMLInputElement).value)}
                />
                <p class="text-xs text-slate-500">Use rows to narrow single vs dual-row variants.</p>
              </label>
            </div>

            <div class="space-y-3">
              {#if partErrorMessage}
                <p class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{partErrorMessage}</p>
              {/if}

              {#if hasSearchedParts && partResults.length === 0 && !partErrorMessage}
                <p class="text-sm text-slate-600">No parts found in this series with those filters.</p>
              {:else if partResults.length === 0 && !partErrorMessage}
                <p class="text-sm text-slate-600">Search to see individual part numbers.</p>
              {/if}

              {#each partResults as part}
                <div class="space-y-3 rounded-lg border border-slate-200 p-4 shadow-sm">
                  <div class="flex flex-col gap-4 sm:flex-row">
                    <div class="flex h-24 w-24 items-center justify-center overflow-hidden rounded bg-slate-50 ring-1 ring-slate-200">
                      <img
                        class="h-full w-full object-contain"
                        src={part.imageUrl || selectedSeries.imageUrl || fallbackImage}
                        alt={part.partNumber}
                        on:error={(event) => {
                          const target = event.target;
                          if (target instanceof HTMLImageElement && target.src !== location.origin + fallbackImage) {
                            target.src = fallbackImage;
                          }
                        }}
                      />
                    </div>

                    <div class="flex-1 space-y-2">
                      <div class="flex flex-wrap items-center gap-2">
                        <h3 class="text-lg font-semibold text-slate-900">{part.partNumber || "Unnamed part"}</h3>
                        {#if part.positions !== null && part.positions !== undefined}
                          <span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                            {part.positions} positions
                          </span>
                        {/if}
                        {#if part.rows !== null && part.rows !== undefined}
                          <span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                            {part.rows} rows
                          </span>
                        {/if}
                        <button
                          class="ml-auto rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                          type="button"
                          on:click={() => selectPart(part)}
                        >
                          {selectedPart?.id === part.id ? "Selected" : "Use this part"}
                        </button>
                      </div>

                      <div class="grid gap-2 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
                        {#if part.pitch !== null && part.pitch !== undefined}
                          <p>Pitch: {part.pitch} mm</p>
                        {/if}
                        {#if part.datasheetUrl}
                          <a
                            class="text-blue-700 hover:underline"
                            href={part.datasheetUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Datasheet
                          </a>
                        {/if}
                        {#if part.lowestPrice}
                          <p>
                            Starts at {part.lowestPrice.unitPrice} {part.lowestPrice.currency} /ea
                            {#if part.lowestPrice.minQty} @ {part.lowestPrice.minQty}+ {/if}
                          </p>
                        {/if}
                      </div>

                      {#if part.purchaseLinks && part.purchaseLinks.length}
                        <div class="flex flex-wrap gap-2">
                          {#each part.purchaseLinks as link}
                            <a
                              class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Buy at {link.distributor}
                            </a>
                          {/each}
                        </div>
                      {/if}

                      <div class="flex flex-wrap gap-3 text-sm font-semibold text-blue-700">
                        {#if part.cadUrl}
                          <a class="hover:underline" href={part.cadUrl} target="_blank" rel="noreferrer">Download CAD</a>
                        {/if}
                        {#if part.ecadUrl}
                          <a class="hover:underline" href={part.ecadUrl} target="_blank" rel="noreferrer">Get ECAD data</a>
                        {/if}
                      </div>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </section>
        {/if}

        {#if selectedPart}
          <section class="panelized panelized-accent space-y-3 rounded-xl bg-slate-900 p-5 text-white shadow-md">
            <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-emerald-200">Step 3</p>
                <h2 class="text-lg font-semibold">Checkout & downloads</h2>
                <p class="text-sm text-slate-200">
                  You picked {selectedPart.partNumber || "this part"} from {selectedSeries?.name}. Grab a CAD/ECAD
                  package or jump to a distributor.
                </p>
              </div>
              <button
                class="self-start rounded border border-white/30 px-3 py-2 text-xs font-semibold text-white transition hover:border-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-900"
                type="button"
                on:click={() => (selectedPart = null)}
              >
                Pick a different part
              </button>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div class="space-y-2 rounded-lg bg-white/5 p-4">
                <p class="text-sm font-semibold text-white">Buy this part</p>
                {#if selectedPart.purchaseLinks && selectedPart.purchaseLinks.length}
                  <div class="flex flex-wrap gap-2">
                    {#each selectedPart.purchaseLinks as link}
                      <a
                        class="rounded-full bg-emerald-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-900"
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {link.distributor}
                      </a>
                    {/each}
                  </div>
                {:else}
                  <p class="text-xs text-slate-200">No distributor links yet — try a different part or series.</p>
                {/if}
              </div>

              <div class="space-y-2 rounded-lg bg-white/5 p-4">
                <p class="text-sm font-semibold text-white">Downloads</p>
                <div class="flex flex-wrap gap-2">
                  {#if selectedPart.cadUrl}
                    <a
                      class="rounded bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-slate-900"
                      href={selectedPart.cadUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download CAD
                    </a>
                  {/if}
                  {#if selectedPart.ecadUrl}
                    <a
                      class="rounded border border-white/40 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-slate-900"
                      href={selectedPart.ecadUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Get ECAD data
                    </a>
                  {/if}
                  {#if !selectedPart.cadUrl && !selectedPart.ecadUrl}
                    <p class="text-xs text-slate-200">No CAD/ECAD links yet for this part.</p>
                  {/if}
                </div>
              </div>
            </div>
          </section>
        {/if}

        <section class="panelized space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm" id="report">
          <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p class="text-sm font-semibold text-amber-900">See something wrong in the database?</p>
              <p class="text-sm text-amber-800">
                Share the series name and what's incorrect so we can correct it quickly.
              </p>
            </div>
            <button
              class="self-start rounded border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 shadow-sm transition hover:border-amber-400 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
              type="button"
              on:click={() => {
                showReportForm = !showReportForm;
                reportError = "";
                reportSuccess = "";
              }}
            >
              {showReportForm ? "Hide report form" : "Report a database issue"}
            </button>
          </div>

          {#if showReportForm}
            <form class="space-y-3 rounded-lg bg-white p-4 shadow-sm" on:submit|preventDefault={submitReport}>
              <div class="grid gap-3 md:grid-cols-2">
                <label class="block space-y-1">
                  <span class="text-sm font-semibold text-slate-800">Connector series or part</span>
                  <input
                    class="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="e.g. JST XH header"
                    bind:value={reportForm.connectorName}
                  />
                  <p class="text-xs text-slate-500">Optional but helps us find the record fast.</p>
                </label>

                <label class="block space-y-1">
                  <span class="text-sm font-semibold text-slate-800">Where did you see the problem?</span>
                  <input
                    class="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="Filters you used, link, or page section"
                    bind:value={reportForm.context}
                  />
                  <p class="text-xs text-slate-500">Filters, part numbers, or any other context.</p>
                </label>
              </div>

              <label class="block space-y-1">
                <span class="text-sm font-semibold text-slate-800">What looks wrong?</span>
                <textarea
                  class="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  rows="4"
                  placeholder="Describe the incorrect data and what you expected."
                  bind:value={reportForm.details}
                  required
                ></textarea>
                <p class="text-xs text-slate-500">Include the wrong value and what it should be.</p>
              </label>

              <label class="block space-y-1 md:w-1/2">
                <span class="text-sm font-semibold text-slate-800">Email (optional)</span>
                <input
                  class="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  type="email"
                  placeholder="you@example.com"
                  bind:value={reportForm.email}
                />
                <p class="text-xs text-slate-500">Only used if we need more detail.</p>
              </label>

              {#if reportError}
                <p class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{reportError}</p>
              {/if}

              {#if reportSuccess}
                <p class="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{reportSuccess}</p>
              {/if}

              <div class="flex flex-wrap gap-3">
                <button
                  class="rounded bg-amber-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-80"
                  type="submit"
                  disabled={isSubmittingReport}
                >
                  {isSubmittingReport ? "Sending..." : "Send report"}
                </button>
                <button
                  class="rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                  type="button"
                  on:click={() => {
                    reportForm = { connectorName: "", context: "", details: "", email: "" };
                    reportError = "";
                    reportSuccess = "";
                  }}
                >
                  Clear form
                </button>
              </div>
            </form>
          {/if}
        </section>
      </div>
    </section>

    <footer class="site-footer">
      <p class="brand-title">Choose My Connector</p>
      <p class="muted">Built for engineers who want fewer tabs and faster decisions.</p>
      <div class="footer-links">
        <button class="ghost-button" type="button" on:click={() => (showReportForm = true)}>
          Report an issue
        </button>
      </div>
    </footer>
  </div>
</div>

<style>
  .page-shell {
    position: relative;
    min-height: 100vh;
    background: var(--page-gradient);
    color: var(--text-primary);
    overflow: hidden;
  }

  .page-glow {
    position: absolute;
    width: 520px;
    height: 520px;
    border-radius: 999px;
    filter: blur(120px);
    opacity: 0.55;
    pointer-events: none;
    z-index: 0;
  }

  .page-glow--left {
    top: -180px;
    left: -120px;
    background: radial-gradient(circle, rgba(124, 58, 237, 0.3), transparent 55%);
  }

  .page-glow--right {
    bottom: -220px;
    right: -160px;
    background: radial-gradient(circle, rgba(6, 182, 212, 0.28), transparent 60%);
  }

  .page-container {
    position: relative;
    z-index: 1;
    max-width: 1120px;
    margin: 0 auto;
    padding: 28px 18px 72px;
    display: flex;
    flex-direction: column;
    gap: 22px;
  }

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
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
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

  .brand-subtitle {
    margin: 2px 0 0;
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .top-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .hero-panel {
    position: relative;
    overflow: hidden;
    text-align: center;
    padding: 48px 32px;
    border-radius: 22px;
    border: 1px solid var(--border);
    background: linear-gradient(135deg, color-mix(in srgb, var(--panel) 90%, transparent), rgba(124, 58, 237, 0.08));
    box-shadow: var(--card-shadow);
  }

  .hero-panel::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 30% 30%, rgba(124, 58, 237, 0.1), transparent 45%),
      radial-gradient(circle at 70% 10%, rgba(6, 182, 212, 0.12), transparent 40%);
    pointer-events: none;
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
  }

  .hero-title {
    margin: 10px auto 6px;
    font-size: clamp(2rem, 4vw, 2.8rem);
    line-height: 1.12;
    max-width: 780px;
  }

  .lede {
    margin: 0 auto;
    max-width: 760px;
    color: var(--text-muted);
    font-size: 1.03rem;
  }

  .hero-actions {
    margin-top: 20px;
    display: grid;
    justify-content: center;
  }

  .hero-actions--inline {
    grid-template-columns: minmax(260px, 720px);
  }

  .hero-search {
    width: 100%;
    padding: 16px 18px;
    border-radius: 18px;
    border: 1px solid color-mix(in srgb, var(--accent) 15%, var(--border));
    background: #ffffff;
    box-shadow: 0 18px 48px rgba(12, 26, 75, 0.14);
    font-size: 1rem;
    color: var(--text-primary);
    outline: none;
    transition: box-shadow 0.2s ease, transform 0.15s ease;
  }

  .hero-search::placeholder {
    color: var(--text-muted);
  }

  .hero-search:focus {
    box-shadow: 0 20px 52px rgba(12, 26, 75, 0.16);
    transform: translateY(-1px);
  }

  .hero-stats {
    margin-top: 26px;
    display: flex;
    justify-content: center;
  }

  :global(:root[data-theme='dark']) .hero-search {
    color: #0f172a;
    background: #ffffff;
  }

  :global(:root[data-theme='dark']) .hero-search::placeholder {
    color: #4b5563;
  }

  .stat-flow {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: color-mix(in srgb, var(--panel) 92%, transparent);
    box-shadow: var(--card-shadow);
    flex-wrap: wrap;
    justify-content: center;
  }

  .stat-chip {
    padding: 8px 12px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    color: var(--text-primary);
    font-weight: 700;
    font-size: 0.95rem;
  }

  .stat-arrow {
    color: var(--text-muted);
    font-weight: 700;
    font-size: 1.1rem;
  }

  .stack {
    position: relative;
    z-index: 1;
  }

  .content-stack {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .panelized {
    border-radius: 18px;
    border: 1px solid var(--border);
    box-shadow: var(--card-shadow);
    background: color-mix(in srgb, var(--panel) 94%, transparent);
    backdrop-filter: blur(10px);
  }

  .panelized-accent {
    background: linear-gradient(145deg, rgba(16, 185, 129, 0.08), rgba(124, 58, 237, 0.24));
    border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
    box-shadow: var(--glow);
  }

  .ghost-button,
  .pill-button,
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

  .pill-button {
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    color: var(--accent-strong);
    border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
    box-shadow: var(--glow);
  }

  .pill-button:hover {
    transform: translateY(-1px);
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

  .muted {
    color: var(--text-muted);
  }

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

  @media (min-width: 768px) {
    .page-container {
      padding: 34px 20px 86px;
    }

    .content-stack {
      gap: 24px;
    }

    .hero-panel {
      padding: 56px 48px;
    }
  }
</style>

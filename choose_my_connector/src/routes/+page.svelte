<script lang="ts">
  import { browser } from "$app/environment";
  import { onMount } from "svelte";
  import { DISTRIBUTORS } from "$lib/constants/distributors";

  type DistributorLink = { distributor: string; purchaseUrl: string };
  type SeriesResult = {
    id: number;
    name: string;
    manufacturer?: string | null;
    productType?: string | null;
    minVoltage?: number | null;
    maxVoltage?: number | null;
    maxCurrent?: number | null;
    maxPower?: number | null;
    minCapacityMah?: number | null;
    maxCapacityMah?: number | null;
    datasheetUrl?: string | null;
    cadUrl?: string | null;
    imageUrl?: string | null;
    notes?: string | null;
    distributorLinks?: DistributorLink[];
  };

  type PartPurchaseLink = { distributor: string; url: string; slug?: string };
  type PricePreview = { distributor?: string; minQty?: number; unitPrice?: number; currency?: string | null };
  type MotorSpecs = {
    motorType?: string | null;
    kvRating?: number | null;
    poleCount?: number | null;
    statorDiameter?: number | null;
    statorLength?: number | null;
    shaftDiameter?: number | null;
    maxCurrent?: number | null;
    maxVoltage?: number | null;
    maxPower?: number | null;
    maxTorque?: number | null;
    noLoadCurrent?: number | null;
    resistanceMilliohms?: number | null;
    inductanceMicrohenry?: number | null;
    efficiency?: number | null;
    weightGrams?: number | null;
    mountingPattern?: string | null;
    bearingType?: string | null;
    temperatureLimitC?: number | null;
    notes?: string | null;
  };
  type EscSpecs = {
    firmware?: string | null;
    continuousCurrent?: number | null;
    burstCurrent?: number | null;
    minVoltage?: number | null;
    maxVoltage?: number | null;
    cellCountMin?: number | null;
    cellCountMax?: number | null;
    protocols?: string | null;
    pwmFrequencyKhz?: number | null;
    becType?: string | null;
    becVoltage?: number | null;
    becCurrent?: number | null;
    telemetry?: string | null;
    braking?: string | null;
    waterproofRating?: string | null;
    length?: number | null;
    width?: number | null;
    height?: number | null;
    weightGrams?: number | null;
    notes?: string | null;
  };
  type BatterySpecs = {
    chemistry?: string | null;
    capacityMah?: number | null;
    nominalVoltage?: number | null;
    maxVoltage?: number | null;
    minVoltage?: number | null;
    cellCount?: number | null;
    dischargeCurrentContinuous?: number | null;
    dischargeCurrentBurst?: number | null;
    dischargeRateC?: number | null;
    energyWh?: number | null;
    internalResistanceMilliohms?: number | null;
    connector?: string | null;
    balanceConnector?: string | null;
    length?: number | null;
    width?: number | null;
    height?: number | null;
    weightGrams?: number | null;
    notes?: string | null;
  };
  type PartResult = {
    id: number;
    seriesId: number;
    modelNumber?: string | null;
    variantName?: string | null;
    sku?: string | null;
    nominalVoltage?: number | null;
    maxVoltage?: number | null;
    maxCurrent?: number | null;
    maxPower?: number | null;
    capacityMah?: number | null;
    weightGrams?: number | null;
    length?: number | null;
    width?: number | null;
    height?: number | null;
    datasheetUrl?: string | null;
    cadUrl?: string | null;
    ecadUrl?: string | null;
    imageUrl?: string | null;
    motorSpecs?: MotorSpecs | null;
    escSpecs?: EscSpecs | null;
    batterySpecs?: BatterySpecs | null;
    purchaseLinks?: PartPurchaseLink[];
    lowestPrice?: PricePreview | null;
  };

  type SeriesFilters = {
    types: string[];
    distributors: string[];
    minPower: number | "";
    maxPower: number | "";
    current: number | "";
    voltage: number | "";
  };

  type PartFilters = {
    query: string;
  };

  const connectionTypes: string[] = ["Brushless motor", "Electronic speed controller", "Battery"];
  const fallbackImage = "/images/default_connector.jpg";
  const categoryFilters = [
    {
      slug: "electronic speed controller",
      label: "Electronic speed controllers",
      blurb: "Filter by continuous/burst current and supported protocols."
    },
    {
      slug: "battery",
      label: "Batteries",
      blurb: "Compare chemistry, cell count, capacity, and discharge ratings."
    },
    {
      slug: "brushless motor",
      label: "Brushless motors",
      blurb: "Sort by Kv, stator size, mass, and peak power."
    }
  ];

  const defaultSeriesFilters: SeriesFilters = {
    types: [],
    distributors: [],
    minPower: "",
    maxPower: "",
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

  let partFilters: PartFilters = { query: "" };
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
    productName: "",
    context: "",
    details: "",
    email: ""
  };
  let showLogin = false;
  let loginError = "";
  let loginForm = { email: "", password: "" };
  let theme: "light" | "dark" = "dark";

  const toNumber = (value: string | number | null) => {
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  };

  type SeriesNumericKey = "minPower" | "maxPower" | "current" | "voltage";

  function setSeriesNumberFilter(key: SeriesNumericKey, rawValue: string | number) {
    const numeric = toNumber(rawValue);

    if (numeric === null) {
      seriesFilters = { ...seriesFilters, [key]: "" };
      return;
    }

    let value = Math.max(0, numeric);

    if (key === "maxPower") {
      const minVal = toNumber(seriesFilters.minPower as number | "");
      if (minVal !== null && value < minVal) value = minVal;
    }

    if (key === "minPower") {
      const maxVal = toNumber(seriesFilters.maxPower as number | "");
      if (maxVal !== null && maxVal < value) {
        seriesFilters = { ...seriesFilters, [key]: value, maxPower: value };
        return;
      }
    }

    seriesFilters = { ...seriesFilters, [key]: value };
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
    applyTheme(saved ?? "dark");
  });

  function scrollToSearch() {
    searchSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleLoginModal() {
    showLogin = !showLogin;
    loginError = "";
  }

  function submitLogin() {
    loginError = "";
    const trimmedEmail = loginForm.email.trim();
    const trimmedPassword = loginForm.password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      loginError = "Email and password are required.";
      return;
    }

    // Placeholder auth handler until backend is wired.
    alert("Admin login placeholder — wire to auth backend.");
    showLogin = false;
  }

  function buildSeriesSearchParams() {
    const params = new URLSearchParams();

    if (seriesFilters.types.length) {
      seriesFilters.types.forEach((type) => params.append("type", type));
    }

    if (seriesFilters.distributors.length) {
      seriesFilters.distributors.forEach((distributor) => params.append("distributor", distributor));
    }

    (["minPower", "maxPower", "current", "voltage"] as const).forEach((key) => {
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
      partErrorMessage = "Choose a component family first.";
      return;
    }

    const params = buildPartSearchParams();
    partErrorMessage = "";
    isSearchingParts = true;

    try {
      const res = await fetch(`/api/parts?${params.toString()}`);

      if (!res.ok) {
        partErrorMessage = "Variant search failed — please try again.";
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
      partErrorMessage = "Unable to reach the variant search API.";
      partResults = [];
    } finally {
      isSearchingParts = false;
    }
  }

  function selectSeries(series: SeriesResult) {
    selectedSeries = series;
    selectedPart = null;
    partResults = [];
    partFilters = { query: "" };
    hasSearchedParts = false;
    partErrorMessage = "";
    searchParts();
  }

  function clearSeriesSelection() {
    selectedSeries = null;
    selectedPart = null;
    partResults = [];
    partFilters = { query: "" };
    hasSearchedParts = false;
    partErrorMessage = "";
  }

  function selectPart(part: PartResult) {
    selectedPart = part;
  }

  function clearPartFilters() {
    partFilters = { query: "" };
  }

  function selectCategory(slug: string) {
    seriesFilters = {
      ...defaultSeriesFilters,
      types: [slug]
    };
    seriesResults = [];
    hasSearchedSeries = false;
    seriesErrorMessage = "";
    selectedSeries = null;
    selectedPart = null;
    partResults = [];
    partFilters = { query: "" };
    hasSearchedParts = false;
    partErrorMessage = "";
    searchSeries();
    scrollToSearch();
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
        productName: "",
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
      <h1 class="hero-title">Parametric — engineering-grade powertrain components.</h1>
      <p class="lede">
        Compare ESCs, brushless motors, and batteries by spec, then jump straight to supplier pages.
      </p>
      <div class="hero-actions hero-actions--inline">
        <input
          class="hero-search"
          type="text"
          placeholder="Search ESCs, motors, batteries or paste a model number"
          aria-label="Search ESCs, motors, batteries or paste a model number"
        />
      </div>
      <div class="category-grid">
        {#each categoryFilters as category}
          <button class="category-card" type="button" on:click={() => selectCategory(category.slug)}>
            <div class="category-icon" aria-hidden="true">⚙️</div>
            <div class="category-copy">
              <p class="category-title">{category.label}</p>
              <p class="category-blurb">{category.blurb}</p>
            </div>
            <span class="category-cta">Browse</span>
          </button>
        {/each}
        <a class="category-card category-card--outline" href="/trends">
          <div class="category-icon" aria-hidden="true">📈</div>
          <div class="category-copy">
            <p class="category-title">View trends</p>
            <p class="category-blurb">See mass vs. power, current vs. weight, and energy density plots.</p>
          </div>
          <span class="category-cta">Open</span>
        </a>
      </div>

      {#if showLogin}
        <div class="modal-backdrop" role="presentation" on:click={toggleLoginModal}></div>
        <div class="modal" role="dialog" aria-modal="true" aria-label="Admin login">
          <div class="modal-header">
            <h3>Admin login</h3>
            <button class="ghost-button" type="button" on:click={toggleLoginModal}>Close</button>
          </div>
          <div class="modal-body">
            <label class="block space-y-1">
              <span class="text-sm font-semibold text-slate-800">Email</span>
              <input
                class="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                type="email"
                placeholder="you@example.com"
                bind:value={loginForm.email}
              />
            </label>
            <label class="block space-y-1">
              <span class="text-sm font-semibold text-slate-800">Password</span>
              <input
                class="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                type="password"
                placeholder="••••••••"
                bind:value={loginForm.password}
              />
            </label>
            {#if loginError}
              <p class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{loginError}</p>
            {/if}
          </div>
          <div class="modal-footer">
            <button class="primary-button" type="button" on:click={submitLogin}>Log in</button>
            <button class="secondary-button" type="button" on:click={toggleLoginModal}>Cancel</button>
          </div>
          <p class="modal-note">Placeholder login — wire to your auth backend.</p>
        </div>
      {/if}
    </section>

    <section class="stack" id="search" bind:this={searchSection}>
      <div class="content-stack space-y-6">
        <section class="panelized space-y-4 rounded-xl bg-slate-50 p-5 shadow-sm ring-1 ring-slate-200">
          <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 1</p>
              <h2 class="text-lg font-semibold text-slate-900">Browse components by family</h2>
              <p class="text-sm text-slate-700">Filter down ESC, battery, and brushless motor families, then drill into variants.</p>
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
                  Change family
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
                {#if selectedSeries.productType}
                  <p class="text-sm text-slate-700">{selectedSeries.productType}</p>
                {/if}
                <p class="text-xs text-slate-500">Now search for the specific variant within this family.</p>
              </div>
            </div>
          {:else}
            <div class="filters space-y-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <label class="block space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <span class="text-sm font-semibold text-slate-800">Component type</span>
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
                  <p class="text-xs text-slate-500">Focus on motor, ESC, or battery families.</p>
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

              <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4" aria-label="Electrical performance ranges">
                <label class="block space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <span class="text-sm font-semibold text-slate-800">Minimum power (W)</span>
                  <input
                    class="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    type="number"
                    min="0"
                    placeholder="Min power (W)"
                    bind:value={seriesFilters.minPower}
                    on:input={(event) =>
                      setSeriesNumberFilter("minPower", (event.currentTarget as HTMLInputElement).value)
                    }
                  />
                  <p class="text-xs text-slate-500">Filter for the minimum output power your system needs.</p>
                </label>

                <label class="block space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <span class="text-sm font-semibold text-slate-800">Maximum power (W)</span>
                  <input
                    class="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    type="number"
                    min={seriesFilters.minPower === "" ? 0 : seriesFilters.minPower}
                    placeholder="Max power (W)"
                    bind:value={seriesFilters.maxPower}
                    on:input={(event) =>
                      setSeriesNumberFilter("maxPower", (event.currentTarget as HTMLInputElement).value)
                    }
                  />
                  <p class="text-xs text-slate-500">Cap the power range to stay within your thermal budget.</p>
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
                  <p class="text-xs text-slate-500">Enter the continuous current floor for ESCs and batteries.</p>
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
                  <p class="text-xs text-slate-500">Set the minimum supported voltage range for your pack.</p>
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
                <p class="text-sm text-slate-600">No component families matched those filters.</p>
              {:else if seriesResults.length === 0 && !seriesErrorMessage}
                <p class="text-sm text-slate-600">Start searching to see component families.</p>
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
                          Select this family
                        </button>
                      </div>

                      <div class="grid gap-2 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
                        {#if item.productType}
                          <p>Type: {item.productType}</p>
                        {/if}
                        {#if item.maxCurrent !== null && item.maxCurrent !== undefined}
                          <p>Max current: {item.maxCurrent} A</p>
                        {/if}
                        {#if item.maxVoltage !== null && item.maxVoltage !== undefined}
                          <p>Max voltage: {item.maxVoltage} V</p>
                        {/if}
                        {#if item.maxPower !== null && item.maxPower !== undefined}
                          <p>Max power: {item.maxPower} W</p>
                        {/if}
                        {#if item.maxCapacityMah !== null && item.maxCapacityMah !== undefined}
                          <p>Max capacity: {item.maxCapacityMah} mAh</p>
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
                  Search variants in {selectedSeries.name}
                </h2>
                <p class="text-sm text-slate-700">
                  Look up the exact model number, then pick it to see supplier and CAD/ECAD links.
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
                  Reset variant filters
                </button>
                <button
                  class="rounded bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-80"
                  type="button"
                  on:click={searchParts}
                  disabled={isSearchingParts}
                >
                  {isSearchingParts ? "Searching..." : "Search variants"}
                </button>
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <label class="space-y-1">
                <span class="text-sm font-semibold text-slate-800">Model or variant</span>
                <input
                  class="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  placeholder="e.g. 2207-1950KV, XRotor 65A"
                  bind:value={partFilters.query}
                />
                <p class="text-xs text-slate-500">Search model numbers, variant names, or SKUs.</p>
              </label>
            </div>

            <div class="space-y-3">
              {#if partErrorMessage}
                <p class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{partErrorMessage}</p>
              {/if}

              {#if hasSearchedParts && partResults.length === 0 && !partErrorMessage}
                <p class="text-sm text-slate-600">No variants found in this series with those filters.</p>
              {:else if partResults.length === 0 && !partErrorMessage}
                <p class="text-sm text-slate-600">Search to see individual variants.</p>
              {/if}

              {#each partResults as part}
                <div class="space-y-3 rounded-lg border border-slate-200 p-4 shadow-sm">
                  <div class="flex flex-col gap-4 sm:flex-row">
                    <div class="flex h-24 w-24 items-center justify-center overflow-hidden rounded bg-slate-50 ring-1 ring-slate-200">
                      <img
                        class="h-full w-full object-contain"
                        src={part.imageUrl || selectedSeries.imageUrl || fallbackImage}
                        alt={part.modelNumber || part.variantName || "Product variant"}
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
                        <h3 class="text-lg font-semibold text-slate-900">
                          {part.modelNumber || part.variantName || "Unnamed variant"}
                        </h3>
                        {#if part.nominalVoltage !== null && part.nominalVoltage !== undefined}
                          <span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                            {part.nominalVoltage} V nominal
                          </span>
                        {/if}
                        {#if part.maxCurrent !== null && part.maxCurrent !== undefined}
                          <span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                            {part.maxCurrent} A
                          </span>
                        {/if}
                        {#if part.maxPower !== null && part.maxPower !== undefined}
                          <span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                            {part.maxPower} W
                          </span>
                        {/if}
                        {#if part.capacityMah !== null && part.capacityMah !== undefined}
                          <span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                            {part.capacityMah} mAh
                          </span>
                        {/if}
                        <button
                          class="ml-auto rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                          type="button"
                          on:click={() => selectPart(part)}
                        >
                          {selectedPart?.id === part.id ? "Selected" : "Use this variant"}
                        </button>
                      </div>

                      <div class="grid gap-2 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
                        {#if part.variantName}
                          <p>Variant: {part.variantName}</p>
                        {/if}
                        {#if part.sku}
                          <p>SKU: {part.sku}</p>
                        {/if}
                        {#if part.weightGrams !== null && part.weightGrams !== undefined}
                          <p>Weight: {part.weightGrams} g</p>
                        {/if}
                        {#if part.motorSpecs?.kvRating !== null && part.motorSpecs?.kvRating !== undefined}
                          <p>Kv: {part.motorSpecs?.kvRating}</p>
                        {/if}
                        {#if part.escSpecs?.continuousCurrent !== null && part.escSpecs?.continuousCurrent !== undefined}
                          <p>Continuous current: {part.escSpecs?.continuousCurrent} A</p>
                        {/if}
                        {#if part.batterySpecs?.chemistry}
                          <p>Chemistry: {part.batterySpecs?.chemistry}</p>
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
                <h2 class="text-lg font-semibold">Supplier links & downloads</h2>
                <p class="text-sm text-slate-200">
                  You picked {selectedPart.modelNumber || selectedPart.variantName || "this variant"} from {selectedSeries?.name}.
                  Grab a CAD/ECAD package or jump to a supplier.
                </p>
              </div>
              <button
                class="self-start rounded border border-white/30 px-3 py-2 text-xs font-semibold text-white transition hover:border-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-900"
                type="button"
                on:click={() => (selectedPart = null)}
              >
                Pick a different variant
              </button>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div class="space-y-2 rounded-lg bg-white/5 p-4">
                <p class="text-sm font-semibold text-white">Engineering specs</p>
                <div class="grid gap-2 text-xs text-slate-200">
                  {#if selectedPart.nominalVoltage !== null && selectedPart.nominalVoltage !== undefined}
                    <p>Nominal voltage: {selectedPart.nominalVoltage} V</p>
                  {/if}
                  {#if selectedPart.maxVoltage !== null && selectedPart.maxVoltage !== undefined}
                    <p>Max voltage: {selectedPart.maxVoltage} V</p>
                  {/if}
                  {#if selectedPart.maxCurrent !== null && selectedPart.maxCurrent !== undefined}
                    <p>Max current: {selectedPart.maxCurrent} A</p>
                  {/if}
                  {#if selectedPart.maxPower !== null && selectedPart.maxPower !== undefined}
                    <p>Max power: {selectedPart.maxPower} W</p>
                  {/if}
                  {#if selectedPart.capacityMah !== null && selectedPart.capacityMah !== undefined}
                    <p>Capacity: {selectedPart.capacityMah} mAh</p>
                  {/if}
                  {#if selectedPart.motorSpecs?.kvRating !== null && selectedPart.motorSpecs?.kvRating !== undefined}
                    <p>Kv rating: {selectedPart.motorSpecs?.kvRating}</p>
                  {/if}
                  {#if selectedPart.motorSpecs?.poleCount !== null && selectedPart.motorSpecs?.poleCount !== undefined}
                    <p>Pole count: {selectedPart.motorSpecs?.poleCount}</p>
                  {/if}
                  {#if selectedPart.escSpecs?.continuousCurrent !== null && selectedPart.escSpecs?.continuousCurrent !== undefined}
                    <p>ESC continuous current: {selectedPart.escSpecs?.continuousCurrent} A</p>
                  {/if}
                  {#if selectedPart.escSpecs?.burstCurrent !== null && selectedPart.escSpecs?.burstCurrent !== undefined}
                    <p>ESC burst current: {selectedPart.escSpecs?.burstCurrent} A</p>
                  {/if}
                  {#if selectedPart.escSpecs?.protocols}
                    <p>ESC protocols: {selectedPart.escSpecs?.protocols}</p>
                  {/if}
                  {#if selectedPart.batterySpecs?.chemistry}
                    <p>Battery chemistry: {selectedPart.batterySpecs?.chemistry}</p>
                  {/if}
                  {#if selectedPart.batterySpecs?.cellCount !== null && selectedPart.batterySpecs?.cellCount !== undefined}
                    <p>Cell count: {selectedPart.batterySpecs?.cellCount}S</p>
                  {/if}
                  {#if selectedPart.batterySpecs?.dischargeRateC !== null && selectedPart.batterySpecs?.dischargeRateC !== undefined}
                    <p>Discharge rate: {selectedPart.batterySpecs?.dischargeRateC}C</p>
                  {/if}
                </div>
              </div>

              <div class="space-y-2 rounded-lg bg-white/5 p-4">
                <p class="text-sm font-semibold text-white">Physical profile</p>
                <div class="grid gap-2 text-xs text-slate-200">
                  {#if selectedPart.length !== null && selectedPart.length !== undefined}
                    <p>Length: {selectedPart.length} mm</p>
                  {:else if selectedPart.escSpecs?.length !== null && selectedPart.escSpecs?.length !== undefined}
                    <p>Length: {selectedPart.escSpecs?.length} mm</p>
                  {:else if selectedPart.batterySpecs?.length !== null && selectedPart.batterySpecs?.length !== undefined}
                    <p>Length: {selectedPart.batterySpecs?.length} mm</p>
                  {/if}
                  {#if selectedPart.width !== null && selectedPart.width !== undefined}
                    <p>Width: {selectedPart.width} mm</p>
                  {:else if selectedPart.escSpecs?.width !== null && selectedPart.escSpecs?.width !== undefined}
                    <p>Width: {selectedPart.escSpecs?.width} mm</p>
                  {:else if selectedPart.batterySpecs?.width !== null && selectedPart.batterySpecs?.width !== undefined}
                    <p>Width: {selectedPart.batterySpecs?.width} mm</p>
                  {/if}
                  {#if selectedPart.height !== null && selectedPart.height !== undefined}
                    <p>Height: {selectedPart.height} mm</p>
                  {:else if selectedPart.escSpecs?.height !== null && selectedPart.escSpecs?.height !== undefined}
                    <p>Height: {selectedPart.escSpecs?.height} mm</p>
                  {:else if selectedPart.batterySpecs?.height !== null && selectedPart.batterySpecs?.height !== undefined}
                    <p>Height: {selectedPart.batterySpecs?.height} mm</p>
                  {/if}
                  {#if selectedPart.weightGrams !== null && selectedPart.weightGrams !== undefined}
                    <p>Weight: {selectedPart.weightGrams} g</p>
                  {:else if selectedPart.escSpecs?.weightGrams !== null && selectedPart.escSpecs?.weightGrams !== undefined}
                    <p>Weight: {selectedPart.escSpecs?.weightGrams} g</p>
                  {:else if selectedPart.batterySpecs?.weightGrams !== null && selectedPart.batterySpecs?.weightGrams !== undefined}
                    <p>Weight: {selectedPart.batterySpecs?.weightGrams} g</p>
                  {/if}
                </div>
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div class="space-y-2 rounded-lg bg-white/5 p-4">
                <p class="text-sm font-semibold text-white">Buy this variant</p>
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
                  <p class="text-xs text-slate-200">No distributor links yet — try a different variant or series.</p>
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
                    <p class="text-xs text-slate-200">No CAD/ECAD links yet for this variant.</p>
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
                  Share the component name and what's incorrect so we can correct it quickly.
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
                  <span class="text-sm font-semibold text-slate-800">Component series or variant</span>
                  <input
                    class="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="e.g. 2306 brushless motor"
                    bind:value={reportForm.productName}
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
                  <p class="text-xs text-slate-500">Filters, model numbers, or any other context.</p>
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
                    reportForm = { productName: "", context: "", details: "", email: "" };
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
      <p class="brand-title">Parametric</p>
      <p class="muted">Built for engineers who want fewer tabs and faster decisions.</p>
      <div class="footer-links">
        <button class="ghost-button" type="button" on:click={() => (showReportForm = true)}>
          Report an issue
        </button>
        <button class="ghost-button" type="button" on:click={toggleLoginModal}>Admin login</button>
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
    background: radial-gradient(circle, rgba(79, 123, 191, 0.24), transparent 55%);
  }

  .page-glow--right {
    bottom: -220px;
    right: -160px;
    background: radial-gradient(circle, rgba(56, 189, 248, 0.2), transparent 60%);
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
    background: linear-gradient(135deg, color-mix(in srgb, var(--panel) 94%, transparent), rgba(79, 123, 191, 0.12));
    box-shadow: var(--card-shadow);
  }

  .hero-panel::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 30% 30%, rgba(79, 123, 191, 0.1), transparent 45%),
      radial-gradient(circle at 70% 10%, rgba(56, 189, 248, 0.14), transparent 40%);
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
    border: 1px solid color-mix(in srgb, var(--accent) 22%, var(--border));
    background: color-mix(in srgb, var(--panel) 90%, transparent);
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.32);
    font-size: 1rem;
    color: var(--text-primary);
    outline: none;
    transition: box-shadow 0.2s ease, transform 0.15s ease;
  }

  .hero-search::placeholder {
    color: var(--text-muted);
  }

  .hero-search:focus {
    box-shadow: 0 20px 52px rgba(0, 0, 0, 0.42);
    transform: translateY(-1px);
  }

  .category-grid {
    margin-top: 22px;
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }

  .category-card {
    border: 1px solid var(--border);
    border-radius: 14px;
    background: color-mix(in srgb, var(--panel) 88%, transparent);
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.28);
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    text-align: left;
    cursor: pointer;
    color: inherit;
    text-decoration: none;
    transition: transform 0.12s ease, box-shadow 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
  }

  .category-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 16px 42px rgba(0, 0, 0, 0.34);
    border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
  }

  .category-card--outline {
    background: color-mix(in srgb, var(--panel) 70%, transparent);
  }

  .category-icon {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    font-size: 1.1rem;
  }

  .category-copy {
    display: grid;
    gap: 2px;
  }

  .category-title {
    margin: 0;
    font-weight: 700;
    font-size: 0.98rem;
  }

  .category-blurb {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.88rem;
  }

  .category-cta {
    font-weight: 700;
    color: var(--accent-strong);
    font-size: 0.9rem;
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
    background: linear-gradient(145deg, rgba(61, 171, 245, 0.14), rgba(12, 20, 35, 0.7));
    border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
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

  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(6px);
    z-index: 20;
  }

  .modal {
    position: fixed;
    inset: 0;
    margin: auto;
    max-width: 420px;
    height: fit-content;
    background: color-mix(in srgb, var(--panel) 96%, transparent);
    border: 1px solid var(--border);
    border-radius: 18px;
    box-shadow: 0 22px 70px rgba(0, 0, 0, 0.5);
    padding: 18px;
    z-index: 30;
    display: grid;
    gap: 14px;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
  }

  .modal-body {
    display: grid;
    gap: 10px;
  }

  .modal-footer {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .modal-note {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.86rem;
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

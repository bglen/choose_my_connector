<script>
    import { DISTRIBUTORS } from "$lib/constants/distributors";

    const connectionTypes = ["Wire-to-board", "Wire-to-wire", "Board-to-board"];

    let results = [];
    let hasSearched = false;
    let errorMessage = "";
    let isSearching = false;
    const fallbackImage = "/images/default_connector.jpg";
    let filters = {
        types: [],
        distributors: [],
        waterproof: "",
        panel: "",
        minContacts: "",
        maxContacts: "",
        current: "",
        voltage: ""
    };
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

    const toNumber = (value) => {
        const num = Number(value);
        return Number.isNaN(num) ? null : num;
    };

    function setNumberFilter(key, rawValue) {
        const numeric = toNumber(rawValue);

        if (numeric === null) {
            filters = { ...filters, [key]: "" };
            return;
        }

        let value = Math.max(0, numeric);

        if (key === "maxContacts") {
            const minVal = toNumber(filters.minContacts);
            if (minVal !== null && value < minVal) value = minVal;
        }

        if (key === "minContacts") {
            const maxVal = toNumber(filters.maxContacts);
            if (maxVal !== null && maxVal < value) {
                filters = { ...filters, [key]: value, maxContacts: value };
                return;
            }
        }

        filters = { ...filters, [key]: value };
    }

    function buildSearchParams() {
        const params = new URLSearchParams();

        if (filters.types.length) {
            filters.types.forEach((type) => params.append("type", type));
        }

        if (filters.distributors.length) {
            filters.distributors.forEach((distributor) => params.append("distributor", distributor));
        }

        for (const key of ["waterproof", "panel", "minContacts", "maxContacts", "current", "voltage"]) {
            const value = filters[key];
            if (value !== "" && value !== null && value !== undefined) {
                params.append(key, String(value));
            }
        }

        return params;
    }

    function toggleType(type) {
        const hasType = filters.types.includes(type);
        filters = {
            ...filters,
            types: hasType ? filters.types.filter((t) => t !== type) : [...filters.types, type]
        };
    }

    function toggleDistributor(slug) {
        const hasDistributor = filters.distributors.includes(slug);
        filters = {
            ...filters,
            distributors: hasDistributor
                ? filters.distributors.filter((value) => value !== slug)
                : [...filters.distributors, slug]
        };
    }

    async function search() {
        const params = buildSearchParams();
        errorMessage = "";
        isSearching = true;

        try {
            const res = await fetch(`/api/search?${params.toString()}`);

            if (!res.ok) {
                errorMessage = "Search failed — please try again.";
                results = [];
                return;
            }

            results = await res.json();
            hasSearched = true;
        } catch (error) {
            console.error("Search error", error);
            errorMessage = "Unable to reach the search API.";
            results = [];
        } finally {
            isSearching = false;
        }
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

<div class="px-6 pt-6">
    <h1 class="mb-4 text-2xl font-bold text-slate-900">Choose My Connector</h1>

    <h1 class="mb-3 text-xl font-bold text-slate-900">Search Connector Series</h1>

    <div class="filters space-y-6 rounded-xl bg-slate-50 p-5 shadow-sm">
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <label class="block space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <span class="text-sm font-semibold text-slate-800">Connection type</span>
                <div class="space-y-2">
                    {#each connectionTypes as type}
                        <label class="flex items-center gap-2 text-sm text-slate-800">
                            <input
                                type="checkbox"
                                class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                checked={filters.types.includes(type)}
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
                                checked={filters.distributors.includes(distributor.slug)}
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
                    bind:value={filters.waterproof}
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
                    bind:value={filters.panel}
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
                    bind:value={filters.minContacts}
                    on:input={(event) => setNumberFilter("minContacts", event.target.value)}
                />
                <p class="text-xs text-slate-500">Use min positions to match the smallest pole count you can support.</p>
            </label>

            <label class="block space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <span class="text-sm font-semibold text-slate-800">Maximum contacts</span>
                <input
                    class="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    type="number"
                    min={filters.minContacts === "" ? 0 : filters.minContacts}
                    placeholder="Max contacts"
                    bind:value={filters.maxContacts}
                    on:input={(event) => setNumberFilter("maxContacts", event.target.value)}
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
                    bind:value={filters.current}
                    on:input={(event) => setNumberFilter("current", event.target.value)}
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
                    bind:value={filters.voltage}
                    on:input={(event) => setNumberFilter("voltage", event.target.value)}
                />
                <p class="text-xs text-slate-500">Set the minimum voltage rating to screen out low-insulation options.</p>
            </label>
        </div>

        <div class="flex flex-wrap gap-3">
            <button
                class="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                on:click={search}
                disabled={isSearching}
            >
                {isSearching ? "Searching..." : "Search"}
            </button>
        </div>
    </div>

    <div class="mt-6 space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
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
    </div>

    <hr class="mt-6" />

    {#if errorMessage}
        <p class="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
    {/if}

    {#if hasSearched && results.length === 0 && !errorMessage}
        <p class="mt-4 text-sm text-slate-600">No connector series matched those filters.</p>
    {:else if results.length === 0 && !errorMessage}
        <p class="mt-4 text-sm text-slate-600">Start searching to see connector series.</p>
    {/if}

    {#each results as item}
        <div class="mt-3 space-y-3 rounded-lg border border-slate-200 p-4 shadow-sm">
            <div class="flex gap-4">
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
                    <div class="flex items-center gap-2">
                        <h2 class="text-lg font-semibold text-slate-900">{item.name}</h2>
                        {#if item.manufacturer}
                            <span class="text-sm font-medium text-slate-600">· {item.manufacturer}</span>
                        {/if}
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
                            <a class="hover:underline" href={item.datasheetUrl} target="_blank" rel="noreferrer">Datasheet</a>
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

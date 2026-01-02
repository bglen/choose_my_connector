<script lang="ts">
  import { dev } from "$app/environment";
  import { onMount } from "svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import SiteHeader from "$lib/components/SiteHeader.svelte";
  import type { SessionAccount } from "$lib/types/account";
  export let data: { account: SessionAccount | null };
  type TrendId = "motor-power" | "esc-current" | "battery-density";

  const categories = [
    { slug: "brushless motors", label: "Brushless motors" },
    { slug: "electronic speed controllers", label: "Electronic speed controllers" },
    { slug: "batteries", label: "Batteries" }
  ];

  const trends: Record<TrendId, { label: string; xLabel: string; yLabel: string; category: string }> = {
    "motor-power": {
      label: "Mass vs peak power",
      xLabel: "Mass (g)",
      yLabel: "Peak power (W)",
      category: "brushless motors"
    },
    "esc-current": {
      label: "Mass vs continuous current",
      xLabel: "Mass (g)",
      yLabel: "Continuous current (A)",
      category: "electronic speed controllers"
    },
    "battery-density": {
      label: "Mass vs energy",
      xLabel: "Mass (g)",
      yLabel: "Energy (Wh)",
      category: "batteries"
    },
    "motor-price-power": {
      label: "Price vs peak power",
      xLabel: "Price (USD)",
      yLabel: "Peak power (W)",
      category: "brushless motors"
    },
    "motor-price-mass": {
      label: "Price vs mass",
      xLabel: "Price (USD)",
      yLabel: "Mass (g)",
      category: "brushless motors"
    }
  };

  type PlotPoint = { x: number; y: number; label: string };

  const placeholderData: Record<TrendId, PlotPoint[]> = {
    "motor-power": Array.from({ length: 30 }).map((_, idx) => ({
      x: 20 + idx * 8 + Math.random() * 6,
      y: 120 + idx * 18 + Math.random() * 40,
      label: `Motor ${idx + 1}`
    })),
    "esc-current": Array.from({ length: 24 }).map((_, idx) => ({
      x: 8 + idx * 3 + Math.random() * 2,
      y: 10 + idx * 3.2 + Math.random() * 3,
      label: `ESC ${idx + 1}`
    })),
    "battery-density": Array.from({ length: 20 }).map((_, idx) => ({
      x: 80 + idx * 25 + Math.random() * 10,
      y: 60 + idx * 7 + Math.random() * 8,
      label: `Pack ${idx + 1}`
    })),
    "motor-price-power": Array.from({ length: 24 }).map((_, idx) => ({
      x: 15 + idx * 2 + Math.random() * 4,
      y: 150 + idx * 25 + Math.random() * 40,
      label: `Motor ${idx + 1}`
    })),
    "motor-price-mass": Array.from({ length: 24 }).map((_, idx) => ({
      x: 10 + idx * 2 + Math.random() * 3,
      y: 20 + idx * 6 + Math.random() * 5,
      label: `Motor ${idx + 1}`
    }))
  };

  let selectedCategory = "";
  let selectedTrend: TrendId | "" = "";
  let swapAxes = false;

  $: availableTrends = (Object.entries(trends) as [TrendId, (typeof trends)[TrendId]][]).filter(
    ([, trend]) => trend.category === selectedCategory
  );

  $: rawPlot = selectedTrend ? placeholderData[selectedTrend] : [];
  $: plotData = swapAxes ? rawPlot.map((p) => ({ ...p, x: p.y, y: p.x })) : rawPlot;
  $: regression = computeRegression(plotData);
  const chartWidth = 540;
  const chartHeight = 300;
  const margin = { top: 24, right: 20, bottom: 64, left: 70 };
  let zoomLevel = 1;
  let svgRef: SVGSVGElement | null = null;
  let hovered: { point: PlotPoint; x: number; y: number } | null = null;
  let sessionAccount: SessionAccount | null = data.account ?? null;
  let isAuthLoading = false;
  $: showAdminButton = dev || !!sessionAccount?.isAdmin;

  function getDomain(points: PlotPoint[], axis: "x" | "y") {
    if (!points.length) return { min: 0, max: 1 };
    const values = points.map((p) => (axis === "x" ? p.x : p.y));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const center = min + span / 2;
    const zoomedSpan = span / zoomLevel;
    return { min: center - zoomedSpan / 2, max: center + zoomedSpan / 2 };
  }

  function scaleX(value: number, points: PlotPoint[]) {
    const { min, max } = getDomain(points, "x");
    const range = max - min || 1;
    return ((value - min) / range) * chartWidth;
  }

  function scaleY(value: number, points: PlotPoint[]) {
    const { min, max } = getDomain(points, "y");
    const range = max - min || 1;
    return chartHeight - ((value - min) / range) * chartHeight;
  }

  function getTicks(points: PlotPoint[], axis: "x" | "y", count = 5) {
    if (!points.length) return [];
    const { min, max } = getDomain(points, axis);
    const step = (max - min) / (count - 1 || 1);
    return Array.from({ length: count }, (_, i) => min + step * i);
  }

  function computeRegression(points: PlotPoint[]) {
    if (!points.length) return null;
    const n = points.length;
    const sumX = points.reduce((acc, p) => acc + p.x, 0);
    const sumY = points.reduce((acc, p) => acc + p.y, 0);
    const sumXY = points.reduce((acc, p) => acc + p.x * p.y, 0);
    const sumXX = points.reduce((acc, p) => acc + p.x * p.x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
    const intercept = sumY / n - slope * (sumX / n);
    const xs = points.map((p) => p.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    return { slope, intercept, minX, maxX, minY: slope * minX + intercept, maxY: slope * maxX + intercept };
  }

  function downloadCSV() {
    if (!selectedTrend || !plotData.length) return;
    const rows = [
      "label,x,y",
      ...plotData.map((p) => `${p.label},${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedTrend}-trend.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleWheel(event: WheelEvent) {
    if (!plotData.length) return;
    event.preventDefault();
    const factor = event.deltaY > 0 ? 1.1 : 0.9;
    zoomLevel = Math.max(1, Math.min(6, zoomLevel * factor));
  }

  function handleMouseMove(event: MouseEvent) {
    if (!plotData.length || !svgRef) return;
    const rect = svgRef.getBoundingClientRect();
    const offsetX = event.clientX - rect.left - margin.left;
    const offsetY = event.clientY - rect.top - margin.top;

    let nearest: { point: PlotPoint; x: number; y: number; dist: number } | null = null;
    for (const point of plotData) {
      const px = scaleX(point.x, plotData);
      const py = scaleY(point.y, plotData);
      const dist = Math.hypot(px - offsetX, py - offsetY);
      if (!nearest || dist < nearest.dist) {
        nearest = { point, x: px, y: py, dist };
      }
    }

    if (nearest) {
      hovered = { point: nearest.point, x: nearest.x + margin.left, y: nearest.y + margin.top };
    }
  }

  function handleMouseLeave() {
    hovered = null;
  }

  onMount(() => {
    if (!sessionAccount) {
      fetchSession();
    }
  });

  async function fetchSession() {
    isAuthLoading = true;
    try {
      const res = await fetch("/api/auth/session");
      if (!res.ok) {
        sessionAccount = null;
        return;
      }

      const data = await res.json();
      sessionAccount = data.account ?? null;
    } catch (error) {
      console.error("Session check failed", error);
      sessionAccount = null;
    } finally {
      isAuthLoading = false;
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      sessionAccount = null;
    }
  }
</script>

<div class="page-shell">
  <div class="page-container">
    <SiteHeader
      {sessionAccount}
      {isAuthLoading}
      {showAdminButton}
      onLogoutClick={logout}
    />

    <section class="hero-panel">
      <p class="eyebrow">Trends</p>
      <h1 class="hero-title">Visualize components before you pick a part.</h1>
    </section>

    <section class="controls">
      <div class="control-card">
        <p class="control-label">Category</p>
        <div class="pill-row">
          {#each categories as category}
            <button
              class:active-pill={selectedCategory === category.slug}
              class="pill-button"
              type="button"
              on:click={() => {
                selectedCategory = category.slug;
                selectedTrend = "";
              }}
            >
              {category.label}
            </button>
          {/each}
        </div>
      </div>

      <div class="control-card">
        <p class="control-label">Trend</p>
        {#if !selectedCategory}
          <p class="muted">Pick a category to see available trends.</p>
        {:else if availableTrends.length === 0}
          <p class="muted">No trends available for this category yet.</p>
        {:else}
          <div class="trend-grid">
            {#each availableTrends as [id, trend]}
              <button
                class="trend-card"
                class:trend-card--active={selectedTrend === id}
                type="button"
                on:click={() => (selectedTrend = id)}
              >
                <p class="trend-title">{trend.label}</p>
                <p class="trend-meta">{trend.xLabel} → {trend.yLabel}</p>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </section>

    <section class="panelized chart-panel">
      {#if !selectedTrend}
        <p class="muted">Select a trend to see a plot.</p>
      {:else if !plotData.length}
        <p class="muted">No data yet — wire up the database to feed this chart.</p>
      {:else}
        <div class="chart-header">
          <div>
            <p class="chart-title">{trends[selectedTrend].label}</p>
            <p class="chart-meta">
              {swapAxes
                ? `${trends[selectedTrend].yLabel} vs ${trends[selectedTrend].xLabel}`
                : `${trends[selectedTrend].xLabel} vs ${trends[selectedTrend].yLabel}`}
            </p>
          </div>
        </div>
        <div class="chart-area" on:wheel|preventDefault={handleWheel}>
          <div class="chart-overlay-title">{trends[selectedTrend].label}</div>
          <svg
            bind:this={svgRef}
            viewBox={`0 0 ${chartWidth + margin.left + margin.right} ${chartHeight + margin.top + margin.bottom}`}
            role="img"
            aria-label="Scatter plot"
            on:mousemove={handleMouseMove}
            on:mouseleave={handleMouseLeave}
          >
            <g transform={`translate(${margin.left},${margin.top})`}>
              {#if plotData.length}
                {#each getTicks(plotData, "y", 6) as tick}
                  <line
                    x1="0"
                    x2={chartWidth}
                    y1={scaleY(tick, plotData)}
                    y2={scaleY(tick, plotData)}
                    stroke="rgba(255,255,255,0.08)"
                    stroke-width="1"
                  />
                  <text
                    x="-10"
                    y={scaleY(tick, plotData) + 4}
                    text-anchor="end"
                    class="tick-label"
                  >
                    {tick.toFixed(0)}
                  </text>
                {/each}

                {#each getTicks(plotData, "x", 6) as tick}
                  <line
                    x1={scaleX(tick, plotData)}
                    x2={scaleX(tick, plotData)}
                    y1="0"
                    y2={chartHeight}
                    stroke="rgba(255,255,255,0.08)"
                    stroke-width="1"
                  />
                  <text
                    x={scaleX(tick, plotData)}
                    y={chartHeight + 18}
                    text-anchor="middle"
                    class="tick-label"
                  >
                    {tick.toFixed(0)}
                  </text>
                {/each}

                <rect
                  x="0"
                  y="0"
                  width={chartWidth}
                  height={chartHeight}
                  fill="none"
                  stroke="rgba(255,255,255,0.15)"
                  stroke-width="1"
                />

                {#if regression}
                  <line
                    x1={scaleX(regression.minX, plotData)}
                    y1={scaleY(regression.minY, plotData)}
                    x2={scaleX(regression.maxX, plotData)}
                    y2={scaleY(regression.maxY, plotData)}
                    stroke="rgba(122,210,255,0.8)"
                    stroke-width="2"
                  />
                {/if}
                {#each plotData as point}
                  <circle
                    cx={scaleX(swapAxes ? point.y : point.x, plotData)}
                    cy={scaleY(swapAxes ? point.x : point.y, plotData)}
                    r="5"
                    fill="rgba(59,130,246,0.8)"
                  />
                {/each}
              {/if}
            </g>

            {#if selectedTrend}
              <text
                x={(chartWidth + margin.left + margin.right) / 2}
                y={chartHeight + margin.top + margin.bottom - 16}
                text-anchor="middle"
                class="axis-label"
              >
                {swapAxes ? trends[selectedTrend].yLabel : trends[selectedTrend].xLabel}
              </text>
              <text
                x="16"
                y={(chartHeight + margin.top) / 2}
                text-anchor="middle"
                transform={`rotate(-90 16 ${(chartHeight + margin.top) / 2})`}
                class="axis-label"
              >
                {swapAxes ? trends[selectedTrend].xLabel : trends[selectedTrend].yLabel}
              </text>
            {/if}
          </svg>

          {#if hovered}
            <div class="tooltip" style={`left:${hovered.x}px;top:${hovered.y}px;`}>
              <p class="tooltip-title">{hovered.point.label}</p>
              <p class="tooltip-meta">
                {hovered.point.x.toFixed(1)} / {hovered.point.y.toFixed(1)}
              </p>
            </div>
          {/if}
        </div>
        <div class="download-row">
          <button class="primary-button strong-button" type="button" on:click={downloadCSV} disabled={!plotData.length}>
            Download {selectedTrend ? trends[selectedTrend].label : "trend"} data
          </button>
          <button
            class="secondary-button"
            type="button"
            on:click={() => {
              swapAxes = !swapAxes;
              zoomLevel = 1;
            }}
            disabled={!plotData.length}
          >
            Swap axes
          </button>
        </div>
      {/if}
    </section>

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
    max-width: none;
    margin: 0 auto;
    padding: 28px clamp(16px, 3vw, 32px) 72px;
    display: grid;
    gap: 20px;
  }

  .hero-panel {
    border-radius: 20px;
    border: 1px solid var(--border);
    padding: 28px 24px;
    background: linear-gradient(135deg, color-mix(in srgb, var(--panel) 94%, transparent), rgba(79, 123, 191, 0.12));
    box-shadow: var(--card-shadow);
  }

  .eyebrow {
    margin: 0;
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent-strong);
    font-weight: 700;
  }

  .hero-title {
    margin: 8px 0 6px;
    font-size: clamp(1.9rem, 4vw, 2.4rem);
  }

  .lede {
    margin: 0;
    color: var(--text-muted);
    max-width: 760px;
  }

  .controls {
    display: grid;
    gap: 14px;
  }

  .control-card {
    padding: 14px;
    border-radius: 14px;
    border: 1px solid var(--border);
    background: color-mix(in srgb, var(--panel) 92%, transparent);
    box-shadow: var(--card-shadow);
  }

  .control-label {
    margin: 0 0 8px;
    font-weight: 700;
  }

  .pill-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .pill-button {
    border-radius: 999px;
    padding: 10px 14px;
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--border));
    color: var(--accent-strong);
    font-weight: 700;
    cursor: pointer;
  }

  .active-pill {
    background: color-mix(in srgb, var(--accent) 35%, transparent);
    border-color: color-mix(in srgb, var(--accent) 60%, var(--border));
    color: var(--text-primary);
  }

  .trend-grid {
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .trend-card {
    border-radius: 14px;
    border: 1px solid var(--border);
    padding: 12px;
    background: color-mix(in srgb, var(--panel) 90%, transparent);
    text-align: left;
    cursor: pointer;
    transition: transform 0.12s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  }

  .trend-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.28);
    border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
  }

  .trend-card--active {
    border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
    box-shadow: 0 12px 42px rgba(0, 0, 0, 0.34);
  }

  .trend-title {
    margin: 0 0 4px;
    font-weight: 700;
  }

  .trend-meta {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.92rem;
  }

  .control-actions {
    display: flex;
    justify-content: flex-end;
  }

  .chart-panel {
    padding: 16px;
  }

  .chart-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .chart-title {
    margin: 0;
    font-weight: 700;
    font-size: 1.02rem;
  }

  .chart-meta {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.92rem;
  }

  .chart-area {
    border-radius: 12px;
    border: 1px solid var(--border);
    background: color-mix(in srgb, var(--panel) 90%, transparent);
    overflow: hidden;
    position: relative;
  }

  .chart-overlay-title {
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    font-weight: 700;
    color: var(--text-primary);
    text-shadow: 0 1px 10px rgba(0, 0, 0, 0.35);
    pointer-events: none;
  }

  .tick-label {
    fill: var(--text-muted);
    font-size: 0.82rem;
  }

  .axis-label {
    fill: var(--text-primary);
    font-weight: 700;
    font-size: 0.9rem;
  }

  .tooltip {
    position: absolute;
    transform: translate(-50%, -120%);
    background: color-mix(in srgb, var(--panel) 96%, transparent);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 8px 10px;
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.28);
    min-width: 140px;
    pointer-events: none;
  }

  .tooltip-title {
    margin: 0 0 2px;
    font-weight: 700;
  }

  .tooltip-meta {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .download-row {
    margin-top: 12px;
    display: flex;
    justify-content: center;
    gap: 10px;
  }

  .strong-button {
    box-shadow: var(--glow);
    border: 1px solid color-mix(in srgb, var(--accent) 40%, var(--border));
  }
</style>

<svelte:head>
  <title>Parametric | Trends</title>
</svelte:head>

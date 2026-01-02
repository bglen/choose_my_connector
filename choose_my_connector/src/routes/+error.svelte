<script lang="ts">
	type Props = {
		status: number;
		error: Error & { message?: string };
	};

	let { status, error }: Props = $props();

	const isNotFound = $derived(status === 404);
	const headline = $derived(isNotFound ? "Page not found" : "Something went wrong");
	const detail = $derived(
		isNotFound
			? "We looked everywhere but couldn't find that page. It may have moved or the link is out of date."
			: error?.message ?? "An unexpected error occurred. Please try again in a moment."
	);
</script>

<svelte:head>
	<title>{headline} • Parametric</title>
</svelte:head>

<main class="error-shell">
	<div class="glow glow--a"></div>
	<div class="glow glow--b"></div>

	<section class="error-card" aria-labelledby="error-title">
		<p class="eyebrow">Error {status}</p>
		<h1 id="error-title">{headline}</h1>
		<p class="lede">{detail}</p>

		<div class="cta-row">
			<a class="primary-button" href="/">Back to main page</a>
			<a class="ghost-button" href="mailto:hello@parametric.parts?subject=404%20feedback">
				Report an issue
			</a>
		</div>

	</section>
</main>

<style>
	.error-shell {
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: clamp(18px, 4vw, 36px);
		position: relative;
		overflow: hidden;
	}

	.glow {
		position: absolute;
		border-radius: 999px;
		filter: blur(120px);
		opacity: 0.6;
		z-index: 0;
	}

	.glow--a {
		width: 540px;
		height: 540px;
		top: -180px;
		left: -160px;
		background: radial-gradient(circle, rgba(79, 123, 191, 0.22), transparent 50%);
	}

	.glow--b {
		width: 520px;
		height: 520px;
		bottom: -200px;
		right: -120px;
		background: radial-gradient(circle, rgba(56, 189, 248, 0.2), transparent 55%);
	}

	.error-card {
		position: relative;
		z-index: 1;
		max-width: 720px;
		width: min(720px, 100%);
		border-radius: 22px;
		border: 1px solid var(--border);
		background: linear-gradient(
				135deg,
				color-mix(in srgb, var(--panel) 92%, transparent),
				color-mix(in srgb, rgba(79, 123, 191, 0.16), transparent)
			),
			color-mix(in srgb, var(--panel) 92%, transparent);
		box-shadow: var(--card-shadow);
		padding: clamp(22px, 4vw, 36px);
		display: grid;
		justify-items: center;
		text-align: center;
		gap: 14px;
	}

	.error-card::after {
		content: "";
		position: absolute;
		inset: 0;
		background: radial-gradient(circle at 28% 20%, rgba(79, 123, 191, 0.12), transparent 42%),
			radial-gradient(circle at 80% 12%, rgba(56, 189, 248, 0.16), transparent 46%);
		border-radius: inherit;
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
		margin: 0;
	}

	h1 {
		margin: 0;
		font-size: clamp(1.8rem, 3.4vw, 2.6rem);
		line-height: 1.1;
	}

	.lede {
		margin: 0;
		color: var(--text-muted);
		font-size: 1.02rem;
	}

	.cta-row {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 10px;
		margin-top: 4px;
	}

	.primary-button,
	.ghost-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		border: 1px solid transparent;
		padding: 12px 18px;
		font-weight: 700;
		text-decoration: none;
		transition: transform 0.15s ease, box-shadow 0.2s ease, background-color 0.2s ease,
			border-color 0.2s ease;
		cursor: pointer;
	}

	.primary-button {
		background: linear-gradient(135deg, var(--accent), var(--accent-strong));
		color: #fff;
		box-shadow: var(--glow);
	}

	.primary-button:hover {
		transform: translateY(-1px);
	}

	.ghost-button {
		border-color: var(--border);
		color: var(--text-primary);
		background: color-mix(in srgb, var(--panel) 84%, transparent);
	}

	.ghost-button:hover {
		transform: translateY(-1px);
		box-shadow: 0 10px 30px rgba(12, 26, 75, 0.14);
	}

	@media (max-width: 640px) {
		.error-card {
			padding: 18px;
		}

	}
</style>

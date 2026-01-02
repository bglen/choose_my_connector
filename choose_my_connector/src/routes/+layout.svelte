<script lang="ts">
	import { onMount } from "svelte";
	import favicon from "$lib/assets/favicon.svg";
	import "./layout.css";
	import { theme } from "$lib/stores/theme";

	let { children } = $props();

	onMount(() => {
		theme.init();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<script>
		const saved = localStorage.getItem("cmc-theme");
		const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		const next = saved ?? (prefersDark ? "dark" : "light");
		document.documentElement.dataset.theme = next;
	</script>
</svelte:head>

{@render children()}

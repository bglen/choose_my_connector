<script>
    let results = [];
    let filters = {
        type: "",
        waterproof: "",
        panel: "",
        minContacts: "",
        maxContacts: "",
        current: "",
        voltage: ""
    };


    async function search() {
        const params = new URLSearchParams(filters);
        const res = await fetch(`/api/search?${params.toString()}`);
        results = await res.json();
    }
</script>


<h1>Choose My Connector</h1>


<div class="filters">
    <select bind:value={filters.type}>
        <option value="">Connection Type</option>
        <option value="wire-to-board">Wire to Board</option>
        <option value="wire-to-wire">Wire to Wire</option>
        <option value="board-to-board">Board to Board</option>
    </select>


    <select bind:value={filters.waterproof}>
        <option value="">Waterproof?</option>
        <option value="1">Yes</option>
        <option value="0">No</option>
    </select>


    <select bind:value={filters.panel}>
        <option value="">Panel Mount?</option>
        <option value="1">Yes</option>
        <option value="0">No</option>
    </select>


    <input type="number" placeholder="Min Contacts" bind:value={filters.minContacts} />
    <input type="number" placeholder="Max Contacts" bind:value={filters.maxContacts} />
    <input type="number" placeholder="Min Current (A)" bind:value={filters.current} />
    <input type="number" placeholder="Min Voltage (V)" bind:value={filters.voltage} />


    <button on:click={search}>Search</button>
</div>


<hr />


{#if results.length === 0}
    <p>No results yet.</p>
{/if}


{#each results as item}
    <div class="card">
        <h2>{item.series}</h2>
        <img src={item.imageUrl} alt={item.series} width="120" />
        <p>Contacts: {item.contacts}</p>
        <p>{item.current} A, {item.voltage} V</p>
        <a href={item.datasheetUrl} target="_blank">Datasheet</a>
        <a href={item.cadUrl} target="_blank">CAD</a>
    </div>
{/each}


<style>
    .filters {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 1rem;
    }

    .card {
        border: 1px solid #ccc;
        padding: 1rem;
        margin: 0.5rem 0;
    }
</style>
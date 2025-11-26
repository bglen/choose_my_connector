# Landing page improvements for connector series search

The current landing page offers only basic filters and minimal result presentation. Below are proposed improvements aligned with the database schema in `src/lib/drizzle/schema.ts`.

## Filtering and query inputs
- **Connection type** (`connectionType`): Keep as select; add helper text/examples.
- **Waterproof & panel mount** (`waterproof`, `panelMount`): Use toggle chips instead of raw select to reduce clicks.
- **Pitch range** (`pitch` on series or parts): Dual slider or min/max numeric fields with mm suffix.
- **Current & voltage** (`minCurrent`, `maxCurrent`, `minVoltage`, `maxVoltage`): Separate per-contact vs. total current toggles; allow minimum required values.
- **Positions & rows** (`positions`, `rows` on parts): Numeric range sliders or stepper inputs; preset buttons for common counts (2, 4, 6, 10, etc.).
- **Wire size support** (joins via `seriesWireSizes`/`wireSizes`): Multiselect chips for AWG; show equivalent mm².
- **Environmental/spec ratings** (`specs`, `seriesSpecs`, `partSpecs`): Checklist grouped by category (e.g., IP, UL94). Support multi-select with badge counts.
- **Colors** (`seriesColors`/`partColors`): Swatch pickers with labels; allow multi-select.
- **Tooling availability** (`seriesTools`): Checkbox for "Stocked hand crimper available"; badge with tool count per result.
- **Series relationships** (`seriesRelationships`): Filter for "mates with" or "fully compatible" to surface alternatives; show related-series links on cards.
- **Datasheet/CAD presence** (`datasheetUrl`, `cadUrl`): Toggles to require documentation/CAD models.
- **Keyword search** (`name`, `manufacturer`, `notes`): Single search bar with fuzzy matching across series name, manufacturer, and notes.

## Result display and sorting
- **Sorting controls**: Sort by pitch, positions, max current, newest added, or price (when price table populated).
- **Card details**: Display manufacturer, pitch, wire range, current/voltage limits, waterproof/panel mount chips, and supported specs as badges.
- **Pricing snippet** (`partPrices`): Show lowest break with distributor name and MOQ if data is present.
- **Media**: Use `seriesImageUrl` fallback to part `imageUrl`; lazy-load thumbnails.
- **Actions**: Primary CTA for datasheet, secondary for CAD, and tertiary for tooling/compatibility links.

## UX polish
- **Filter summary bar**: Show active filters as removable chips and a single "Clear all" action.
- **Empty state**: Replace "No results yet" with guidance (e.g., relax filters, try other specs) and sample popular series.
- **Performance**: Debounce searches on input changes; show a loading state and skeleton cards.
- **Responsive layout**: Two-column card grid on desktop, single column on mobile; sticky filter panel for wide screens.

## Data alignment notes
- Ensure API accepts the above filter parameters and maps them to the corresponding fields in `connectorSeries`, `connectorParts`, `seriesWireSizes`, `specs`, and related join tables.
- Validate numeric filters (pitch/current/voltage/positions) before issuing requests to avoid server errors.

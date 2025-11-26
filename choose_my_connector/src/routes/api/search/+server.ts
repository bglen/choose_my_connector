import { db } from "$lib/db";
import { connectorSeries } from "$lib/drizzle/schema";
import { and, asc, eq, gte, like, or, sql } from "drizzle-orm";

function parseNumberParam(value: string | null) {
    if (value === null || value === "") return null;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return null;
    return Math.max(0, parsed);
}

function sanitizeType(value: string) {
    return value.replace(/[%_]/g, "").trim().toLowerCase();
}

export async function GET({ url }) {
    const typeFilters = url
        .searchParams
        .getAll("type")
        .flatMap((entry) => entry.split(","))
        .map(sanitizeType)
        .filter(Boolean);

    const filters = {
        waterproof: parseNumberParam(url.searchParams.get("waterproof")),
        panel: parseNumberParam(url.searchParams.get("panel")),
        current: parseNumberParam(url.searchParams.get("current")),
        voltage: parseNumberParam(url.searchParams.get("voltage"))
    };

    const where = [];

    if (typeFilters.length) {
        const typeClauses = typeFilters.map((type) =>
            like(sql`lower(${connectorSeries.connectionType})`, `%${type}%`)
        );
        where.push(or(...typeClauses));
    }

    if (filters.waterproof !== null) where.push(eq(connectorSeries.waterproof, filters.waterproof));
    if (filters.panel !== null) where.push(eq(connectorSeries.panelMount, filters.panel));
    if (filters.current !== null) where.push(gte(connectorSeries.maxCurrent, filters.current));
    if (filters.voltage !== null) where.push(gte(connectorSeries.maxVoltage, filters.voltage));

    const results = await db
        .select({
            id: connectorSeries.id,
            name: connectorSeries.name,
            manufacturer: connectorSeries.manufacturer,
            connectionType: connectorSeries.connectionType,
            waterproof: connectorSeries.waterproof,
            panelMount: connectorSeries.panelMount,
            pitch: connectorSeries.pitch,
            maxCurrent: connectorSeries.maxCurrent,
            maxVoltage: connectorSeries.maxVoltage,
            datasheetUrl: connectorSeries.seriesDatasheetUrl,
            imageUrl: connectorSeries.seriesImageUrl,
            notes: connectorSeries.notes
        })
        .from(connectorSeries)
        .where(where.length ? and(...where) : undefined)
        .orderBy(asc(connectorSeries.manufacturer), asc(connectorSeries.name));

    return new Response(JSON.stringify(results), {
        headers: { "Content-Type": "application/json" }
    });
}

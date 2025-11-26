import { DISTRIBUTORS, distributorSlugToLabel } from "$lib/constants/distributors";
import { db } from "$lib/db";
import { connectorSeries, seriesDistributorLinks } from "$lib/drizzle/schema";
import { and, asc, eq, exists, gte, inArray, like, or, sql } from "drizzle-orm";

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

    const distributorFilters = url
        .searchParams
        .getAll("distributor")
        .flatMap((entry) => entry.split(","))
        .map((value) => value.trim().toLowerCase())
        .filter((value) => DISTRIBUTORS.some((distributor) => distributor.slug === value))
        .map((value) => distributorSlugToLabel[value])
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
    if (distributorFilters.length) {
        where.push(
            exists(
                db
                    .select({ id: seriesDistributorLinks.seriesId })
                    .from(seriesDistributorLinks)
                    .where(
                        and(
                            eq(seriesDistributorLinks.seriesId, connectorSeries.id),
                            inArray(seriesDistributorLinks.distributor, distributorFilters)
                        )
                    )
            )
        );
    }

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
            notes: connectorSeries.notes,
            distributorLinks: sql<string>`json_group_array(
                CASE
                    WHEN ${seriesDistributorLinks.purchaseUrl} IS NOT NULL THEN
                        json_object('distributor', ${seriesDistributorLinks.distributor}, 'purchaseUrl', ${seriesDistributorLinks.purchaseUrl})
                END
            )`.as("distributorLinks")
        })
        .from(connectorSeries)
        .leftJoin(seriesDistributorLinks, eq(seriesDistributorLinks.seriesId, connectorSeries.id))
        .where(where.length ? and(...where) : undefined)
        .groupBy(connectorSeries.id)
        .orderBy(asc(connectorSeries.manufacturer), asc(connectorSeries.name));

    const response = results.map((row) => {
        const parsedLinks = row.distributorLinks
            ? JSON.parse(row.distributorLinks).filter(Boolean)
            : [];

        return {
            ...row,
            distributorLinks: parsedLinks.filter((entry: any) => entry?.purchaseUrl)
        };
    });

    return new Response(JSON.stringify(response), {
        headers: { "Content-Type": "application/json" }
    });
}

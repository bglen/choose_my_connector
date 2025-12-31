import { DISTRIBUTORS, distributorSlugToLabel } from "$lib/constants/distributors";
import { db } from "$lib/db";
import { productSeries, seriesPurchaseLinks } from "$lib/drizzle/schema";
import { and, asc, eq, exists, gte, inArray, like, lte, or, sql } from "drizzle-orm";

function parseNumberParam(value: string | null) {
    if (value === null || value === "") return null;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return null;
    return Math.max(0, parsed);
}

function sanitizeType(value: string) {
    return value.replace(/%/g, "").trim().toLowerCase();
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
        current: parseNumberParam(url.searchParams.get("current")),
        voltage: parseNumberParam(url.searchParams.get("voltage")),
        minPower: parseNumberParam(url.searchParams.get("minPower")),
        maxPower: parseNumberParam(url.searchParams.get("maxPower"))
    };

    const where = [];

    if (typeFilters.length) {
        const typeClauses = typeFilters.map((type) =>
            like(sql`lower(${productSeries.productType})`, `%${type}%`)
        );
        where.push(or(...typeClauses));
    }

    if (filters.current !== null) where.push(gte(productSeries.maxCurrent, filters.current));
    if (filters.voltage !== null) where.push(gte(productSeries.maxVoltage, filters.voltage));
    if (filters.minPower !== null) where.push(gte(productSeries.maxPower, filters.minPower));
    if (filters.maxPower !== null) where.push(lte(productSeries.maxPower, filters.maxPower));
    if (distributorFilters.length) {
        where.push(
            exists(
                db
                    .select({ id: seriesPurchaseLinks.seriesId })
                    .from(seriesPurchaseLinks)
                    .where(
                        and(
                            eq(seriesPurchaseLinks.seriesId, productSeries.id),
                            inArray(seriesPurchaseLinks.distributor, distributorFilters)
                        )
                    )
            )
        );
    }

    const results = await db
        .select({
            id: productSeries.id,
            name: productSeries.name,
            manufacturer: productSeries.manufacturer,
            productType: productSeries.productType,
            minVoltage: productSeries.minVoltage,
            maxVoltage: productSeries.maxVoltage,
            maxCurrent: productSeries.maxCurrent,
            maxPower: productSeries.maxPower,
            minCapacityMah: productSeries.minCapacityMah,
            maxCapacityMah: productSeries.maxCapacityMah,
            datasheetUrl: productSeries.seriesDatasheetUrl,
            cadUrl: productSeries.seriesCadUrl,
            imageUrl: productSeries.seriesImageUrl,
            notes: productSeries.notes,
            distributorLinks: sql<string>`json_group_array(
                CASE
                    WHEN ${seriesPurchaseLinks.purchaseUrl} IS NOT NULL THEN
                        json_object('distributor', ${seriesPurchaseLinks.distributor}, 'purchaseUrl', ${seriesPurchaseLinks.purchaseUrl})
                END
            )`.as("distributorLinks")
        })
        .from(productSeries)
        .leftJoin(seriesPurchaseLinks, eq(seriesPurchaseLinks.seriesId, productSeries.id))
        .where(where.length ? and(...where) : undefined)
        .groupBy(productSeries.id)
        .orderBy(asc(productSeries.manufacturer), asc(productSeries.name));

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

import { db } from "$lib/db";
import { batteryProducts, escProducts, motorProducts } from "$lib/drizzle/schema";
import { and, asc, gte, like, lte, or, sql } from "drizzle-orm";

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

    const filters = {
        current: parseNumberParam(url.searchParams.get("current")),
        voltage: parseNumberParam(url.searchParams.get("voltage")),
        minPower: parseNumberParam(url.searchParams.get("minPower")),
        maxPower: parseNumberParam(url.searchParams.get("maxPower"))
    };

    const escWhere = [];
    const batteryWhere = [];
    const motorWhere = [];

    if (filters.current !== null) {
        escWhere.push(
            or(
                gte(escProducts.continuousCurrent, filters.current),
                gte(escProducts.peakCurrent, filters.current)
            )
        );
        motorWhere.push(gte(motorProducts.maxPower, filters.current)); // fallback proxy
    }

    if (filters.voltage !== null) {
        batteryWhere.push(gte(batteryProducts.voltage, filters.voltage));
        motorWhere.push(gte(motorProducts.voltage, filters.voltage));
    }

    if (filters.minPower !== null) motorWhere.push(gte(motorProducts.maxPower, filters.minPower));
    if (filters.maxPower !== null) motorWhere.push(lte(motorProducts.maxPower, filters.maxPower));

    const query = url.searchParams.get("q")?.trim().toLowerCase();

    if (query) {
        const escQuery = like(sql`lower(${escProducts.name})`, `%${query}%`);
        escWhere.push(escQuery);

        const battQuery = like(sql`lower(${batteryProducts.name})`, `%${query}%`);
        batteryWhere.push(battQuery);

        const motorQuery = like(sql`lower(${motorProducts.name})`, `%${query}%`);
        motorWhere.push(motorQuery);
    }

    const includeType = (type: string) => typeFilters.length === 0 || typeFilters.some((entry) => entry === type);

    const response: Array<Record<string, any>> = [];

    if (includeType("esc")) {
        const escRows = await db
            .select({
                id: escProducts.id,
                name: escProducts.name,
                manufacturer: escProducts.manufacturer,
                productType: sql`'esc'`.as("productType"),
                minVoltage: sql<number>`NULL`,
                maxVoltage: sql<number>`NULL`,
                maxCurrent: escProducts.peakCurrent ?? escProducts.continuousCurrent,
                maxPower: escProducts.peakPower,
                minCapacityMah: sql<number>`NULL`,
                maxCapacityMah: sql<number>`NULL`,
                datasheetUrl: escProducts.datasheetUrl,
                cadUrl: escProducts.cadUrl,
                imageUrl: escProducts.pictureUrl,
                notes: sql<string>`NULL`,
                purchaseUrl: escProducts.purchaseUrl
            })
            .from(escProducts)
            .where(escWhere.length ? and(...escWhere) : undefined)
            .orderBy(asc(escProducts.manufacturer), asc(escProducts.name));

        response.push(
            ...escRows.map((row) => ({
                ...row,
                distributorLinks: row.purchaseUrl
                    ? [{ distributor: "Purchase", purchaseUrl: row.purchaseUrl }]
                    : []
            }))
        );
    }

    if (includeType("battery")) {
        const batteryRows = await db
            .select({
                id: batteryProducts.id,
                name: batteryProducts.name,
                manufacturer: batteryProducts.manufacturer,
                productType: sql`'battery'`.as("productType"),
                minVoltage: sql<number>`NULL`,
                maxVoltage: batteryProducts.voltage,
                maxCurrent: sql<number>`NULL`,
                maxPower: sql<number>`NULL`,
                minCapacityMah: batteryProducts.capacityMah,
                maxCapacityMah: batteryProducts.capacityMah,
                datasheetUrl: batteryProducts.datasheetUrl,
                cadUrl: batteryProducts.cadUrl,
                imageUrl: sql<string>`NULL`,
                notes: batteryProducts.notes,
                purchaseUrl: batteryProducts.purchaseUrl
            })
            .from(batteryProducts)
            .where(batteryWhere.length ? and(...batteryWhere) : undefined)
            .orderBy(asc(batteryProducts.manufacturer), asc(batteryProducts.name));

        response.push(
            ...batteryRows.map((row) => ({
                ...row,
                distributorLinks: row.purchaseUrl
                    ? [{ distributor: "Purchase", purchaseUrl: row.purchaseUrl }]
                    : []
            }))
        );
    }

    if (includeType("brushless_motor") || includeType("motor")) {
        const motorRows = await db
            .select({
                id: motorProducts.id,
                name: motorProducts.name,
                manufacturer: motorProducts.manufacturer,
                productType: sql`'brushless_motor'`.as("productType"),
                minVoltage: sql<number>`NULL`,
                maxVoltage: motorProducts.voltage,
                maxCurrent: sql<number>`NULL`,
                maxPower: motorProducts.maxPower,
                minCapacityMah: sql<number>`NULL`,
                maxCapacityMah: sql<number>`NULL`,
                datasheetUrl: motorProducts.datasheetUrl,
                cadUrl: motorProducts.cadUrl,
                imageUrl: sql<string>`NULL`,
                notes: motorProducts.notes,
                purchaseUrl: motorProducts.purchaseUrl
            })
            .from(motorProducts)
            .where(motorWhere.length ? and(...motorWhere) : undefined)
            .orderBy(asc(motorProducts.manufacturer), asc(motorProducts.name));

        response.push(
            ...motorRows.map((row) => ({
                ...row,
                distributorLinks: row.purchaseUrl
                    ? [{ distributor: "Purchase", purchaseUrl: row.purchaseUrl }]
                    : []
            }))
        );
    }

    return new Response(JSON.stringify(response), {
        headers: { "Content-Type": "application/json" }
    });
}

import {
  DISTRIBUTORS,
  buildDistributorPurchaseUrl,
  distributorLabelToSlug
} from "$lib/constants/distributors";
import { db } from "$lib/db";
import { connectorParts, partPrices } from "$lib/drizzle/schema";
import { and, asc, eq, like, sql } from "drizzle-orm";

function parsePositiveNumber(value: string | null) {
  if (value === null || value === "") return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return null;
  return parsed < 0 ? null : parsed;
}

function sanitizeSearch(value: string | null) {
  if (!value) return "";
  return value.replace(/[%_]/g, "").trim().toLowerCase();
}

export async function GET({ url }) {
  const seriesId = parsePositiveNumber(url.searchParams.get("seriesId"));
  const query = sanitizeSearch(url.searchParams.get("q"));
  const positions = parsePositiveNumber(url.searchParams.get("positions"));
  const rows = parsePositiveNumber(url.searchParams.get("rows"));

  if (!seriesId) {
    return new Response(JSON.stringify({ error: "seriesId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const where = [eq(connectorParts.seriesId, seriesId)];

  if (query) {
    where.push(like(sql`lower(${connectorParts.partNumber})`, `%${query}%`));
  }

  if (positions !== null) where.push(eq(connectorParts.positions, positions));
  if (rows !== null) where.push(eq(connectorParts.rows, rows));

  const results = await db
    .select({
      id: connectorParts.id,
      seriesId: connectorParts.seriesId,
      partNumber: connectorParts.partNumber,
      positions: connectorParts.positions,
      rows: connectorParts.rows,
      pitch: connectorParts.pitch,
      datasheetUrl: connectorParts.datasheetUrl,
      cadUrl: connectorParts.cadUrl,
      imageUrl: connectorParts.imageUrl,
      distributorPrices: sql<string>`json_group_array(
        CASE
          WHEN ${partPrices.id} IS NOT NULL THEN
            json_object(
              'distributor', ${partPrices.distributor},
              'minQty', ${partPrices.minQty},
              'unitPrice', ${partPrices.unitPrice},
              'currency', ${partPrices.currency}
            )
        END
      )`.as("distributorPrices")
    })
    .from(connectorParts)
    .leftJoin(partPrices, eq(partPrices.partId, connectorParts.id))
    .where(and(...where))
    .groupBy(connectorParts.id)
    .orderBy(asc(connectorParts.partNumber));

  const fallbackDistributors = DISTRIBUTORS.map(({ label }) => label);

  const response = results.map((row) => {
    const parsedPrices: Array<{
      distributor?: string;
      minQty?: number;
      unitPrice?: number;
      currency?: string;
    }> = row.distributorPrices ? JSON.parse(row.distributorPrices).filter(Boolean) : [];

    const distributorsFromPrices = parsedPrices
      .map((entry) => entry.distributor)
      .filter((value): value is string => Boolean(value));

    const distributors = distributorsFromPrices.length
      ? Array.from(new Set(distributorsFromPrices))
      : fallbackDistributors;

    const purchaseLinks = distributors
      .map((distributor) => {
        const url = buildDistributorPurchaseUrl(distributor, row.partNumber);
        if (!url) return null;

        const slug =
          distributorLabelToSlug[distributor.toLowerCase()] ||
          (distributor.includes("/") ? distributor : distributor.toLowerCase());

        return { distributor, url, slug };
      })
      .filter(Boolean);

    const lowestPrice = parsedPrices
      .filter((entry) => typeof entry.unitPrice === "number")
      .sort((a, b) => (a.unitPrice ?? 0) - (b.unitPrice ?? 0))[0];

    const ecadUrl = row.partNumber
      ? `https://www.snapeda.com/search/?q=${encodeURIComponent(row.partNumber)}`
      : null;

    const cadUrl = row.cadUrl || ecadUrl;

    return {
      ...row,
      distributorPrices: parsedPrices,
      purchaseLinks,
      lowestPrice: lowestPrice
        ? {
            distributor: lowestPrice.distributor ?? "Distributor",
            minQty: lowestPrice.minQty,
            unitPrice: lowestPrice.unitPrice,
            currency: lowestPrice.currency || "USD"
          }
        : null,
      cadUrl,
      ecadUrl
    };
  });

  return new Response(JSON.stringify(response), {
    headers: { "Content-Type": "application/json" }
  });
}

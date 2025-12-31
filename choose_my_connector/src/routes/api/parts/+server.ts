import {
  DISTRIBUTORS,
  buildDistributorPurchaseUrl,
  distributorLabelToSlug
} from "$lib/constants/distributors";
import { db } from "$lib/db";
import {
  batterySpecs,
  escSpecs,
  motorSpecs,
  productVariants,
  variantPurchaseLinks
} from "$lib/drizzle/schema";
import { and, asc, eq, gte, like, or, sql } from "drizzle-orm";

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
  const filters = {
    minRotorDiameter: parsePositiveNumber(url.searchParams.get("minRotorDiameter")),
    minShaftLength: parsePositiveNumber(url.searchParams.get("minShaftLength")),
    minStatorSlotCount: parsePositiveNumber(url.searchParams.get("minStatorSlotCount")),
    minEscTemperature: parsePositiveNumber(url.searchParams.get("minEscTemperature")),
    minChargeRateC: parsePositiveNumber(url.searchParams.get("minChargeRateC")),
    minChargeCurrent: parsePositiveNumber(url.searchParams.get("minChargeCurrent")),
    minCycleLife: parsePositiveNumber(url.searchParams.get("minCycleLife"))
  };

  if (!seriesId) {
    return new Response(JSON.stringify({ error: "seriesId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const where = [eq(productVariants.seriesId, seriesId)];

  if (query) {
    where.push(
      or(
        like(sql`lower(${productVariants.modelNumber})`, `%${query}%`),
        like(sql`lower(${productVariants.variantName})`, `%${query}%`)
      )
    );
  }

  if (filters.minRotorDiameter !== null) {
    where.push(gte(motorSpecs.rotorDiameter, filters.minRotorDiameter));
  }

  if (filters.minShaftLength !== null) {
    where.push(gte(motorSpecs.shaftLength, filters.minShaftLength));
  }

  if (filters.minStatorSlotCount !== null) {
    where.push(gte(motorSpecs.statorSlotCount, filters.minStatorSlotCount));
  }

  if (filters.minEscTemperature !== null) {
    where.push(gte(escSpecs.temperatureLimitC, filters.minEscTemperature));
  }

  if (filters.minChargeRateC !== null) {
    where.push(gte(batterySpecs.chargeRateC, filters.minChargeRateC));
  }

  if (filters.minChargeCurrent !== null) {
    where.push(gte(batterySpecs.maxChargeCurrent, filters.minChargeCurrent));
  }

  if (filters.minCycleLife !== null) {
    where.push(gte(batterySpecs.cycleLife, filters.minCycleLife));
  }

  const results = await db
    .select({
      id: productVariants.id,
      seriesId: productVariants.seriesId,
      modelNumber: productVariants.modelNumber,
      variantName: productVariants.variantName,
      sku: productVariants.sku,
      nominalVoltage: productVariants.nominalVoltage,
      maxVoltage: productVariants.maxVoltage,
      maxCurrent: productVariants.maxCurrent,
      maxPower: productVariants.maxPower,
      capacityMah: productVariants.capacityMah,
      weightGrams: productVariants.weightGrams,
      length: productVariants.length,
      width: productVariants.width,
      height: productVariants.height,
      datasheetUrl: productVariants.datasheetUrl,
      cadUrl: productVariants.cadUrl,
      imageUrl: productVariants.imageUrl,
      motorSpecs: sql<string>`CASE
        WHEN ${motorSpecs.variantId} IS NOT NULL THEN json_object(
          'motorType', ${motorSpecs.motorType},
          'kvRating', ${motorSpecs.kvRating},
          'poleCount', ${motorSpecs.poleCount},
          'statorDiameter', ${motorSpecs.statorDiameter},
          'statorLength', ${motorSpecs.statorLength},
          'statorSlotCount', ${motorSpecs.statorSlotCount},
          'rotorDiameter', ${motorSpecs.rotorDiameter},
          'shaftDiameter', ${motorSpecs.shaftDiameter},
          'shaftLength', ${motorSpecs.shaftLength},
          'maxCurrent', ${motorSpecs.maxCurrent},
          'maxVoltage', ${motorSpecs.maxVoltage},
          'maxPower', ${motorSpecs.maxPower},
          'maxTorque', ${motorSpecs.maxTorque},
          'noLoadCurrent', ${motorSpecs.noLoadCurrent},
          'resistanceMilliohms', ${motorSpecs.resistanceMilliohms},
          'inductanceMicrohenry', ${motorSpecs.inductanceMicrohenry},
          'efficiency', ${motorSpecs.efficiency},
          'weightGrams', ${motorSpecs.weightGrams},
          'mountingPattern', ${motorSpecs.mountingPattern},
          'bearingType', ${motorSpecs.bearingType},
          'temperatureLimitC', ${motorSpecs.temperatureLimitC},
          'notes', ${motorSpecs.notes}
        )
      END`.as("motorSpecs"),
      escSpecs: sql<string>`CASE
        WHEN ${escSpecs.variantId} IS NOT NULL THEN json_object(
          'firmware', ${escSpecs.firmware},
          'continuousCurrent', ${escSpecs.continuousCurrent},
          'burstCurrent', ${escSpecs.burstCurrent},
          'minVoltage', ${escSpecs.minVoltage},
          'maxVoltage', ${escSpecs.maxVoltage},
          'cellCountMin', ${escSpecs.cellCountMin},
          'cellCountMax', ${escSpecs.cellCountMax},
          'protocols', ${escSpecs.protocols},
          'pwmFrequencyKhz', ${escSpecs.pwmFrequencyKhz},
          'becType', ${escSpecs.becType},
          'becVoltage', ${escSpecs.becVoltage},
          'becCurrent', ${escSpecs.becCurrent},
          'inputConnector', ${escSpecs.inputConnector},
          'motorConnector', ${escSpecs.motorConnector},
          'telemetry', ${escSpecs.telemetry},
          'braking', ${escSpecs.braking},
          'waterproofRating', ${escSpecs.waterproofRating},
          'temperatureLimitC', ${escSpecs.temperatureLimitC},
          'length', ${escSpecs.length},
          'width', ${escSpecs.width},
          'height', ${escSpecs.height},
          'weightGrams', ${escSpecs.weightGrams},
          'notes', ${escSpecs.notes}
        )
      END`.as("escSpecs"),
      batterySpecs: sql<string>`CASE
        WHEN ${batterySpecs.variantId} IS NOT NULL THEN json_object(
          'chemistry', ${batterySpecs.chemistry},
          'capacityMah', ${batterySpecs.capacityMah},
          'nominalVoltage', ${batterySpecs.nominalVoltage},
          'maxVoltage', ${batterySpecs.maxVoltage},
          'minVoltage', ${batterySpecs.minVoltage},
          'cellCount', ${batterySpecs.cellCount},
          'dischargeCurrentContinuous', ${batterySpecs.dischargeCurrentContinuous},
          'dischargeCurrentBurst', ${batterySpecs.dischargeCurrentBurst},
          'dischargeRateC', ${batterySpecs.dischargeRateC},
          'chargeRateC', ${batterySpecs.chargeRateC},
          'maxChargeCurrent', ${batterySpecs.maxChargeCurrent},
          'cycleLife', ${batterySpecs.cycleLife},
          'energyWh', ${batterySpecs.energyWh},
          'internalResistanceMilliohms', ${batterySpecs.internalResistanceMilliohms},
          'connector', ${batterySpecs.connector},
          'balanceConnector', ${batterySpecs.balanceConnector},
          'length', ${batterySpecs.length},
          'width', ${batterySpecs.width},
          'height', ${batterySpecs.height},
          'weightGrams', ${batterySpecs.weightGrams},
          'notes', ${batterySpecs.notes}
        )
      END`.as("batterySpecs"),
      distributorPrices: sql<string>`json_group_array(
        CASE
          WHEN ${variantPurchaseLinks.id} IS NOT NULL THEN
            json_object(
              'distributor', ${variantPurchaseLinks.distributor},
              'minQty', ${variantPurchaseLinks.minQty},
              'unitPrice', ${variantPurchaseLinks.unitPrice},
              'currency', ${variantPurchaseLinks.currency},
              'purchaseUrl', ${variantPurchaseLinks.purchaseUrl},
              'sku', ${variantPurchaseLinks.sku}
            )
        END
      )`.as("distributorPrices")
    })
    .from(productVariants)
    .leftJoin(variantPurchaseLinks, eq(variantPurchaseLinks.variantId, productVariants.id))
    .leftJoin(motorSpecs, eq(motorSpecs.variantId, productVariants.id))
    .leftJoin(escSpecs, eq(escSpecs.variantId, productVariants.id))
    .leftJoin(batterySpecs, eq(batterySpecs.variantId, productVariants.id))
    .where(and(...where))
    .groupBy(productVariants.id)
    .orderBy(asc(productVariants.modelNumber));

  const fallbackDistributors = DISTRIBUTORS.map(({ label }) => label);

  const response = results.map((row) => {
    const parsedPrices: Array<{
      distributor?: string;
      minQty?: number;
      unitPrice?: number;
      currency?: string;
      purchaseUrl?: string;
      sku?: string;
    }> = row.distributorPrices ? JSON.parse(row.distributorPrices).filter(Boolean) : [];

    const distributorsFromPrices = parsedPrices
      .map((entry) => entry.distributor)
      .filter((value): value is string => Boolean(value));

    const distributors = distributorsFromPrices.length
      ? Array.from(new Set(distributorsFromPrices))
      : fallbackDistributors;

    const purchaseLinks = distributors
      .map((distributor) => {
        const searchTerm = row.modelNumber ?? row.variantName ?? "";
        const url =
          parsedPrices.find((entry) => entry.distributor === distributor)?.purchaseUrl ||
          buildDistributorPurchaseUrl(distributor, searchTerm);
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

    const ecadUrl =
      row.modelNumber || row.variantName
        ? `https://www.snapeda.com/search/?q=${encodeURIComponent(row.modelNumber ?? row.variantName ?? "")}`
        : null;

    const cadUrl = row.cadUrl || ecadUrl;

    return {
      ...row,
      motorSpecs: row.motorSpecs ? JSON.parse(row.motorSpecs) : null,
      escSpecs: row.escSpecs ? JSON.parse(row.escSpecs) : null,
      batterySpecs: row.batterySpecs ? JSON.parse(row.batterySpecs) : null,
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

import { db } from "$lib/db";
import { batteryProducts, escProducts, motorProducts } from "$lib/drizzle/schema";
import { and, asc, eq, like, or, sql } from "drizzle-orm";

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

const buildEcadUrl = (modelNumber: string | null, variantName: string | null) => {
  const term = modelNumber ?? variantName ?? "";
  if (!term) return null;
  return `https://www.snapeda.com/search/?q=${encodeURIComponent(term)}`;
};

export async function GET({ url }) {
  const productId = parsePositiveNumber(url.searchParams.get("seriesId"));
  const productType = url.searchParams.get("productType")?.toLowerCase() ?? "";
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

  if (!productId) {
    return new Response(JSON.stringify({ error: "seriesId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  if (!productType) {
    return new Response(JSON.stringify({ error: "productType is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  if (productType.includes("motor")) {
    const where = [eq(motorProducts.id, productId)];

    if (query) {
      where.push(like(sql`lower(${motorProducts.name})`, `%${query}%`));
    }

    const results = await db
      .select()
      .from(motorProducts)
      .where(and(...where))
      .orderBy(asc(motorProducts.name));

    const response = results.map((row) => {
      const ecadUrl = buildEcadUrl(row.name, row.name);
      return {
        id: row.id,
        seriesId: row.id,
        modelNumber: row.name,
        variantName: null,
        sku: null,
        nominalVoltage: row.voltage,
        maxVoltage: row.voltage,
        maxCurrent: null,
        maxPower: row.maxPower,
        capacityMah: null,
        weightGrams: row.weight,
        length: null,
        width: null,
        height: null,
        datasheetUrl: row.datasheetUrl,
        cadUrl: row.cadUrl || ecadUrl,
        ecadUrl,
        imageUrl: null,
        motorSpecs: {
          kvRating: row.kvRating,
          poleCount: null,
          statorDiameter: null,
          statorLength: null,
          statorSlotCount: null,
          rotorDiameter: null,
          shaftDiameter: null,
          shaftLength: null,
          maxCurrent: null,
          maxVoltage: row.voltage,
          maxPower: row.maxPower,
          maxTorque: null,
          noLoadCurrent: null,
          resistanceMilliohms: null,
          inductanceMicrohenry: null,
          efficiency: null,
          weightGrams: row.weight,
          mountingPattern: row.statorSize,
          bearingType: null,
          temperatureLimitC: null,
          notes: row.notes
        },
        escSpecs: null,
        batterySpecs: null,
        distributorPrices: [],
        purchaseLinks: row.purchaseUrl
          ? [{ distributor: "Purchase", url: row.purchaseUrl, slug: "purchase" }]
          : [],
        lowestPrice: null
      };
    });

    return new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (productType === "esc") {
    const where = [eq(escProducts.id, productId)];

    if (query) {
      where.push(like(sql`lower(${escProducts.name})`, `%${query}%`));
    }

    const results = await db
      .select()
      .from(escProducts)
      .where(and(...where))
      .orderBy(asc(escProducts.name));

    const response = results.map((row) => {
      const ecadUrl = buildEcadUrl(row.name, row.name);
      return {
        id: row.id,
        seriesId: row.id,
        modelNumber: row.name,
        variantName: row.name,
        sku: null,
        nominalVoltage: null,
        maxVoltage: null,
        maxCurrent: row.peakCurrent ?? row.continuousCurrent,
        maxPower: row.peakPower,
        capacityMah: null,
        weightGrams: row.mass,
        length: null,
        width: null,
        height: null,
        datasheetUrl: row.datasheetUrl,
        cadUrl: row.cadUrl || ecadUrl,
        ecadUrl,
        imageUrl: row.pictureUrl,
        motorSpecs: null,
        escSpecs: {
          firmware: null,
          continuousCurrent: row.continuousCurrent,
          burstCurrent: row.peakCurrent,
          minVoltage: null,
          maxVoltage: null,
          cellCountMin: row.minCells,
          cellCountMax: row.maxCells,
          protocols: row.firmwareFeatures,
          pwmFrequencyKhz: null,
          becType: row.bec,
          becVoltage: null,
          becCurrent: null,
          inputConnector: row.connectionType,
          motorConnector: null,
          telemetry: null,
          braking: null,
          waterproofRating: row.waterproof,
          temperatureLimitC: null,
          length: null,
          width: null,
          height: null,
          weightGrams: row.mass,
          notes: null
        },
        batterySpecs: null,
        distributorPrices: [],
        purchaseLinks: row.purchaseUrl
          ? [{ distributor: "Purchase", url: row.purchaseUrl, slug: "purchase" }]
          : [],
        lowestPrice: null
      };
    });

    return new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (productType === "battery") {
    const where = [eq(batteryProducts.id, productId)];

    if (query) {
      where.push(like(sql`lower(${batteryProducts.name})`, `%${query}%`));
    }

    const results = await db
      .select()
      .from(batteryProducts)
      .where(and(...where))
      .orderBy(asc(batteryProducts.name));

    const response = results.map((row) => {
      const ecadUrl = buildEcadUrl(row.name, row.name);
      return {
        id: row.id,
        seriesId: row.id,
        modelNumber: row.name,
        variantName: row.name,
        sku: null,
        nominalVoltage: row.voltage,
        maxVoltage: row.voltage,
        maxCurrent: null,
        maxPower: null,
        capacityMah: row.capacityMah,
        weightGrams: row.weight,
        length: null,
        width: null,
        height: null,
        datasheetUrl: row.datasheetUrl,
        cadUrl: row.cadUrl || ecadUrl,
        ecadUrl,
        imageUrl: null,
        motorSpecs: null,
        escSpecs: null,
        batterySpecs: {
          chemistry: row.chemistry,
          capacityMah: row.capacityMah,
          nominalVoltage: row.voltage,
          maxVoltage: row.voltage,
          minVoltage: null,
          cellCount: row.cellCount,
          dischargeCurrentContinuous: null,
          dischargeCurrentBurst: null,
          dischargeRateC: row.dischargeC,
          chargeRateC: null,
          maxChargeCurrent: null,
          cycleLife: null,
          energyWh: null,
          internalResistanceMilliohms: null,
          connector: null,
          balanceConnector: null,
          length: null,
          width: null,
          height: null,
          weightGrams: row.weight,
          notes: row.notes
        },
        distributorPrices: [],
        purchaseLinks: row.purchaseUrl
          ? [{ distributor: "Purchase", url: row.purchaseUrl, slug: "purchase" }]
          : [],
        lowestPrice: null
      };
    });

    return new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ error: "Unsupported productType" }), {
    status: 400,
    headers: { "Content-Type": "application/json" }
  });
}

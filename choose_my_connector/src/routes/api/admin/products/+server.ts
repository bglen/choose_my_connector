import { db } from "$lib/db";
import { batteryProducts, escProducts, motorProducts } from "$lib/drizzle/schema";
import { asc, eq } from "drizzle-orm";
import { json } from "@sveltejs/kit";

type Category = "esc" | "battery" | "motor";

type ProductPayload = Record<string, unknown> & {
  category?: Category;
  id?: number;
};

const categoryMap = {
  esc: escProducts,
  battery: batteryProducts,
  motor: motorProducts
} as const;

function getCategory(value: unknown): Category | null {
  if (value === "esc" || value === "battery" || value === "motor") return value;
  return null;
}

function cleanText(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function cleanNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return undefined;
  return parsed;
}

export async function GET({ url }) {
  const category = getCategory(url.searchParams.get("category"));
  if (!category) {
    return json({ error: "Category must be esc, battery, or motor." }, { status: 400 });
  }

  const table = categoryMap[category];
  const results = await db
    .select()
    .from(table)
    .orderBy(asc(table.name));

  return json(results);
}

export async function POST({ request }) {
  let payload: ProductPayload;

  try {
    payload = await request.json();
  } catch (error) {
    console.error("Failed to parse admin product payload", error);
    return json({ error: "Invalid request body." }, { status: 400 });
  }

  const category = getCategory(payload.category);
  if (!category) {
    return json({ error: "Category must be esc, battery, or motor." }, { status: 400 });
  }

  const name = cleanText(payload.name);
  if (!name) {
    return json({ error: "Name is required." }, { status: 400 });
  }

  const manufacturer = cleanText(payload.manufacturer);
  const notes = cleanText(payload.notes);
  const cadUrl = cleanText(payload.cadUrl);
  const datasheetUrl = cleanText(payload.datasheetUrl);
  const purchaseUrl = cleanText(payload.purchaseUrl);

  try {
    if (category === "esc") {
      const inserted = await db
        .insert(escProducts)
        .values({
          name: name.slice(0, 200),
          manufacturer: manufacturer?.slice(0, 200),
          continuousCurrent: cleanNumber(payload.continuousCurrent),
          burstCurrent: cleanNumber(payload.burstCurrent),
          minVoltage: cleanNumber(payload.minVoltage),
          maxVoltage: cleanNumber(payload.maxVoltage),
          weight: cleanNumber(payload.weight),
          cadUrl: cadUrl?.slice(0, 500),
          datasheetUrl: datasheetUrl?.slice(0, 500),
          purchaseUrl: purchaseUrl?.slice(0, 500),
          notes: notes?.slice(0, 1000)
        })
        .returning();

      return json({ ok: true, product: inserted[0] });
    }

    if (category === "battery") {
      const inserted = await db
        .insert(batteryProducts)
        .values({
          name: name.slice(0, 200),
          manufacturer: manufacturer?.slice(0, 200),
          chemistry: cleanText(payload.chemistry)?.slice(0, 100),
          cellCount: cleanNumber(payload.cellCount),
          capacityMah: cleanNumber(payload.capacityMah),
          dischargeC: cleanNumber(payload.dischargeC),
          voltage: cleanNumber(payload.voltage),
          weight: cleanNumber(payload.weight),
          cadUrl: cadUrl?.slice(0, 500),
          datasheetUrl: datasheetUrl?.slice(0, 500),
          purchaseUrl: purchaseUrl?.slice(0, 500),
          notes: notes?.slice(0, 1000)
        })
        .returning();

      return json({ ok: true, product: inserted[0] });
    }

    const inserted = await db
      .insert(motorProducts)
      .values({
        name: name.slice(0, 200),
        manufacturer: manufacturer?.slice(0, 200),
        kvRating: cleanNumber(payload.kvRating),
        statorSize: cleanText(payload.statorSize)?.slice(0, 100),
        maxPower: cleanNumber(payload.maxPower),
        voltage: cleanNumber(payload.voltage),
        weight: cleanNumber(payload.weight),
        cadUrl: cadUrl?.slice(0, 500),
        datasheetUrl: datasheetUrl?.slice(0, 500),
        purchaseUrl: purchaseUrl?.slice(0, 500),
        notes: notes?.slice(0, 1000)
      })
      .returning();

    return json({ ok: true, product: inserted[0] });
  } catch (error) {
    console.error("Failed to create product", error);
    return json({ error: "Could not save product." }, { status: 500 });
  }
}

export async function PATCH({ request }) {
  let payload: ProductPayload;

  try {
    payload = await request.json();
  } catch (error) {
    console.error("Failed to parse admin product update", error);
    return json({ error: "Invalid request body." }, { status: 400 });
  }

  const category = getCategory(payload.category);
  if (!category) {
    return json({ error: "Category must be esc, battery, or motor." }, { status: 400 });
  }

  const id = Number(payload.id);
  if (!id || Number.isNaN(id)) {
    return json({ error: "Valid product id is required." }, { status: 400 });
  }

  const name = cleanText(payload.name);
  if (!name) {
    return json({ error: "Name is required." }, { status: 400 });
  }

  const manufacturer = cleanText(payload.manufacturer);
  const notes = cleanText(payload.notes);
  const cadUrl = cleanText(payload.cadUrl);
  const datasheetUrl = cleanText(payload.datasheetUrl);
  const purchaseUrl = cleanText(payload.purchaseUrl);

  try {
    if (category === "esc") {
      await db
        .update(escProducts)
        .set({
          name: name.slice(0, 200),
          manufacturer: manufacturer?.slice(0, 200),
          continuousCurrent: cleanNumber(payload.continuousCurrent),
          burstCurrent: cleanNumber(payload.burstCurrent),
          minVoltage: cleanNumber(payload.minVoltage),
          maxVoltage: cleanNumber(payload.maxVoltage),
          weight: cleanNumber(payload.weight),
          cadUrl: cadUrl?.slice(0, 500),
          datasheetUrl: datasheetUrl?.slice(0, 500),
          purchaseUrl: purchaseUrl?.slice(0, 500),
          notes: notes?.slice(0, 1000)
        })
        .where(eq(escProducts.id, id));

      return json({ ok: true });
    }

    if (category === "battery") {
      await db
        .update(batteryProducts)
        .set({
          name: name.slice(0, 200),
          manufacturer: manufacturer?.slice(0, 200),
          chemistry: cleanText(payload.chemistry)?.slice(0, 100),
          cellCount: cleanNumber(payload.cellCount),
          capacityMah: cleanNumber(payload.capacityMah),
          dischargeC: cleanNumber(payload.dischargeC),
          voltage: cleanNumber(payload.voltage),
          weight: cleanNumber(payload.weight),
          cadUrl: cadUrl?.slice(0, 500),
          datasheetUrl: datasheetUrl?.slice(0, 500),
          purchaseUrl: purchaseUrl?.slice(0, 500),
          notes: notes?.slice(0, 1000)
        })
        .where(eq(batteryProducts.id, id));

      return json({ ok: true });
    }

    await db
      .update(motorProducts)
      .set({
        name: name.slice(0, 200),
        manufacturer: manufacturer?.slice(0, 200),
        kvRating: cleanNumber(payload.kvRating),
        statorSize: cleanText(payload.statorSize)?.slice(0, 100),
        maxPower: cleanNumber(payload.maxPower),
        voltage: cleanNumber(payload.voltage),
        weight: cleanNumber(payload.weight),
        cadUrl: cadUrl?.slice(0, 500),
        datasheetUrl: datasheetUrl?.slice(0, 500),
        purchaseUrl: purchaseUrl?.slice(0, 500),
        notes: notes?.slice(0, 1000)
      })
      .where(eq(motorProducts.id, id));

    return json({ ok: true });
  } catch (error) {
    console.error("Failed to update product", error);
    return json({ error: "Could not update product." }, { status: 500 });
  }
}

export async function DELETE({ request }) {
  let payload: ProductPayload;

  try {
    payload = await request.json();
  } catch (error) {
    console.error("Failed to parse admin product delete", error);
    return json({ error: "Invalid request body." }, { status: 400 });
  }

  const category = getCategory(payload.category);
  if (!category) {
    return json({ error: "Category must be esc, battery, or motor." }, { status: 400 });
  }

  const id = Number(payload.id);
  if (!id || Number.isNaN(id)) {
    return json({ error: "Valid product id is required." }, { status: 400 });
  }

  try {
    const table = categoryMap[category];
    await db.delete(table).where(eq(table.id, id));
    return json({ ok: true });
  } catch (error) {
    console.error("Failed to delete product", error);
    return json({ error: "Could not delete product." }, { status: 500 });
  }
}

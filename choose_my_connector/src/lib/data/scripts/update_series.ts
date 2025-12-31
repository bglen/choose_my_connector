// To use: npx tsx src/lib/data/scripts/update_series.ts src/lib/data/product_series.csv

import "dotenv/config";

import { DISTRIBUTORS, distributorLabels } from "$lib/constants/distributors";
import { db } from "$lib/db";
import { productSeries, seriesPurchaseLinks } from "$lib/drizzle/schema";

import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { and, eq, inArray } from "drizzle-orm";

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const targetPath = process.argv[2];
if (!targetPath) {
  console.error("❌ ERROR: Provide a CSV file or folder path as argument.");
  process.exit(1);
}

function getCsvFiles(input: string): string[] {
  const fullPath = path.resolve(input);

  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Path does not exist: ${fullPath}`);
    process.exit(1);
  }

  if (fs.statSync(fullPath).isDirectory()) {
    return fs
      .readdirSync(fullPath)
      .filter((f) => f.endsWith(".csv"))
      .map((f) => path.join(fullPath, f));
  }

  return [fullPath];
}

type CsvRow = Record<string, any>;

function loadCsv(file: string): CsvRow[] {
  const raw = fs.readFileSync(file);
  return parse(raw, { columns: true, skip_empty_lines: true }) as CsvRow[];
}

function normalize(val: any) {
  if (val === "" || val === undefined) return null;
  return typeof val === "string" ? val.trim() : val;
}

function detectChanges(existing: any, incoming: any) {
  const changes: Record<string, any> = {};

  for (const key of Object.keys(incoming)) {
    const oldVal = existing[key] ?? null;
    const newVal = incoming[key] ?? null;

    if (oldVal !== newVal) {
      changes[key] = newVal;
    }
  }
  return changes;
}

// ------------------------------------------------------------------
// Processor
// ------------------------------------------------------------------

async function processCsv(file: string) {
  console.log(`\n📄 Loading: ${file}`);

  const rows = loadCsv(file);
  console.log(`   → ${rows.length} rows`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const hasDistributorColumns = DISTRIBUTORS.some(
      ({ csvKey }) => csvKey && csvKey in row
    );
    const distributorLinks = !hasDistributorColumns
      ? []
      : DISTRIBUTORS
          .map(({ csvKey, label }) => ({
            distributor: label,
            purchaseUrl: normalize((row as Record<string, any>)[csvKey])
          }))
          .filter((entry) => entry.purchaseUrl);
    const name = normalize(row.name);
    const manufacturer = normalize(row.manufacturer);
    const productType = normalize(row.productType);

    if (!name) {
      console.log("   ⏭️  Missing name, skipping row.");
      skipped++;
      continue;
    }

    if (!manufacturer) {
      console.log(`   ⏭️  '${name}' is missing manufacturer, skipping.`);
      skipped++;
      continue;
    }
    if (!productType) {
      console.log(`   ⏭️  '${name}' is missing productType, skipping.`);
      skipped++;
      continue;
    }

    // Prepare row for DB insert/update
    const incoming = {
      name,
      manufacturer,
      productType,
      description: normalize(row.description),
      minVoltage: normalize(row.minVoltage),
      maxVoltage: normalize(row.maxVoltage),
      maxCurrent: normalize(row.maxCurrent),
      maxPower: normalize(row.maxPower),
      minCapacityMah: normalize(row.minCapacityMah),
      maxCapacityMah: normalize(row.maxCapacityMah),
      notes: normalize(row.notes),
      seriesDatasheetUrl: normalize(row.seriesDatasheetUrl),
      seriesCadUrl: normalize(row.seriesCadUrl),
      seriesImageUrl: normalize(row.seriesImageUrl)
    };

    // Look for existing: name + manufacturer
    const existing = await db
      .select()
      .from(productSeries)
      .where(
        and(
          eq(productSeries.name, name),
          eq(productSeries.manufacturer, manufacturer)
        )
      )
      .limit(1);

    const existingRow = existing[0];
    let seriesId = existingRow?.id;

    // Insert new
    if (!existingRow) {
      const insertedRows = await db
        .insert(productSeries)
        .values(incoming)
        .returning({ id: productSeries.id });

      seriesId = insertedRows[0]?.id ?? seriesId;
      console.log(`   ➕ Inserted: ${name} (${manufacturer})`);
      inserted++;
    } else {
      // Detect changes
      const changes = detectChanges(existingRow, incoming);

      if (Object.keys(changes).length === 0) {
        console.log(
          `   ⏭️  No changes: ${name} (${manufacturer}) (series metadata unchanged)`
        );
        skipped++;
      } else {
        // Update only changed fields
        await db
          .update(productSeries)
          .set(changes)
          .where(eq(productSeries.id, existingRow.id));

        console.log(
          `   🔄 Updated: ${name} (${manufacturer}) → changed: ${Object.keys(
            changes
          ).join(", ")}`
        );
        updated++;
      }
    }

    // Sync distributor links only when CSV provides the columns
    if (hasDistributorColumns) {
      if (!seriesId) {
        const lookup = await db
          .select({ id: productSeries.id })
          .from(productSeries)
          .where(
            and(
              eq(productSeries.name, name),
              eq(productSeries.manufacturer, manufacturer)
            )
          )
          .limit(1);

        seriesId = lookup[0]?.id;
      }

      if (!seriesId) {
        console.warn(
          `   ⚠️  Could not resolve series id for ${name}, skipping distributor links.`
        );
        continue;
      }

      await db
        .delete(seriesPurchaseLinks)
        .where(
          and(
            eq(seriesPurchaseLinks.seriesId, seriesId),
            inArray(
              seriesPurchaseLinks.distributor,
              distributorLabels
            )
          )
        );

      if (distributorLinks.length) {
        await db.insert(seriesPurchaseLinks).values(
          distributorLinks.map((entry) => ({
            seriesId,
            distributor: entry.distributor,
            purchaseUrl: entry.purchaseUrl
          }))
        );
        console.log(
          `   🛒 Updated distributors: ${distributorLinks
            .map((d) => d.distributor)
            .join(", ")}`
        );
      }
    }
  }

  console.log(`\n📊 Results for ${path.basename(file)}:`);
  console.log(`   ➕ Inserted: ${inserted}`);
  console.log(`   🔄 Updated: ${updated}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------

async function main() {
  console.log("🚀 Starting product series update…\n");

  const files = getCsvFiles(targetPath);

  for (const file of files) {
    await processCsv(file);
  }

  console.log("\n🎉 Done updating product series.");
  process.exit(0);
}

main();

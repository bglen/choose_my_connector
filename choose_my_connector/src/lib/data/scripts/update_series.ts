// To use: npx tsx src/lib/data/scripts/update_series.ts src/lib/data/series_data.csv

import "dotenv/config";

import { db } from "$lib/db";
import { connectorSeries } from "$lib/drizzle/schema";

import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { and, eq } from "drizzle-orm";

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

function loadCsv(file: string) {
  const raw = fs.readFileSync(file);
  return parse(raw, { columns: true, skip_empty_lines: true });
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
    const name = normalize(row.name);
    const manufacturer = normalize(row.manufacturer);

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

    // Prepare row for DB insert/update
    const incoming = {
      name,
      manufacturer,
      connectionType: normalize(row.connectionType),
      waterproof: normalize(row.waterproof),
      panelMount: normalize(row.panelMount),
      pitch: normalize(row.pitch),
      maxCurrent: normalize(row.maxCurrent),
      maxVoltage: normalize(row.maxVoltage),
      notes: normalize(row.notes),
      seriesDatasheetUrl: normalize(row.seriesDatasheetUrl),
      seriesImageUrl: normalize(row.seriesImageUrl)
    };

    // Look for existing: name + manufacturer
    const existing = await db
      .select()
      .from(connectorSeries)
      .where(
        and(
          eq(connectorSeries.name, name),
          eq(connectorSeries.manufacturer, manufacturer)
        )
      )
      .limit(1);

    const existingRow = existing[0];

    // Insert new
    if (!existingRow) {
      await db.insert(connectorSeries).values(incoming);
      console.log(`   ➕ Inserted: ${name} (${manufacturer})`);
      inserted++;
      continue;
    }

    // Detect changes
    const changes = detectChanges(existingRow, incoming);

    if (Object.keys(changes).length === 0) {
      console.log(`   ⏭️  No changes: ${name} (${manufacturer})`);
      skipped++;
      continue;
    }

    // Update only changed fields
    await db
      .update(connectorSeries)
      .set(changes)
      .where(eq(connectorSeries.id, existingRow.id));

    console.log(
      `   🔄 Updated: ${name} (${manufacturer}) → changed: ${Object.keys(
        changes
      ).join(", ")}`
    );
    updated++;
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
  console.log("🚀 Starting connector series update…\n");

  const files = getCsvFiles(targetPath);

  for (const file of files) {
    await processCsv(file);
  }

  console.log("\n🎉 Done updating connector series.");
  process.exit(0);
}

main();

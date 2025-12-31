// Updated schema.ts for Turso + Drizzle
// This schema models:
// - product series (motors, ESCs, batteries)
// - product variants/SKUs
// - purchase links/pricing
// - engineering-grade specifications
// - reported database issues

import { sql } from "drizzle-orm";
import { integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// -----------------------------
// Product Series (Families)
// -----------------------------
export const productSeries = sqliteTable("product_series", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  manufacturer: text("manufacturer").notNull(),
  productType: text("product_type").notNull(), // brushless_motor, esc, battery
  description: text("description"),
  minVoltage: real("min_voltage"),
  maxVoltage: real("max_voltage"),
  maxCurrent: real("max_current"),
  maxPower: real("max_power"),
  minCapacityMah: real("min_capacity_mah"),
  maxCapacityMah: real("max_capacity_mah"),
  notes: text("notes"),
  seriesDatasheetUrl: text("series_datasheet_url"),
  seriesCadUrl: text("series_cad_url"),
  seriesImageUrl: text("series_image_url")
});

// -----------------------------
// Distributor Links per Series
// -----------------------------
export const seriesPurchaseLinks = sqliteTable(
  "series_purchase_links",
  {
    seriesId: integer("series_id")
      .references(() => productSeries.id)
      .notNull(),
    distributor: text("distributor").notNull(),
    purchaseUrl: text("purchase_url")
  },
  (table) => ({
    pk: primaryKey({ columns: [table.seriesId, table.distributor] })
  })
);

// -----------------------------
// Individual Product Variants/SKUs
// -----------------------------
export const productVariants = sqliteTable("product_variants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  seriesId: integer("series_id")
    .notNull()
    .references(() => productSeries.id),
  modelNumber: text("model_number"),
  variantName: text("variant_name"),
  sku: text("sku"),
  nominalVoltage: real("nominal_voltage"),
  maxVoltage: real("max_voltage"),
  maxCurrent: real("max_current"),
  maxPower: real("max_power"),
  capacityMah: real("capacity_mah"),
  weightGrams: real("weight_grams"),
  length: real("length"),
  width: real("width"),
  height: real("height"),
  datasheetUrl: text("datasheet_url"),
  cadUrl: text("cad_url"),
  imageUrl: text("image_url"),
  notes: text("notes")
});

// -----------------------------
// Variant Purchase Links / Pricing
// -----------------------------
export const variantPurchaseLinks = sqliteTable("variant_purchase_links", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  variantId: integer("variant_id")
    .notNull()
    .references(() => productVariants.id),
  distributor: text("distributor").notNull(),
  purchaseUrl: text("purchase_url"),
  sku: text("sku"),
  minQty: integer("min_qty"),
  unitPrice: real("unit_price"),
  currency: text("currency").default("USD")
});

// -----------------------------
// Brushless Motor Specs
// -----------------------------
export const motorSpecs = sqliteTable(
  "motor_specs",
  {
    variantId: integer("variant_id")
      .notNull()
      .references(() => productVariants.id),
    motorType: text("motor_type"), // inrunner, outrunner
    kvRating: real("kv_rating"),
    poleCount: integer("pole_count"),
    statorDiameter: real("stator_diameter"),
    statorLength: real("stator_length"),
    statorSlotCount: integer("stator_slot_count"),
    rotorDiameter: real("rotor_diameter"),
    shaftDiameter: real("shaft_diameter"),
    shaftLength: real("shaft_length"),
    maxCurrent: real("max_current"),
    maxVoltage: real("max_voltage"),
    maxPower: real("max_power"),
    maxTorque: real("max_torque"),
    noLoadCurrent: real("no_load_current"),
    resistanceMilliohms: real("resistance_milliohms"),
    inductanceMicrohenry: real("inductance_microhenry"),
    efficiency: real("efficiency"),
    weightGrams: real("weight_grams"),
    mountingPattern: text("mounting_pattern"),
    bearingType: text("bearing_type"),
    temperatureLimitC: real("temperature_limit_c"),
    notes: text("notes")
  },
  (table) => ({
    pk: primaryKey({ columns: [table.variantId] })
  })
);

// -----------------------------
// ESC Specs
// -----------------------------
export const escSpecs = sqliteTable(
  "esc_specs",
  {
    variantId: integer("variant_id")
      .notNull()
      .references(() => productVariants.id),
    firmware: text("firmware"),
    continuousCurrent: real("continuous_current"),
    burstCurrent: real("burst_current"),
    minVoltage: real("min_voltage"),
    maxVoltage: real("max_voltage"),
    cellCountMin: integer("cell_count_min"),
    cellCountMax: integer("cell_count_max"),
    protocols: text("protocols"),
    pwmFrequencyKhz: real("pwm_frequency_khz"),
    becType: text("bec_type"),
    becVoltage: real("bec_voltage"),
    becCurrent: real("bec_current"),
    inputConnector: text("input_connector"),
    motorConnector: text("motor_connector"),
    telemetry: text("telemetry"),
    braking: text("braking"),
    waterproofRating: text("waterproof_rating"),
    temperatureLimitC: real("temperature_limit_c"),
    length: real("length"),
    width: real("width"),
    height: real("height"),
    weightGrams: real("weight_grams"),
    notes: text("notes")
  },
  (table) => ({
    pk: primaryKey({ columns: [table.variantId] })
  })
);

// -----------------------------
// Battery Specs
// -----------------------------
export const batterySpecs = sqliteTable(
  "battery_specs",
  {
    variantId: integer("variant_id")
      .notNull()
      .references(() => productVariants.id),
    chemistry: text("chemistry"),
    capacityMah: real("capacity_mah"),
    nominalVoltage: real("nominal_voltage"),
    maxVoltage: real("max_voltage"),
    minVoltage: real("min_voltage"),
    cellCount: integer("cell_count"),
    dischargeCurrentContinuous: real("discharge_current_continuous"),
    dischargeCurrentBurst: real("discharge_current_burst"),
    dischargeRateC: real("discharge_rate_c"),
    chargeRateC: real("charge_rate_c"),
    maxChargeCurrent: real("max_charge_current"),
    cycleLife: integer("cycle_life"),
    energyWh: real("energy_wh"),
    internalResistanceMilliohms: real("internal_resistance_milliohms"),
    connector: text("connector"),
    balanceConnector: text("balance_connector"),
    length: real("length"),
    width: real("width"),
    height: real("height"),
    weightGrams: real("weight_grams"),
    notes: text("notes")
  },
  (table) => ({
    pk: primaryKey({ columns: [table.variantId] })
  })
);

// -----------------------------
// Reported Database Issues
// -----------------------------
export const issueReports = sqliteTable("issue_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email"),
  productName: text("product_name"),
  context: text("context"),
  details: text("details").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
});

// -----------------------------
// Product Categories: ESCs, Batteries, Motors
// -----------------------------

export const escProducts = sqliteTable('esc_products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  manufacturer: text('manufacturer'),
  continuousCurrent: real('continuous_current'),
  burstCurrent: real('burst_current'),
  minVoltage: real('min_voltage'),
  maxVoltage: real('max_voltage'),
  weight: real('weight'),
  cadUrl: text('cad_url'),
  datasheetUrl: text('datasheet_url'),
  purchaseUrl: text('purchase_url'),
  notes: text('notes')
});

export const batteryProducts = sqliteTable('battery_products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  manufacturer: text('manufacturer'),
  chemistry: text('chemistry'),
  cellCount: integer('cell_count'),
  capacityMah: integer('capacity_mah'),
  dischargeC: real('discharge_c'),
  voltage: real('voltage'),
  weight: real('weight'),
  cadUrl: text('cad_url'),
  datasheetUrl: text('datasheet_url'),
  purchaseUrl: text('purchase_url'),
  notes: text('notes')
});

export const motorProducts = sqliteTable('motor_products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  manufacturer: text('manufacturer'),
  kvRating: integer('kv_rating'),
  statorSize: text('stator_size'),
  maxPower: real('max_power'),
  voltage: real('voltage'),
  weight: real('weight'),
  cadUrl: text('cad_url'),
  datasheetUrl: text('datasheet_url'),
  purchaseUrl: text('purchase_url'),
  notes: text('notes')
});

// Updated schema.ts for Turso + Drizzle
// This schema models:
// - connector series
// - individual parts
// - pricing tiers
// - wire size compatibility
// - specs/standards
// - colors
// - tooling
// - physical dimensions
// - contact groups (power/signal/etc)
// - keying options

import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text, real, primaryKey } from 'drizzle-orm/sqlite-core';

// -----------------------------
// Connector Series
// -----------------------------
export const connectorSeries = sqliteTable('connector_series', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),                 // e.g. "JST XH"
  manufacturer: text('manufacturer'),
  connectionType: text('connection_type'),      // wire-to-board, board-to-board, etc.
  waterproof: integer('waterproof'),            // 0/1
  panelMount: integer('panel_mount'),           // 0/1
  pitch: real('pitch'),                         // mm
  minCurrent: real('min_current'),
  maxCurrent: real('max_current'),
  minVoltage: real('min_voltage'),
  maxVoltage: real('max_voltage'),
  notes: text('notes'),
  seriesDatasheetUrl: text('series_datasheet_url'),
  seriesImageUrl: text('series_image_url')
});

// -----------------------------
// Distributor Links per Series
// -----------------------------
export const seriesDistributorLinks = sqliteTable('series_distributor_links', {
  seriesId: integer('series_id').references(() => connectorSeries.id).notNull(),
  distributor: text('distributor').notNull(),
  purchaseUrl: text('purchase_url')
}, (table) => ({
  pk: primaryKey({ columns: [table.seriesId, table.distributor] })
}));

// -----------------------------
// Individual Connector Parts
// -----------------------------
export const connectorParts = sqliteTable('connector_parts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seriesId: integer('series_id').notNull().references(() => connectorSeries.id),

  partNumber: text('part_number'),
  positions: integer('positions'),              // total contacts
  rows: integer('rows'),                        // e.g. 1,2,3
  pitch: real('pitch'),                         // may differ from series

  // Per-part current ratings
  partMaxCurrentPerContact: real('part_max_current_per_contact'),
  partMaxCurrentTotal: real('part_max_current_total'),

  // Physical dimensions
  length: real('length'),
  width: real('width'),
  height: real('height'),
  footprintArea: real('footprint_area'),        // optional precomputed
  volume: real('volume'),                       // optional precomputed
  contactDensity: real('contact_density'),      // optional precomputed

  datasheetUrl: text('datasheet_url'),
  cadUrl: text('cad_url'),
  imageUrl: text('image_url')
});

// -----------------------------
// Part Pricing (MOQ + Breaks)
// -----------------------------
export const partPrices = sqliteTable('part_prices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  partId: integer('part_id').notNull().references(() => connectorParts.id),
  distributor: text('distributor').notNull(),
  minQty: integer('min_qty').notNull(),
  unitPrice: real('unit_price').notNull(),
  currency: text('currency').default('USD')
});

// -----------------------------
// Wire Sizes (AWG)
// -----------------------------
export const wireSizes = sqliteTable('wire_sizes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  awg: integer('awg').notNull(),
  areaMm2: real('area_mm2')
});

export const seriesWireSizes = sqliteTable('series_wire_sizes', {
  seriesId: integer('series_id').references(() => connectorSeries.id).notNull(),
  wireSizeId: integer('wire_size_id').references(() => wireSizes.id).notNull()
});

// -----------------------------
// Specs / Standards (UL94, IP67, etc.)
// -----------------------------
export const specs = sqliteTable('specs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull(),             // "UL94-V0", "IP67", etc.
  category: text('category'),
  description: text('description')
});

export const seriesSpecs = sqliteTable('series_specs', {
  seriesId: integer('series_id').references(() => connectorSeries.id).notNull(),
  specId: integer('spec_id').references(() => specs.id).notNull(),
  appliesToAllParts: integer('applies_to_all_parts').notNull().default(1)
});

export const partSpecs = sqliteTable('part_specs', {
  partId: integer('part_id').references(() => connectorParts.id).notNull(),
  specId: integer('spec_id').references(() => specs.id).notNull()
});

// -----------------------------
// Colors
// -----------------------------
export const colors = sqliteTable('colors', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull()             // black, white, red, natural
});

export const seriesColors = sqliteTable('series_colors', {
  seriesId: integer('series_id').references(() => connectorSeries.id).notNull(),
  colorId: integer('color_id').references(() => colors.id).notNull()
});

export const partColors = sqliteTable('part_colors', {
  partId: integer('part_id').references(() => connectorParts.id).notNull(),
  colorId: integer('color_id').references(() => colors.id).notNull()
});

// -----------------------------
// Crimp Tooling
// -----------------------------
export const tools = sqliteTable('tools', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  manufacturer: text('manufacturer'),
  partNumber: text('part_number'),
  toolType: text('tool_type'),           // hand_crimper, applicator, etc.
  cost: real('cost'),
  currency: text('currency').default('USD')
});

export const seriesTools = sqliteTable('series_tools', {
  seriesId: integer('series_id').references(() => connectorSeries.id).notNull(),
  toolId: integer('tool_id').references(() => tools.id).notNull()
});

// -----------------------------
// Contact Groups (power, signal, etc.)
// -----------------------------
export const contactGroups = sqliteTable('contact_groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  partId: integer('part_id').references(() => connectorParts.id).notNull(),
  groupType: text('group_type'),            // power, sign
});

// -----------------------------
// Series Relationships
// -----------------------------
export const seriesRelationships = sqliteTable('series_relationships', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seriesAId: integer('series_a_id').references(() => connectorSeries.id).notNull(),
  seriesBId: integer('series_b_id').references(() => connectorSeries.id).notNull(),
  relationType: text('relation_type').notNull(), // 'subseries_of', 'fully_compatible', 'mates_with'
  notes: text('notes')
});

// -----------------------------
// Reported Database Issues
// -----------------------------
export const issueReports = sqliteTable('issue_reports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email'),
  connectorName: text('connector_name'),
  context: text('context'),
  details: text('details').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
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

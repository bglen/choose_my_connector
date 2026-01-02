// Updated schema.ts for Turso + Drizzle
// This schema models:
// - product series (motors, ESCs, batteries)
// - product variants/SKUs
// - purchase links/pricing
// - engineering-grade specifications
// - reported database issues

import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
// Accounts + Sessions
// -----------------------------
export const accounts = sqliteTable(
  "accounts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email").notNull(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    passwordHash: text("password_hash").notNull(),
    passwordSalt: text("password_salt").notNull(),
    isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastLoginAt: integer("last_login_at", { mode: "timestamp" })
  },
  (table) => ({
    emailUnique: uniqueIndex("accounts_email_unique").on(table.email)
  })
);

export const accountSessions = sqliteTable(
  "account_sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull()
  },
  (table) => ({
    tokenHashUnique: uniqueIndex("account_sessions_token_hash_unique").on(table.tokenHash)
  })
);
// Product Categories: ESCs, Batteries, Motors
// -----------------------------

export const escProducts = sqliteTable("esc_products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  manufacturer: text("manufacturer"),
  continuousCurrent: real("continuous_current"),
  peakCurrent: real("peak_current"),
  peakCurrentTime: real("peak_current_time"),
  min_cells: real("min_cells"),
  max_cells: real("max_cells"),
  peakPower: real("peak_power"),
  bec: text("bec"),
  connectionType: text("connection_type"),
  waterproof: text("waterproof"),
  firmwareFeatures: text("firmware_features"),
  mass: real("mass"),
  price: real("price"),
  cadUrl: text("cad_url"),
  datasheetUrl: text("datasheet_url"),
  purchaseUrl: text("purchase_url"),
  pictureUrl: text("picture_url")
});

export const batteryProducts = sqliteTable("battery_products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  manufacturer: text("manufacturer"),
  chemistry: text("chemistry"),
  cellCount: integer("cell_count"),
  capacityMah: integer("capacity_mah"),
  dischargeC: real("discharge_c"),
  minVoltage: real("min_voltage"),
  maxVoltage: real("max_voltage"),
  mass: real("mass"),
  cadUrl: text("cad_url"),
  datasheetUrl: text("datasheet_url"),
  purchaseUrl: text("purchase_url"),
  pictureUrl: text("picture_url")
});

export const motorProducts = sqliteTable("motor_products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  manufacturer: text("manufacturer"),
  kvRating: integer("kv_rating"),
  peakPower: real("peak_power"),
  minVoltage: real("min_voltage"),
  maxVoltage: real("max_voltage"),
  mass: real("mass"),
  cadUrl: text("cad_url"),
  datasheetUrl: text("datasheet_url"),
  purchaseUrl: text("purchase_url"),
  pictureUrl: text("picture_url")
});

// -----------------------------
// Column metadata for admin UI labels/descriptions
// -----------------------------
export const columnMetadata = sqliteTable("column_metadata", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tableName: text("table_name").notNull(),
    columnName: text("column_name").notNull(),
    label: text("label"),
    description: text("description"),
    inputType: text("input_type"),
    displayOrder: integer("display_order")
  });

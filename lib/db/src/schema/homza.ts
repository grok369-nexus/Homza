import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const homzaRole = pgEnum("homza_role", ["tenant", "owner", "admin"]);
export const ownerVerificationStatus = pgEnum("homza_owner_verification_status", ["unverified", "pending", "verified", "rejected"]);
export const propertyStatus = pgEnum("homza_property_status", ["available", "pending", "rented", "paused", "hidden"]);
export const reportStatus = pgEnum("homza_report_status", ["open", "reviewing", "resolved", "dismissed"]);

export const users = pgTable("homza_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: homzaRole("role").notNull().default("tenant"),
  phone: text("phone"),
  ownerVerificationStatus: ownerVerificationStatus("owner_verification_status").notNull().default("unverified"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("homza_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const properties = pgTable("homza_properties", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  type: text("type").notNull(),
  location: text("location").notNull(),
  district: text("district").notNull(),
  neighborhood: text("neighborhood").notNull(),
  rent: integer("rent").notNull(),
  advanceMonths: integer("advance_months").notNull().default(1),
  bedrooms: integer("bedrooms").notNull().default(1),
  bathrooms: integer("bathrooms").notNull().default(1),
  size: integer("size"),
  image: text("image").notNull(),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  description: text("description").notNull().default(""),
  amenities: jsonb("amenities").$type<string[]>().notNull().default([]),
  status: propertyStatus("status").notNull().default("pending"),
  verified: boolean("verified").notNull().default(false),
  views: integer("views").notNull().default(0),
  leads: integer("leads").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
});

export const favorites = pgTable("homza_favorites", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.userId, table.propertyId] })]);

export const savedSearches = pgTable("homza_saved_searches", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  location: text("location").notNull().default(""),
  summary: text("summary").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reports = pgTable("homza_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  reporterId: uuid("reporter_id").references(() => users.id, { onDelete: "set null" }),
  reason: text("reason").notNull(),
  status: reportStatus("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contactMessages = pgTable("homza_contact_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  topic: text("topic").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type HomzaUser = typeof users.$inferSelect;
export type NewHomzaUser = typeof users.$inferInsert;
export type HomzaPropertyRow = typeof properties.$inferSelect;

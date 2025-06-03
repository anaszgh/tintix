import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("installer"), // "installer" or "manager"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const jobEntries = pgTable("job_entries", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  installerId: varchar("installer_id").notNull().references(() => users.id),
  vehicleYear: varchar("vehicle_year").notNull(),
  vehicleMake: varchar("vehicle_make").notNull(),
  vehicleModel: varchar("vehicle_model").notNull(),
  timeVariance: integer("time_variance").notNull(), // in minutes, positive or negative
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const redoEntries = pgTable("redo_entries", {
  id: serial("id").primaryKey(),
  jobEntryId: integer("job_entry_id").notNull().references(() => jobEntries.id, { onDelete: "cascade" }),
  part: varchar("part").notNull(), // "windshield", "rollups", "back_windshield", "quarter"
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  jobEntries: many(jobEntries),
}));

export const jobEntriesRelations = relations(jobEntries, ({ one, many }) => ({
  installer: one(users, {
    fields: [jobEntries.installerId],
    references: [users.id],
  }),
  redoEntries: many(redoEntries),
}));

export const redoEntriesRelations = relations(redoEntries, ({ one }) => ({
  jobEntry: one(jobEntries, {
    fields: [redoEntries.jobEntryId],
    references: [jobEntries.id],
  }),
}));

// Insert schemas
export const insertJobEntrySchema = createInsertSchema(jobEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRedoEntrySchema = createInsertSchema(redoEntries).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type JobEntry = typeof jobEntries.$inferSelect;
export type InsertJobEntry = z.infer<typeof insertJobEntrySchema>;
export type RedoEntry = typeof redoEntries.$inferSelect;
export type InsertRedoEntry = z.infer<typeof insertRedoEntrySchema>;

// Combined types for API responses
export type JobEntryWithDetails = JobEntry & {
  installer: User;
  redoEntries: RedoEntry[];
};

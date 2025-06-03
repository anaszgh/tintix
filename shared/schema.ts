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
  vehicleYear: varchar("vehicle_year").notNull(),
  vehicleMake: varchar("vehicle_make").notNull(),
  vehicleModel: varchar("vehicle_model").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const jobInstallers = pgTable("job_installers", {
  id: serial("id").primaryKey(),
  jobEntryId: integer("job_entry_id").notNull().references(() => jobEntries.id, { onDelete: "cascade" }),
  installerId: varchar("installer_id").notNull().references(() => users.id),
  timeVariance: integer("time_variance").notNull(), // in minutes, positive or negative for each installer
  createdAt: timestamp("created_at").defaultNow(),
});

export const redoEntries = pgTable("redo_entries", {
  id: serial("id").primaryKey(),
  jobEntryId: integer("job_entry_id").notNull().references(() => jobEntries.id, { onDelete: "cascade" }),
  installerId: varchar("installer_id").notNull().references(() => users.id),
  part: varchar("part").notNull(), // "windshield", "rollups", "back_windshield", "quarter"
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  jobInstallers: many(jobInstallers),
  redoEntries: many(redoEntries),
}));

export const jobEntriesRelations = relations(jobEntries, ({ many }) => ({
  jobInstallers: many(jobInstallers),
  redoEntries: many(redoEntries),
}));

export const jobInstallersRelations = relations(jobInstallers, ({ one }) => ({
  jobEntry: one(jobEntries, {
    fields: [jobInstallers.jobEntryId],
    references: [jobEntries.id],
  }),
  installer: one(users, {
    fields: [jobInstallers.installerId],
    references: [users.id],
  }),
}));

export const redoEntriesRelations = relations(redoEntries, ({ one }) => ({
  jobEntry: one(jobEntries, {
    fields: [redoEntries.jobEntryId],
    references: [jobEntries.id],
  }),
  installer: one(users, {
    fields: [redoEntries.installerId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertJobEntrySchema = createInsertSchema(jobEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJobInstallerSchema = createInsertSchema(jobInstallers).omit({
  id: true,
  createdAt: true,
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
export type JobInstaller = typeof jobInstallers.$inferSelect;
export type InsertJobInstaller = z.infer<typeof insertJobInstallerSchema>;
export type RedoEntry = typeof redoEntries.$inferSelect;
export type InsertRedoEntry = z.infer<typeof insertRedoEntrySchema>;

// Combined types for API responses
export type JobEntryWithDetails = JobEntry & {
  installers: User[];
  redoEntries: (RedoEntry & { installer: User })[];
};

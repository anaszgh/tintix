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
  real,
  numeric,
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

// Film types management
export const films = pgTable("films", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(), // Film name/type
  type: varchar("type").notNull(), // Category: "ceramic", "carbon", "dyed", etc.
  costPerSqft: numeric("cost_per_sqft", { precision: 10, scale: 2 }).notNull(), // Cost per square foot
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const jobEntries = pgTable("job_entries", {
  id: serial("id").primaryKey(),
  jobNumber: varchar("job_number").notNull().unique(),
  date: timestamp("date").notNull(),
  vehicleYear: varchar("vehicle_year").notNull(),
  vehicleMake: varchar("vehicle_make").notNull(),
  vehicleModel: varchar("vehicle_model").notNull(),
  filmId: integer("film_id").references(() => films.id), // Reference to film type
  totalSqft: real("total_sqft"), // Total square footage for cost calculation (sum of all dimensions)
  filmCost: numeric("film_cost", { precision: 10, scale: 2 }), // Total film cost for the job
  windowAssignments: jsonb("window_assignments"), // Store detailed window-installer assignments
  totalWindows: integer("total_windows").notNull().default(7),
  startTime: timestamp("start_time"), // Job start time
  endTime: timestamp("end_time"), // Job end time
  durationMinutes: integer("duration_minutes"), // Total job duration in minutes
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Separate table for multiple dimension entries per job
export const jobDimensions = pgTable("job_dimensions", {
  id: serial("id").primaryKey(),
  jobEntryId: integer("jobEntryId").notNull().references(() => jobEntries.id, { onDelete: "cascade" }),
  lengthInches: numeric("lengthInches", { precision: 8, scale: 2 }).notNull(),
  widthInches: numeric("widthInches", { precision: 8, scale: 2 }).notNull(),
  sqft: numeric("sqft", { precision: 10, scale: 4 }).notNull(), // Calculated L*W/144
  description: varchar("description"), // Optional description (e.g., "Front windshield", "Side windows")
  createdAt: timestamp("created_at").defaultNow(),
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

// Time tracking for installer performance
export const installerTimeEntries = pgTable("installer_time_entries", {
  id: serial("id").primaryKey(),
  jobEntryId: integer("job_entry_id").notNull().references(() => jobEntries.id, { onDelete: "cascade" }),
  installerId: varchar("installer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  windowsCompleted: integer("windows_completed").notNull().default(0), // Number of windows assigned to this installer
  timeMinutes: integer("time_minutes").notNull(), // Time allocated to this installer for this job (in minutes)
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  jobInstallers: many(jobInstallers),
  redoEntries: many(redoEntries),
  timeEntries: many(installerTimeEntries),
}));

export const filmsRelations = relations(films, ({ many }) => ({
  jobEntries: many(jobEntries),
}));

export const jobEntriesRelations = relations(jobEntries, ({ many, one }) => ({
  jobInstallers: many(jobInstallers),
  redoEntries: many(redoEntries),
  timeEntries: many(installerTimeEntries),
  dimensions: many(jobDimensions),
  film: one(films, {
    fields: [jobEntries.filmId],
    references: [films.id],
  }),
}));

export const jobDimensionsRelations = relations(jobDimensions, ({ one }) => ({
  jobEntry: one(jobEntries, {
    fields: [jobDimensions.jobEntryId],
    references: [jobEntries.id],
  }),
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

export const installerTimeEntriesRelations = relations(installerTimeEntries, ({ one }) => ({
  jobEntry: one(jobEntries, {
    fields: [installerTimeEntries.jobEntryId],
    references: [jobEntries.id],
  }),
  installer: one(users, {
    fields: [installerTimeEntries.installerId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertJobEntrySchema = createInsertSchema(jobEntries).omit({
  id: true,
  jobNumber: true,
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

export const insertInstallerTimeEntrySchema = createInsertSchema(installerTimeEntries).omit({
  id: true,
  createdAt: true,
});

export const insertFilmSchema = createInsertSchema(films).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJobDimensionSchema = createInsertSchema(jobDimensions).omit({
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
export type InstallerTimeEntry = typeof installerTimeEntries.$inferSelect;
export type InsertInstallerTimeEntry = z.infer<typeof insertInstallerTimeEntrySchema>;
export type Film = typeof films.$inferSelect;
export type InsertFilm = z.infer<typeof insertFilmSchema>;
export type JobDimension = typeof jobDimensions.$inferSelect;
export type InsertJobDimension = z.infer<typeof insertJobDimensionSchema>;

// Combined types for API responses
export type JobEntryWithDetails = JobEntry & {
  installers: (User & { timeVariance: number })[];
  redoEntries: (RedoEntry & { installer: User })[];
  dimensions: JobDimension[];
};

import {
  mysqlTable,
  text,
  varchar,
  timestamp,
  json,
  index,
  int,
  boolean,
  float,
  decimal,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = mysqlTable(
  "session",
  {
    sid: varchar("sid", { length: 255 }).primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = mysqlTable("users", {
  id: varchar("id", { length: 255 }).primaryKey().notNull(),
  email: varchar("email", { length: 255 }).unique(),
  password: varchar("password", { length: 255 }), // For local auth, null for OAuth users
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
  role: varchar("role", { length: 50 }).notNull().default("installer"), // "installer", "manager", or "data_entry"
  hourlyRate: decimal("hourly_rate", { precision: 8, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Film types management
export const films = mysqlTable("films", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull().unique(), // Film name/type
  type: varchar("type", { length: 100 }).notNull(), // Category: "ceramic", "carbon", "dyed", etc.
  costPerSqft: decimal("cost_per_sqft", { precision: 10, scale: 2 }).notNull(), // Cost per square foot
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Film inventory tracking
export const filmInventory = mysqlTable("film_inventory", {
  id: int("id").primaryKey().autoincrement(),
  filmId: int("film_id").notNull().references(() => films.id, { onDelete: "cascade" }),
  currentStock: decimal("current_stock", { precision: 10, scale: 2 }).notNull().default("0.00"), // Current stock in sqft
  minimumStock: decimal("minimum_stock", { precision: 10, scale: 2 }).notNull().default("0.00"), // Alert threshold
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Inventory transactions log
export const inventoryTransactions = mysqlTable("inventory_transactions", {
  id: int("id").primaryKey().autoincrement(),
  filmId: int("film_id").notNull().references(() => films.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // "addition", "deduction", "adjustment"
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(), // Positive for additions, negative for deductions
  previousStock: decimal("previous_stock", { precision: 10, scale: 2 }).notNull(),
  newStock: decimal("new_stock", { precision: 10, scale: 2 }).notNull(),
  jobEntryId: int("job_entry_id").references(() => jobEntries.id), // Reference if related to a job
  notes: text("notes"),
  createdBy: varchar("created_by", { length: 255 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const jobEntries = mysqlTable("job_entries", {
  id: int("id").primaryKey().autoincrement(),
  jobNumber: varchar("job_number", { length: 255 }).notNull().unique(),
  date: timestamp("date").notNull(),
  vehicleYear: varchar("vehicle_year", { length: 10 }).notNull(),
  vehicleMake: varchar("vehicle_make", { length: 100 }).notNull(),
  vehicleModel: varchar("vehicle_model", { length: 100 }).notNull(),
  totalSqft: float("total_sqft"), // Total square footage for cost calculation (sum of all dimensions)
  filmCost: decimal("film_cost", { precision: 10, scale: 2 }), // Total film cost for the job
  windowAssignments: json("window_assignments"), // Store detailed window-installer assignments
  totalWindows: int("total_windows").notNull().default(7),
  startTime: timestamp("start_time"), // Job start time
  endTime: timestamp("end_time"), // Job end time
  durationMinutes: int("duration_minutes"), // Total job duration in minutes
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Separate table for multiple dimension entries per job
export const jobDimensions = mysqlTable("job_dimensions", {
  id: int("id").primaryKey().autoincrement(),
  jobEntryId: int("job_entry_id").notNull().references(() => jobEntries.id, { onDelete: "cascade" }),
  filmId: int("film_id").references(() => films.id), // Add film type per dimension
  lengthInches: decimal("length_inches", { precision: 8, scale: 2 }).notNull(),
  widthInches: decimal("width_inches", { precision: 8, scale: 2 }).notNull(),
  sqft: decimal("sqft", { precision: 10, scale: 4 }).notNull(), // Calculated L*W/144
  filmCost: decimal("film_cost", { precision: 10, scale: 2 }), // Cost for this specific dimension
  description: varchar("description", { length: 255 }), // Optional description (e.g., "Front windshield", "Side windows")
  createdAt: timestamp("created_at").defaultNow(),
});

export const jobInstallers = mysqlTable("job_installers", {
  id: int("id").primaryKey().autoincrement(),
  jobEntryId: int("job_entry_id").notNull().references(() => jobEntries.id, { onDelete: "cascade" }),
  installerId: varchar("installer_id", { length: 255 }).notNull().references(() => users.id),
  timeVariance: int("time_variance").notNull(), // in minutes, positive or negative for each installer
  createdAt: timestamp("created_at").defaultNow(),
});

export const redoEntries = mysqlTable("redo_entries", {
  id: int("id").primaryKey().autoincrement(),
  jobEntryId: int("job_entry_id").notNull().references(() => jobEntries.id, { onDelete: "cascade" }),
  installerId: varchar("installer_id", { length: 255 }).notNull().references(() => users.id),
  part: varchar("part", { length: 100 }).notNull(), // "windshield", "rollups", "back_windshield", "quarter"
  lengthInches: float("length_inches"), // Material consumption length
  widthInches: float("width_inches"), // Material consumption width
  sqft: float("sqft"), // Calculated square footage (length * width / 144)
  filmId: int("film_id").references(() => films.id), // Add film type per dimension
  materialCost: decimal("material_cost", { precision: 10, scale: 2 }), // Cost of material used for redo
  timeMinutes: int("time_minutes").default(0), // Time spent on redo in minutes
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Time tracking for installer performance
export const installerTimeEntries = mysqlTable("installer_time_entries", {
  id: int("id").primaryKey().autoincrement(),
  jobEntryId: int("job_entry_id").notNull().references(() => jobEntries.id, { onDelete: "cascade" }),
  installerId: varchar("installer_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  windowsCompleted: int("windows_completed").notNull().default(0), // Number of windows assigned to this installer
  timeMinutes: int("time_minutes").notNull(), // Time allocated to this installer for this job (in minutes)
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  jobInstallers: many(jobInstallers),
  redoEntries: many(redoEntries),
  timeEntries: many(installerTimeEntries),
}));

export const filmsRelations = relations(films, ({ many, one }) => ({
  jobDimensions: many(jobDimensions),
  inventory: one(filmInventory),
  inventoryTransactions: many(inventoryTransactions),
}));

export const filmInventoryRelations = relations(filmInventory, ({ one }) => ({
  film: one(films, {
    fields: [filmInventory.filmId],
    references: [films.id],
  }),
}));

export const inventoryTransactionsRelations = relations(inventoryTransactions, ({ one }) => ({
  film: one(films, {
    fields: [inventoryTransactions.filmId],
    references: [films.id],
  }),
  jobEntry: one(jobEntries, {
    fields: [inventoryTransactions.jobEntryId],
    references: [jobEntries.id],
  }),
  createdByUser: one(users, {
    fields: [inventoryTransactions.createdBy],
    references: [users.id],
  }),
}));

export const jobEntriesRelations = relations(jobEntries, ({ many }) => ({
  jobInstallers: many(jobInstallers),
  redoEntries: many(redoEntries),
  timeEntries: many(installerTimeEntries),
  dimensions: many(jobDimensions),
}));

export const jobDimensionsRelations = relations(jobDimensions, ({ one }) => ({
  jobEntry: one(jobEntries, {
    fields: [jobDimensions.jobEntryId],
    references: [jobEntries.id],
  }),
  film: one(films, { // Add film relation
    fields: [jobDimensions.filmId],
    references: [films.id],
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

export const insertFilmInventorySchema = createInsertSchema(filmInventory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInventoryTransactionSchema = createInsertSchema(inventoryTransactions).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert & {
  password?: string;
};
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
export type FilmInventory = typeof filmInventory.$inferSelect;
export type InsertFilmInventory = z.infer<typeof insertFilmInventorySchema>;
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type InsertInventoryTransaction = z.infer<typeof insertInventoryTransactionSchema>;

// Combined types for API responses
export type FilmWithInventory = Film & {
  inventory?: FilmInventory;
};
export type JobEntryWithDetails = JobEntry & {
  installers: (User & { timeVariance: number })[];
  redoEntries: (RedoEntry & { installer: User })[];
  dimensions: (JobDimension & { film?: Film })[]; // Include film info
};

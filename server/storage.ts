import {
  users,
  jobEntries,
  jobInstallers,
  redoEntries,
  installerTimeEntries,
  films,
  jobDimensions,
  filmInventory,
  inventoryTransactions,
  type User,
  type UpsertUser,
  type JobEntry,
  type InsertJobEntry,
  type JobInstaller,
  type InsertJobInstaller,
  type RedoEntry,
  type InsertRedoEntry,
  type InstallerTimeEntry,
  type InsertInstallerTimeEntry,
  type Film,
  type InsertFilm,
  type JobDimension,
  type InsertJobDimension,
  type JobEntryWithDetails,
  type FilmInventory,
  type InsertFilmInventory,
  type InventoryTransaction,
  type InsertInventoryTransaction,
  type FilmWithInventory,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, count, isNull } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(userId: string, role: string): Promise<User>;
  updateUserHourlyRate(userId: string, hourlyRate: string): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: string): Promise<void>;
  
  // Job entry operations
  createJobEntry(jobEntry: InsertJobEntry & { windowAssignments?: any[] }, installerData: Array<{installerId: string, timeVariance: number}>): Promise<JobEntry>;
  getJobEntries(filters?: {
    installerId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<JobEntryWithDetails[]>;
  getJobEntry(id: number): Promise<JobEntryWithDetails | undefined>;
  updateJobEntry(id: number, jobEntry: Partial<InsertJobEntry>): Promise<JobEntry>;
  deleteJobEntry(id: number): Promise<void>;
  
  // Job installer operations
  createJobInstaller(jobInstaller: InsertJobInstaller): Promise<JobInstaller>;
  deleteJobInstaller(jobEntryId: number, installerId: string): Promise<void>;
  
  // Redo entry operations
  createRedoEntry(redoEntry: InsertRedoEntry): Promise<RedoEntry>;
  deleteRedoEntry(id: number): Promise<void>;
  
  // Analytics operations
  getPerformanceMetrics(filters?: {
    installerId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{
    totalVehicles: number;
    totalRedos: number;
    totalWindows: number;
    avgTimeVariance: number;
    activeInstallers: number;
    jobsWithoutRedos: number;
  }>;
  
  getTopPerformers(limit?: number, filters?: {
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<Array<{
    installer: User;
    vehicleCount: number;
    redoCount: number;
    successRate: number;
  }>>;
  
  getRedoBreakdown(filters?: {
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<Array<{
    part: string;
    count: number;
  }>>;
  
  // Window performance analytics
  getWindowPerformanceAnalytics(): Promise<{
    totalWindows: number;
    totalRedos: number;
    successRate: number;
    installerPerformance: Array<{
      installer: User;
      windowsCompleted: number;
      redoCount: number;
      successRate: number;
    }>;
  }>;
  
  // Installer operations
  getInstallers(): Promise<User[]>;
  
  // Time performance analytics
  getInstallerTimePerformance(): Promise<Array<{
    installer: User;
    totalMinutes: number;
    totalWindows: number;
    avgTimePerWindow: number;
    jobCount: number;
  }>>;

  // Film operations
  getAllFilms(): Promise<Film[]>;
  getActiveFilms(): Promise<Film[]>;
  createFilm(film: InsertFilm): Promise<Film>;
  updateFilm(id: number, film: Partial<InsertFilm>): Promise<Film>;
  deleteFilm(id: number): Promise<void>;
  
  // Film consumption analytics
  getFilmConsumption(filters?: {
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<Array<{
    date: string;
    filmType: string;
    filmName: string;
    totalSqft: number;
    totalCost: number;
    jobCount: number;
  }>>;

  // Labor cost calculations
  getJobLaborCosts(jobEntryId: number): Promise<Array<{
    installer: User;
    timeMinutes: number;
    hourlyRate: number;
    laborCost: number;
  }>>;

  // Inventory operations
  getFilmsWithInventory(): Promise<FilmWithInventory[]>;
  getFilmInventory(filmId: number): Promise<FilmInventory | undefined>;
  addInventoryStock(filmId: number, quantity: number, userId: string, notes?: string): Promise<FilmInventory>;
  deductInventoryStock(filmId: number, quantity: number, userId: string, jobEntryId?: number, notes?: string): Promise<FilmInventory>;
  adjustInventoryStock(filmId: number, newStock: number, userId: string, notes?: string): Promise<FilmInventory>;
  setMinimumStock(filmId: number, minimumStock: number): Promise<FilmInventory>;
  getInventoryTransactions(filmId?: number, limit?: number): Promise<Array<InventoryTransaction & { film: Film; createdByUser: User; jobEntry?: JobEntry }>>;
  getLowStockFilms(): Promise<FilmWithInventory[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    await db
      .insert(users)
      .values(userData)
      .onDuplicateKeyUpdate({
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      });
    
    // Fetch the user after upsert since MySQL doesn't support returning
    const [user] = await db.select().from(users).where(eq(users.id, userData.id));
    if (!user) {
      throw new Error('Failed to retrieve user after upsert');
    }
    return user;
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId));
    
    // Fetch the user after update since MySQL doesn't support returning
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      throw new Error('Failed to retrieve user after update');
    }
    return user;
  }

  async updateUserHourlyRate(userId: string, hourlyRate: string): Promise<User> {
    await db
      .update(users)
      .set({ hourlyRate, updatedAt: new Date() })
      .where(eq(users.id, userId));
    
    // Fetch the user after update since MySQL doesn't support returning
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      throw new Error('Failed to retrieve user after update');
    }
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.firstName, users.lastName);
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Job entry operations
  async createJobEntry(jobEntry: InsertJobEntry & { 
    windowAssignments?: any[], 
    dimensions?: Array<{
      lengthInches: number, 
      widthInches: number, 
      description?: string,
      filmId?: number
    }> 
  }, installerData: Array<{installerId: string, timeVariance: number}>): Promise<JobEntry> {
    // Generate sequential job number starting from 1
    const existingEntries = await db.select({ id: jobEntries.id }).from(jobEntries);
    const nextJobNumber = existingEntries.length + 1;
    const jobNumber = `JOB-${nextJobNumber}`;

    const result = await db
      .insert(jobEntries)
      .values({
        ...jobEntry,
        jobNumber,
        windowAssignments: jobEntry.windowAssignments ? JSON.stringify(jobEntry.windowAssignments) : null,
      });
    
    // Get the inserted job entry since MySQL doesn't support returning
    const [entry] = await db
      .select()
      .from(jobEntries)
      .where(eq(jobEntries.jobNumber, jobNumber));
    
    // Add dimensions if provided and calculate total square footage and film cost
    let totalSqft = 0;
    let totalFilmCost = 0;
    
    if (jobEntry.dimensions && jobEntry.dimensions.length > 0) {
      for (const dimension of jobEntry.dimensions) {
        const sqft = (dimension.lengthInches * dimension.widthInches) / 144;
        totalSqft += sqft;
        
        // Calculate film cost for this dimension if filmId is provided
        let dimensionFilmCost = 0;
        if (dimension.filmId) {
          const [film] = await db.select().from(films).where(eq(films.id, dimension.filmId));
          if (film) {
            dimensionFilmCost = Number(film.costPerSqft) * sqft;
            totalFilmCost += dimensionFilmCost;
            
            // Auto-deduct inventory for this dimension
            const userId = installerData.length > 0 ? installerData[0].installerId : "system";
            try {
              await this.deductInventoryStock(
                dimension.filmId, 
                sqft, 
                userId, 
                entry.id, 
                `Auto-deduction for dimension in job ${entry.jobNumber}`
              );
            } catch (error) {
              console.warn(`Failed to deduct inventory for dimension in job ${entry.jobNumber}:`, error);
            }
          }
        }
        
        await db.insert(jobDimensions).values({
          jobEntryId: entry.id,
          filmId: dimension.filmId || null,
          lengthInches: dimension.lengthInches.toString(),
          widthInches: dimension.widthInches.toString(),
          sqft: sqft.toString(),
          filmCost: dimensionFilmCost.toString(),
          description: dimension.description || null,
        });
      }
      
      // Update total square footage and film cost
      await db.update(jobEntries)
        .set({ 
          totalSqft,
          filmCost: totalFilmCost.toString()
        })
        .where(eq(jobEntries.id, entry.id));
    }

    // Add installers to the job with their individual time variances
    for (const installer of installerData) {
      await this.createJobInstaller({
        jobEntryId: entry.id,
        installerId: installer.installerId,
        timeVariance: installer.timeVariance,
      });
    }

    // Calculate and store individual installer time allocations
    if (jobEntry.durationMinutes && jobEntry.windowAssignments) {
      let assignments: any[] = [];
      
      if (Array.isArray(jobEntry.windowAssignments)) {
        assignments = jobEntry.windowAssignments;
      } else if (typeof jobEntry.windowAssignments === 'string') {
        try {
          assignments = JSON.parse(jobEntry.windowAssignments);
        } catch (error) {
          console.error('Error parsing window assignments:', error);
          assignments = [];
        }
      }
      
      // Count windows per installer
      const installerWindowCounts: Record<string, number> = {};
      assignments.forEach((assignment: any) => {
        if (assignment.installerId) {
          installerWindowCounts[assignment.installerId] = (installerWindowCounts[assignment.installerId] || 0) + 1;
        }
      });

      const totalAssignedWindows = Object.values(installerWindowCounts).reduce((sum, count) => sum + count, 0);
      
      // Distribute time proportionally based on windows assigned
      for (const [installerId, windowCount] of Object.entries(installerWindowCounts)) {
        const allocatedTime = Math.round((windowCount / totalAssignedWindows) * jobEntry.durationMinutes);
        
        await db.insert(installerTimeEntries).values({
          jobEntryId: entry.id,
          installerId,
          windowsCompleted: windowCount,
          timeMinutes: allocatedTime,
        });
      }
    }
    
    return entry;
  }

  async getJobEntries(filters?: {
    installerId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<JobEntryWithDetails[]> {
    const conditions = [];
    
    if (filters?.dateFrom) {
      // Create start of day for dateFrom
      const startOfDay = new Date(filters.dateFrom);
      startOfDay.setUTCHours(0, 0, 0, 0);
      conditions.push(gte(jobEntries.date, startOfDay));
    }
    if (filters?.dateTo) {
      // Create end of day for dateTo
      const endOfDay = new Date(filters.dateTo);
      endOfDay.setUTCHours(23, 59, 59, 999);
      conditions.push(lte(jobEntries.date, endOfDay));
    }

    let query = db
      .select({
        jobEntry: jobEntries,
      })
      .from(jobEntries)
      .orderBy(desc(jobEntries.date));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    const entries = await query;
    
    // Get detailed information for each job entry
    const entriesWithDetails: JobEntryWithDetails[] = [];
    
    for (const { jobEntry } of entries) {
      const fullEntry = await this.getJobEntry(jobEntry.id);
      if (fullEntry) {
        // Filter by installer if specified
        if (!filters?.installerId || fullEntry.installers.some(installer => installer.id === filters.installerId)) {
          entriesWithDetails.push(fullEntry);
        }
      }
    }
    
    return entriesWithDetails;
  }

  async getJobEntry(id: number): Promise<JobEntryWithDetails | undefined> {
    // Get the job entry
    const [entry] = await db
      .select()
      .from(jobEntries)
      .where(eq(jobEntries.id, id));

    if (!entry) return undefined;

    // Get all installers for this job with their time variance
    const jobInstallersResult = await db
      .select({
        installer: users,
        timeVariance: jobInstallers.timeVariance,
      })
      .from(jobInstallers)
      .leftJoin(users, eq(jobInstallers.installerId, users.id))
      .where(eq(jobInstallers.jobEntryId, id));

    const installers = jobInstallersResult.map(r => ({
      ...r.installer!,
      timeVariance: r.timeVariance,
    })).filter(Boolean) as (User & { timeVariance: number })[];

    // Get all redo entries with installer info
    const redoResults = await db
      .select({
        redo: redoEntries,
        installer: users,
      })
      .from(redoEntries)
      .leftJoin(users, eq(redoEntries.installerId, users.id))
      .where(eq(redoEntries.jobEntryId, id));

    const redoEntriesWithInstallers = redoResults.map(r => ({
      ...r.redo,
      installer: r.installer!,
    }));

    // Get all dimensions for this job with film info
    const dimensionResults = await db
      .select({
        dimension: jobDimensions,
        film: films,
      })
      .from(jobDimensions)
      .leftJoin(films, eq(jobDimensions.filmId, films.id))
      .where(eq(jobDimensions.jobEntryId, id));

    const dimensions = dimensionResults.map(r => ({
      ...r.dimension,
      film: r.film || undefined,
    }));

    return {
      ...entry,
      installers: installers as (User & { timeVariance: number })[],
      redoEntries: redoEntriesWithInstallers,
      dimensions,
    };
  }

  async updateJobEntry(id: number, jobEntry: Partial<InsertJobEntry>): Promise<JobEntry> {
    await db
      .update(jobEntries)
      .set({ ...jobEntry, updatedAt: new Date() })
      .where(eq(jobEntries.id, id));
    
    // Fetch the updated job entry since MySQL doesn't support returning
    const [entry] = await db.select().from(jobEntries).where(eq(jobEntries.id, id));
    if (!entry) {
      throw new Error('Failed to retrieve job entry after update');
    }
    return entry;
  }

  async deleteJobEntry(id: number): Promise<void> {
    // Delete all related records first (in order of foreign key dependencies)
    
    // 1. Delete inventory transactions that reference this job entry
    await db.delete(inventoryTransactions).where(eq(inventoryTransactions.jobEntryId, id));
    
    // 2. Delete installer time entries
    await db.delete(installerTimeEntries).where(eq(installerTimeEntries.jobEntryId, id));
    
    // 3. Delete job dimensions
    await db.delete(jobDimensions).where(eq(jobDimensions.jobEntryId, id));
    
    // 4. Delete related job installers
    await db.delete(jobInstallers).where(eq(jobInstallers.jobEntryId, id));
    
    // 5. Delete related redo entries
    await db.delete(redoEntries).where(eq(redoEntries.jobEntryId, id));
    
    // 6. Finally delete the job entry itself
    await db.delete(jobEntries).where(eq(jobEntries.id, id));
  }

  // Job installer operations
  async createJobInstaller(jobInstaller: InsertJobInstaller): Promise<JobInstaller> {
    await db
      .insert(jobInstallers)
      .values(jobInstaller);
    
    // Fetch the created job installer since MySQL doesn't support returning
    const [installer] = await db
      .select()
      .from(jobInstallers)
      .where(and(
        eq(jobInstallers.jobEntryId, jobInstaller.jobEntryId),
        eq(jobInstallers.installerId, jobInstaller.installerId)
      ));
    if (!installer) {
      throw new Error('Failed to retrieve job installer after creation');
    }
    return installer;
  }

  async deleteJobInstaller(jobEntryId: number, installerId: string): Promise<void> {
    await db
      .delete(jobInstallers)
      .where(and(
        eq(jobInstallers.jobEntryId, jobEntryId),
        eq(jobInstallers.installerId, installerId)
      ));
  }

  // Redo entry operations
  async createRedoEntry(redoEntry: InsertRedoEntry): Promise<RedoEntry> {
    await db
      .insert(redoEntries)
      .values(redoEntry);
    
    // Get the most recently created redo entry for this job
    const [entry] = await db
      .select()
      .from(redoEntries)
      .where(eq(redoEntries.jobEntryId, redoEntry.jobEntryId))
      .orderBy(desc(redoEntries.id))
      .limit(1);
    
    if (!entry) {
      throw new Error('Failed to retrieve redo entry after creation');
    }
    return entry;
  }

  async deleteRedoEntry(id: number): Promise<void> {
    await db.delete(redoEntries).where(eq(redoEntries.id, id));
  }

  // Analytics operations
  async getPerformanceMetrics(filters?: {
    installerId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{
    totalVehicles: number;
    totalRedos: number;
    totalWindows: number;
    avgTimeVariance: number;
    activeInstallers: number;
    jobsWithoutRedos: number;
  }> {
    const conditions = [];
    
    if (filters?.dateFrom) {
      const startOfDay = new Date(filters.dateFrom);
      startOfDay.setUTCHours(0, 0, 0, 0);
      conditions.push(gte(jobEntries.date, startOfDay));
    }
    if (filters?.dateTo) {
      const endOfDay = new Date(filters.dateTo);
      endOfDay.setUTCHours(23, 59, 59, 999);
      conditions.push(lte(jobEntries.date, endOfDay));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count distinct job entries (vehicles) and sum total windows (including redos)
    const [vehicleCount] = await db
      .select({
        totalVehicles: count(jobEntries.id),
        totalWindows: sql<number>`COALESCE(SUM(${jobEntries.totalWindows}), 0)`,
      })
      .from(jobEntries)
      .where(whereClause);

    // Count redo entries as additional windows
    const [redoWindowCount] = await db
      .select({
        redoWindows: count(redoEntries.id),
      })
      .from(redoEntries)
      .innerJoin(jobEntries, eq(redoEntries.jobEntryId, jobEntries.id))
      .where(whereClause);

    // Calculate average time variance from existing job entries only
    const [timeVarianceMetrics] = await db
      .select({
        avgTimeVariance: sql<number>`COALESCE(AVG(CAST(${jobInstallers.timeVariance} AS DECIMAL)), 0)`,
      })
      .from(jobInstallers)
      .innerJoin(jobEntries, eq(jobInstallers.jobEntryId, jobEntries.id))
      .where(whereClause);

    // Count redo entries that belong to existing job entries only
    const [redoCount] = await db
      .select({
        totalRedos: count(redoEntries.id),
      })
      .from(redoEntries)
      .innerJoin(jobEntries, eq(redoEntries.jobEntryId, jobEntries.id))
      .where(whereClause);

    // Count active installers from existing job entries only
    const [installerCount] = await db
      .select({
        activeInstallers: sql<number>`COUNT(DISTINCT ${jobInstallers.installerId})`,
      })
      .from(jobInstallers)
      .innerJoin(jobEntries, eq(jobInstallers.jobEntryId, jobEntries.id))
      .where(whereClause);

    // Count jobs that have NO redos (perfect jobs)
    const [perfectJobs] = await db
      .select({
        jobsWithoutRedos: sql<number>`COUNT(DISTINCT ${jobEntries.id})`,
      })
      .from(jobEntries)
      .leftJoin(redoEntries, eq(jobEntries.id, redoEntries.jobEntryId))
      .where(
        whereClause 
          ? and(whereClause, sql`${redoEntries.id} IS NULL`)
          : sql`${redoEntries.id} IS NULL`
      );

    return {
      totalVehicles: vehicleCount.totalVehicles,
      totalRedos: redoCount.totalRedos,
      totalWindows: vehicleCount.totalWindows + (redoWindowCount.redoWindows || 0), // Include redos as additional windows
      avgTimeVariance: Math.round(timeVarianceMetrics.avgTimeVariance),
      activeInstallers: installerCount.activeInstallers,
      jobsWithoutRedos: perfectJobs.jobsWithoutRedos,
    };
  }

  async getTopPerformers(limit = 10, filters?: {
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<Array<{
    installer: User;
    vehicleCount: number;
    redoCount: number;
    successRate: number;
  }>> {
    // Build where clause for date filtering
    const conditions = [];
    if (filters?.dateFrom) {
      const startOfDay = new Date(filters.dateFrom);
      startOfDay.setUTCHours(0, 0, 0, 0);
      conditions.push(gte(jobEntries.date, startOfDay));
    }
    if (filters?.dateTo) {
      const endOfDay = new Date(filters.dateTo);
      endOfDay.setUTCHours(23, 59, 59, 999);
      conditions.push(lte(jobEntries.date, endOfDay));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get all job entries with window assignments for proper calculation
    const allJobEntries = await db
      .select({
        id: jobEntries.id,
        totalWindows: jobEntries.totalWindows,
        windowAssignments: jobEntries.windowAssignments,
      })
      .from(jobEntries)
      .where(whereClause);

    // Calculate actual windows per installer using JavaScript parsing
    const installerWindowCounts: Record<string, { vehicleCount: number; totalWindows: number }> = {};
    
    // Get all job installers for counting vehicles
    const allJobInstallers = await db
      .select({
        installerId: jobInstallers.installerId,
        jobEntryId: jobInstallers.jobEntryId,
      })
      .from(jobInstallers)
      .innerJoin(jobEntries, eq(jobInstallers.jobEntryId, jobEntries.id))
      .where(whereClause);

    // Count vehicles per installer
    for (const ji of allJobInstallers) {
      if (!installerWindowCounts[ji.installerId]) {
        installerWindowCounts[ji.installerId] = { vehicleCount: 0, totalWindows: 0 };
      }
      installerWindowCounts[ji.installerId].vehicleCount++;
    }

    // Count actual windows assigned per installer
    for (const entry of allJobEntries) {
      if (entry.windowAssignments) {
        try {
          const assignments = typeof entry.windowAssignments === 'string' 
            ? JSON.parse(entry.windowAssignments) 
            : entry.windowAssignments;
          
          if (Array.isArray(assignments)) {
            assignments.forEach((assignment: any) => {
              if (assignment.installerId) {
                if (!installerWindowCounts[assignment.installerId]) {
                  installerWindowCounts[assignment.installerId] = { vehicleCount: 0, totalWindows: 0 };
                }
                installerWindowCounts[assignment.installerId].totalWindows++;
              }
            });
          }
        } catch (error) {
          console.error('Error parsing window assignments:', error);
          // Fallback: distribute total windows among installers for this job
          const jobInstallers = allJobInstallers.filter(ji => ji.jobEntryId === entry.id);
          const windowsPerInstaller = Math.floor(entry.totalWindows / jobInstallers.length);
          
          jobInstallers.forEach(ji => {
            if (!installerWindowCounts[ji.installerId]) {
              installerWindowCounts[ji.installerId] = { vehicleCount: 0, totalWindows: 0 };
            }
            installerWindowCounts[ji.installerId].totalWindows += windowsPerInstaller;
          });
        }
      } else {
        // No window assignments: distribute total windows equally among installers
        const jobInstallers = allJobInstallers.filter(ji => ji.jobEntryId === entry.id);
        if (jobInstallers.length > 0) {
          const windowsPerInstaller = Math.floor(entry.totalWindows / jobInstallers.length);
          
          jobInstallers.forEach(ji => {
            if (!installerWindowCounts[ji.installerId]) {
              installerWindowCounts[ji.installerId] = { vehicleCount: 0, totalWindows: 0 };
            }
            installerWindowCounts[ji.installerId].totalWindows += windowsPerInstaller;
          });
        }
      }
    }

    // Convert to the expected format
    const vehicleCounts = Object.entries(installerWindowCounts).map(([installerId, data]) => ({
      installerId,
      vehicleCount: data.vehicleCount,
      totalWindows: data.totalWindows,
    }));

    // Get redo count per installer (each redo counts as one additional window)
    const redoWindowCountsQuery = db
      .select({
        installerId: redoEntries.installerId,
        redoWindows: count(redoEntries.id),
      })
      .from(redoEntries)
      .innerJoin(jobEntries, eq(redoEntries.jobEntryId, jobEntries.id))
      .groupBy(redoEntries.installerId);
    
    if (whereClause) {
      redoWindowCountsQuery.where(whereClause);
    }
    
    const redoWindowCounts = await redoWindowCountsQuery;

    // Get redo count per installer from existing job entries only
    const redoCountsQuery = db
      .select({
        installerId: redoEntries.installerId,
        redoCount: count(redoEntries.id),
      })
      .from(redoEntries)
      .innerJoin(jobEntries, eq(redoEntries.jobEntryId, jobEntries.id))
      .groupBy(redoEntries.installerId);
    
    if (whereClause) {
      redoCountsQuery.where(whereClause);
    }
    
    const redoCounts = await redoCountsQuery;

    // Get all installers
    const allInstallers = await db
      .select()
      .from(users)
      .where(eq(users.role, "installer"));

    // Combine the data
    const results = allInstallers.map(installer => {
      const vehicleData = vehicleCounts.find(vc => vc.installerId === installer.id);
      const redoData = redoCounts.find(rc => rc.installerId === installer.id);
      const redoWindowData = redoWindowCounts.find(rwc => rwc.installerId === installer.id);
      
      const vehicleCount = vehicleData?.vehicleCount || 0;
      const redoCount = redoData?.redoCount || 0;
      const baseWindows = vehicleData?.totalWindows || 0;
      const redoWindows = redoWindowData?.redoWindows || 0;
      const totalWindows = baseWindows + redoWindows; // Include redos as additional windows
      
      // Calculate success rate: (Base Windows Successfully Completed) / Total Windows * 100
      const successfulWindows = baseWindows; // Base windows are successful, redos are failures
      const successRate = totalWindows > 0 
        ? Math.round((successfulWindows / totalWindows) * 1000) / 10  // More precise rounding
        : 100;

      return {
        installer,
        vehicleCount,
        redoCount,
        successRate,
      };
    });

    // Sort by performance (vehicle count - redo count, then by success rate)
    return results
      .sort((a, b) => {
        const scoreA = a.vehicleCount - a.redoCount;
        const scoreB = b.vehicleCount - b.redoCount;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return b.successRate - a.successRate;
      })
      .slice(0, limit);
  }

  async getRedoBreakdown(filters?: {
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<Array<{
    part: string;
    count: number;
    totalSqft: number;
    totalCost: number;
    avgTimeMinutes: number;
  }>> {
    const conditions = [];
    
    if (filters?.dateFrom) {
      const startOfDay = new Date(filters.dateFrom);
      startOfDay.setUTCHours(0, 0, 0, 0);
      conditions.push(gte(jobEntries.date, startOfDay));
    }
    if (filters?.dateTo) {
      const endOfDay = new Date(filters.dateTo);
      endOfDay.setUTCHours(23, 59, 59, 999);
      conditions.push(lte(jobEntries.date, endOfDay));
    }

    let query = db
      .select({
        part: redoEntries.part,
        count: count(redoEntries.id),
        totalSqft: sql<number>`COALESCE(SUM(${redoEntries.sqft}::numeric), 0)`,
        totalCost: sql<number>`COALESCE(SUM(${redoEntries.materialCost}::numeric), 0)`,
        avgTimeMinutes: sql<number>`COALESCE(AVG(${redoEntries.timeMinutes}::numeric), 0)`,
      })
      .from(redoEntries)
      .innerJoin(jobEntries, eq(redoEntries.jobEntryId, jobEntries.id))
      .groupBy(redoEntries.part)
      .orderBy(desc(count(redoEntries.id)));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const results = await query;

    return results.map(result => ({
      ...result,
      totalSqft: Number(result.totalSqft) || 0,
      totalCost: Number(result.totalCost) || 0,
      avgTimeMinutes: Math.round(Number(result.avgTimeMinutes) || 0),
    }));
  }

  async getWindowPerformanceAnalytics(): Promise<{
    totalWindows: number;
    totalRedos: number;
    successRate: number;
    installerPerformance: Array<{
      installer: User;
      windowsCompleted: number;
      redoCount: number;
      successRate: number;
    }>;
  }> {
    // Get all job entries with window assignments
    const entries = await db.select().from(jobEntries);
    
    // Calculate total windows from window assignments
    let totalWindows = 0;
    const installerWindowCounts: Record<string, number> = {};
    
    for (const entry of entries) {
      if (entry.windowAssignments && entry.windowAssignments !== null) {
        try {
          // Handle both string and object cases
          const assignments = typeof entry.windowAssignments === 'string' 
            ? JSON.parse(entry.windowAssignments) 
            : entry.windowAssignments;
          if (Array.isArray(assignments)) {
            // Only count windows that are actually assigned to installers
            const assignedWindows = assignments.filter((assignment: any) => assignment.installerId);
            totalWindows += assignedWindows.length;
            
            // Count windows per installer
            assignedWindows.forEach((assignment: any) => {
              installerWindowCounts[assignment.installerId] = (installerWindowCounts[assignment.installerId] || 0) + 1;
            });
          }
        } catch (error) {
          console.error('Error parsing window assignments:', error);
          // Fallback to totalWindows if JSON parsing fails
          totalWindows += entry.totalWindows || 0;
        }
      } else {
        // Use totalWindows from job entry if windowAssignments is null
        totalWindows += entry.totalWindows || 0;
      }
    }
    
    // Get total redos (each redo counts as one additional window)
    const redoResults = await db.select().from(redoEntries);
    const totalRedos = redoResults.length;
    
    // Add redos to total window count (each redo is one additional window)
    totalWindows += totalRedos;
    
    // Get redos per installer
    const installerRedoCounts: Record<string, number> = {};
    redoResults.forEach(redo => {
      installerRedoCounts[redo.installerId] = (installerRedoCounts[redo.installerId] || 0) + 1;
      // Each redo also counts as one additional window for that installer
      installerWindowCounts[redo.installerId] = (installerWindowCounts[redo.installerId] || 0) + 1;
    });
    
    // Get all installers
    const allInstallers = await db.select().from(users).where(eq(users.role, "installer"));
    
    // For installers without window assignments, get counts from job_installers table
    const jobInstallerCounts = await db
      .select({
        installerId: jobInstallers.installerId,
        totalWindows: sql<number>`SUM(${jobEntries.totalWindows})`,
      })
      .from(jobInstallers)
      .innerJoin(jobEntries, eq(jobInstallers.jobEntryId, jobEntries.id))
      .groupBy(jobInstallers.installerId);

    // Merge window counts from assignments and job installers
    jobInstallerCounts.forEach(({ installerId, totalWindows }) => {
      if (!installerWindowCounts[installerId]) {
        installerWindowCounts[installerId] = totalWindows;
      }
    });

    // Calculate installer performance
    const installerPerformance = allInstallers.map(installer => {
      const windowsCompleted = installerWindowCounts[installer.id] || 0;
      const redoCount = installerRedoCounts[installer.id] || 0;
      const successRate = windowsCompleted > 0 ? ((windowsCompleted - redoCount) / windowsCompleted) * 100 : 0;
      
      return {
        installer,
        windowsCompleted,
        redoCount,
        successRate: Math.max(0, successRate)
      };
    });
    
    const overallSuccessRate = totalWindows > 0 ? ((totalWindows - totalRedos) / totalWindows) * 100 : 0;
    
    return {
      totalWindows,
      totalRedos,
      successRate: Math.max(0, overallSuccessRate),
      installerPerformance
    };
  }

  async getInstallers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.role, "installer"))
      .orderBy(users.firstName, users.lastName);
  }

  async getInstallerTimePerformance(): Promise<Array<{
    installer: User;
    totalMinutes: number;
    totalWindows: number;
    avgTimePerWindow: number;
    jobCount: number;
  }>> {
    const result = await db
      .select({
        installer: users,
        totalMinutes: sql<number>`COALESCE(SUM(${installerTimeEntries.timeMinutes}), 0)`,
        totalWindows: sql<number>`COALESCE(SUM(${installerTimeEntries.windowsCompleted}), 0)`,
        jobCount: sql<number>`COUNT(DISTINCT ${installerTimeEntries.jobEntryId})`,
      })
      .from(users)
      .leftJoin(installerTimeEntries, eq(users.id, installerTimeEntries.installerId))
      .where(eq(users.role, "installer"))
      .groupBy(users.id, users.email, users.firstName, users.lastName, users.profileImageUrl, users.role, users.createdAt, users.updatedAt);

    // Get redo counts per installer to add to window counts
    const redoCounts = await db
      .select({
        installerId: redoEntries.installerId,
        redoCount: sql<number>`COUNT(*)`,
      })
      .from(redoEntries)
      .groupBy(redoEntries.installerId);

    const redoCountMap = new Map<string, number>();
    redoCounts.forEach(row => {
      redoCountMap.set(row.installerId, Number(row.redoCount));
    });

    return result.map(row => {
      const baseWindows = Number(row.totalWindows) || 0;
      const redoWindows = redoCountMap.get(row.installer.id) || 0;
      const totalWindows = baseWindows + redoWindows; // Include redos as additional windows

      return {
        installer: row.installer,
        totalMinutes: Number(row.totalMinutes) || 0,
        totalWindows,
        avgTimePerWindow: totalWindows > 0 ? Math.round((Number(row.totalMinutes) / totalWindows) * 10) / 10 : 0,
        jobCount: Number(row.jobCount) || 0,
      };
    });
  }

  // Film operations
  async getAllFilms(): Promise<Film[]> {
    return await db
      .select()
      .from(films)
      .orderBy(films.type, films.name);
  }

  async getActiveFilms(): Promise<Film[]> {
    return await db
      .select()
      .from(films)
      .where(eq(films.isActive, true))
      .orderBy(films.type, films.name);
  }

  async createFilm(filmData: InsertFilm): Promise<Film> {
    await db
      .insert(films)
      .values(filmData);
    
    // Get the most recently created film with matching name and type
    const [film] = await db
      .select()
      .from(films)
      .where(and(
        eq(films.name, filmData.name),
        eq(films.type, filmData.type)
      ))
      .orderBy(desc(films.id))
      .limit(1);
    
    if (!film) {
      throw new Error('Failed to retrieve film after creation');
    }
    return film;
  }

  async updateFilm(id: number, filmData: Partial<InsertFilm>): Promise<Film> {
    await db
      .update(films)
      .set({ ...filmData, updatedAt: new Date() })
      .where(eq(films.id, id));
    
    // Fetch the updated film since MySQL doesn't support returning
    const [film] = await db.select().from(films).where(eq(films.id, id));
    if (!film) {
      throw new Error('Failed to retrieve film after update');
    }
    return film;
  }

  async deleteFilm(id: number): Promise<void> {
    await db
      .delete(films)
      .where(eq(films.id, id));
  }

  async getFilmConsumption(filters?: {
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<Array<{
    date: string;
    filmType: string;
    filmName: string;
    totalSqft: number;
    totalCost: number;
    jobCount: number;
  }>> {
    // Build filter conditions
    const conditions = [];
    if (filters?.dateFrom) {
      const startOfDay = new Date(filters.dateFrom);
      startOfDay.setUTCHours(0, 0, 0, 0);
      conditions.push(gte(jobEntries.date, startOfDay));
    }
    if (filters?.dateTo) {
      const endOfDay = new Date(filters.dateTo);
      endOfDay.setUTCHours(23, 59, 59, 999);
      conditions.push(lte(jobEntries.date, endOfDay));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get dimension-level consumption (since filmId is now in jobDimensions)
    const dimensionQuery = db
      .select({
        date: sql<string>`DATE(${jobEntries.date})`,
        filmType: films.type,
        filmName: films.name,
        filmId: films.id,
        costPerSqft: films.costPerSqft,
        totalSqft: sql<number>`COALESCE(SUM(${jobDimensions.sqft}::numeric), 0)`,
        totalCost: sql<number>`COALESCE(SUM(${jobDimensions.filmCost}::numeric), 0)`,
        jobCount: sql<number>`COUNT(DISTINCT ${jobEntries.id})`,
      })
      .from(jobDimensions)
      .innerJoin(jobEntries, eq(jobDimensions.jobEntryId, jobEntries.id))
      .innerJoin(films, eq(jobDimensions.filmId, films.id))
      .groupBy(sql`DATE(${jobEntries.date})`, films.type, films.name, films.id, films.costPerSqft);

    if (whereClause) {
      dimensionQuery.where(whereClause);
    }

    const dimensionResults = await dimensionQuery.orderBy(sql`DATE(${jobEntries.date}) DESC`, films.type, films.name);

    // Get redo consumption grouped by date and film (redos still reference job entries)
    // For redos, we need to get the film type from the job's dimensions
    const redoQuery = db
      .select({
        date: sql<string>`DATE(${jobEntries.date})`,
        filmType: films.type,
        filmName: films.name,
        redoSqft: sql<number>`COALESCE(SUM(${redoEntries.sqft}), 0)`,
      })
      .from(redoEntries)
      .innerJoin(jobEntries, eq(redoEntries.jobEntryId, jobEntries.id))
      .innerJoin(jobDimensions, eq(jobEntries.id, jobDimensions.jobEntryId))
      .innerJoin(films, eq(jobDimensions.filmId, films.id))
      .groupBy(sql`DATE(${jobEntries.date})`, films.type, films.name);

    if (whereClause) {
      redoQuery.where(whereClause);
    }

    const redoResults = await redoQuery;

    // Combine dimension and redo consumption
    const combinedResults = dimensionResults.map(dimensionResult => {
      // Find matching redo consumption for this date and film
      const matchingRedo = redoResults.find(
        redo => redo.date === dimensionResult.date && 
                redo.filmType === dimensionResult.filmType && 
                redo.filmName === dimensionResult.filmName
      );
      
      const redoSqft = Number(matchingRedo?.redoSqft || 0);
      const totalSqft = Number(dimensionResult.totalSqft) + redoSqft;
      const redoCost = redoSqft * Number(dimensionResult.costPerSqft || 0);
      const totalCost = Number(dimensionResult.totalCost) + redoCost;

      return {
        date: dimensionResult.date || 'Unknown',
        filmType: dimensionResult.filmType || 'Unknown',
        filmName: dimensionResult.filmName || 'Unknown Film',
        totalSqft: totalSqft,
        totalCost: totalCost,
        jobCount: Number(dimensionResult.jobCount) || 0,
      };
    });

    return combinedResults;
  }

  // Labor cost calculations
  async getJobLaborCosts(jobEntryId: number): Promise<Array<{
    installer: User;
    timeMinutes: number;
    hourlyRate: number;
    laborCost: number;
  }>> {
    const result = await db
      .select({
        installer: users,
        timeMinutes: installerTimeEntries.timeMinutes,
      })
      .from(installerTimeEntries)
      .innerJoin(users, eq(installerTimeEntries.installerId, users.id))
      .where(eq(installerTimeEntries.jobEntryId, jobEntryId));

    return result.map(row => {
      const hourlyRate = Number(row.installer.hourlyRate) || 0;
      const timeHours = row.timeMinutes / 60;
      const laborCost = timeHours * hourlyRate;

      return {
        installer: row.installer,
        timeMinutes: row.timeMinutes,
        hourlyRate,
        laborCost: Math.round(laborCost * 100) / 100, // Round to 2 decimal places
      };
    });
  }

  // Inventory operations
  async getFilmsWithInventory(): Promise<FilmWithInventory[]> {
    const result = await db
      .select()
      .from(films)
      .leftJoin(filmInventory, eq(films.id, filmInventory.filmId))
      .orderBy(films.type, films.name);

    return result.map(row => ({
      ...row.films,
      inventory: row.film_inventory || undefined,
    }));
  }

  async getFilmInventory(filmId: number): Promise<FilmInventory | undefined> {
    const [inventory] = await db
      .select()
      .from(filmInventory)
      .where(eq(filmInventory.filmId, filmId));
    return inventory;
  }

  async addInventoryStock(filmId: number, quantity: number, userId: string, notes?: string): Promise<FilmInventory> {
    // Get current inventory or create if doesn't exist
    let inventory = await this.getFilmInventory(filmId);
    const previousStock = inventory ? Number(inventory.currentStock) : 0;
    const newStock = previousStock + quantity;

    if (inventory) {
      // Update existing inventory
      await db
        .update(filmInventory)
        .set({ 
          currentStock: newStock.toString(),
          updatedAt: new Date()
        })
        .where(eq(filmInventory.filmId, filmId));
    } else {
      // Create new inventory record
      await db
        .insert(filmInventory)
        .values({
          filmId,
          currentStock: newStock.toString(),
          minimumStock: "0.00"
        });
    }

    // Get updated inventory since MySQL doesn't support returning
    inventory = await this.getFilmInventory(filmId);
    if (!inventory) {
      throw new Error('Failed to retrieve inventory after update');
    }

    // Log transaction
    await db.insert(inventoryTransactions).values({
      filmId,
      type: "addition",
      quantity: quantity.toString(),
      previousStock: previousStock.toString(),
      newStock: newStock.toString(),
      notes,
      createdBy: userId,
    });

    return inventory;
  }

  async deductInventoryStock(filmId: number, quantity: number, userId: string, jobEntryId?: number, notes?: string): Promise<FilmInventory> {
    // Get current inventory or create if doesn't exist
    let inventory = await this.getFilmInventory(filmId);
    const previousStock = inventory ? Number(inventory.currentStock) : 0;
    const newStock = Math.max(0, previousStock - quantity); // Don't allow negative stock

    if (inventory) {
      // Update existing inventory
      await db
        .update(filmInventory)
        .set({ 
          currentStock: newStock.toString(),
          updatedAt: new Date()
        })
        .where(eq(filmInventory.filmId, filmId));
    } else {
      // Create new inventory record with negative deduction
      await db
        .insert(filmInventory)
        .values({
          filmId,
          currentStock: newStock.toString(),
          minimumStock: "0.00"
        });
    }

    // Get updated inventory since MySQL doesn't support returning
    inventory = await this.getFilmInventory(filmId);
    if (!inventory) {
      throw new Error('Failed to retrieve inventory after update');
    }

    // Log transaction
    await db.insert(inventoryTransactions).values({
      filmId,
      type: "deduction",
      quantity: (-quantity).toString(), // Negative for deductions
      previousStock: previousStock.toString(),
      newStock: newStock.toString(),
      jobEntryId,
      notes,
      createdBy: userId,
    });

    return inventory;
  }

  async adjustInventoryStock(filmId: number, newStock: number, userId: string, notes?: string): Promise<FilmInventory> {
    // Get current inventory or create if doesn't exist
    let inventory = await this.getFilmInventory(filmId);
    const previousStock = inventory ? Number(inventory.currentStock) : 0;

    if (inventory) {
      // Update existing inventory
      await db
        .update(filmInventory)
        .set({ 
          currentStock: newStock.toString(),
          updatedAt: new Date()
        })
        .where(eq(filmInventory.filmId, filmId));
    } else {
      // Create new inventory record
      await db
        .insert(filmInventory)
        .values({
          filmId,
          currentStock: newStock.toString(),
          minimumStock: "0.00"
        });
    }

    // Get updated inventory since MySQL doesn't support returning
    inventory = await this.getFilmInventory(filmId);
    if (!inventory) {
      throw new Error('Failed to retrieve inventory after update');
    }

    // Log transaction
    await db.insert(inventoryTransactions).values({
      filmId,
      type: "adjustment",
      quantity: (newStock - previousStock).toString(),
      previousStock: previousStock.toString(),
      newStock: newStock.toString(),
      notes,
      createdBy: userId,
    });

    return inventory;
  }

  async setMinimumStock(filmId: number, minimumStock: number): Promise<FilmInventory> {
    // Get current inventory or create if doesn't exist
    let inventory = await this.getFilmInventory(filmId);

    if (inventory) {
      // Update existing inventory
      await db
        .update(filmInventory)
        .set({ 
          minimumStock: minimumStock.toString(),
          updatedAt: new Date()
        })
        .where(eq(filmInventory.filmId, filmId));
    } else {
      // Create new inventory record
      await db
        .insert(filmInventory)
        .values({
          filmId,
          currentStock: "0.00",
          minimumStock: minimumStock.toString()
        });
    }

    // Get updated inventory since MySQL doesn't support returning
    inventory = await this.getFilmInventory(filmId);
    if (!inventory) {
      throw new Error('Failed to retrieve inventory after update');
    }

    return inventory;
  }

  async getInventoryTransactions(filmId?: number, limit = 100): Promise<Array<InventoryTransaction & { film: Film; createdByUser: User; jobEntry?: JobEntry }>> {
    const baseQuery = db
      .select()
      .from(inventoryTransactions)
      .innerJoin(films, eq(inventoryTransactions.filmId, films.id))
      .innerJoin(users, eq(inventoryTransactions.createdBy, users.id))
      .leftJoin(jobEntries, eq(inventoryTransactions.jobEntryId, jobEntries.id))
      .orderBy(desc(inventoryTransactions.createdAt))
      .limit(limit);

    let query;
    if (filmId) {
      query = baseQuery.where(eq(inventoryTransactions.filmId, filmId));
    } else {
      query = baseQuery;
    }

    const result = await query;

    return result.map(row => ({
      ...row.inventory_transactions,
      film: row.films,
      createdByUser: row.users,
      jobEntry: row.job_entries || undefined,
    }));
  }

  async getLowStockFilms(): Promise<FilmWithInventory[]> {
    const result = await db
      .select()
      .from(films)
      .innerJoin(filmInventory, eq(films.id, filmInventory.filmId))
      .where(sql`CAST(${filmInventory.currentStock} AS DECIMAL) <= CAST(${filmInventory.minimumStock} AS DECIMAL)`)
      .orderBy(films.type, films.name);

    return result.map(row => ({
      ...row.films,
      inventory: row.film_inventory,
    }));
  }
}

export const storage = new DatabaseStorage();

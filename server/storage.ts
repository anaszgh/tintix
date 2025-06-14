import {
  users,
  jobEntries,
  jobInstallers,
  redoEntries,
  installerTimeEntries,
  films,
  jobDimensions,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, count, isNull } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
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
    avgTimeVariance: number;
    activeInstallers: number;
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
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserHourlyRate(userId: string, hourlyRate: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ hourlyRate, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.firstName, users.lastName);
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Job entry operations
  async createJobEntry(jobEntry: InsertJobEntry & { windowAssignments?: any[], dimensions?: Array<{lengthInches: number, widthInches: number, description?: string}> }, installerData: Array<{installerId: string, timeVariance: number}>): Promise<JobEntry> {
    // Generate sequential job number starting from 1
    const existingEntries = await db.select({ id: jobEntries.id }).from(jobEntries);
    const nextJobNumber = existingEntries.length + 1;
    const jobNumber = `JOB-${nextJobNumber}`;

    const [entry] = await db
      .insert(jobEntries)
      .values({
        ...jobEntry,
        jobNumber,
        windowAssignments: jobEntry.windowAssignments ? JSON.stringify(jobEntry.windowAssignments) : null,
      })
      .returning();
    
    // Add dimensions if provided and calculate total square footage
    let totalSqft = 0;
    if (jobEntry.dimensions && jobEntry.dimensions.length > 0) {
      for (const dimension of jobEntry.dimensions) {
        const sqft = (dimension.lengthInches * dimension.widthInches) / 144;
        totalSqft += sqft;
        
        await db.insert(jobDimensions).values({
          jobEntryId: entry.id,
          lengthInches: dimension.lengthInches.toString(),
          widthInches: dimension.widthInches.toString(),
          sqft: sqft.toString(),
          description: dimension.description || null,
        });
      }
      
      // Update total square footage
      await db.update(jobEntries)
        .set({ totalSqft })
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

    // Get all dimensions for this job
    const dimensionResults = await db
      .select()
      .from(jobDimensions)
      .where(eq(jobDimensions.jobEntryId, id));

    return {
      ...entry,
      installers: installers as (User & { timeVariance: number })[],
      redoEntries: redoEntriesWithInstallers,
      dimensions: dimensionResults,
    };
  }

  async updateJobEntry(id: number, jobEntry: Partial<InsertJobEntry>): Promise<JobEntry> {
    const [entry] = await db
      .update(jobEntries)
      .set({ ...jobEntry, updatedAt: new Date() })
      .where(eq(jobEntries.id, id))
      .returning();
    return entry;
  }

  async deleteJobEntry(id: number): Promise<void> {
    // Delete related job installers first
    await db.delete(jobInstallers).where(eq(jobInstallers.jobEntryId, id));
    
    // Delete related redo entries
    await db.delete(redoEntries).where(eq(redoEntries.jobEntryId, id));
    
    // Finally delete the job entry
    await db.delete(jobEntries).where(eq(jobEntries.id, id));
  }

  // Job installer operations
  async createJobInstaller(jobInstaller: InsertJobInstaller): Promise<JobInstaller> {
    const [installer] = await db
      .insert(jobInstallers)
      .values(jobInstaller)
      .returning();
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
    const [entry] = await db
      .insert(redoEntries)
      .values(redoEntry)
      .returning();
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
        avgTimeVariance: sql<number>`COALESCE(AVG(${jobInstallers.timeVariance}::numeric), 0)`,
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
    const [film] = await db
      .insert(films)
      .values(filmData)
      .returning();
    return film;
  }

  async updateFilm(id: number, filmData: Partial<InsertFilm>): Promise<Film> {
    const [film] = await db
      .update(films)
      .set({ ...filmData, updatedAt: new Date() })
      .where(eq(films.id, id))
      .returning();
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

    // Get job-level consumption
    const jobQuery = db
      .select({
        date: sql<string>`DATE(${jobEntries.date})`,
        filmType: films.type,
        filmName: films.name,
        filmId: films.id,
        costPerSqft: films.costPerSqft,
        totalSqft: sql<number>`COALESCE(SUM(${jobEntries.totalSqft}), 0)`,
        totalCost: sql<number>`COALESCE(SUM(CAST(${jobEntries.filmCost} AS DECIMAL)), 0)`,
        jobCount: count(jobEntries.id),
      })
      .from(jobEntries)
      .leftJoin(films, eq(jobEntries.filmId, films.id))
      .groupBy(sql`DATE(${jobEntries.date})`, films.type, films.name, films.id, films.costPerSqft);

    if (whereClause) {
      jobQuery.where(whereClause);
    }

    const jobResults = await jobQuery.orderBy(sql`DATE(${jobEntries.date}) DESC`, films.type, films.name);

    // Get redo consumption grouped by date and film
    const redoQuery = db
      .select({
        date: sql<string>`DATE(${jobEntries.date})`,
        filmId: jobEntries.filmId,
        redoSqft: sql<number>`COALESCE(SUM(${redoEntries.sqft}), 0)`,
      })
      .from(redoEntries)
      .innerJoin(jobEntries, eq(redoEntries.jobEntryId, jobEntries.id))
      .groupBy(sql`DATE(${jobEntries.date})`, jobEntries.filmId);

    if (whereClause) {
      redoQuery.where(whereClause);
    }

    const redoResults = await redoQuery;

    // Combine job and redo consumption
    const combinedResults = jobResults.map(jobResult => {
      // Find matching redo consumption for this date and film
      const matchingRedo = redoResults.find(
        redo => redo.date === jobResult.date && redo.filmId === jobResult.filmId
      );
      
      const redoSqft = Number(matchingRedo?.redoSqft || 0);
      const totalSqft = Number(jobResult.totalSqft) + redoSqft;
      const redoCost = redoSqft * Number(jobResult.costPerSqft || 0);
      const totalCost = Number(jobResult.totalCost) + redoCost;

      return {
        date: jobResult.date || 'Unknown',
        filmType: jobResult.filmType || 'Unknown',
        filmName: jobResult.filmName || 'Unknown Film',
        totalSqft: totalSqft,
        totalCost: totalCost,
        jobCount: Number(jobResult.jobCount) || 0,
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
}

export const storage = new DatabaseStorage();

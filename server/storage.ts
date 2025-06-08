import {
  users,
  jobEntries,
  jobInstallers,
  redoEntries,
  installerTimeEntries,
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
  type JobEntryWithDetails,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, count, isNull } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(userId: string, role: string): Promise<User>;
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
  
  getTopPerformers(limit?: number): Promise<Array<{
    installer: User;
    vehicleCount: number;
    redoCount: number;
    successRate: number;
  }>>;
  
  getRedoBreakdown(): Promise<Array<{
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

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.firstName, users.lastName);
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Job entry operations
  async createJobEntry(jobEntry: InsertJobEntry & { windowAssignments?: any[] }, installerData: Array<{installerId: string, timeVariance: number}>): Promise<JobEntry> {
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
      conditions.push(gte(jobEntries.date, filters.dateFrom));
    }
    if (filters?.dateTo) {
      conditions.push(lte(jobEntries.date, filters.dateTo));
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

    return {
      ...entry,
      installers: installers as (User & { timeVariance: number })[],
      redoEntries: redoEntriesWithInstallers,
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
      conditions.push(gte(jobEntries.date, filters.dateFrom));
    }
    if (filters?.dateTo) {
      conditions.push(lte(jobEntries.date, filters.dateTo));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count distinct job entries (vehicles) and sum total windows
    const [vehicleCount] = await db
      .select({
        totalVehicles: count(jobEntries.id),
        totalWindows: sql<number>`COALESCE(SUM(${jobEntries.totalWindows}), 0)`,
      })
      .from(jobEntries)
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
      totalWindows: vehicleCount.totalWindows,
      avgTimeVariance: Math.round(timeVarianceMetrics.avgTimeVariance),
      activeInstallers: installerCount.activeInstallers,
      jobsWithoutRedos: perfectJobs.jobsWithoutRedos,
    };
  }

  async getTopPerformers(limit = 10): Promise<Array<{
    installer: User;
    vehicleCount: number;
    redoCount: number;
    successRate: number;
  }>> {
    // Get vehicle count and total windows per installer from existing job entries only
    const vehicleCounts = await db
      .select({
        installerId: jobInstallers.installerId,
        vehicleCount: count(jobInstallers.jobEntryId),
        totalWindows: sql<number>`SUM(${jobEntries.totalWindows})`,
      })
      .from(jobInstallers)
      .innerJoin(jobEntries, eq(jobInstallers.jobEntryId, jobEntries.id))
      .groupBy(jobInstallers.installerId);

    // Get redo count per installer from existing job entries only
    const redoCounts = await db
      .select({
        installerId: redoEntries.installerId,
        redoCount: count(redoEntries.id),
      })
      .from(redoEntries)
      .innerJoin(jobEntries, eq(redoEntries.jobEntryId, jobEntries.id))
      .groupBy(redoEntries.installerId);

    // Get all installers
    const allInstallers = await db
      .select()
      .from(users)
      .where(eq(users.role, "installer"));

    // Combine the data
    const results = allInstallers.map(installer => {
      const vehicleData = vehicleCounts.find(vc => vc.installerId === installer.id);
      const redoData = redoCounts.find(rc => rc.installerId === installer.id);
      
      const vehicleCount = vehicleData?.vehicleCount || 0;
      const redoCount = redoData?.redoCount || 0;
      const totalWindows = vehicleData?.totalWindows || 0;
      
      // Calculate success rate using actual window counts: (Total Windows - Total Redos) / Total Windows * 100
      const successfulWindows = totalWindows - redoCount;
      const successRate = totalWindows > 0 
        ? Math.round((successfulWindows / totalWindows) * 100 * 10) / 10
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

  async getRedoBreakdown(): Promise<Array<{
    part: string;
    count: number;
  }>> {
    const results = await db
      .select({
        part: redoEntries.part,
        count: count(redoEntries.id),
      })
      .from(redoEntries)
      .groupBy(redoEntries.part)
      .orderBy(desc(count(redoEntries.id)));

    return results;
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
          let assignments;
          if (typeof entry.windowAssignments === 'string') {
            assignments = JSON.parse(entry.windowAssignments);
          } else {
            assignments = entry.windowAssignments;
          }
          
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
    
    // Get total redos
    const redoResults = await db.select().from(redoEntries);
    const totalRedos = redoResults.length;
    
    // Get redos per installer
    const installerRedoCounts: Record<string, number> = {};
    redoResults.forEach(redo => {
      installerRedoCounts[redo.installerId] = (installerRedoCounts[redo.installerId] || 0) + 1;
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

    return result.map(row => ({
      installer: row.installer,
      totalMinutes: Number(row.totalMinutes) || 0,
      totalWindows: Number(row.totalWindows) || 0,
      avgTimePerWindow: row.totalWindows > 0 ? Math.round((Number(row.totalMinutes) / Number(row.totalWindows)) * 10) / 10 : 0,
      jobCount: Number(row.jobCount) || 0,
    }));
  }
}

export const storage = new DatabaseStorage();

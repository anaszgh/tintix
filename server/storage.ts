import {
  users,
  jobEntries,
  jobInstallers,
  redoEntries,
  type User,
  type UpsertUser,
  type JobEntry,
  type InsertJobEntry,
  type JobInstaller,
  type InsertJobInstaller,
  type RedoEntry,
  type InsertRedoEntry,
  type JobEntryWithDetails,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, count } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(userId: string, role: string): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: string): Promise<void>;
  
  // Job entry operations
  createJobEntry(jobEntry: InsertJobEntry, installerIds: string[]): Promise<JobEntry>;
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
  
  // Installer operations
  getInstallers(): Promise<User[]>;
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

  // Job entry operations
  async createJobEntry(jobEntry: InsertJobEntry, installerIds: string[]): Promise<JobEntry> {
    const [entry] = await db
      .insert(jobEntries)
      .values(jobEntry)
      .returning();
    
    // Add installers to the job
    for (const installerId of installerIds) {
      await this.createJobInstaller({
        jobEntryId: entry.id,
        installerId,
      });
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

    // Get all installers for this job
    const jobInstallersResult = await db
      .select({
        installer: users,
      })
      .from(jobInstallers)
      .leftJoin(users, eq(jobInstallers.installerId, users.id))
      .where(eq(jobInstallers.jobEntryId, id));

    const installers = jobInstallersResult.map(r => r.installer).filter(Boolean) as User[];

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
      installers,
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
    avgTimeVariance: number;
    activeInstallers: number;
  }> {
    const conditions = [];
    
    if (filters?.dateFrom) {
      conditions.push(gte(jobEntries.date, filters.dateFrom));
    }
    if (filters?.dateTo) {
      conditions.push(lte(jobEntries.date, filters.dateTo));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [vehicleMetrics] = await db
      .select({
        totalVehicles: count(jobEntries.id),
        avgTimeVariance: sql<number>`COALESCE(AVG(${jobEntries.timeVariance}), 0)`,
      })
      .from(jobEntries)
      .where(whereClause);

    const [redoMetrics] = await db
      .select({
        totalRedos: count(redoEntries.id),
      })
      .from(redoEntries)
      .leftJoin(jobEntries, eq(redoEntries.jobEntryId, jobEntries.id))
      .where(whereClause);

    const [installerMetrics] = await db
      .select({
        activeInstallers: sql<number>`COUNT(DISTINCT ${jobInstallers.installerId})`,
      })
      .from(jobInstallers)
      .leftJoin(jobEntries, eq(jobInstallers.jobEntryId, jobEntries.id))
      .where(whereClause);

    return {
      totalVehicles: vehicleMetrics.totalVehicles,
      totalRedos: redoMetrics.totalRedos,
      avgTimeVariance: Math.round(vehicleMetrics.avgTimeVariance),
      activeInstallers: installerMetrics.activeInstallers,
    };
  }

  async getTopPerformers(limit = 10): Promise<Array<{
    installer: User;
    vehicleCount: number;
    redoCount: number;
    successRate: number;
  }>> {
    const results = await db
      .select({
        installer: users,
        vehicleCount: count(jobInstallers.jobEntryId),
        redoCount: sql<number>`COALESCE(COUNT(${redoEntries.id}), 0)`,
      })
      .from(users)
      .leftJoin(jobInstallers, eq(users.id, jobInstallers.installerId))
      .leftJoin(jobEntries, eq(jobInstallers.jobEntryId, jobEntries.id))
      .leftJoin(redoEntries, and(
        eq(jobEntries.id, redoEntries.jobEntryId),
        eq(users.id, redoEntries.installerId)
      ))
      .where(eq(users.role, "installer"))
      .groupBy(users.id)
      .orderBy(desc(sql`${count(jobInstallers.jobEntryId)} - COALESCE(COUNT(${redoEntries.id}), 0)`))
      .limit(limit);

    return results.map(result => ({
      installer: result.installer,
      vehicleCount: result.vehicleCount,
      redoCount: result.redoCount,
      successRate: result.vehicleCount > 0 
        ? Math.round(((result.vehicleCount - result.redoCount) / result.vehicleCount) * 100 * 10) / 10
        : 100,
    }));
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

  async getInstallers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.role, "installer"))
      .orderBy(users.firstName, users.lastName);
  }
}

export const storage = new DatabaseStorage();

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertJobEntrySchema, insertRedoEntrySchema, insertJobInstallerSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User management routes
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "manager") {
        return res.status(403).json({ message: "Only managers can access user management" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/users/:id/role', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "manager") {
        return res.status(403).json({ message: "Only managers can update user roles" });
      }

      const targetUserId = req.params.id;
      const { role } = req.body;

      if (!role || !["installer", "manager"].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be 'installer' or 'manager'" });
      }

      // Prevent users from changing their own role
      if (targetUserId === userId) {
        return res.status(400).json({ message: "Cannot change your own role" });
      }

      const updatedUser = await storage.updateUserRole(targetUserId, role);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Job entries routes
  app.get("/api/job-entries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const { installer, dateFrom, dateTo, limit, offset } = req.query;
      
      const filters: any = {};
      
      // If user is installer, only show their entries
      if (user.role === "installer") {
        filters.installerId = userId;
      } else if (installer && installer !== "all") {
        filters.installerId = installer;
      }
      
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
      if (limit) filters.limit = parseInt(limit as string);
      if (offset) filters.offset = parseInt(offset as string);

      const entries = await storage.getJobEntries(filters);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching job entries:", error);
      res.status(500).json({ message: "Failed to fetch job entries" });
    }
  });

  app.post("/api/job-entries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      console.log('Raw request body:', JSON.stringify(req.body, null, 2));

      const validatedData = insertJobEntrySchema.parse({
        ...req.body,
        date: new Date(req.body.date),
      });

      // Handle installer data with individual time variances
      const { installerIds, installerTimeVariances } = req.body;
      if (!installerIds || !Array.isArray(installerIds) || installerIds.length === 0) {
        return res.status(400).json({ message: "At least one installer must be selected" });
      }

      // Transform installer data to include time variances
      const installerData = installerIds.map((installerId: string) => ({
        installerId,
        timeVariance: installerTimeVariances?.[installerId] || 0
      }));

      // Handle window assignments properly for storage
      const jobEntryData = {
        ...validatedData,
        windowAssignments: req.body.windowAssignments || []
      };
      
      const jobEntry = await storage.createJobEntry(jobEntryData, installerData);

      // Create redo entries if provided
      if (req.body.redoEntries && Array.isArray(req.body.redoEntries)) {
        for (const redoData of req.body.redoEntries) {
          const validatedRedo = insertRedoEntrySchema.parse({
            jobEntryId: jobEntry.id,
            installerId: redoData.installerId || installerIds[0], // Default to first installer if not specified
            part: redoData.part,
            timestamp: new Date(), // Use current timestamp
          });
          await storage.createRedoEntry(validatedRedo);
        }
      }

      const fullEntry = await storage.getJobEntry(jobEntry.id);
      res.status(201).json(fullEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating job entry:", error);
      res.status(500).json({ message: "Failed to create job entry" });
    }
  });

  app.put("/api/job-entries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Manager role check for editing entries
      if (user.role !== "manager") {
        return res.status(403).json({ message: "Only managers can edit job entries" });
      }

      const entryId = parseInt(req.params.id);
      if (isNaN(entryId)) {
        return res.status(400).json({ message: "Invalid entry ID" });
      }

      const validatedData = insertJobEntrySchema.parse({
        ...req.body,
        date: new Date(req.body.date),
      });

      // Handle installer data with individual time variances
      const { installerIds, installerTimeVariances } = req.body;
      if (!installerIds || !Array.isArray(installerIds) || installerIds.length === 0) {
        return res.status(400).json({ message: "At least one installer must be selected" });
      }

      // Update the job entry
      await storage.updateJobEntry(entryId, validatedData);

      // Delete existing job installers and redo entries
      const existingEntry = await storage.getJobEntry(entryId);
      if (existingEntry) {
        for (const installer of existingEntry.installers) {
          await storage.deleteJobInstaller(entryId, installer.id);
        }
        for (const redo of existingEntry.redoEntries) {
          await storage.deleteRedoEntry(redo.id);
        }
      }

      // Recreate job installers with new time variances
      const installerData = installerIds.map((installerId: string) => ({
        installerId,
        timeVariance: installerTimeVariances?.[installerId] || 0
      }));

      for (const installer of installerData) {
        await storage.createJobInstaller({
          jobEntryId: entryId,
          installerId: installer.installerId,
          timeVariance: installer.timeVariance
        });
      }

      // Recreate redo entries if provided
      if (req.body.redoEntries && Array.isArray(req.body.redoEntries)) {
        for (const redoData of req.body.redoEntries) {
          const validatedRedo = insertRedoEntrySchema.parse({
            jobEntryId: entryId,
            installerId: redoData.installerId || installerIds[0],
            part: redoData.part,
            timestamp: new Date(),
          });
          await storage.createRedoEntry(validatedRedo);
        }
      }

      const updatedEntry = await storage.getJobEntry(entryId);
      res.json(updatedEntry);
    } catch (error) {
      console.error("Error updating job entry:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update job entry" });
    }
  });

  app.get("/api/job-entries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const entryId = parseInt(req.params.id);
      const entry = await storage.getJobEntry(entryId);
      
      if (!entry) {
        return res.status(404).json({ message: "Job entry not found" });
      }

      // If user is installer, only allow access to their own entries
      if (user.role === "installer" && !entry.installers.some(installer => installer.id === userId)) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(entry);
    } catch (error) {
      console.error("Error fetching job entry:", error);
      res.status(500).json({ message: "Failed to fetch job entry" });
    }
  });

  app.put("/api/job-entries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Only managers can edit entries
      if (user.role !== "manager") {
        return res.status(403).json({ message: "Only managers can edit entries" });
      }

      const entryId = parseInt(req.params.id);
      const validatedData = insertJobEntrySchema.partial().parse({
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : undefined,
      });

      const updatedEntry = await storage.updateJobEntry(entryId, validatedData);
      const fullEntry = await storage.getJobEntry(updatedEntry.id);
      res.json(fullEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating job entry:", error);
      res.status(500).json({ message: "Failed to update job entry" });
    }
  });

  app.delete("/api/job-entries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Only managers can delete entries
      if (user.role !== "manager") {
        return res.status(403).json({ message: "Only managers can delete entries" });
      }

      const entryId = parseInt(req.params.id);
      await storage.deleteJobEntry(entryId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting job entry:", error);
      res.status(500).json({ message: "Failed to delete job entry" });
    }
  });

  // Analytics routes
  app.get("/api/analytics/metrics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const { installer, dateFrom, dateTo } = req.query;
      
      const filters: any = {};
      
      // If user is installer, only show their metrics
      if (user.role === "installer") {
        filters.installerId = userId;
      } else if (installer && installer !== "all") {
        filters.installerId = installer;
      }
      
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);

      const metrics = await storage.getPerformanceMetrics(filters);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  app.get("/api/analytics/top-performers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const { dateFrom, dateTo } = req.query;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      const filters: any = {};
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
      
      const performers = await storage.getTopPerformers(limit, filters);
      res.json(performers);
    } catch (error) {
      console.error("Error fetching top performers:", error);
      res.status(500).json({ message: "Failed to fetch top performers" });
    }
  });

  app.get("/api/analytics/redo-breakdown", isAuthenticated, async (req: any, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      
      const filters: any = {};
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
      
      const breakdown = await storage.getRedoBreakdown(filters);
      res.json(breakdown);
    } catch (error) {
      console.error("Error fetching redo breakdown:", error);
      res.status(500).json({ message: "Failed to fetch redo breakdown" });
    }
  });

  app.get("/api/analytics/window-performance", isAuthenticated, async (req: any, res) => {
    try {
      const analytics = await storage.getWindowPerformanceAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching window performance analytics:", error);
      res.status(500).json({ message: "Failed to fetch window performance analytics" });
    }
  });

  app.get("/api/analytics/time-performance", isAuthenticated, async (req: any, res) => {
    try {
      const analytics = await storage.getInstallerTimePerformance();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching time performance analytics:", error);
      res.status(500).json({ message: "Failed to fetch time performance analytics" });
    }
  });

  // Installers routes
  app.get("/api/installers", isAuthenticated, async (req: any, res) => {
    try {
      const installers = await storage.getInstallers();
      res.json(installers);
    } catch (error) {
      console.error("Error fetching installers:", error);
      res.status(500).json({ message: "Failed to fetch installers" });
    }
  });

  app.post("/api/installers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "manager") {
        return res.status(403).json({ message: "Only managers can add installers" });
      }

      const { email, firstName, lastName } = req.body;
      
      if (!email || !firstName || !lastName) {
        return res.status(400).json({ message: "Email, first name, and last name are required" });
      }

      // Create installer with default role
      const installer = await storage.upsertUser({
        id: email, // Use email as ID for new users
        email,
        firstName,
        lastName,
        role: "installer",
      });

      res.status(201).json(installer);
    } catch (error) {
      console.error("Error creating installer:", error);
      res.status(500).json({ message: "Failed to create installer" });
    }
  });

  app.patch("/api/installers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "manager") {
        return res.status(403).json({ message: "Only managers can update installers" });
      }

      const { id } = req.params;
      const { email, firstName, lastName } = req.body;

      const existingInstaller = await storage.getUser(id);
      if (!existingInstaller) {
        return res.status(404).json({ message: "Installer not found" });
      }

      const updatedInstaller = await storage.upsertUser({
        id,
        email: email || existingInstaller.email,
        firstName: firstName || existingInstaller.firstName,
        lastName: lastName || existingInstaller.lastName,
        role: existingInstaller.role,
      });

      res.json(updatedInstaller);
    } catch (error) {
      console.error("Error updating installer:", error);
      res.status(500).json({ message: "Failed to update installer" });
    }
  });

  app.delete("/api/installers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "manager") {
        return res.status(403).json({ message: "Only managers can remove installers" });
      }

      const { id } = req.params;
      
      // Note: In a real application, you might want to soft-delete or transfer jobs
      // For now, we'll assume the installer can be safely removed
      await storage.deleteUser(id);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting installer:", error);
      res.status(500).json({ message: "Failed to delete installer" });
    }
  });

  // Temporary endpoint to promote current user to manager (for setup)
  app.post('/api/promote-to-manager', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updatedUser = await storage.updateUserRole(userId, "manager");
      res.json(updatedUser);
    } catch (error) {
      console.error("Error promoting user to manager:", error);
      res.status(500).json({ message: "Failed to promote user to manager" });
    }
  });

  // Film management routes
  app.get("/api/films", isAuthenticated, async (req: any, res) => {
    try {
      const films = await storage.getActiveFilms();
      res.json(films);
    } catch (error) {
      console.error("Error fetching films:", error);
      res.status(500).json({ message: "Failed to fetch films" });
    }
  });

  app.get("/api/films/all", isAuthenticated, async (req: any, res) => {
    try {
      const films = await storage.getAllFilms();
      res.json(films);
    } catch (error) {
      console.error("Error fetching all films:", error);
      res.status(500).json({ message: "Failed to fetch all films" });
    }
  });

  app.post("/api/films", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "manager") {
        return res.status(403).json({ message: "Only managers can create films" });
      }

      const film = await storage.createFilm(req.body);
      res.json(film);
    } catch (error) {
      console.error("Error creating film:", error);
      res.status(500).json({ message: "Failed to create film" });
    }
  });

  app.put("/api/films/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "manager") {
        return res.status(403).json({ message: "Only managers can update films" });
      }

      const filmId = parseInt(req.params.id);
      const film = await storage.updateFilm(filmId, req.body);
      res.json(film);
    } catch (error) {
      console.error("Error updating film:", error);
      res.status(500).json({ message: "Failed to update film" });
    }
  });

  app.delete("/api/films/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "manager") {
        return res.status(403).json({ message: "Only managers can delete films" });
      }

      const filmId = parseInt(req.params.id);
      await storage.deleteFilm(filmId);
      res.json({ message: "Film deleted successfully" });
    } catch (error) {
      console.error("Error deleting film:", error);
      res.status(500).json({ message: "Failed to delete film" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

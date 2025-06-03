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

      const validatedData = insertJobEntrySchema.parse({
        ...req.body,
        date: new Date(req.body.date),
      });

      // Handle installer IDs - if user is installer, include them, otherwise use provided installers
      let installerIds: string[] = [];
      if (user.role === "installer") {
        installerIds = [userId];
      } else if (req.body.installerIds && Array.isArray(req.body.installerIds)) {
        installerIds = req.body.installerIds;
      } else {
        return res.status(400).json({ message: "Installer IDs are required" });
      }

      const jobEntry = await storage.createJobEntry(validatedData, installerIds);

      // Create redo entries if provided
      if (req.body.redoEntries && Array.isArray(req.body.redoEntries)) {
        for (const redoData of req.body.redoEntries) {
          const validatedRedo = insertRedoEntrySchema.parse({
            jobEntryId: jobEntry.id,
            installerId: redoData.installerId || installerIds[0], // Default to first installer if not specified
            part: redoData.part,
            timestamp: new Date(redoData.timestamp),
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
      if (user.role === "installer" && entry.installerId !== userId) {
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

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const performers = await storage.getTopPerformers(limit);
      res.json(performers);
    } catch (error) {
      console.error("Error fetching top performers:", error);
      res.status(500).json({ message: "Failed to fetch top performers" });
    }
  });

  app.get("/api/analytics/redo-breakdown", isAuthenticated, async (req: any, res) => {
    try {
      const breakdown = await storage.getRedoBreakdown();
      res.json(breakdown);
    } catch (error) {
      console.error("Error fetching redo breakdown:", error);
      res.status(500).json({ message: "Failed to fetch redo breakdown" });
    }
  });

  // Installers route
  app.get("/api/installers", isAuthenticated, async (req: any, res) => {
    try {
      const installers = await storage.getInstallers();
      res.json(installers);
    } catch (error) {
      console.error("Error fetching installers:", error);
      res.status(500).json({ message: "Failed to fetch installers" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

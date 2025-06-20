import { defineConfig } from "drizzle-kit";

// if (!process.env.DATABASE_URL) {
//   throw new Error("DATABASE_URL, ensure the database is provisioned");
// }

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    host: process.env.DB_HOST || '',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME || '',
    ssl: {
      rejectUnauthorized: false
    }
  },
});

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import * as dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

function buildConnectionString(baseUrl: string): string {
  if (baseUrl.includes('sslmode=')) return baseUrl;
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}sslmode=require`;
}

export const pool = new Pool({ connectionString: buildConnectionString(process.env.DATABASE_URL) });
export const db = drizzle(pool, { schema });

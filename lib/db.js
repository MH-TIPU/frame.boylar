import { Pool } from 'pg';

// Connects lazily on the first query, so the build works without a database.
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

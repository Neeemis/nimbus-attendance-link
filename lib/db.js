import postgres from 'postgres';

const DATABASE_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("Missing POSTGRES_URL in environment variables.");
}

const sql = postgres(DATABASE_URL, {
  ssl: { rejectUnauthorized: false }, // Required for secure cloud providers like Neon/Render
});

export default sql;

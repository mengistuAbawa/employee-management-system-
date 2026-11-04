import bcrypt from "bcrypt";
import dotenv from "dotenv";
import pg from "pg";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env") });

const { Client } = pg;
const config = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER || "postgres",
      database: process.env.DB_NAME || "employees",
      ...(process.env.DB_PASS ? { password: process.env.DB_PASS } : {}),
      ...(process.env.DB_SSL === "true" ? { ssl: { rejectUnauthorized: false } } : {}),
    };

const { ADMIN_FULL_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!ADMIN_FULL_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
  console.error("Set ADMIN_FULL_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD (at least 12 characters).");
  process.exitCode = 1;
} else {
  const client = new Client(config);
  try {
    await client.connect();
    const { rows } = await client.query("SELECT COUNT(*)::int AS count FROM admin");
    if (rows[0].count > 0) {
      throw new Error("An administrator already exists; create additional admins from the authenticated admin panel.");
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const result = await client.query(
      "INSERT INTO admin (full_name, email, password) VALUES ($1, $2, $3) RETURNING id",
      [ADMIN_FULL_NAME.trim(), ADMIN_EMAIL.trim().toLowerCase(), passwordHash],
    );
    console.log(`Initial administrator created (id ${result.rows[0].id}). Remove bootstrap environment variables now.`);
  } catch (error) {
    console.error(`Could not create initial administrator: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await client.end().catch((error) => {
      console.error(`Could not close the database connection: ${error.message}`);
      process.exitCode = 1;
    });
  }
}

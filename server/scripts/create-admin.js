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
if (
  !ADMIN_FULL_NAME ||
  !ADMIN_EMAIL ||
  !ADMIN_PASSWORD ||
  ADMIN_PASSWORD.length < 12 ||
  Buffer.byteLength(ADMIN_PASSWORD, "utf8") > 72
) {
  console.error("Set ADMIN_FULL_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD (12 to 72 bytes).");
  process.exitCode = 1;
} else {
  const client = new Client(config);
  let transactionStarted = false;
  try {
    await client.connect();
    await client.query("BEGIN");
    transactionStarted = true;
    const { rows } = await client.query("SELECT COUNT(*)::int AS count FROM admin");
    if (rows[0].count > 0) {
      throw new Error("An administrator already exists; create additional admins from the authenticated admin panel.");
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const fullName = ADMIN_FULL_NAME.trim();
    const email = ADMIN_EMAIL.trim().toLowerCase();
    const user = await client.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin')
       RETURNING id`,
      [fullName, email, passwordHash],
    );
    const admin = await client.query(
      `INSERT INTO admin (full_name, email, password, user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [fullName, email, passwordHash, user.rows[0].id],
    );
    await client.query("COMMIT");
    transactionStarted = false;
    console.log(`Initial administrator created (id ${admin.rows[0].id}). Remove bootstrap environment variables now.`);
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(`Could not roll back administrator setup: ${rollbackError.message}`);
      }
    }
    console.error(`Could not create initial administrator: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await client.end().catch((error) => {
      console.error(`Could not close the database connection: ${error.message}`);
      process.exitCode = 1;
    });
  }
}

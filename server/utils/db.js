import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { createHash } from "node:crypto";
import pg from "pg";

const { Pool } = pg;

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env") });

const databaseUrl = String(process.env.DATABASE_URL || "").trim();
const connectionConfig = databaseUrl
  ? { connectionString: databaseUrl }
  : {
      host: String(process.env.DB_HOST || "localhost"),
      port: Number(String(process.env.DB_PORT || "5432")),
      user: String(process.env.DB_USER || "postgres"),
      password: String(process.env.DB_PASS ?? ""),
      database: String(process.env.DB_NAME || "employees"),
      ssl: String(process.env.DB_SSL || "").toLowerCase() === "true"
        ? { rejectUnauthorized: false }
        : false,
    };

// pg's SCRAM authentication requires the password option to exist as a string.
// Do this after constructing the config because dotenv can represent an empty
// PostgreSQL password as undefined in some environments.
if (!connectionConfig.connectionString) {
  connectionConfig.password = typeof connectionConfig.password === "string"
    ? connectionConfig.password
    : "";
  if (!connectionConfig.password) {
    delete connectionConfig.password;
  }
}

const pool = new Pool(connectionConfig);
const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migrationDirectory = resolve(projectDirectory, "migrations");
const baselinePath = resolve(dirname(fileURLToPath(import.meta.url)), "postgres_schema.sql");
const migrationLockId = 648817230214;

const mysqlPlaceholdersToPostgres = (sql) => {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
};

const con = {
  query(sql, values, callback) {
    let params = values;
    let done = callback;

    if (typeof values === "function") {
      done = values;
      params = [];
    }

    const postgresSql = mysqlPlaceholdersToPostgres(sql)
      .replace(/\bNOW\(\)/gi, "CURRENT_TIMESTAMP")
      .replace(/\bIFNULL\s*\(/gi, "COALESCE(");

    const query = pool.query(postgresSql, params);
    if (typeof done === "function") {
      query.then((result) => {
        result.rows.affectedRows = result.rowCount;
        result.rows.insertId = result.rows[0]?.id;
        done(null, result.rows, result);
      }).catch(done);
      return;
    }
    return query.then((result) => result.rows);
  },
  async connect() {
    await pool.query("SELECT 1");
    console.log("PostgreSQL connected successfully");
  },
  async transaction(work) {
    const client = await pool.connect();
    let transactionStarted = false;
    try {
      await client.query("BEGIN");
      transactionStarted = true;
      const result = await work(client);
      await client.query("COMMIT");
      transactionStarted = false;
      return result;
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error("Database transaction rollback failed:", rollbackError);
        }
      }
      throw error;
    } finally {
      client.release();
    }
  },
  async migrate() {
    const client = await pool.connect();
    try {
      await client.query("SELECT pg_advisory_lock($1)", [migrationLockId]);
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          checksum TEXT NOT NULL,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const migrationFiles = fs.readdirSync(migrationDirectory)
        .filter((file) => /^\d+_[a-z0-9_-]+\.sql$/i.test(file))
        .sort();
      const files = [
        { version: "000_legacy_baseline", name: "postgres_schema.sql", path: baselinePath },
        ...migrationFiles.map((name) => ({
          version: name.replace(/\.sql$/i, ""),
          name,
          path: resolve(migrationDirectory, name),
        })),
      ];

      for (const migration of files) {
        const sql = fs.readFileSync(migration.path, "utf8");
        const checksum = createHash("sha256").update(sql).digest("hex");
        const applied = await client.query(
          "SELECT checksum FROM schema_migrations WHERE version = $1",
          [migration.version],
        );
        if (applied.rowCount) {
          if (applied.rows[0].checksum !== checksum) {
            throw new Error(
              `Applied migration ${migration.name} has changed; create a new migration instead of editing it.`,
            );
          }
          continue;
        }

        await client.query("BEGIN");
        try {
          await client.query(sql);
          await client.query(
            "INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)",
            [migration.version, migration.name, checksum],
          );
          await client.query("COMMIT");
          console.log(`Applied database migration ${migration.version}`);
        } catch (error) {
          await client.query("ROLLBACK");
          throw new Error(`Database migration ${migration.name} failed: ${error.message}`, { cause: error });
        }
      }
    } finally {
      try {
        await client.query("SELECT pg_advisory_unlock($1)", [migrationLockId]);
      } finally {
        client.release();
      }
    }
  },
  async end() {
    await pool.end();
  },
};

export default con;

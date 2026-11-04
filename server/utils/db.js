import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
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
    try {
      await pool.query("SELECT 1");
      if (process.env.AUTO_INIT_SCHEMA === "true") {
        const schemaPath = resolve(dirname(fileURLToPath(import.meta.url)), "postgres_schema.sql");
        await pool.query(fs.readFileSync(schemaPath, "utf8"));
      }
      console.log("PostgreSQL connected successfully");
    } catch (error) {
      console.error("PostgreSQL connection error:", error.message);
    }
  },
};

con.connect();
export default con;

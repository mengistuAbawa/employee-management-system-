import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env") });

const connectionConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASS || "",
      database: process.env.DB_NAME || "employees",
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
    };

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
      console.log("PostgreSQL connected successfully");
    } catch (error) {
      console.error("PostgreSQL connection error:", error.message);
    }
  },
};

con.connect();
export default con;

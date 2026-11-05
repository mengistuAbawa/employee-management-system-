import con from "../utils/db.js";

try {
  await con.connect();
  await con.migrate();
} catch (error) {
  console.error("Database migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await con.end().catch((error) => {
    console.error("Could not close the database connection:", error.message);
    process.exitCode = 1;
  });
}

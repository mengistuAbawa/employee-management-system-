import mysql from "mysql";
const con = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "employees",
});

con.connect(function (err) {
  if (!err) {
    console.log("MySQL connected successfully");
  } else {
    console.error("MySQL connection error:", err);
  }
});
export default con;

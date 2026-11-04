- [x] Diagnose why Admin → Attendance Control page not displaying (route exists; likely DB/schema issue).
- [x] Inspect attendance SQL + DB connection.
- [x] Fix: add `USE employees;` to `server/utils/add_attendance_table.sql` so attendance table is created in the same DB your app connects to.
- [ ] Re-run `server/utils/add_attendance_table.sql` (and/or `server/utils/init_database.sql`) in MySQL.
- [ ] Verify `GET http://localhost:3000/attendances` returns Status:true.
- [ ] Re-test UI: click “Attendance Control” in admin dashboard.


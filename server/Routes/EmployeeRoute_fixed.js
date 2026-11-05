import express from "express";
import con from "../utils/db.js";
import bcrypt from "bcrypt";
import multer from "multer";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { rateLimit } from "express-rate-limit";
import { authenticateRole, clearAuthCookie, setAuthCookie } from "../middleware/auth.js";
import { createEmployeeAccount } from "../services/accountService.js";
import { createLeaveRequest, isValidIsoDate } from "../services/leaveService.js";
import { acknowledgePerformanceReview } from "../services/performanceService.js";

const router = express.Router();
const organizationLocalTimeSql = `(CURRENT_TIMESTAMP AT TIME ZONE COALESCE(
  (SELECT setting_value #>> '{}' FROM organization_settings WHERE setting_key = 'timezone'),
  'UTC'
))`;
const organizationLocalDateSql = `(${organizationLocalTimeSql})::date`;
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { loginStatus: false, Error: "Too many sign-in attempts. Try again later." },
});
const verifyUser = authenticateRole("employee");

const requireOwnEmployeeRecord = (req, res, next) => {
  if (String(req.id) !== String(req.params.id)) {
    return res.status(403).json({ Status: false, Error: "You can only access your own employee record" });
  }
  next();
};

const imageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../public/images");
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(imageDirectory, { recursive: true });
    cb(null, imageDirectory);
  },
  filename: (req, file, cb) => {
    const extension = file.mimetype === "image/png" ? ".png"
      : file.mimetype === "image/webp" ? ".webp"
        : file.mimetype === "image/gif" ? ".gif" : ".jpg";
    cb(null, `profile_${randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype)) {
      return cb(new Error("Upload a JPEG, PNG, WebP, or GIF image"));
    }
    return cb(null, true);
  },
});
const uploadImage = (req, res, next) => {
  upload.single("image")(req, res, (error) => {
    if (error) return res.status(400).json({ Status: false, Error: error.message });
    next();
  });
};

router.post("/employee_login", loginLimiter, (req, res) => {
  if (
    typeof req.body?.email !== "string" ||
    !req.body.email.trim() ||
    typeof req.body?.password !== "string" ||
    !req.body.password
  ) {
    return res.status(400).json({ loginStatus: false, Error: "Email and password are required" });
  }
  const sql = `SELECT u.id AS user_id, u.email, u.password_hash, u.is_active,
                      e.id AS employee_id, e.approval_status, e.employment_status
               FROM users u
               JOIN employee e ON e.user_id = u.id
               WHERE LOWER(u.email) = LOWER(?) AND u.role = 'employee'`;
  con.query(sql, [req.body.email.trim()], (err, result) => {
    if (err)
      return res
        .status(500)
        .json({ loginStatus: false, Error: "Database error" });

    if (result.length > 0) {
      const employee = result[0];
      if (employee.employment_status === "departed") {
        return res.status(403).json({ loginStatus: false, Error: "This employee account is no longer active." });
      }
      if (employee.approval_status === "pending") {
        return res.status(403).json({ loginStatus: false, Error: "Your account is pending admin approval." });
      }
      if (employee.approval_status === "rejected") {
        return res.status(403).json({ loginStatus: false, Error: "Your account has been rejected by admin." });
      }
      if (!employee.is_active) {
        return res.status(403).json({ loginStatus: false, Error: "This employee account is inactive." });
      }
      bcrypt.compare(req.body.password, employee.password_hash, (err, response) => {
        if (err)
          return res.status(500).json({ loginStatus: false, Error: "Could not verify credentials" });

        if (response) {
          try {
            setAuthCookie(res, {
              userId: employee.user_id,
              profileId: employee.employee_id,
              role: "employee",
              email: employee.email,
            });
          } catch (sessionError) {
            console.error("Could not create employee session:", sessionError);
            return res.status(500).json({ loginStatus: false, Error: "Authentication service is unavailable" });
          }
          return res.json({ loginStatus: true, id: employee.employee_id });
        } else {
          return res.status(401).json({ loginStatus: false, Error: "Wrong email or password" });
        }
      });
    } else {
      return res.status(401).json({ loginStatus: false, Error: "Wrong email or password" });
    }
  });
});

// Employee self-registration (pending approval)
router.post("/register", loginLimiter, async (req, res) => {
  const { full_name, email, password, address, category_id, department_id } = req.body || {};
  if (
    typeof full_name !== "string" ||
    !full_name.trim() ||
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    !password ||
    !category_id ||
    !department_id
  ) {
    return res.status(400).json({ Status: false, Error: "Name, email, password, category, and department are required" });
  }
  if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({ Status: false, Error: "Password must be 12 to 72 bytes long" });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    await createEmployeeAccount({
      fullName: full_name,
      email,
      passwordHash,
      salary: null,
      address,
      categoryId: category_id,
      departmentId: department_id,
      approvalStatus: "pending",
    });
    return res.json({ Status: true, Message: "Registration successful. Awaiting admin approval." });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ Status: false, Error: "Email already exists" });
    }
    if (error.code === "23503") {
      return res.status(400).json({ Status: false, Error: "Selected category or department does not exist" });
    }
    console.error("Employee registration failed:", error);
    return res.status(500).json({ Status: false, Error: "Could not complete registration" });
  }
});

// Detail
router.get("/detail/:id", verifyUser, requireOwnEmployeeRecord, (req, res) => {
  const { id } = req.params;
  const sql = `SELECT e.*, d.name AS department_name
               FROM employee e
               LEFT JOIN department d ON d.id = e.department_id
               WHERE e.id = ?`;
  con.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ Status: false, Error: "Query Error" });
    }
    if (!result || result.length === 0) {
      return res.status(404).json({ Status: false, Error: "Employee not found" });
    }
    return res.json({ Status: true, Result: result[0] });
  });
});

// Leaves
router.get("/leaves/:id", verifyUser, requireOwnEmployeeRecord, (req, res) => {
  const { id } = req.params;
  const sql = `SELECT * FROM leaves WHERE employee_id = ? ORDER BY applied_date DESC`;
  con.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ Status: false, Error: "Query Error" });
    }
    return res.json({ Status: true, Result: result });
  });
});

router.post("/leaves", verifyUser, (req, res) => {
  const { leave_type, start_date, end_date, reason } = req.body || {};
  if (
    typeof leave_type !== "string" || !leave_type.trim() ||
    !isValidIsoDate(start_date) || !isValidIsoDate(end_date) ||
    end_date < start_date ||
    typeof reason !== "string" || !reason.trim() || reason.trim().length > 5000
  ) {
    return res.status(400).json({ Status: false, Error: "Provide a leave type, valid date range, and reason" });
  }
  createLeaveRequest({
    employeeId: req.id,
    leaveType: leave_type.trim(),
    startDate: start_date,
    endDate: end_date,
    reason: reason.trim(),
    actorUserId: req.userId,
  }).then((leave) => {
    return res.status(201).json({ Status: true, Result: leave, Message: "Leave applied successfully" });
  }).catch((error) => {
    if (error.code === "EMPLOYEE_NOT_ACTIVE") {
      return res.status(403).json({ Status: false, Error: "Only active, approved employees can request leave" });
    }
    if (error.code === "LEAVE_TYPE_NOT_FOUND") {
      return res.status(400).json({ Status: false, Error: "Selected leave type is not active" });
    }
    if (error.code === "LEAVE_PERIOD_OVERLAP") {
      return res.status(409).json({ Status: false, Error: error.message });
    }
    console.error("Leave application error:", error);
    return res.status(500).json({ Status: false, Error: "Could not submit leave application" });
  });
});

// Salary
router.get("/salary/:id", verifyUser, requireOwnEmployeeRecord, (req, res) => {
  const { id } = req.params;
  const sql = "SELECT salary FROM employee WHERE id = ?";
  con.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ Status: false, Error: "Query Error" });
    }
    if (!result || result.length === 0) {
      return res.status(404).json({ Status: false, Error: "Employee not found" });
    }
    return res.json({ Status: true, Salary: result[0].salary });
  });
});

router.get("/payroll/:id", verifyUser, requireOwnEmployeeRecord, async (req, res) => {
  try {
    const payroll = await con.query(`
      SELECT p.id, r.period_start, r.period_end, p.base_pay, p.overtime_pay,
             p.bonus, p.deductions, p.net_pay,
             COALESCE(p.currency_code, r.currency_code, 'USD') AS currency,
             r.finalized_at, ps.id AS payslip_id, ps.generated_at AS payslip_generated_at
      FROM payroll p
      JOIN payroll_runs r ON r.id = p.payroll_run_id
      LEFT JOIN payslips ps
        ON ps.payroll_id = p.id AND ps.employee_id = p.employee_id
      WHERE p.employee_id = $1 AND r.status = 'finalized'
      ORDER BY r.period_end DESC, p.id DESC
      LIMIT 36
    `, [req.id]);
    return res.json({ Status: true, Result: payroll });
  } catch (error) {
    console.error("Could not load employee payroll:", error);
    return res.status(500).json({ Status: false, Error: "Could not load payroll records" });
  }
});

router.get("/payroll/:id/payslips/:payslipId", verifyUser, requireOwnEmployeeRecord, async (req, res) => {
  const payslipId = Number(req.params.payslipId);
  if (!Number.isInteger(payslipId) || payslipId < 1) {
    return res.status(400).json({ Status: false, Error: "Invalid payslip ID" });
  }
  try {
    const records = await con.query(`
      SELECT ps.id AS payslip_id, ps.generated_at,
             e.id AS employee_id, e.full_name, e.email, d.name AS department_name,
             r.period_start, r.period_end, p.base_pay, p.overtime_pay,
             p.bonus, p.deductions, p.net_pay,
             COALESCE(p.currency_code, r.currency_code, 'USD') AS currency
      FROM payslips ps
      JOIN payroll p ON p.id = ps.payroll_id AND p.employee_id = ps.employee_id
      JOIN payroll_runs r ON r.id = p.payroll_run_id AND r.status = 'finalized'
      JOIN employee e ON e.id = ps.employee_id
      LEFT JOIN department d ON d.id = e.department_id
      WHERE ps.id = $1 AND ps.employee_id = $2
    `, [payslipId, req.id]);
    if (!records.length) return res.status(404).json({ Status: false, Error: "Payslip not found" });
    return res.json({ Status: true, Result: records[0] });
  } catch (error) {
    console.error("Could not load employee payslip:", error);
    return res.status(500).json({ Status: false, Error: "Could not load payslip" });
  }
});

router.get("/performance/:id", verifyUser, requireOwnEmployeeRecord, async (req, res) => {
  try {
    const reviews = await con.query(`
      SELECT r.id, r.period_start, r.period_end, r.rating, r.summary,
             r.status, r.submitted_at, r.acknowledged_at,
             COALESCE(
               jsonb_agg(jsonb_build_object(
                 'id', g.id,
                 'title', g.title,
                 'description', g.description,
                 'status', g.status,
                 'due_date', g.due_date
               ) ORDER BY g.id) FILTER (WHERE g.id IS NOT NULL),
               '[]'::jsonb
             ) AS goals
      FROM performance_reviews r
      LEFT JOIN performance_goals g ON g.review_id = r.id
      WHERE r.employee_id = $1 AND r.status IN ('submitted', 'acknowledged')
      GROUP BY r.id
      ORDER BY r.period_end DESC, r.id DESC
      LIMIT 100
    `, [req.id]);
    return res.json({ Status: true, Result: reviews });
  } catch (error) {
    console.error("Could not load employee performance reviews:", error);
    return res.status(500).json({ Status: false, Error: "Could not load performance reviews" });
  }
});

router.post("/performance/:id/reviews/:reviewId/acknowledge", verifyUser, requireOwnEmployeeRecord, async (req, res) => {
  const reviewId = Number(req.params.reviewId);
  if (!Number.isInteger(reviewId) || reviewId < 1) {
    return res.status(400).json({ Status: false, Error: "Invalid performance review ID" });
  }
  try {
    const result = await acknowledgePerformanceReview({
      reviewId,
      employeeId: req.id,
      employeeUserId: req.userId,
    });
    if (result.outcome === "not_found") return res.status(404).json({ Status: false, Error: "Performance review not found" });
    if (result.outcome === "not_submitted") return res.status(409).json({ Status: false, Error: "Only submitted reviews can be acknowledged" });
    if (result.outcome === "already_acknowledged") return res.status(409).json({ Status: false, Error: "This review has already been acknowledged" });
    return res.json({ Status: true, Result: result.review });
  } catch (error) {
    console.error("Could not acknowledge performance review:", error);
    return res.status(500).json({ Status: false, Error: "Could not acknowledge performance review" });
  }
});

router.get("/notifications/:id", verifyUser, requireOwnEmployeeRecord, async (req, res) => {
  const status = req.query.status || "all";
  if (!["all", "unread", "read"].includes(status)) {
    return res.status(400).json({ Status: false, Error: "Invalid notification filter" });
  }
  const condition = status === "unread" ? "AND read_at IS NULL"
    : status === "read" ? "AND read_at IS NOT NULL" : "";
  try {
    const notifications = await con.query(`
      SELECT id, notification_type, title, body, entity_type, entity_id, read_at, created_at
      FROM notifications
      WHERE user_id = $1 ${condition}
      ORDER BY created_at DESC, id DESC
      LIMIT 100
    `, [req.userId]);
    return res.json({ Status: true, Result: notifications });
  } catch (error) {
    console.error("Could not load employee notifications:", error);
    return res.status(500).json({ Status: false, Error: "Could not load notifications" });
  }
});

router.put("/notifications/:id/read-all", verifyUser, requireOwnEmployeeRecord, async (req, res) => {
  try {
    const result = await con.query(`
      UPDATE notifications
      SET read_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND read_at IS NULL
      RETURNING id
    `, [req.userId]);
    return res.json({ Status: true, updated: result.length });
  } catch (error) {
    console.error("Could not mark employee notifications as read:", error);
    return res.status(500).json({ Status: false, Error: "Could not update notifications" });
  }
});

router.put("/notifications/:id/:notificationId/read", verifyUser, requireOwnEmployeeRecord, async (req, res) => {
  const notificationId = Number(req.params.notificationId);
  if (!Number.isInteger(notificationId) || notificationId < 1) {
    return res.status(400).json({ Status: false, Error: "Invalid notification ID" });
  }
  try {
    const updated = await con.query(`
      UPDATE notifications
      SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
      WHERE id = $1 AND user_id = $2
      RETURNING id, read_at
    `, [notificationId, req.userId]);
    if (!updated.length) return res.status(404).json({ Status: false, Error: "Notification not found" });
    return res.json({ Status: true, Result: updated[0] });
  } catch (error) {
    console.error("Could not mark employee notification as read:", error);
    return res.status(500).json({ Status: false, Error: "Could not update notification" });
  }
});

// Update employee profile
router.put("/update/:id", verifyUser, requireOwnEmployeeRecord, async (req, res) => {
  const { id } = req.params;
  const { full_name, email, address, password } = req.body || {};

  const fields = [];
  const values = [];
  const identityFields = [];
  const identityValues = [];

  if (full_name !== undefined) {
    if (typeof full_name !== "string" || !full_name.trim()) {
      return res.status(400).json({ Status: false, Error: "Name cannot be empty" });
    }
    fields.push("full_name = $" + (values.length + 1));
    values.push(full_name.trim());
    identityFields.push("full_name = $" + (identityValues.length + 1));
    identityValues.push(full_name.trim());
  }
  if (email !== undefined) {
    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ Status: false, Error: "Email cannot be empty" });
    }
    fields.push("email = $" + (values.length + 1));
    values.push(email.trim().toLowerCase());
    identityFields.push("email = $" + (identityValues.length + 1));
    identityValues.push(email.trim().toLowerCase());
  }
  if (address !== undefined) {
    fields.push("address = $" + (values.length + 1));
    values.push(address);
  }

  if (fields.length === 0 && !password) {
    return res.status(400).json({ Status: false, Error: "No fields to update" });
  }
  if (password !== undefined) {
    if (typeof password !== "string" || password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({ Status: false, Error: "Password must be 12 to 72 bytes long" });
    }
  }
  try {
    let passwordHash;
    if (password) passwordHash = await bcrypt.hash(password, 12);
    if (passwordHash) {
      fields.push(`password = $${values.length + 1}`);
      values.push(passwordHash);
      identityFields.push(`password_hash = $${identityValues.length + 1}`);
      identityValues.push(passwordHash);
    }

    const updated = await con.transaction(async (client) => {
      const employeeValues = [...values, id];
      const result = await client.query(
        `UPDATE employee SET ${fields.join(", ")}
         WHERE id = $${employeeValues.length}
         RETURNING user_id`,
        employeeValues,
      );
      if (!result.rowCount) return false;
      if (identityFields.length) {
        await client.query(
          `UPDATE users SET ${identityFields.join(", ")} WHERE id = $${identityValues.length + 1}`,
          [...identityValues, result.rows[0].user_id],
        );
      }
      return true;
    });
    if (!updated) return res.status(404).json({ Status: false, Error: "Employee not found" });
    return res.json({ Status: true, Message: "Profile updated successfully" });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ Status: false, Error: "Email already exists" });
    }
    console.error("Employee profile update failed:", error);
    return res.status(500).json({ Status: false, Error: "Could not update profile" });
  }
});

// Logout
router.get("/logout", (req, res) => {
  clearAuthCookie(res);
  return res.json({ Status: true });
});

// Update profile image
router.put("/update_profile_image/:id", verifyUser, requireOwnEmployeeRecord, uploadImage, (req, res) => {
  const { id } = req.params;
  
  if (!req.file) {
    return res.json({ Status: false, Error: "No image file uploaded" });
  }

  const imageFilename = req.file.filename;

  const sql = "UPDATE employee SET image = ? WHERE id = ?";

  con.query(sql, [imageFilename, id], (err, result) => {
    if (err) {
      console.error("Error updating image:", err);
      return res.json({ Status: false, Error: "Error updating profile image" });
    }

    return res.json({ Status: true, Message: "Profile image updated successfully", image: imageFilename });
  });
});

router.get("/attendance", verifyUser, async (req, res) => {
  try {
    const [records, today] = await Promise.all([
      con.query(`
        SELECT id, employee_id, date, clock_in_time, clock_out_time,
               clock_in_at, clock_out_at, status, submitted_at
        FROM attendance
        WHERE employee_id = $1
        ORDER BY date DESC, submitted_at DESC
        LIMIT 90
      `, [req.id]),
      con.query(`SELECT ${organizationLocalDateSql}::text AS today`),
    ]);
    const todayDate = today[0].today;
    const todayAttendance = records.find((record) => String(record.date).slice(0, 10) === todayDate) ?? null;
    return res.json({
      Status: true,
      Result: records,
      Today: todayDate,
      TodayAttendance: todayAttendance,
    });
  } catch (error) {
    console.error("Attendance fetch error:", error);
    return res.status(500).json({ Status: false, Error: "Could not load attendance history" });
  }
});

router.post("/attendance", verifyUser, async (req, res) => {
  const { action } = req.body || {};
  if (!["clock_in", "clock_out"].includes(action)) {
    return res.status(400).json({ Status: false, Error: "Choose clock in or clock out" });
  }

  try {
    const result = action === "clock_in"
      ? await con.query(`
        INSERT INTO attendance
          (employee_id, date, clock_in_time, clock_in_at, status, submitted_at)
        SELECT $1, local_clock::date, local_clock::time(0), CURRENT_TIMESTAMP, 'pending', CURRENT_TIMESTAMP
        FROM (SELECT ${organizationLocalTimeSql} AS local_clock) configured
        ON CONFLICT (employee_id, date) DO NOTHING
        RETURNING id
      `, [req.id])
      : await con.query(`
        UPDATE attendance
        SET clock_out_time = configured.local_clock::time(0), clock_out_at = CURRENT_TIMESTAMP,
            status = 'pending', submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        FROM (SELECT ${organizationLocalTimeSql} AS local_clock) configured
        WHERE employee_id = $1 AND date = configured.local_clock::date
          AND clock_in_time IS NOT NULL AND clock_out_time IS NULL
        RETURNING id
      `, [req.id]);
    if (!result.length) {
      return res.status(409).json({
        Status: false,
        Error: action === "clock_in"
          ? "You have already clocked in today"
          : "Clock in first before clocking out, or you have already clocked out",
      });
    }
    return res.json({ Status: true, Message: "Attendance recorded successfully" });
  } catch (error) {
    console.error("Attendance recording error:", error);
    return res.status(500).json({ Status: false, Error: "Could not record attendance" });
  }
});

router.get("/dashboard-summary", verifyUser, async (req, res) => {
  try {
    const [
      profile,
      todayAttendance,
      attendanceHistory,
      leaveCounts,
      recentLeaves,
      leaveBalances,
      latestPayroll,
      announcements,
      notifications,
      reviews,
    ] = await Promise.all([
      con.query(`
        SELECT e.id, e.full_name, e.email, e.image, e.address,
               e.employment_status, e.approval_status,
               d.name AS department_name, c.name AS category_name
        FROM employee e
        LEFT JOIN department d ON d.id = e.department_id
        LEFT JOIN category c ON c.id = e.category_id
        WHERE e.id = $1
      `, [req.id]),
      con.query(`
        SELECT id, date, clock_in_time, clock_out_time, status
        FROM attendance
        WHERE employee_id = $1 AND date = ${organizationLocalDateSql}
        LIMIT 1
      `, [req.id]),
      con.query(`
        SELECT id, date, clock_in_time, clock_out_time, status
        FROM attendance
        WHERE employee_id = $1
        ORDER BY date DESC, submitted_at DESC
        LIMIT 5
      `, [req.id]),
      con.query(`
        SELECT COUNT(*) AS total,
               COUNT(*) FILTER (WHERE status = 'pending') AS pending,
               COUNT(*) FILTER (WHERE status = 'approved') AS approved,
               COUNT(*) FILTER (WHERE status = 'rejected') AS rejected
        FROM leaves
        WHERE employee_id = $1
      `, [req.id]),
      con.query(`
        SELECT id, leave_type, start_date, end_date, status, applied_date
        FROM leaves
        WHERE employee_id = $1
        ORDER BY applied_date DESC, id DESC
        LIMIT 5
      `, [req.id]),
      con.query(`
        SELECT t.name AS leave_type, b.entitled_days, b.used_days,
               GREATEST(b.entitled_days - b.used_days, 0) AS remaining_days
        FROM leave_balances b
        JOIN leave_types t ON t.id = b.leave_type_id
        WHERE b.employee_id = $1
          AND b.balance_year = EXTRACT(YEAR FROM ${organizationLocalDateSql})::smallint
        ORDER BY t.name
      `, [req.id]),
      con.query(`
        SELECT p.id, r.period_start, r.period_end, p.base_pay, p.overtime_pay,
               p.bonus, p.deductions, p.net_pay,
               COALESCE(p.currency_code, r.currency_code, 'USD') AS currency,
               r.finalized_at, ps.id AS payslip_id,
               ps.generated_at AS payslip_generated_at
        FROM payroll p
        JOIN payroll_runs r ON r.id = p.payroll_run_id
        LEFT JOIN payslips ps
          ON ps.payroll_id = p.id AND ps.employee_id = p.employee_id
        WHERE p.employee_id = $1 AND r.status = 'finalized'
        ORDER BY r.period_end DESC, p.id DESC
        LIMIT 1
      `, [req.id]),
      con.query(`
        SELECT a.id, a.title, a.body, a.published_at, a.expires_at
        FROM announcements a
        WHERE a.is_published = TRUE
          AND a.published_at <= CURRENT_TIMESTAMP
          AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)
          AND (
            NOT EXISTS (
              SELECT 1 FROM announcement_departments ad
              WHERE ad.announcement_id = a.id
            )
            OR EXISTS (
              SELECT 1 FROM announcement_departments ad
              JOIN employee e ON e.department_id = ad.department_id
              WHERE ad.announcement_id = a.id AND e.id = $1
            )
          )
        ORDER BY a.published_at DESC, a.id DESC
        LIMIT 5
      `, [req.id]),
      con.query(`
        SELECT id, title, body, notification_type, created_at
        FROM notifications
        WHERE user_id = $1 AND read_at IS NULL
        ORDER BY created_at DESC, id DESC
        LIMIT 5
      `, [req.userId]),
      con.query(`
        SELECT id, period_start, period_end, rating, summary, status, submitted_at
        FROM performance_reviews
        WHERE employee_id = $1 AND status IN ('submitted', 'acknowledged')
        ORDER BY period_end DESC, id DESC
        LIMIT 3
      `, [req.id]),
    ]);

    if (!profile.length) {
      return res.status(404).json({ Status: false, Error: "Employee profile not found" });
    }

    return res.json({
      Status: true,
      Result: {
        profile: profile[0],
        todayAttendance: todayAttendance[0] ?? null,
        attendanceHistory,
        leaveStats: leaveCounts[0] ?? { total: 0, pending: 0, approved: 0, rejected: 0 },
        recentLeaves,
        leaveBalances,
        latestPayroll: latestPayroll[0] ?? null,
        announcements,
        notifications,
        reviews,
      },
    });
  } catch (error) {
    console.error("Could not load employee dashboard summary:", error);
    return res.status(500).json({ Status: false, Error: "Could not load employee dashboard data" });
  }
});

export { router as EmployeeRouter };

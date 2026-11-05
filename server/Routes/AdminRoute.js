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
import { createAdminAccount, createEmployeeAccount } from "../services/accountService.js";
import {
  createLeaveRequest,
  deleteLeaveRequest,
  isValidIsoDate,
  reviewLeaveRequest,
} from "../services/leaveService.js";
import {
  createPayrollRun,
  deleteDraftPayrollRun,
  finalizePayrollRun,
  saveSalaryStructure,
  updatePayrollItem,
} from "../services/payrollService.js";
import {
  createPerformanceReview,
  deletePerformanceReviewDraft,
  submitPerformanceReview,
  updatePerformanceReviewDraft,
} from "../services/performanceService.js";
import {
  createAnnouncement,
  deleteDraftAnnouncement,
  sendAdminNotification,
  setAnnouncementPublished,
  updateAnnouncement,
} from "../services/communicationService.js";
import { getManagementReport } from "../services/reportService.js";

// Socket.io emitters (optional, only if server index exposes `io`)
import { emitEmployeeCountUpdated, emitPendingEmployeesUpdated } from "../socket/dashboardEmitter.js";


const router = express.Router();
const organizationLocalDateSql = `(
  CURRENT_TIMESTAMP AT TIME ZONE COALESCE(
    (SELECT setting_value #>> '{}' FROM organization_settings WHERE setting_key = 'timezone'),
    'UTC'
  )
)::date`;
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { loginStatus: false, Error: "Too many sign-in attempts. Try again later." },
});
//to check if admin is logged in or not
router.post("/adminlogin", loginLimiter, (req, res) => {
  if (
    typeof req.body?.email !== "string" ||
    !req.body.email.trim() ||
    typeof req.body?.password !== "string" ||
    !req.body.password
  ) {
    return res.status(400).json({ loginStatus: false, Error: "Email and password are required" });
  }
  const sql = `SELECT u.id AS user_id, u.email, u.password_hash, a.id AS admin_id
               FROM users u
               JOIN admin a ON a.user_id = u.id
               WHERE LOWER(u.email) = LOWER(?) AND u.role = 'admin' AND u.is_active = TRUE`;
  con.query(sql, [req.body.email.trim()], (err, result) => {
    if (err) {
      console.error("DB query error:", err);
      return res
        .status(500)
        .json({ loginStatus: false, Error: "Database error" });
    }

    if (result.length > 0) {
      bcrypt.compare(req.body.password, result[0].password_hash, (err, response) => {
        if (err)
          return res.status(500).json({ loginStatus: false, Error: "Comparison error" });

        if (response) {
          try {
            setAuthCookie(res, {
              userId: result[0].user_id,
              profileId: result[0].admin_id,
              role: "admin",
              email: result[0].email,
            });
          } catch (sessionError) {
            console.error("Could not create administrator session:", sessionError);
            return res.status(500).json({ loginStatus: false, Error: "Authentication service is unavailable" });
          }
          return res.json({ loginStatus: true, message: "Login successful" });
        } else {
          return res.status(401).json({ loginStatus: false, Error: "Invalid email or password" });
        }
      });
    } else {
      return res.status(401).json({ loginStatus: false, Error: "Invalid email or password" });
    }
  });
});

router.use((req, res, next) => {
  const employeeRoutePrefixes = [
    "/employee/detail/",
    "/employee/leaves/",
    "/employee/salary/",
    "/employee/payroll/",
    "/employee/performance/",
    "/employee/notifications/",
    "/employee/update/",
    "/employee/update_profile_image/",
  ];
  if (
    req.path === "/verify" ||
    req.path === "/employee/employee_login" ||
    req.path === "/employee/register" ||
    req.path === "/employee/logout" ||
    req.path === "/employee/dashboard-summary" ||
    (req.path === "/employee/leaves" && req.method === "POST") ||
    req.path === "/employee/attendance" ||
    employeeRoutePrefixes.some((prefix) => req.path.startsWith(prefix)) ||
    req.path === "/images" ||
    req.path.startsWith("/images/")
  ) {
    return next();
  }

  if (
    req.method === "GET" &&
    (req.path === "/category" || req.path === "/auth/department")
  ) {
    return next();
  }

  return authenticateRole("admin")(req, res, next);
});

// to add category use Post () method
router.post("/add_category", (req, res) => {
  const sql = `INSERT INTO category(name) VALUES(?)`;
  con.query(sql, [req.body.category], (err, result) => {
    if (err) return res.json({ Status: false, Error: err });
    return res.json({ Status: true, Message: "Category Added Successfully" });
  });
});
//to select from db nd display on the screen use GET() method 
router.get("/category", (req, res) => {
  const sql = `SELECT * FROM category`;
  con.query(sql, (err, result) => {
    if (err) {
      console.error("DB query error:", err);
      return res.status(500).json({ Status: false, Error: "Database error" });
    }
    return res.json({ Status: true, Result: result });
  });
});

// for deleting category
router.delete("/delete_category/:ID", (req, res) => {
  const id = req.params.ID;
  const sql = "DELETE FROM category WHERE ID = ?";
  con.query(sql, [id], (err, result) => {
    if (err) return res.json({ Status: false, Error: err });
    if (result.affectedRows === 0)
      return res.json({ Status: false, Error: "Category not found" });
    return res.json({ Status: true, Message: "Category Deleted Successfully" });
  });
});

// GET single category for edit
router.get("/category/:id", (req, res) => {
  const sql = "SELECT * FROM category WHERE ID = ?";
  con.query(sql, [req.params.id], (err, result) => {
    if (err) return res.json({ Status: false, Error: err });
    if (result.length === 0) return res.json({ Status: false, Error: "Category not found" });
    return res.json({ Status: true, Result: result });
  });
});

//for editing category PUT () use to update the rows or values
router.put("/edit_category/:ID", (req, res) => {
  const ID = req.params.ID;
  const { name } = req.body;

  const sql = "UPDATE category SET name = ? WHERE ID = ?";

  con.query(sql, [name, ID], (err, result) => {
    if (err) {
      return res.json({ Status: false, Error: "Query Error" });
    }

    return res.json({ Status: true });
  });
});

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
    cb(null, `image_${randomUUID()}${extension}`);
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

const normalizeOptionalId = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : Number.NaN;
};

const normalizeMoneyAmount = (value) => {
  const amount = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim()
      ? Number(value)
      : Number.NaN;
  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    amount > 9999999999.99 ||
    Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-7
  ) return null;
  return amount;
};

const payrollRunIdFrom = (value) => {
  const id = normalizeOptionalId(value);
  return id === null || Number.isNaN(id) ? null : id;
};

const normalizePerformanceRating = (value) => {
  if (value === undefined || value === null || (typeof value === "string" && !value.trim())) return null;
  if (typeof value !== "number" && typeof value !== "string") return Number.NaN;
  const rating = typeof value === "number" ? value : Number(value);
  if (
    !Number.isFinite(rating) ||
    rating < 0 ||
    rating > 5 ||
    Math.abs(rating * 100 - Math.round(rating * 100)) > 1e-7
  ) return Number.NaN;
  return rating;
};

const normalizePerformanceGoals = (goals) => {
  if (!Array.isArray(goals) || goals.length > 25) return null;
  const allowedStatuses = ["not_started", "in_progress", "completed", "cancelled"];
  const normalized = [];
  for (const goal of goals) {
    if (
      typeof goal?.title !== "string" ||
      !goal.title.trim() ||
      goal.title.trim().length > 255 ||
      (goal.description !== undefined && goal.description !== null &&
        (typeof goal.description !== "string" || goal.description.length > 2000)) ||
      (goal.due_date && !isValidIsoDate(goal.due_date)) ||
      (goal.status && !allowedStatuses.includes(goal.status))
    ) return null;
    normalized.push({
      title: goal.title.trim(),
      description: goal.description || "",
      status: goal.status || "not_started",
      due_date: goal.due_date || null,
    });
  }
  return normalized;
};

const normalizePerformanceSummary = (summary) => {
  if (summary === undefined || summary === null || summary === "") return "";
  if (typeof summary !== "string" || summary.length > 5000) return null;
  return summary.trim();
};

const normalizeDepartmentIds = (departmentIds) => {
  if (!Array.isArray(departmentIds) || departmentIds.length > 100) return null;
  const parsed = departmentIds.map((id) => normalizeOptionalId(id));
  if (parsed.some((id) => id === null || Number.isNaN(id)) || new Set(parsed).size !== parsed.length) {
    return null;
  }
  return parsed;
};

const normalizeCommunicationText = (value, maxLength) => {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && text.length <= maxLength ? text : null;
};

const normalizeExpiresAt = (value) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return Number.NaN;
  const expiresAt = new Date(value);
  if (expiresAt.getTime() <= Date.now()) return Number.NaN;
  return expiresAt.toISOString();
};

const getEmployees = (req, res, defaultStatus) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
  const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);
  const search = (req.query.search || "").trim();
  const status = ["active", "departed", "all"].includes(req.query.status)
    ? req.query.status
    : defaultStatus;
  const conditions = [];
  const params = [];
  if (status !== "all") {
    conditions.push("e.employment_status = ?");
    params.push(status);
  }
  if (search) {
    conditions.push("(LOWER(e.full_name) LIKE LOWER(?) OR LOWER(e.email) LIKE LOWER(?))");
    params.push(`%${search}%`, `%${search}%`);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const sqlCount = `SELECT COUNT(*) as total
                     FROM employee e
                     ${whereClause}`;

  const sql = `SELECT e.id, e.full_name, e.email, e.salary, e.address, e.image,
                      e.category_id, e.department_id, e.approval_status,
                      e.employment_status, e.created_at,
                      c.name as category_name, d.name as department_name,
                      e.position_id, p.title as position_name,
                      ed.reason as departure_reason, ed.departed_at
               FROM employee e
               LEFT JOIN category c ON e.category_id = c.id
               LEFT JOIN department d ON e.department_id = d.id
               LEFT JOIN positions p ON e.position_id = p.id
               LEFT JOIN employee_departures ed ON ed.employee_id = e.id
               ${whereClause}
               ORDER BY e.id DESC
               LIMIT ? OFFSET ?`;
  const sqlParams = [...params, limit, offset];

  con.query(sqlCount, params, (err, countResult) => {
    if (err) return res.status(500).json({ Status: false, Error: "Could not load employees" });

    con.query(sql, sqlParams, (err2, result) => {
      if (err2) return res.status(500).json({ Status: false, Error: "Could not load employees" });
      const total = countResult?.[0]?.total ?? 0;
      return res.json({
        Status: true,
        Result: result,
        Meta: { total, limit, offset },
      });
    });
  });
};

router.get("/employee", (req, res) => getEmployees(req, res, "active"));
router.get("/auth/employee", (req, res) => getEmployees(req, res, "active"));


// Get pending employees (supports pagination)
// Query params: limit, offset
router.get("/pending_employees", (req, res) => {
  const limit = Math.max(parseInt(req.query.limit || "20", 10), 1);
  const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);

  const sqlCount = `SELECT COUNT(*) as total
                     FROM employee e
                     WHERE e.approval_status = 'pending'
                       AND e.employment_status = 'active'`;

  const sql = `SELECT e.id, e.full_name, e.email, e.salary, e.address, e.image,
                      e.category_id, e.department_id, e.approval_status,
                      e.employment_status, e.created_at,
                      c.name as category_name, d.name as department_name,
                      e.position_id, p.title as position_name,
                      ed.reason as departure_reason, ed.departed_at
               FROM employee e 
               LEFT JOIN category c ON e.category_id = c.id
               LEFT JOIN department d ON e.department_id = d.id
               LEFT JOIN positions p ON e.position_id = p.id
               LEFT JOIN employee_departures ed ON ed.employee_id = e.id
               WHERE e.approval_status = 'pending' AND e.employment_status = 'active'
               ORDER BY e.id DESC
               LIMIT ? OFFSET ?`;

  con.query(sqlCount, (err, countResult) => {
    if (err) return res.json({ Status: false, Error: err });

    con.query(sql, [limit, offset], (err2, result) => {
      if (err2) return res.json({ Status: false, Error: err2 });
      const total = countResult?.[0]?.total ?? 0;
      return res.json({
        Status: true,
        Result: result,
        Meta: { total, limit, offset },
      });
    });
  });
});


// Approve employee
router.put("/employees/:id/approve", async (req, res) => {
  try {
    const updated = await con.transaction(async (client) => {
      const result = await client.query(
        `UPDATE employee SET approval_status = 'approved'
         WHERE id = $1 AND employment_status = 'active'
         RETURNING user_id`,
        [req.params.id],
      );
      if (!result.rowCount) return false;
      await client.query("UPDATE users SET is_active = TRUE WHERE id = $1", [result.rows[0].user_id]);
      return true;
    });
    if (!updated) return res.status(404).json({ Status: false, Error: "Employee not found or is no longer active" });
    // Broadcast live dashboard updates
    con.query(
      "SELECT count(id) as pending FROM employee WHERE approval_status = 'pending' AND employment_status = 'active'",
      (e2, r2) => {
        if (!e2) emitPendingEmployeesUpdated(r2?.[0]?.pending ?? 0);
      }
    );
    con.query("SELECT count(id) as employee FROM employee WHERE employment_status = 'active' AND approval_status = 'approved'", (e3, r3) => {
      if (!e3) emitEmployeeCountUpdated(r3?.[0]?.employee ?? 0);
    });
    return res.json({ Status: true, Message: "Employee approved successfully" });
  } catch (error) {
    console.error("Employee approval failed:", error);
    return res.status(500).json({ Status: false, Error: "Could not approve employee" });
  }
});


// Reject employee
router.put("/employees/:id/reject", async (req, res) => {
  try {
    const updated = await con.transaction(async (client) => {
      const result = await client.query(
        `UPDATE employee SET approval_status = 'rejected'
         WHERE id = $1 AND employment_status = 'active'
         RETURNING user_id`,
        [req.params.id],
      );
      if (!result.rowCount) return false;
      await client.query("UPDATE users SET is_active = FALSE WHERE id = $1", [result.rows[0].user_id]);
      return true;
    });
    if (!updated) return res.status(404).json({ Status: false, Error: "Employee not found or is no longer active" });
    return res.json({ Status: true, Message: "Employee rejected successfully" });
  } catch (error) {
    console.error("Employee rejection failed:", error);
    return res.status(500).json({ Status: false, Error: "Could not reject employee" });
  }
});

// Get pending employee count
router.get("/pending_employee_count", (req, res) => {
  const sql = "SELECT count(id) as pending FROM employee WHERE approval_status = 'pending' AND employment_status = 'active'";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: err });
    return res.json({ Status: true, Result: result });
  });
});

// Add employee with file upload
router.post("/add_employee", uploadImage, async (req, res) => {
  const { full_name, email, salary, address, category_id, department_id, position_id, password } = req.body || {};
  const positionId = normalizeOptionalId(position_id);
  const salaryAmount = normalizeMoneyAmount(salary);
  if (
    typeof full_name !== "string" ||
    !full_name.trim() ||
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    !password ||
    !Number.isInteger(Number(category_id)) ||
    Number(category_id) < 1 ||
    !Number.isInteger(Number(department_id)) ||
    Number(department_id) < 1 ||
    Number.isNaN(positionId)
  ) {
    return res.status(400).json({ Status: false, Error: "Name, email, password, category, and department are required" });
  }
  if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({ Status: false, Error: "Password must be 12 to 72 bytes long" });
  }
  if (salaryAmount === null) {
    return res.status(400).json({ Status: false, Error: "Salary must be a non-negative amount with at most two decimal places" });
  }

  try {
    if (positionId !== null) {
      const positions = await con.query(
        `SELECT id FROM positions
         WHERE id = $1 AND is_active = TRUE
           AND (department_id IS NULL OR department_id = $2)`,
        [positionId, department_id],
      );
      if (!positions.length) {
        return res.status(400).json({ Status: false, Error: "Choose an active position for the selected department" });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await createEmployeeAccount({
      fullName: full_name,
      email,
      passwordHash,
      salary: salaryAmount,
      address,
      image: req.file?.filename,
      categoryId: category_id,
      departmentId: department_id,
      positionId,
      approvalStatus: "approved",
      createdBy: req.userId,
    });
    return res.json({ Status: true, Message: "Employee added successfully" });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ Status: false, Error: "Email already exists" });
    }
    if (error.code === "23503") {
      return res.status(400).json({ Status: false, Error: "Selected category or department does not exist" });
    }
    console.error("Could not create employee account:", error);
    return res.status(500).json({ Status: false, Error: "Could not create employee account" });
  }
});

// to display the employee
router.get("/employee/:ID", (req, res) => {
  const sql = `SELECT e.id, e.full_name, e.email, e.salary, e.address, e.image,
                      e.category_id, e.department_id, e.position_id,
                      e.approval_status, e.employment_status, e.created_at,
                      c.name AS category_name, d.name AS department_name,
                      p.title AS position_name, ed.reason AS departure_reason,
                      ed.departed_at
               FROM employee e
               LEFT JOIN category c ON c.id = e.category_id
               LEFT JOIN department d ON d.id = e.department_id
               LEFT JOIN positions p ON p.id = e.position_id
               LEFT JOIN employee_departures ed ON ed.employee_id = e.id
               WHERE e.id = ?`;
  con.query(sql, [req.params.ID], (err, result) => {
    if (err) return res.status(500).json({ Status: false, Error: "Could not load employee" });
    if (result.length === 0) return res.status(404).json({ Status: false, Error: "Employee not found" });
    return res.json({ Status: true, Result: result });
  });
});
// to edit the employee
router.put("/edit_employee/:id", async (req, res) => {
  const id = req.params.id;
  const { full_name, email, salary, address, category_id, department_id, position_id } = req.body || {};
  const positionId = normalizeOptionalId(position_id);
  const salaryAmount = normalizeMoneyAmount(salary);
  if (
    typeof full_name !== "string" ||
    !full_name.trim() ||
    typeof email !== "string" ||
    !email.trim() ||
    !Number.isInteger(Number(category_id)) ||
    Number(category_id) < 1 ||
    !Number.isInteger(Number(department_id)) ||
    Number(department_id) < 1 ||
    Number.isNaN(positionId)
  ) {
    return res.status(400).json({ Status: false, Error: "Name, email, category, and department are required" });
  }
  if (salaryAmount === null) {
    return res.status(400).json({ Status: false, Error: "Salary must be a non-negative amount with at most two decimal places" });
  }

  try {
    if (position_id !== undefined && positionId !== null) {
      const positions = await con.query(
        `SELECT id FROM positions
         WHERE id = $1
           AND (is_active = TRUE OR id = (
             SELECT position_id FROM employee WHERE id = $3
           ))
           AND (department_id IS NULL OR department_id = $2)`,
        [positionId, department_id, id],
      );
      if (!positions.length) {
        return res.status(400).json({ Status: false, Error: "Choose a position for the selected department" });
      }
    }

    const result = await con.transaction(async (client) => {
      const currentEmployee = await client.query(
        "SELECT id, user_id, salary FROM employee WHERE id = $1 FOR UPDATE",
        [id],
      );
      if (!currentEmployee.rowCount) return false;
      const updated = await client.query(
        `UPDATE employee
         SET full_name = $1, email = $2, salary = $3, address = $4,
             category_id = $5, department_id = $6,
             position_id = CASE WHEN $7 THEN $8 ELSE position_id END
         WHERE id = $9
         RETURNING user_id`,
        [
          full_name.trim(),
          email.trim().toLowerCase(),
          salaryAmount,
          address,
          category_id,
          department_id,
          position_id !== undefined,
          positionId,
          id,
        ],
      );
      if (!updated.rowCount) return false;
      await client.query(
        "UPDATE users SET full_name = $1, email = $2 WHERE id = $3",
        [full_name.trim(), email.trim().toLowerCase(), updated.rows[0].user_id],
      );
      if (
        currentEmployee.rows[0].salary === null ||
        Number(currentEmployee.rows[0].salary) !== salaryAmount
      ) {
        await saveSalaryStructure(client, {
          employeeId: Number(id),
          baseSalary: salaryAmount,
          actorUserId: req.userId,
        });
        await client.query(`
          INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data)
          VALUES ($1, 'salary.updated', 'employee', $2, $3::jsonb, $4::jsonb)
        `, [
          req.userId,
          String(id),
          JSON.stringify({ salary: currentEmployee.rows[0].salary }),
          JSON.stringify({ salary: salaryAmount }),
        ]);
      }
      return true;
    });
    if (!result) return res.status(404).json({ Status: false, Error: "Employee not found" });
    return res.json({ Status: true, Message: "Employee Updated Successfully" });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ Status: false, Error: "Email already exists" });
    }
    console.error("Employee update failed:", error);
    return res.status(500).json({ Status: false, Error: "Could not update employee" });
  }
});

router.put("/update_salary/:id", async (req, res) => {
  const employeeId = normalizeOptionalId(req.params.id);
  const salary = normalizeMoneyAmount(req.body?.salary);
  if (employeeId === null || Number.isNaN(employeeId) || salary === null) {
    return res.status(400).json({ Status: false, Error: "Employee ID and a valid non-negative salary are required" });
  }
  try {
    const updated = await con.transaction(async (client) => {
      const employee = await client.query(
        "SELECT salary FROM employee WHERE id = $1 AND employment_status = 'active' FOR UPDATE",
        [employeeId],
      );
      if (!employee.rowCount) return { outcome: "not_found" };
      await client.query("UPDATE employee SET salary = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [salary, employeeId]);
      await saveSalaryStructure(client, { employeeId, baseSalary: salary, actorUserId: req.userId });
      await client.query(`
        INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data)
        VALUES ($1, 'salary.updated', 'employee', $2, $3::jsonb, $4::jsonb)
      `, [
        req.userId,
        String(employeeId),
        JSON.stringify({ salary: employee.rows[0].salary }),
        JSON.stringify({ salary }),
      ]);
      return { outcome: "updated" };
    });
    if (updated.outcome === "not_found") {
      return res.status(404).json({ Status: false, Error: "Active employee not found" });
    }
    return res.json({ Status: true, Message: "Salary and salary history updated" });
  } catch (error) {
    console.error("Salary update failed:", error);
    return res.status(500).json({ Status: false, Error: "Could not update salary" });
  }
});
const offboardEmployee = async (req, res) => {
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
  if (!reason) {
    return res.status(400).json({ Status: false, Error: "A departure reason is required" });
  }
  try {
    const result = await con.transaction(async (client) => {
      const employee = await client.query(
        `UPDATE employee SET employment_status = 'departed'
         WHERE id = $1 AND employment_status = 'active'
         RETURNING id, user_id`,
        [req.params.id],
      );
      if (!employee.rowCount) return false;
      await client.query("UPDATE users SET is_active = FALSE WHERE id = $1", [employee.rows[0].user_id]);
      await client.query(
        `INSERT INTO employee_departures (employee_id, reason, admin_id)
         VALUES ($1, $2, $3)`,
        [employee.rows[0].id, reason, req.id],
      );
      return true;
    });
    if (!result) {
      return res.status(409).json({ Status: false, Error: "Employee does not exist or is already departed" });
    }
    return res.json({ Status: true, Message: "Employee departure recorded; employment history retained" });
  } catch (error) {
    console.error("Employee offboarding failed:", error);
    return res.status(500).json({ Status: false, Error: "Could not record employee departure" });
  }
};
router.put("/employees/:id/offboard", offboardEmployee);
router.delete("/delete_employee/:id", offboardEmployee);

// 1. Get Admin Count
router.get("/admin_count", (req, res) => {
  const sql = "SELECT count(ID) as admin FROM admin";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: err });
    return res.json({ Status: true, Result: result });
  });
});

// 1.b Get Admin List
router.get("/admin", (req, res) => {
  const sql = "SELECT ID, full_name, email FROM admin";
  con.query(sql, (err, result) => {
    if (err) {
      console.error("DB query error:", err);
      return res.status(500).json({ Status: false, Error: "Database error" });
    }
    return res.json({ Status: true, Result: result });
  });
});

// Get single admin by ID
router.get("/admin/:ID", (req, res) => {
  const sql = "SELECT ID, full_name, email FROM admin WHERE ID = ?";
  con.query(sql, [req.params.ID], (err, result) => {
    if (err) return res.json({ Status: false, Error: err });
    if (result.length === 0)
      return res.json({ Status: false, Error: "Admin not found" });
    return res.json({ Status: true, Result: result[0] });
  });
});

// Edit admin
router.put("/edit_admin/:ID", async (req, res) => {
  const ID = req.params.ID;
  const { full_name, email } = req.body || {};
  if (
    typeof full_name !== "string" ||
    !full_name.trim() ||
    typeof email !== "string" ||
    !email.trim()
  ) {
    return res.status(400).json({ Status: false, Error: "Name and email are required" });
  }
  try {
    const updated = await con.transaction(async (client) => {
      const result = await client.query(
        "UPDATE admin SET full_name = $1, email = $2 WHERE id = $3 RETURNING user_id",
        [full_name.trim(), email.trim().toLowerCase(), ID],
      );
      if (!result.rowCount) return false;
      await client.query(
        "UPDATE users SET full_name = $1, email = $2 WHERE id = $3",
        [full_name.trim(), email.trim().toLowerCase(), result.rows[0].user_id],
      );
      return true;
    });
    if (!updated) return res.status(404).json({ Status: false, Error: "Admin not found" });
    return res.json({ Status: true, Message: "Admin updated successfully" });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ Status: false, Error: "Email already exists" });
    }
    console.error("Admin update failed:", error);
    return res.status(500).json({ Status: false, Error: "Could not update admin" });
  }
});

const addAdmin = async (req, res) => {
  const { full_name, email, password } = req.body || {};
  if (
    typeof full_name !== "string" ||
    !full_name.trim() ||
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    !password
  ) {
    return res.status(400).json({ Status: false, Error: "Name, email, and password are required" });
  }
  if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({ Status: false, Error: "Password must be 12 to 72 bytes long" });
  }
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    await createAdminAccount({ fullName: full_name, email, passwordHash });
    return res.json({ Status: true, Message: "Admin added successfully" });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ Status: false, Error: "Email already exists" });
    }
    console.error("Could not create admin account:", error);
    return res.status(500).json({ Status: false, Error: "Could not create admin account" });
  }
};

router.post("/add_admin", addAdmin);

// Delete admin
router.delete("/delete_admin/:ID", async (req, res) => {
  const ID = req.params.ID;
  try {
    const deleted = await con.transaction(async (client) => {
      const result = await client.query("DELETE FROM admin WHERE id = $1 RETURNING user_id", [ID]);
      if (!result.rowCount) return false;
      await client.query("UPDATE users SET is_active = FALSE WHERE id = $1", [result.rows[0].user_id]);
      return true;
    });
    if (!deleted) return res.status(404).json({ Status: false, Error: "Admin not found" });
    return res.json({ Status: true, Message: "Admin account deactivated successfully" });
  } catch (error) {
    console.error("Admin deactivation failed:", error);
    return res.status(500).json({ Status: false, Error: "Could not deactivate admin account" });
  }
});

// Logout - clear token cookie
router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  return res.json({ Status: true, Message: "Logged out" });
});

// 2. Get Employee Count
router.get("/employee_count", (req, res) => {
  const sql = "SELECT count(id) as employee FROM employee WHERE employment_status = 'active' AND approval_status = 'approved'";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: err });
    return res.json({ Status: true, Result: result });
  });
});

// 3. Get Total Salary
router.get("/total_salary", (req, res) => {
  const sql = `SELECT COALESCE(SUM(salary), 0) AS "sumOfSalary"
               FROM employee WHERE employment_status = 'active'`;
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: err });
    // We send result[0].sumOfSalary back to match your setTotalSalary(result.data.Salary)
    return res.json({ Status: true, Salary: Number(result[0].sumOfSalary) });
  });
});
// 4. Get Total Category
router.get("/total_category", (req, res) => {
  const sql = "SELECT COUNT(ID) as category FROM category";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: err });

    return res.json({ Status: true, Result: result });
  });
});
router.get("/dashboard/admin-profile", (req, res) => {
  // First try with image column
  const sqlWithImage = "SELECT id, full_name, email, image FROM admin WHERE id = ?";
  
  con.query(sqlWithImage, [req.id], (err, result) => {
    if (err) {
      console.log("Trying without image column:", err.code);
      // Try without image column (fallback for when column doesn't exist yet)
      const sqlWithoutImage = "SELECT id, full_name, email FROM admin WHERE id = ?";
      con.query(sqlWithoutImage, [req.id], (err2, result2) => {
        if (err2) {
          console.error("Database Error:", err2); 
          return res.json({ Status: false, Error: "Query Error" });
        }
        if (result2 && result2.length > 0) {
          return res.json({
            Status: true,
            id: result2[0].id,
            full_name: result2[0].full_name,
            email: result2[0].email,
            image: null,
          });
        } else {
          return res.json({ Status: false, Error: "No admin records found" });
        }
      });
    } else if (result && result.length > 0) {
      return res.json({
        Status: true,
        id: result[0].id,
        full_name: result[0].full_name,
        email: result[0].email,
        image: result[0].image || null,
      });
    } else {
      return res.json({ Status: false, Error: "No admin records found" });
    }
  });
});

router.put("/dashboard/admin-profile", async (req, res) => {
  const { full_name, email } = req.body || {};
  if (
    typeof full_name !== "string" ||
    !full_name.trim() ||
    typeof email !== "string" ||
    !email.trim()
  ) {
    return res.status(400).json({ Status: false, Error: "Name and email are required" });
  }
  try {
    const updated = await con.transaction(async (client) => {
      const result = await client.query(
        "UPDATE admin SET full_name = $1, email = $2 WHERE id = $3 RETURNING user_id",
        [full_name.trim(), email.trim().toLowerCase(), req.id],
      );
      if (!result.rowCount) return false;
      await client.query(
        "UPDATE users SET full_name = $1, email = $2 WHERE id = $3",
        [full_name.trim(), email.trim().toLowerCase(), result.rows[0].user_id],
      );
      return true;
    });
    if (!updated) return res.status(404).json({ Status: false, Error: "Admin profile not found" });
    return res.json({ Status: true, Message: "Profile updated successfully" });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ Status: false, Error: "Email already exists" });
    }
    console.error("Error updating admin profile:", error);
    return res.status(500).json({ Status: false, Error: "Could not update profile" });
  }
});

// Update admin profile image
const adminStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const imageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../public/images");
    fs.mkdirSync(imageDirectory, { recursive: true });
    cb(null, imageDirectory);
  },
  filename: (req, file, cb) => {
    const extension = file.mimetype === "image/png" ? ".png"
      : file.mimetype === "image/webp" ? ".webp"
        : file.mimetype === "image/gif" ? ".gif" : ".jpg";
    cb(null, `${file.fieldname}_${randomUUID()}${extension}`);
  },
});
const adminUpload = multer({
  storage: adminStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype)) {
      return cb(new Error("Upload a JPEG, PNG, WebP, or GIF image"));
    }
    return cb(null, true);
  },
});

const uploadAdminImage = (req, res, next) => {
  adminUpload.single("image")(req, res, (error) => {
    if (error) {
      return res.status(400).json({ Status: false, Error: error.message });
    }
    next();
  });
};

router.put("/update_profile_image", uploadAdminImage, (req, res) => {
  if (!req.file) {
    return res.json({ Status: false, Error: "No image file uploaded" });
  }

  const imageFilename = req.file.filename;
  
  con.query("UPDATE admin SET image = ? WHERE id = ?", [imageFilename, req.id], (err, result) => {
    if (err || result.affectedRows === 0) {
      console.error("Error updating admin image:", err || "Admin not found");
      return res.status(err ? 500 : 404).json({ Status: false, Error: "Could not update profile image" });
    }
    return res.json({ Status: true, Message: "Profile image updated successfully", image: imageFilename });
  });
});
router.get("/auth/admin/:id", (req, res) => {
  const id = req.params.id;
  const sql = "SELECT full_name, email FROM admin WHERE id = ?";

  con.query(sql, [id], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    if (result.length > 0) {
      return res.json({ Status: true, Result: result[0] });
    } else {
      return res.json({ Status: false, Error: "Admin not found" });
    }
  });
});

router.post("/auth/add_admin", addAdmin);

// ==================== DEPARTMENT MANAGEMENT ROUTES ====================

const addDepartment = (req, res) => {
  const name = req.body?.department;
  if (typeof name !== "string" || !name.trim() || name.trim().length > 100) {
    return res.status(400).json({ Status: false, Error: "Department name is required and must be 100 characters or fewer" });
  }
  con.query("INSERT INTO department(name) VALUES(?)", [name.trim()], (err) => {
    if (err?.code === "23505") {
      return res.status(409).json({ Status: false, Error: "A department with this name already exists" });
    }
    if (err) {
      console.error("Could not create department:", err);
      return res.status(500).json({ Status: false, Error: "Could not create department" });
    }
    return res.json({ Status: true, Message: "Department added successfully" });
  });
};

router.post("/add_department", addDepartment);
router.post("/auth/add_department", addDepartment);
//to select from db nd display on the screen use GET() method 
router.get("/auth/department", (req, res) => {
  const sql = `SELECT * FROM department`;
  con.query(sql, (err, result) => {
    if (err) {
      console.error("DB query error:", err);
      return res.status(500).json({ Status: false, Error: "Database error" });
    }
    return res.json({ Status: true, Result: result });
  });
});

router.delete("/auth/delete_department/:ID", async (req, res) => {
  try {
    const usage = await con.query(`
      SELECT
        EXISTS (SELECT 1 FROM employee WHERE department_id = $1) AS has_employees,
        EXISTS (SELECT 1 FROM positions WHERE department_id = $1) AS has_positions
    `, [req.params.ID]);
    if (usage[0]?.has_employees || usage[0]?.has_positions) {
      return res.status(409).json({
        Status: false,
        Error: "Reassign employees and positions before deleting this department",
      });
    }
    const deleted = await con.query("DELETE FROM department WHERE id = $1 RETURNING id", [req.params.ID]);
    if (!deleted.length) return res.status(404).json({ Status: false, Error: "Department not found" });
    return res.json({ Status: true, Message: "Department deleted successfully" });
  } catch (error) {
    console.error("Could not delete department:", error);
    return res.status(500).json({ Status: false, Error: "Could not delete department" });
  }
});

router.put("/auth/edit_department/:ID", (req, res) => {
  const name = req.body?.name;
  if (typeof name !== "string" || !name.trim() || name.trim().length > 100) {
    return res.status(400).json({ Status: false, Error: "Department name is required and must be 100 characters or fewer" });
  }
  con.query("UPDATE department SET name = ? WHERE id = ?", [name.trim(), req.params.ID], (err, result) => {
    if (err?.code === "23505") {
      return res.status(409).json({ Status: false, Error: "A department with this name already exists" });
    }
    if (err) {
      console.error("Could not update department:", err);
      return res.status(500).json({ Status: false, Error: "Could not update department" });
    }
    if (!result.affectedRows) return res.status(404).json({ Status: false, Error: "Department not found" });
    return res.json({ Status: true, Message: "Department updated successfully" });
  });
});

router.get("/positions", async (req, res) => {
  const conditions = [];
  const values = [];
  if (req.query.active === "true") conditions.push("p.is_active = TRUE");

  if (req.query.department_id !== undefined) {
    const departmentId = normalizeOptionalId(req.query.department_id);
    if (departmentId === null || Number.isNaN(departmentId)) {
      return res.status(400).json({ Status: false, Error: "A valid department is required" });
    }
    values.push(departmentId);
    conditions.push(`(p.department_id IS NULL OR p.department_id = $${values.length})`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  try {
    const positions = await con.query(`
      SELECT p.id, p.title, p.description, p.department_id, p.is_active,
             p.created_at, p.updated_at, d.name AS department_name,
             COUNT(e.id) AS employee_count
      FROM positions p
      LEFT JOIN department d ON d.id = p.department_id
      LEFT JOIN employee e
        ON e.position_id = p.id AND e.employment_status = 'active'
      ${whereClause}
      GROUP BY p.id, d.name
      ORDER BY p.is_active DESC, d.name NULLS FIRST, p.title
    `, values);
    return res.json({ Status: true, Result: positions });
  } catch (error) {
    console.error("Could not load positions:", error);
    return res.status(500).json({ Status: false, Error: "Could not load positions" });
  }
});

router.post("/positions", async (req, res) => {
  const { title, description } = req.body || {};
  const departmentId = normalizeOptionalId(req.body?.department_id);
  if (
    typeof title !== "string" ||
    !title.trim() ||
    title.trim().length > 150 ||
    (description !== undefined && typeof description !== "string") ||
    Number.isNaN(departmentId)
  ) {
    return res.status(400).json({ Status: false, Error: "A valid position title and department are required" });
  }

  try {
    const duplicate = await con.query(
      `SELECT id FROM positions
       WHERE LOWER(title) = LOWER($1)
         AND department_id IS NOT DISTINCT FROM $2`,
      [title.trim(), departmentId],
    );
    if (duplicate.length) {
      return res.status(409).json({ Status: false, Error: "This position already exists for the selected department" });
    }
    const created = await con.query(`
      INSERT INTO positions (title, description, department_id)
      VALUES ($1, $2, $3)
      RETURNING id, title, description, department_id, is_active, created_at
    `, [title.trim(), description?.trim() || null, departmentId]);
    return res.status(201).json({ Status: true, Result: created[0], Message: "Position created successfully" });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ Status: false, Error: "This position already exists for the selected department" });
    }
    if (error.code === "23503") {
      return res.status(400).json({ Status: false, Error: "Selected department does not exist" });
    }
    console.error("Could not create position:", error);
    return res.status(500).json({ Status: false, Error: "Could not create position" });
  }
});

router.put("/positions/:id", async (req, res) => {
  const { title, description, is_active } = req.body || {};
  const departmentId = normalizeOptionalId(req.body?.department_id);
  if (
    typeof title !== "string" ||
    !title.trim() ||
    title.trim().length > 150 ||
    (description !== undefined && typeof description !== "string") ||
    typeof is_active !== "boolean" ||
    Number.isNaN(departmentId)
  ) {
    return res.status(400).json({ Status: false, Error: "A valid position title, department, and active status are required" });
  }
  const positionId = Number(req.params.id);
  if (!Number.isInteger(positionId) || positionId < 1) {
    return res.status(400).json({ Status: false, Error: "A valid position ID is required" });
  }

  try {
    const duplicate = await con.query(
      `SELECT id FROM positions
       WHERE LOWER(title) = LOWER($1)
         AND department_id IS NOT DISTINCT FROM $2
         AND id <> $3`,
      [title.trim(), departmentId, positionId],
    );
    if (duplicate.length) {
      return res.status(409).json({ Status: false, Error: "This position already exists for the selected department" });
    }
    const departmentMismatch = await con.query(
      `SELECT COUNT(*) AS total
       FROM employee
       WHERE position_id = $1 AND employment_status = 'active'
         AND $2::integer IS NOT NULL
         AND department_id IS DISTINCT FROM $2::integer`,
      [positionId, departmentId],
    );
    if (Number(departmentMismatch[0]?.total || 0) > 0) {
      return res.status(409).json({
        Status: false,
        Error: "Reassign active employees before moving this position to another department",
      });
    }
    const updated = await con.query(`
      UPDATE positions
      SET title = $1, description = $2, department_id = $3,
          is_active = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING id
    `, [title.trim(), description?.trim() || null, departmentId, is_active, positionId]);
    if (!updated.length) return res.status(404).json({ Status: false, Error: "Position not found" });
    return res.json({ Status: true, Message: "Position updated successfully" });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ Status: false, Error: "This position already exists for the selected department" });
    }
    if (error.code === "23503") {
      return res.status(400).json({ Status: false, Error: "Selected department does not exist" });
    }
    console.error("Could not update position:", error);
    return res.status(500).json({ Status: false, Error: "Could not update position" });
  }
});

// ==================== LEAVE MANAGEMENT ROUTES ====================

router.get("/leaves", async (req, res) => {
  const limitValue = Number(req.query.limit ?? 100);
  const offsetValue = Number(req.query.offset ?? 0);
  const status = req.query.status;
  if (
    !Number.isInteger(limitValue) || limitValue < 1 ||
    !Number.isInteger(offsetValue) || offsetValue < 0 ||
    (status !== undefined && !["pending", "approved", "rejected"].includes(status))
  ) {
    return res.status(400).json({ Status: false, Error: "Invalid leave list filters" });
  }

  const conditions = [];
  const values = [];
  if (status) {
    values.push(status);
    conditions.push(`l.status = $${values.length}`);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = Math.min(limitValue, 100);
  try {
    const [leaves, count] = await Promise.all([
      con.query(`
        SELECT l.id, l.employee_id, l.leave_type, l.start_date, l.end_date,
               l.reason, l.status, l.applied_date, e.full_name AS employee_name
        FROM leaves l
        JOIN employee e ON e.id = l.employee_id
        ${whereClause}
        ORDER BY l.applied_date DESC NULLS LAST, l.id DESC
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}
      `, [...values, limit, offsetValue]),
      con.query(`
        SELECT COUNT(*) AS total
        FROM leaves l
        JOIN employee e ON e.id = l.employee_id
        ${whereClause}
      `, values),
    ]);
    return res.json({
      Status: true,
      Result: leaves,
      Meta: { total: Number(count[0]?.total || 0), limit, offset: offsetValue },
    });
  } catch (error) {
    console.error("Could not load leave requests:", error);
    return res.status(500).json({ Status: false, Error: "Could not load leave requests" });
  }
});

router.get("/leave_counts", async (req, res) => {
  try {
    const result = await con.query("SELECT status, COUNT(*) AS count FROM leaves GROUP BY status");
    const counts = { applied: 0, approved: 0, rejected: 0, pending: 0 };
    for (const row of result) {
      const count = Number(row.count);
      if (Object.hasOwn(counts, row.status)) counts[row.status] = count;
      counts.applied += count;
    }
    return res.json({ Status: true, Result: counts });
  } catch (error) {
    console.error("Could not load leave counts:", error);
    return res.status(500).json({ Status: false, Error: "Could not load leave counts" });
  }
});

router.post("/leaves", async (req, res) => {
  const { employee_id, leave_type, start_date, end_date, reason } = req.body || {};
  const employeeId = normalizeOptionalId(employee_id);
  if (
    employeeId === null || Number.isNaN(employeeId) ||
    typeof leave_type !== "string" || !leave_type.trim() ||
    !isValidIsoDate(start_date) || !isValidIsoDate(end_date) ||
    end_date < start_date ||
    typeof reason !== "string" || !reason.trim() || reason.trim().length > 5000
  ) {
    return res.status(400).json({ Status: false, Error: "Provide an employee, leave type, valid date range, and reason" });
  }
  try {
    const leave = await createLeaveRequest({
      employeeId,
      leaveType: leave_type.trim(),
      startDate: start_date,
      endDate: end_date,
      reason: reason.trim(),
      actorUserId: req.userId,
    });
    return res.status(201).json({ Status: true, Result: leave, Message: "Leave request added successfully" });
  } catch (error) {
    if (error.code === "EMPLOYEE_NOT_ACTIVE") {
      return res.status(400).json({ Status: false, Error: "Select an active, approved employee" });
    }
    if (error.code === "LEAVE_TYPE_NOT_FOUND") {
      return res.status(400).json({ Status: false, Error: "Selected leave type is not active" });
    }
    if (error.code === "LEAVE_PERIOD_OVERLAP") {
      return res.status(409).json({ Status: false, Error: error.message });
    }
    console.error("Admin leave request creation failed:", error);
    return res.status(500).json({ Status: false, Error: "Could not add leave request" });
  }
});

const handleLeaveReview = (status) => async (req, res) => {
  const leaveId = normalizeOptionalId(req.params.id);
  if (Number.isNaN(leaveId)) {
    return res.status(400).json({ Status: false, Error: "A valid leave request ID is required" });
  }
  try {
    const result = await reviewLeaveRequest({ leaveId, actorUserId: req.userId, status });
    if (result.outcome === "not_found") {
      return res.status(404).json({ Status: false, Error: "Leave request not found" });
    }
    if (result.outcome === "not_pending") {
      return res.status(409).json({ Status: false, Error: "Only pending leave requests can be reviewed" });
    }
    return res.json({ Status: true, Message: `Leave ${status}` });
  } catch (error) {
    console.error(`Could not set leave status to ${status}:`, error);
    return res.status(500).json({ Status: false, Error: "Could not review leave request" });
  }
};

router.put("/leaves/:id/approve", handleLeaveReview("approved"));
router.put("/leaves/:id/reject", handleLeaveReview("rejected"));

router.delete("/leaves/:id", async (req, res) => {
  const leaveId = normalizeOptionalId(req.params.id);
  if (Number.isNaN(leaveId)) {
    return res.status(400).json({ Status: false, Error: "A valid leave request ID is required" });
  }
  try {
    const result = await deleteLeaveRequest(leaveId, req.userId);
    if (result.outcome === "not_found") {
      return res.status(404).json({ Status: false, Error: "Leave request not found" });
    }
    if (result.outcome === "approved") {
      return res.status(409).json({ Status: false, Error: "Approved leave records cannot be deleted" });
    }
    return res.json({ Status: true, Message: "Leave request deleted successfully" });
  } catch (error) {
    console.error("Could not delete leave request:", error);
    return res.status(500).json({ Status: false, Error: "Could not delete leave request" });
  }
});

router.get("/leave-balances/:employeeId", async (req, res) => {
  const employeeId = normalizeOptionalId(req.params.employeeId);
  const year = req.query.year === undefined ? null : Number(req.query.year);
  if (
    employeeId === null || Number.isNaN(employeeId) ||
    (year !== null && (!Number.isInteger(year) || year < 1900 || year > 9999))
  ) {
    return res.status(400).json({ Status: false, Error: "A valid employee and balance year are required" });
  }
  try {
    const balances = await con.query(`
      SELECT t.id AS leave_type_id, t.name AS leave_type,
             COALESCE(b.entitled_days, 0) AS entitled_days,
             COALESCE(b.used_days, 0) AS used_days,
             GREATEST(COALESCE(b.entitled_days, 0) - COALESCE(b.used_days, 0), 0) AS remaining_days,
             COALESCE($2::smallint, EXTRACT(YEAR FROM ${organizationLocalDateSql})::smallint) AS balance_year
      FROM leave_types t
      LEFT JOIN leave_balances b
        ON b.leave_type_id = t.id AND b.employee_id = $1
          AND b.balance_year = COALESCE($2::smallint, EXTRACT(YEAR FROM ${organizationLocalDateSql})::smallint)
      WHERE t.is_active = TRUE
      ORDER BY t.name
    `, [employeeId, year]);
    return res.json({ Status: true, Result: balances });
  } catch (error) {
    console.error("Could not load employee leave balances:", error);
    return res.status(500).json({ Status: false, Error: "Could not load leave balances" });
  }
});

router.put("/leave-balances", async (req, res) => {
  const employeeId = normalizeOptionalId(req.body?.employee_id);
  const leaveTypeId = normalizeOptionalId(req.body?.leave_type_id);
  const year = Number(req.body?.balance_year);
  const rawEntitledDays = req.body?.entitled_days;
  const entitledDays = typeof rawEntitledDays === "number"
    ? rawEntitledDays
    : typeof rawEntitledDays === "string" && rawEntitledDays.trim()
      ? Number(rawEntitledDays)
      : Number.NaN;
  if (
    employeeId === null || Number.isNaN(employeeId) ||
    leaveTypeId === null || Number.isNaN(leaveTypeId) ||
    !Number.isInteger(year) || year < 1900 || year > 9999 ||
    !Number.isFinite(entitledDays) || entitledDays < 0 || entitledDays > 3660
  ) {
    return res.status(400).json({ Status: false, Error: "Provide a valid employee, leave type, year, and entitlement" });
  }

  try {
    const result = await con.transaction(async (client) => {
      const employee = await client.query(
        "SELECT id FROM employee WHERE id = $1 AND employment_status = 'active' AND approval_status = 'approved' FOR UPDATE",
        [employeeId],
      );
      if (!employee.rowCount) return { outcome: "employee_not_found" };
      const leaveType = await client.query(
        "SELECT id, name FROM leave_types WHERE id = $1 AND is_active = TRUE",
        [leaveTypeId],
      );
      if (!leaveType.rowCount) return { outcome: "leave_type_not_found" };
      const existing = await client.query(`
        SELECT entitled_days, used_days
        FROM leave_balances
        WHERE employee_id = $1 AND leave_type_id = $2 AND balance_year = $3
        FOR UPDATE
      `, [employeeId, leaveTypeId, year]);
      const currentBalance = existing.rows[0];
      const usedDays = Number(currentBalance?.used_days || 0);
      if (usedDays > entitledDays) return { outcome: "below_used_days", usedDays };
      const balance = await client.query(`
        INSERT INTO leave_balances (employee_id, leave_type_id, balance_year, entitled_days)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (employee_id, leave_type_id, balance_year)
        DO UPDATE SET entitled_days = EXCLUDED.entitled_days,
                      updated_at = CURRENT_TIMESTAMP
        RETURNING employee_id, leave_type_id, balance_year, entitled_days, used_days
      `, [employeeId, leaveTypeId, year, entitledDays]);
      await client.query(`
        INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data)
        VALUES ($1, 'leave.balance_updated', 'employee_leave_balance', $2, $3::jsonb, $4::jsonb)
      `, [
        req.userId,
        `${employeeId}:${leaveTypeId}:${year}`,
        currentBalance ? JSON.stringify(currentBalance) : null,
        JSON.stringify(balance.rows[0]),
      ]);
      return { outcome: "updated", balance: balance.rows[0], leaveType: leaveType.rows[0].name };
    });
    if (result.outcome === "employee_not_found") {
      return res.status(404).json({ Status: false, Error: "Active approved employee not found" });
    }
    if (result.outcome === "leave_type_not_found") {
      return res.status(404).json({ Status: false, Error: "Active leave type not found" });
    }
    if (result.outcome === "below_used_days") {
      return res.status(409).json({
        Status: false,
        Error: `Entitlement cannot be less than ${result.usedDays} already-used days`,
      });
    }
    return res.json({ Status: true, Result: result.balance, Message: "Leave entitlement updated" });
  } catch (error) {
    console.error("Could not update employee leave balance:", error);
    return res.status(500).json({ Status: false, Error: "Could not update leave balance" });
  }
});

// ==================== ATTENDANCE MANAGEMENT ROUTES ====================

router.get("/attendances", async (req, res) => {
  const limitValue = Number(req.query.limit ?? 50);
  const offsetValue = Number(req.query.offset ?? 0);
  const status = req.query.status;
  const date = req.query.date;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  if (
    !Number.isInteger(limitValue) || limitValue < 1 ||
    !Number.isSafeInteger(offsetValue) || offsetValue < 0 ||
    (status !== undefined && !["pending", "approved", "rejected"].includes(status)) ||
    (date !== undefined && !isValidIsoDate(date)) ||
    (req.query.search !== undefined && typeof req.query.search !== "string") ||
    search.length > 100
  ) {
    return res.status(400).json({ Status: false, Error: "Invalid attendance list filters" });
  }
  const conditions = [];
  const values = [];
  if (status) {
    values.push(status);
    conditions.push(`a.status = $${values.length}`);
  }
  if (date) {
    values.push(date);
    conditions.push(`a.date = $${values.length}::date`);
  }
  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(e.full_name ILIKE $${values.length} OR e.email ILIKE $${values.length})`);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = Math.min(limitValue, 100);
  try {
    const [records, count] = await Promise.all([
      con.query(`
        SELECT a.id, a.employee_id, a.date, a.clock_in_time, a.clock_out_time,
               a.clock_in_at, a.clock_out_at, a.status, a.submitted_at,
               e.full_name AS employee_name, e.email
        FROM attendance a
        JOIN employee e ON e.id = a.employee_id
        ${whereClause}
        ORDER BY a.date DESC, a.submitted_at DESC, a.id DESC
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}
      `, [...values, limit, offsetValue]),
      con.query(`
        SELECT COUNT(*) AS total
        FROM attendance a
        JOIN employee e ON e.id = a.employee_id
        ${whereClause}
      `, values),
    ]);
    return res.json({
      Status: true,
      Result: records,
      Meta: { total: Number(count[0]?.total || 0), limit, offset: offsetValue },
    });
  } catch (error) {
    console.error("Could not load attendance records:", error);
    return res.status(500).json({ Status: false, Error: "Could not load attendance records" });
  }
});

// Get pending attendance count
router.get("/pending_attendance_count", async (req, res) => {
  try {
    const result = await con.query("SELECT COUNT(id) AS pending FROM attendance WHERE status = 'pending'");
    return res.json({ Status: true, Result: result });
  } catch (error) {
    console.error("Could not load pending attendance count:", error);
    return res.status(500).json({ Status: false, Error: "Could not load pending attendance count" });
  }
});

const handleAttendanceReview = (status) => async (req, res) => {
  const attendanceId = normalizeOptionalId(req.params.id);
  if (Number.isNaN(attendanceId)) {
    return res.status(400).json({ Status: false, Error: "A valid attendance ID is required" });
  }
  try {
    const result = await con.transaction(async (client) => {
      const record = await client.query(
        "SELECT id, employee_id, date, status FROM attendance WHERE id = $1 FOR UPDATE",
        [attendanceId],
      );
      if (!record.rowCount) return { outcome: "not_found" };
      if (record.rows[0].status !== "pending") return { outcome: "not_pending" };
      const updated = await client.query(`
        UPDATE attendance
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND status = 'pending'
        RETURNING id
      `, [status, attendanceId]);
      if (!updated.rowCount) return { outcome: "not_pending" };
      await client.query(`
        INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data)
        VALUES ($1, $2, 'attendance', $3, $4::jsonb, $5::jsonb)
      `, [
        req.userId,
        `attendance.${status}`,
        String(attendanceId),
        JSON.stringify(record.rows[0]),
        JSON.stringify({ ...record.rows[0], status }),
      ]);
      return { outcome: "updated" };
    });
    if (result.outcome === "not_found") {
      return res.status(404).json({ Status: false, Error: "Attendance record not found" });
    }
    if (result.outcome === "not_pending") {
      return res.status(409).json({ Status: false, Error: "Only pending attendance can be reviewed" });
    }
    return res.json({ Status: true, Message: `Attendance ${status}` });
  } catch (error) {
    console.error(`Could not set attendance status to ${status}:`, error);
    return res.status(500).json({ Status: false, Error: "Could not review attendance" });
  }
};

router.put("/attendances/:id/approve", handleAttendanceReview("approved"));
router.put("/attendances/:id/reject", handleAttendanceReview("rejected"));

// Backward compatible alias for frontend which calls /auth/dashboard/admin-profile
router.get("/auth/dashboard/admin-profile", (req, res) => {
  // Forward to the actual route handler by directly invoking the DB logic
  // to avoid using internal express internals like router._router.handle.
  const sqlWithImage = "SELECT id, full_name, email, image FROM admin WHERE id = ?";

  con.query(sqlWithImage, [req.id], (err, result) => {
    if (err) {
      const sqlWithoutImage = "SELECT id, full_name, email FROM admin WHERE id = ?";
      con.query(sqlWithoutImage, [req.id], (err2, result2) => {
        if (err2) {
          console.error("Database Error:", err2);
          return res.json({ Status: false, Error: "Query Error" });
        }
        if (result2 && result2.length > 0) {
          return res.json({
            Status: true,
            id: result2[0].id,
            full_name: result2[0].full_name,
            email: result2[0].email,
            image: null,
          });
        }
        return res.json({ Status: false, Error: "No admin records found" });
      });
      return;
    }

    if (result && result.length > 0) {
      return res.json({
        Status: true,
        id: result[0].id,
        full_name: result[0].full_name,
        email: result[0].email,
        image: result[0].image || null,
      });
    }

    return res.json({ Status: false, Error: "No admin records found" });
  });
});

// ==================== HOME: DEPARTMENT DISTRIBUTION ====================
router.get("/departments_performance", (req, res) => {
  const sql = `
    SELECT d.id, d.name, COUNT(e.id) AS employee_count
    FROM department d
    LEFT JOIN employee e
      ON e.department_id = d.id AND e.employment_status = 'active'
    GROUP BY d.id, d.name
    ORDER BY d.id ASC
  `;

  con.query(sql, (err, rows) => {
    if (err) {
      console.error("departments_performance: departments query failed", err);
      return res.json({ Status: false, Error: "Database error" });
    }

    const result = (rows || []).map((department) => ({
      id: department.id,
      name: department.name,
      employee_count: Number(department.employee_count),
    }));

    const io = globalThis.io;
    if (io) io.emit("departmentPerformanceUpdated", { departments: result });

    return res.json({ Status: true, Result: result });
  });
});

router.get("/announcements", async (req, res) => {
  const limit = Number(req.query.limit ?? 100);
  const offset = Number(req.query.offset ?? 0);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0) {
    return res.status(400).json({ Status: false, Error: "Invalid pagination values" });
  }
  try {
    const [count, announcements] = await Promise.all([
      con.query("SELECT COUNT(*) AS total FROM announcements"),
      con.query(`
        SELECT a.id, a.title, a.body, a.expires_at, a.is_published,
               a.published_at, a.created_at, a.updated_at,
               u.full_name AS publisher_name,
               COALESCE(
                 jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name) ORDER BY d.name)
                   FILTER (WHERE d.id IS NOT NULL),
                 '[]'::jsonb
               ) AS departments
        FROM announcements a
        LEFT JOIN users u ON u.id = a.published_by
        LEFT JOIN announcement_departments ad ON ad.announcement_id = a.id
        LEFT JOIN department d ON d.id = ad.department_id
        GROUP BY a.id, u.full_name
        ORDER BY a.created_at DESC, a.id DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]),
    ]);
    return res.json({
      Status: true,
      Result: announcements,
      Meta: { total: Number(count[0].total), limit, offset },
    });
  } catch (error) {
    console.error("Could not load announcements:", error);
    return res.status(500).json({ Status: false, Error: "Could not load announcements" });
  }
});

router.post("/announcements", async (req, res) => {
  const title = normalizeCommunicationText(req.body?.title, 255);
  const body = normalizeCommunicationText(req.body?.body, 20000);
  const expiresAt = normalizeExpiresAt(req.body?.expires_at);
  const departmentIds = normalizeDepartmentIds(req.body?.department_ids ?? []);
  if (!title || !body || Number.isNaN(expiresAt) || departmentIds === null) {
    return res.status(400).json({ Status: false, Error: "Provide a title, message, future expiration (optional), and valid target departments" });
  }
  try {
    const result = await createAnnouncement({
      title,
      body,
      expiresAt,
      departmentIds,
      actorUserId: req.userId,
    });
    if (result.outcome === "invalid_departments") {
      return res.status(400).json({ Status: false, Error: "One or more selected departments do not exist" });
    }
    return res.status(201).json({ Status: true, Result: result.announcement });
  } catch (error) {
    console.error("Could not create announcement:", error);
    return res.status(500).json({ Status: false, Error: "Could not create announcement" });
  }
});

router.put("/announcements/:id", async (req, res) => {
  const announcementId = payrollRunIdFrom(req.params.id);
  const title = normalizeCommunicationText(req.body?.title, 255);
  const body = normalizeCommunicationText(req.body?.body, 20000);
  const expiresAt = normalizeExpiresAt(req.body?.expires_at);
  const departmentIds = normalizeDepartmentIds(req.body?.department_ids ?? []);
  if (announcementId === null || !title || !body || Number.isNaN(expiresAt) || departmentIds === null) {
    return res.status(400).json({ Status: false, Error: "Provide valid announcement content and target departments" });
  }
  try {
    const result = await updateAnnouncement({
      announcementId,
      title,
      body,
      expiresAt,
      departmentIds,
      actorUserId: req.userId,
    });
    if (result.outcome === "not_found") return res.status(404).json({ Status: false, Error: "Announcement not found" });
    if (result.outcome === "invalid_departments") return res.status(400).json({ Status: false, Error: "One or more selected departments do not exist" });
    return res.json({ Status: true, Result: result.announcement });
  } catch (error) {
    console.error("Could not update announcement:", error);
    return res.status(500).json({ Status: false, Error: "Could not update announcement" });
  }
});

router.post("/announcements/:id/publish", async (req, res) => {
  const announcementId = payrollRunIdFrom(req.params.id);
  if (announcementId === null || typeof req.body?.is_published !== "boolean") {
    return res.status(400).json({ Status: false, Error: "Provide a valid announcement ID and publish state" });
  }
  try {
    const result = await setAnnouncementPublished({
      announcementId,
      isPublished: req.body.is_published,
      actorUserId: req.userId,
    });
    if (result.outcome === "not_found") return res.status(404).json({ Status: false, Error: "Announcement not found" });
    if (result.outcome === "expired") return res.status(409).json({ Status: false, Error: "An expired announcement cannot be published" });
    return res.json({ Status: true, Result: result.announcement, notificationCount: result.notificationCount });
  } catch (error) {
    console.error("Could not change announcement publish state:", error);
    return res.status(500).json({ Status: false, Error: "Could not change announcement publish state" });
  }
});

router.delete("/announcements/:id", async (req, res) => {
  const announcementId = payrollRunIdFrom(req.params.id);
  if (announcementId === null) return res.status(400).json({ Status: false, Error: "Invalid announcement ID" });
  try {
    const result = await deleteDraftAnnouncement({ announcementId, actorUserId: req.userId });
    if (result.outcome === "not_found") return res.status(404).json({ Status: false, Error: "Announcement not found" });
    if (result.outcome === "published") return res.status(409).json({ Status: false, Error: "Unpublish an announcement before deleting it" });
    return res.json({ Status: true, Message: "Announcement draft deleted" });
  } catch (error) {
    console.error("Could not delete announcement:", error);
    return res.status(500).json({ Status: false, Error: "Could not delete announcement" });
  }
});

router.get("/notifications", async (req, res) => {
  const limit = Number(req.query.limit ?? 100);
  const offset = Number(req.query.offset ?? 0);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0) {
    return res.status(400).json({ Status: false, Error: "Invalid pagination values" });
  }
  try {
    const [count, notifications] = await Promise.all([
      con.query("SELECT COUNT(*) AS total FROM notifications"),
      con.query(`
        SELECT n.id, n.notification_type, n.title, n.body, n.entity_type,
               n.entity_id, n.read_at, n.created_at, u.full_name AS employee_name,
               u.email, d.name AS department_name
        FROM notifications n
        JOIN users u ON u.id = n.user_id
        LEFT JOIN employee e ON e.user_id = u.id
        LEFT JOIN department d ON d.id = e.department_id
        ORDER BY n.created_at DESC, n.id DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]),
    ]);
    return res.json({
      Status: true,
      Result: notifications,
      Meta: { total: Number(count[0].total), limit, offset },
    });
  } catch (error) {
    console.error("Could not load notifications:", error);
    return res.status(500).json({ Status: false, Error: "Could not load notifications" });
  }
});

router.post("/notifications", async (req, res) => {
  const audience = req.body?.audience;
  const title = normalizeCommunicationText(req.body?.title, 255);
  const body = normalizeCommunicationText(req.body?.body, 5000);
  const employeeId = audience === "employee" ? normalizeOptionalId(req.body?.employee_id) : null;
  const departmentId = audience === "department" ? normalizeOptionalId(req.body?.department_id) : null;
  if (
    !["all", "department", "employee"].includes(audience) ||
    !title || !body ||
    (audience === "employee" && (employeeId === null || Number.isNaN(employeeId))) ||
    (audience === "department" && (departmentId === null || Number.isNaN(departmentId)))
  ) {
    return res.status(400).json({ Status: false, Error: "Provide a valid audience, title, and message" });
  }
  try {
    const result = await sendAdminNotification({
      audience,
      employeeId,
      departmentId,
      title,
      body,
      actorUserId: req.userId,
    });
    if (result.outcome === "no_recipients") {
      return res.status(409).json({ Status: false, Error: "No active approved employees matched this audience" });
    }
    return res.status(201).json({ Status: true, Result: result });
  } catch (error) {
    console.error("Could not send admin notification:", error);
    return res.status(500).json({ Status: false, Error: "Could not send notification" });
  }
});

router.get("/performance/reviews", async (req, res) => {
  const requestedStatus = req.query.status;
  const allowedStatuses = ["draft", "submitted", "acknowledged"];
  if (requestedStatus && !allowedStatuses.includes(requestedStatus)) {
    return res.status(400).json({ Status: false, Error: "Invalid performance review status" });
  }
  const limit = Number(req.query.limit ?? 20);
  const offset = Number(req.query.offset ?? 0);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0) {
    return res.status(400).json({ Status: false, Error: "Invalid pagination values" });
  }

  const conditions = [];
  const values = [];
  if (requestedStatus) {
    values.push(requestedStatus);
    conditions.push(`r.status = $${values.length}`);
  }
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(e.full_name ILIKE $${values.length} OR e.email ILIKE $${values.length} OR d.name ILIKE $${values.length})`);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const countValues = [...values];
  const listValues = [...values, limit, offset];
  const limitParam = `$${values.length + 1}`;
  const offsetParam = `$${values.length + 2}`;

  try {
    const [count, reviews] = await Promise.all([
      con.query(`
        SELECT COUNT(*) AS total
        FROM performance_reviews r
        JOIN employee e ON e.id = r.employee_id
        LEFT JOIN department d ON d.id = e.department_id
        ${whereClause}
      `, countValues),
      con.query(`
        SELECT r.id, r.employee_id, e.full_name, e.email,
               d.name AS department_name, r.period_start, r.period_end,
               r.rating, r.summary, r.status, r.submitted_at, r.acknowledged_at,
               r.created_at, COUNT(g.id) AS goal_count
        FROM performance_reviews r
        JOIN employee e ON e.id = r.employee_id
        LEFT JOIN department d ON d.id = e.department_id
        LEFT JOIN performance_goals g ON g.review_id = r.id
        ${whereClause}
        GROUP BY r.id, e.id, d.name
        ORDER BY r.period_end DESC, r.id DESC
        LIMIT ${limitParam} OFFSET ${offsetParam}
      `, listValues),
    ]);
    return res.json({
      Status: true,
      Result: reviews,
      Meta: { total: Number(count[0].total), limit, offset },
    });
  } catch (error) {
    console.error("Could not load performance reviews:", error);
    return res.status(500).json({ Status: false, Error: "Could not load performance reviews" });
  }
});

router.get("/performance/reviews/:id", async (req, res) => {
  const reviewId = payrollRunIdFrom(req.params.id);
  if (reviewId === null) return res.status(400).json({ Status: false, Error: "Invalid performance review ID" });
  try {
    const reviews = await con.query(`
      SELECT r.id, r.employee_id, e.full_name, e.email, d.name AS department_name,
             r.reviewer_user_id, r.period_start, r.period_end, r.rating,
             r.summary, r.status, r.submitted_at, r.acknowledged_at,
             r.created_at, r.updated_at
      FROM performance_reviews r
      JOIN employee e ON e.id = r.employee_id
      LEFT JOIN department d ON d.id = e.department_id
      WHERE r.id = $1
    `, [reviewId]);
    if (!reviews.length) return res.status(404).json({ Status: false, Error: "Performance review not found" });
    const goals = await con.query(`
      SELECT id, title, description, status, due_date
      FROM performance_goals
      WHERE review_id = $1
      ORDER BY id
    `, [reviewId]);
    return res.json({ Status: true, Result: { ...reviews[0], goals } });
  } catch (error) {
    console.error("Could not load performance review:", error);
    return res.status(500).json({ Status: false, Error: "Could not load performance review" });
  }
});

router.post("/performance/reviews", async (req, res) => {
  const employeeId = normalizeOptionalId(req.body?.employee_id);
  const periodStart = req.body?.period_start;
  const periodEnd = req.body?.period_end;
  const rating = normalizePerformanceRating(req.body?.rating);
  const summary = normalizePerformanceSummary(req.body?.summary);
  const goals = normalizePerformanceGoals(req.body?.goals);
  if (
    employeeId === null || Number.isNaN(employeeId) ||
    !isValidIsoDate(periodStart) || !isValidIsoDate(periodEnd) || periodEnd < periodStart ||
    Number.isNaN(rating) || summary === null || goals === null
  ) {
    return res.status(400).json({ Status: false, Error: "Provide a valid employee, review period, optional rating from 0 to 5, summary, and up to 25 valid goals" });
  }
  try {
    const result = await createPerformanceReview({
      employeeId,
      reviewerUserId: req.userId,
      periodStart,
      periodEnd,
      rating,
      summary,
      goals,
    });
    if (result.outcome === "employee_not_found") return res.status(404).json({ Status: false, Error: "Active approved employee not found" });
    if (result.outcome === "duplicate_period") return res.status(409).json({ Status: false, Error: "A review already exists for this employee and period" });
    return res.status(201).json({ Status: true, Result: result.review });
  } catch (error) {
    console.error("Could not create performance review:", error);
    return res.status(500).json({ Status: false, Error: "Could not create performance review" });
  }
});

router.put("/performance/reviews/:id", async (req, res) => {
  const reviewId = payrollRunIdFrom(req.params.id);
  const rating = normalizePerformanceRating(req.body?.rating);
  const summary = normalizePerformanceSummary(req.body?.summary);
  const goals = normalizePerformanceGoals(req.body?.goals);
  if (
    reviewId === null || Number.isNaN(rating) || summary === null || goals === null
  ) {
    return res.status(400).json({ Status: false, Error: "Provide a valid review ID, optional rating from 0 to 5, summary, and up to 25 valid goals" });
  }
  try {
    const result = await updatePerformanceReviewDraft({
      reviewId,
      reviewerUserId: req.userId,
      rating,
      summary,
      goals,
    });
    if (result.outcome === "not_found") return res.status(404).json({ Status: false, Error: "Performance review not found" });
    if (result.outcome === "not_draft") return res.status(409).json({ Status: false, Error: "Only draft reviews can be edited" });
    return res.json({ Status: true, Result: result.review });
  } catch (error) {
    console.error("Could not update performance review:", error);
    return res.status(500).json({ Status: false, Error: "Could not update performance review" });
  }
});

router.post("/performance/reviews/:id/submit", async (req, res) => {
  const reviewId = payrollRunIdFrom(req.params.id);
  if (reviewId === null) return res.status(400).json({ Status: false, Error: "Invalid performance review ID" });
  try {
    const result = await submitPerformanceReview({ reviewId, reviewerUserId: req.userId });
    if (result.outcome === "not_found") return res.status(404).json({ Status: false, Error: "Performance review not found" });
    if (result.outcome === "not_draft") return res.status(409).json({ Status: false, Error: "Only draft reviews can be submitted" });
    if (result.outcome === "incomplete") return res.status(409).json({ Status: false, Error: "Add a rating and summary before submitting the review" });
    return res.json({ Status: true, Result: result.review });
  } catch (error) {
    console.error("Could not submit performance review:", error);
    return res.status(500).json({ Status: false, Error: "Could not submit performance review" });
  }
});

router.delete("/performance/reviews/:id", async (req, res) => {
  const reviewId = payrollRunIdFrom(req.params.id);
  if (reviewId === null) return res.status(400).json({ Status: false, Error: "Invalid performance review ID" });
  try {
    const result = await deletePerformanceReviewDraft({ reviewId, reviewerUserId: req.userId });
    if (result.outcome === "not_found") return res.status(404).json({ Status: false, Error: "Performance review not found" });
    if (result.outcome === "not_draft") return res.status(409).json({ Status: false, Error: "Only draft reviews can be deleted" });
    return res.json({ Status: true, Message: "Draft performance review deleted" });
  } catch (error) {
    console.error("Could not delete performance review:", error);
    return res.status(500).json({ Status: false, Error: "Could not delete performance review" });
  }
});

router.get("/payroll/runs", async (req, res) => {
  const requestedStatus = req.query.status;
  if (requestedStatus && !["draft", "finalized", "cancelled"].includes(requestedStatus)) {
    return res.status(400).json({ Status: false, Error: "Invalid payroll run status" });
  }
  const parsedLimit = Number(req.query.limit ?? 20);
  const parsedOffset = Number(req.query.offset ?? 0);
  if (
    !Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100 ||
    !Number.isInteger(parsedOffset) || parsedOffset < 0
  ) {
    return res.status(400).json({ Status: false, Error: "Invalid pagination values" });
  }
  const statusFilter = requestedStatus ? "WHERE r.status = $1" : "";
  const listParams = requestedStatus
    ? [requestedStatus, parsedLimit, parsedOffset]
    : [parsedLimit, parsedOffset];
  const limitParam = requestedStatus ? "$2" : "$1";
  const offsetParam = requestedStatus ? "$3" : "$2";
  try {
    const [count, runs] = await Promise.all([
      con.query(
        `SELECT COUNT(*) AS total FROM payroll_runs r ${statusFilter}`,
        requestedStatus ? [requestedStatus] : [],
      ),
      con.query(`
        SELECT r.id, r.period_start, r.period_end, r.status, r.currency_code,
               r.created_at, r.finalized_at, COUNT(p.id) AS employee_count,
               COALESCE(SUM(p.net_pay), 0) AS total_net_pay
        FROM payroll_runs r
        LEFT JOIN payroll p ON p.payroll_run_id = r.id
        ${statusFilter}
        GROUP BY r.id
        ORDER BY r.period_start DESC, r.id DESC
        LIMIT ${limitParam} OFFSET ${offsetParam}
      `, listParams),
    ]);
    return res.json({
      Status: true,
      Result: runs,
      Meta: { total: Number(count.rows[0].total), limit: parsedLimit, offset: parsedOffset },
    });
  } catch (error) {
    console.error("Could not load payroll runs:", error);
    return res.status(500).json({ Status: false, Error: "Could not load payroll runs" });
  }
});

router.get("/payroll/runs/:id", async (req, res) => {
  const runId = payrollRunIdFrom(req.params.id);
  if (runId === null) return res.status(400).json({ Status: false, Error: "Invalid payroll run ID" });
  try {
    const runs = await con.query(`
      SELECT id, period_start, period_end, status, currency_code,
             created_at, finalized_at, finalized_by
      FROM payroll_runs
      WHERE id = $1
    `, [runId]);
    if (!runs.length) return res.status(404).json({ Status: false, Error: "Payroll run not found" });
    const items = await con.query(`
      SELECT p.id, p.employee_id, e.full_name, e.email, d.name AS department_name,
             p.base_pay, p.overtime_pay, p.bonus, p.deductions, p.net_pay,
             p.currency_code, p.salary_structure_id
      FROM payroll p
      JOIN employee e ON e.id = p.employee_id
      LEFT JOIN department d ON d.id = e.department_id
      WHERE p.payroll_run_id = $1
      ORDER BY e.full_name, e.id
    `, [runId]);
    return res.json({ Status: true, Result: { ...runs[0], items } });
  } catch (error) {
    console.error("Could not load payroll run:", error);
    return res.status(500).json({ Status: false, Error: "Could not load payroll run" });
  }
});

router.post("/payroll/runs", async (req, res) => {
  const periodStart = req.body?.period_start;
  const periodEnd = req.body?.period_end;
  const currencyCode = String(req.body?.currency_code || "USD").trim().toUpperCase();
  if (
    !isValidIsoDate(periodStart) ||
    !isValidIsoDate(periodEnd) ||
    periodEnd < periodStart ||
    !/^[A-Z]{3}$/.test(currencyCode)
  ) {
    return res.status(400).json({ Status: false, Error: "Provide a valid full calendar-month period and three-letter currency code" });
  }
  try {
    const result = await createPayrollRun({
      periodStart,
      periodEnd,
      currencyCode,
      actorUserId: req.userId,
    });
    if (result.outcome === "invalid_period") {
      return res.status(400).json({ Status: false, Error: "Payroll periods must cover one full calendar month" });
    }
    if (result.outcome === "no_employees") {
      return res.status(409).json({ Status: false, Error: "There are no active approved employees for this period" });
    }
    if (result.outcome === "missing_salary") {
      return res.status(409).json({ Status: false, Error: "Every eligible employee must have salary defined for the period" });
    }
    if (result.outcome === "invalid_salary") {
      return res.status(409).json({ Status: false, Error: "An employee has an invalid salary amount" });
    }
    if (result.outcome === "currency_mismatch") {
      return res.status(409).json({ Status: false, Error: "Employee salary currencies must match the payroll run currency" });
    }
    return res.status(201).json({ Status: true, Result: result });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ Status: false, Error: "A payroll run already exists for this period" });
    }
    console.error("Could not create payroll run:", error);
    return res.status(500).json({ Status: false, Error: "Could not create payroll run" });
  }
});

router.put("/payroll/runs/:runId/items/:itemId", async (req, res) => {
  const runId = payrollRunIdFrom(req.params.runId);
  const itemId = payrollRunIdFrom(req.params.itemId);
  const values = {
    basePay: normalizeMoneyAmount(req.body?.base_pay),
    overtimePay: normalizeMoneyAmount(req.body?.overtime_pay),
    bonus: normalizeMoneyAmount(req.body?.bonus),
    deductions: normalizeMoneyAmount(req.body?.deductions),
  };
  if (runId === null || itemId === null || Object.values(values).some((amount) => amount === null)) {
    return res.status(400).json({ Status: false, Error: "Provide valid payroll item IDs and non-negative monetary amounts with at most two decimal places" });
  }
  try {
    const result = await updatePayrollItem({ runId, itemId, values, actorUserId: req.userId });
    if (result.outcome === "run_not_found") return res.status(404).json({ Status: false, Error: "Payroll run not found" });
    if (result.outcome === "item_not_found") return res.status(404).json({ Status: false, Error: "Payroll item not found" });
    if (result.outcome === "not_draft") return res.status(409).json({ Status: false, Error: "Finalized payroll items cannot be changed" });
    if (result.outcome === "negative_net_pay") return res.status(400).json({ Status: false, Error: "Deductions cannot exceed total pay" });
    if (result.outcome === "net_pay_limit_exceeded") return res.status(400).json({ Status: false, Error: "Calculated net pay exceeds the supported amount" });
    return res.json({ Status: true, Result: result.item });
  } catch (error) {
    console.error("Could not update payroll item:", error);
    return res.status(500).json({ Status: false, Error: "Could not update payroll item" });
  }
});

router.post("/payroll/runs/:id/finalize", async (req, res) => {
  const runId = payrollRunIdFrom(req.params.id);
  if (runId === null) return res.status(400).json({ Status: false, Error: "Invalid payroll run ID" });
  try {
    const result = await finalizePayrollRun({ runId, actorUserId: req.userId });
    if (result.outcome === "run_not_found") return res.status(404).json({ Status: false, Error: "Payroll run not found" });
    if (result.outcome === "not_draft") return res.status(409).json({ Status: false, Error: "Only draft payroll runs can be finalized" });
    if (result.outcome === "empty") return res.status(409).json({ Status: false, Error: "Add at least one employee before finalizing payroll" });
    if (result.outcome === "invalid_total") return res.status(409).json({ Status: false, Error: "Payroll contains an invalid net amount" });
    return res.json({ Status: true, Result: result });
  } catch (error) {
    console.error("Could not finalize payroll run:", error);
    return res.status(500).json({ Status: false, Error: "Could not finalize payroll run" });
  }
});

router.delete("/payroll/runs/:id", async (req, res) => {
  const runId = payrollRunIdFrom(req.params.id);
  if (runId === null) return res.status(400).json({ Status: false, Error: "Invalid payroll run ID" });
  try {
    const result = await deleteDraftPayrollRun({ runId, actorUserId: req.userId });
    if (result.outcome === "run_not_found") return res.status(404).json({ Status: false, Error: "Payroll run not found" });
    if (result.outcome === "not_draft") return res.status(409).json({ Status: false, Error: "Only draft payroll runs can be deleted" });
    return res.json({ Status: true, Message: "Draft payroll run deleted" });
  } catch (error) {
    console.error("Could not delete payroll run:", error);
    return res.status(500).json({ Status: false, Error: "Could not delete payroll run" });
  }
});

router.get("/reports/summary", async (req, res) => {
  const { from, to } = req.query;
  if (
    !isValidIsoDate(from) ||
    !isValidIsoDate(to) ||
    from > to ||
    (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86400000 > 365
  ) {
    return res.status(400).json({ Status: false, Error: "Provide valid dates in YYYY-MM-DD format; the report range cannot exceed 366 days" });
  }
  try {
    const report = await getManagementReport({ from, to });
    return res.json({ Status: true, Result: report });
  } catch (error) {
    console.error("Could not generate management report:", error);
    return res.status(500).json({ Status: false, Error: "Could not generate management report" });
  }
});

router.get("/dashboard/summary", async (req, res) => {
  try {
    const [
      admins,
      employees,
      categories,
      pendingEmployees,
      leaveRows,
      attendance,
      payroll,
      departments,
      recentEmployees,
      recentActivity,
      salaryCommitment,
    ] = await Promise.all([
      con.query("SELECT COUNT(*) AS total FROM admin"),
      con.query("SELECT COUNT(*) AS total FROM employee WHERE employment_status = 'active' AND approval_status = 'approved'"),
      con.query("SELECT COUNT(*) AS total FROM category"),
      con.query("SELECT COUNT(*) AS total FROM employee WHERE approval_status = 'pending' AND employment_status = 'active'"),
      con.query("SELECT status, COUNT(*) AS count FROM leaves GROUP BY status"),
      con.query(`
        WITH attendance_today AS (
          SELECT employee_id
          FROM attendance
          WHERE date = ${organizationLocalDateSql}
            AND clock_in_time IS NOT NULL
            AND status <> 'rejected'
        )
        SELECT
          (
            SELECT COUNT(*)
            FROM attendance_today today
            JOIN employee present_employee
              ON present_employee.id = today.employee_id
              AND present_employee.employment_status = 'active'
              AND present_employee.approval_status = 'approved'
          ) AS present,
          (
            SELECT COUNT(*)
            FROM employee e
            WHERE e.employment_status = 'active'
              AND e.approval_status = 'approved'
              AND NOT EXISTS (
                SELECT 1 FROM attendance_today today
                WHERE today.employee_id = e.id
              )
          ) AS absent
      `),
      con.query(`
        SELECT BTRIM(COALESCE(r.currency_code, p.currency_code, 'UNSPECIFIED')) AS currency,
               COALESCE(SUM(p.net_pay), 0) AS total
        FROM payroll p
        JOIN payroll_runs r ON r.id = p.payroll_run_id
        WHERE r.status = 'finalized'
          AND r.period_start >= DATE_TRUNC('month', ${organizationLocalDateSql})::date
          AND r.period_end <= (DATE_TRUNC('month', ${organizationLocalDateSql}) + INTERVAL '1 month - 1 day')::date
        GROUP BY BTRIM(COALESCE(r.currency_code, p.currency_code, 'UNSPECIFIED'))
        ORDER BY currency
      `),
      con.query(`
        SELECT d.id, d.name, COUNT(e.id) AS employee_count
        FROM department d
        LEFT JOIN employee e
          ON e.department_id = d.id
          AND e.employment_status = 'active'
          AND e.approval_status = 'approved'
        GROUP BY d.id, d.name
        ORDER BY employee_count DESC, d.name ASC
      `),
      con.query(`
        SELECT e.id, e.full_name, e.email, e.created_at, d.name AS department_name
        FROM employee e
        LEFT JOIN department d ON d.id = e.department_id
        ORDER BY e.created_at DESC, e.id DESC
        LIMIT 5
      `),
      con.query(`
        SELECT a.id, a.action, a.entity_type, a.entity_id, a.created_at,
               u.full_name AS actor_name
        FROM audit_logs a
        LEFT JOIN users u ON u.id = a.actor_user_id
        ORDER BY a.created_at DESC, a.id DESC
        LIMIT 8
      `),
      con.query(`
        SELECT BTRIM(COALESCE(current_salary.currency_code, 'UNSPECIFIED')) AS currency,
               COALESCE(SUM(COALESCE(current_salary.base_salary, e.salary, 0)), 0) AS total
        FROM employee e
        LEFT JOIN LATERAL (
          SELECT structure.base_salary, structure.currency_code
          FROM salary_structures structure
          WHERE structure.employee_id = e.id
            AND structure.effective_from <= ${organizationLocalDateSql}
            AND (structure.effective_to IS NULL OR structure.effective_to >= ${organizationLocalDateSql})
          ORDER BY structure.effective_from DESC, structure.id DESC
          LIMIT 1
        ) current_salary ON TRUE
        WHERE e.employment_status = 'active'
          AND e.approval_status = 'approved'
        GROUP BY BTRIM(COALESCE(current_salary.currency_code, 'UNSPECIFIED'))
        ORDER BY currency
      `),
    ]);

    const leaveStats = { applied: 0, approved: 0, rejected: 0, pending: 0 };
    for (const row of leaveRows) {
      const count = Number(row.count);
      if (Object.hasOwn(leaveStats, row.status)) leaveStats[row.status] = count;
      leaveStats.applied += count;
    }

    return res.json({
      Status: true,
      Result: {
        adminTotal: Number(admins[0]?.total ?? 0),
        employeeTotal: Number(employees[0]?.total ?? 0),
        totalCategory: Number(categories[0]?.total ?? 0),
        pendingTotal: Number(pendingEmployees[0]?.total ?? 0),
        leaveStats,
        attendance: {
          present: Number(attendance[0]?.present ?? 0),
          absent: Number(attendance[0]?.absent ?? 0),
        },
        payroll: {
          totals: payroll.map((row) => ({
            total: Number(row.total ?? 0),
            currency: String(row.currency ?? "UNSPECIFIED").trim(),
          })),
        },
        salaryCommitment: salaryCommitment.map((row) => ({
          total: Number(row.total ?? 0),
          currency: String(row.currency ?? "UNSPECIFIED").trim(),
        })),
        departments: departments.map((department) => ({
          id: department.id,
          name: department.name,
          employee_count: Number(department.employee_count),
        })),
        recentEmployees,
        recentActivity,
      },
    });
  } catch (error) {
    console.error("Could not load admin dashboard summary:", error);
    return res.status(500).json({ Status: false, Error: "Could not load dashboard data" });
  }
});

export { router as adminRouter };

import express from "express";
import con from "../utils/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";

// Socket.io emitters (optional, only if server index exposes `io`)
import { emitEmployeeCountUpdated, emitPendingEmployeesUpdated } from "../socket/dashboardEmitter.js";


const router = express.Router();
//to check if admin is logged in or not
router.post("/adminlogin", (req, res) => {
  const sql = `SELECT * FROM admin WHERE email = ?`;
  con.query(sql, [req.body.email], (err, result) => {
    if (err) {
      console.error("DB query error:", err);
      return res
        .status(500)
        .json({ loginStatus: false, Error: "Database error" });
    }

    if (result.length > 0) {
      bcrypt.compare(req.body.password, result[0].password, (err, response) => {
        if (err)
          return res.status(500).json({ loginStatus: false, Error: "Comparison error" });

        if (response) {
          if (!process.env.JWT_SECRET) {
            return res.status(500).json({
              loginStatus: false,
              Error: "Server misconfiguration: JWT_SECRET is missing",
            });
          }
          const email = result[0].email;
          const token = jwt.sign(
            { role: "admin", email: email, id: result[0].id },
            process.env.JWT_SECRET,
            { expiresIn: "1d" },
          );

          res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "strict",
          });
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

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/images"); // Ensure this folder exists!
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "_" + Date.now() + path.extname(file.originalname),
    );
  },
});
const upload = multer({ storage: storage });

// Employee Routes (supports pagination)
// Query params: limit, offset, search
router.get("/employee", (req, res) => {
  const limit = Math.max(parseInt(req.query.limit || "20", 10), 1);
  const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);
  const search = (req.query.search || "").trim();

  const whereClause = search
    ? "WHERE (e.full_name LIKE ? OR e.email LIKE ?)"
    : "";

  const sqlCount = `SELECT COUNT(*) as total
                     FROM employee e
                     ${whereClause}`;

  const sql = `SELECT e.*, c.name as category_name, d.name as department_name
               FROM employee e 
               JOIN category c ON e.category_id = c.id 
               LEFT JOIN department d ON e.department_id = d.id
               ${whereClause}
               ORDER BY e.id DESC
               LIMIT ? OFFSET ?`;

  const countParams = search ? [`%${search}%`, `%${search}%`] : [];
  const sqlParams = [...countParams, limit, offset];

  con.query(sqlCount, countParams, (err, countResult) => {
    if (err) return res.json({ Status: false, Error: err });

    con.query(sql, sqlParams, (err2, result) => {
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

// Alias for frontend pages that call /auth/employee (ex: Admin Leave page)
router.get("/auth/employee", (req, res) => {
  const limit = Math.max(parseInt(req.query.limit || "20", 10), 1);
  const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);
  const search = (req.query.search || "").trim();

  const whereClause = search
    ? "WHERE (e.full_name LIKE ? OR e.email LIKE ?)"
    : "";

  const sqlCount = `SELECT COUNT(*) as total
                     FROM employee e
                     ${whereClause}`;

  const sql = `SELECT e.*, c.name as category_name, d.name as department_name
               FROM employee e 
               JOIN category c ON e.category_id = c.id 
               LEFT JOIN department d ON e.department_id = d.id
               ${whereClause}
               ORDER BY e.id DESC
               LIMIT ? OFFSET ?`;

  const countParams = search ? [`%${search}%`, `%${search}%`] : [];
  const sqlParams = [...countParams, limit, offset];

  con.query(sqlCount, countParams, (err, countResult) => {
    if (err) return res.json({ Status: false, Error: err });

    con.query(sql, sqlParams, (err2, result) => {
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



// Get pending employees (supports pagination)
// Query params: limit, offset
router.get("/pending_employees", (req, res) => {
  const limit = Math.max(parseInt(req.query.limit || "20", 10), 1);
  const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);

  const sqlCount = `SELECT COUNT(*) as total
                     FROM employee e
                     WHERE e.approval_status = 'pending'`;

  const sql = `SELECT e.*, c.name as category_name, d.name as department_name
               FROM employee e 
               JOIN category c ON e.category_id = c.id 
               LEFT JOIN department d ON e.department_id = d.id
               WHERE e.approval_status = 'pending'
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
router.put("/employees/:id/approve", (req, res) => {
  const sql = "UPDATE employee SET approval_status = 'approved' WHERE id = ?";
  con.query(sql, [req.params.id], (err, result) => {
    if (err) return res.json({ Status: false, Error: err.message || String(err) });

    // Broadcast live dashboard updates
    con.query(
      "SELECT count(id) as pending FROM employee WHERE approval_status = 'pending'",
      (e2, r2) => {
        if (!e2) emitToDashboard("pendingEmployeesUpdated", { total: r2?.[0]?.pending ?? 0 });
      }
    );
    con.query("SELECT count(id) as employee FROM employee", (e3, r3) => {
      if (!e3) emitToDashboard("employeeCountUpdated", { total: r3?.[0]?.employee ?? 0 });
    });

    return res.json({ Status: true, Message: "Employee approved successfully" });
  });
});


// Reject employee
router.put("/employees/:id/reject", (req, res) => {
  const sql = "UPDATE employee SET approval_status = 'rejected' WHERE id = ?";
  con.query(sql, [req.params.id], (err, result) => {
    if (err) return res.json({ Status: false, Error: err.message || String(err) });
    return res.json({ Status: true, Message: "Employee rejected successfully" });
  });
});

// Get pending employee count
router.get("/pending_employee_count", (req, res) => {
  const sql = "SELECT count(id) as pending FROM employee WHERE approval_status = 'pending'";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: err });
    return res.json({ Status: true, Result: result });
  });
});

// Add employee with file upload
router.post("/add_employee", upload.single("image"), (req, res) => {
  const { full_name, email, salary, address, category_id, department_id, password } = req.body;
  if (!department_id) {
    return res.status(400).json({ Status: false, Error: "Department is required" });
  }

  bcrypt.hash(password || "defaultpassword", 10, (err, hash) => {
    if (err) return res.json({ Status: false, Error: "Hashing Error" });

    const sql = `INSERT INTO employee
                (full_name, email, password, salary, address, image, category_id, department_id, approval_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved')`;

    const values = [
      full_name,
      email,
      hash,
      salary,
      address,
      req.file ? req.file.filename : null,
      category_id,
      department_id,
    ];

    con.query(sql, values, (err, result) => {
      if (err) return res.json({ Status: false, Error: err.message });
      return res.json({ Status: true, Message: "Employee added successfully" });
    });
  });
});

// to display the employee
router.get("/employee/:ID", (req, res) => {
  const sql = "SELECT * FROM employee WHERE id = ?";
  con.query(sql, [req.params.ID], (err, result) => {
    if (err) return res.json({ Status: false, Error: err });
    return res.json({ Status: true, Result: result });
  });
});
// to edit the employee
router.put("/edit_employee/:id", (req, res) => {
  const id = req.params.id;
  const { full_name, email, salary, address, category_id, department_id } = req.body;
  if (!department_id) {
    return res.status(400).json({ Status: false, Error: "Department is required" });
  }

  const sql = `UPDATE employee 
               SET full_name = ?, email = ?, salary = ?, address = ?, category_id = ?, department_id = ?
               WHERE id = ?`;

  const values = [full_name, email, salary, address, category_id, department_id, id];

  con.query(sql, values, (err, result) => {
    if (err) {
      return res.json({ Status: false, Error: "Query Error: " + err });
    }
    return res.json({ Status: true, Message: "Employee Updated Successfully" });
  });
});

// Update only salary (dedicated endpoint for salary table updates)
router.put("/update_salary/:id", (req, res) => {
  const id = req.params.id;
  const { salary } = req.body;

  if (salary === undefined || salary === null) {
    return res.json({ Status: false, Error: "Salary is required" });
  }

  const sql = "UPDATE employee SET salary = ? WHERE id = ?";

  con.query(sql, [salary, id], (err, result) => {
    if (err) {
      return res.json({ Status: false, Error: "Query Error: " + err });
    }
    if (result.affectedRows === 0) {
      return res.json({ Status: false, Error: "Employee not found" });
    }
    return res.json({ Status: true, Message: "Salary Updated Successfully" });
  });
});
// Delete Employee Route
router.delete("/delete_employee/:id", (req, res) => {
  const id = req.params.id;
  const sql = "DELETE FROM employee WHERE id = ?";

  con.query(sql, [id], (err, result) => {
    if (err) {
      return res.json({ Status: false, Error: "Query Error: " + err });
    }
    if (result.affectedRows === 0) {
      return res.json({ Status: false, Error: "Employee not found" });
    }

    return res.json({ Status: true, Message: "Employee Deleted Successfully" });
  });
});

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
router.put("/edit_admin/:ID", (req, res) => {
  const ID = req.params.ID;
  const { full_name, email } = req.body;
  const sql = "UPDATE admin SET full_name = ?, email = ? WHERE ID = ?";
  con.query(sql, [full_name, email, ID], (err, result) => {
    if (err) return res.json({ Status: false, Error: err });
    return res.json({ Status: true, Message: "Admin updated successfully" });
  });
});

// Add admin
router.post("/add_admin", (req, res) => {
  const { full_name, email, password } = req.body;
  if (!full_name || !email || !password)
    return res.json({ Status: false, Error: "Missing fields" });

  // Hash password then insert
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.json({ Status: false, Error: "Hashing error" });

    const sql =
      "INSERT INTO admin (full_name, email, password) VALUES (?, ?, ?)";
    con.query(sql, [full_name, email, hash], (err2, result) => {
      if (err2) return res.json({ Status: false, Error: err2 });
      return res.json({ Status: true, Message: "Admin added successfully" });
    });
  });
});

// Delete admin
router.delete("/delete_admin/:ID", (req, res) => {
  const ID = req.params.ID;
  const sql = "DELETE FROM admin WHERE ID = ?";
  con.query(sql, [ID], (err, result) => {
    if (err) return res.json({ Status: false, Error: err });
    if (result.affectedRows === 0)
      return res.json({ Status: false, Error: "Admin not found" });
    return res.json({ Status: true, Message: "Admin deleted successfully" });
  });
});

// Logout - clear token cookie
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false,
    sameSite: "strict",
  });
  return res.json({ Status: true, Message: "Logged out" });
});

// 2. Get Employee Count
router.get("/employee_count", (req, res) => {
  const sql = "SELECT count(id) as employee FROM employee";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: err });
    return res.json({ Status: true, Result: result });
  });
});

// 3. Get Total Salary
router.get("/total_salary", (req, res) => {
  // Note: Use 'SUM' to add up the salary column
  const sql = "SELECT sum(salary) as sumOfSalary FROM employee";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: err });
    // We send result[0].sumOfSalary back to match your setTotalSalary(result.data.Salary)
    return res.json({ Status: true, Salary: result[0].sumOfSalary });
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
  const sqlWithImage = "SELECT full_name, email, image FROM admin LIMIT 1";
  
  con.query(sqlWithImage, (err, result) => {
    if (err) {
      console.log("Trying without image column:", err.code);
      // Try without image column (fallback for when column doesn't exist yet)
      const sqlWithoutImage = "SELECT full_name, email FROM admin LIMIT 1";
      con.query(sqlWithoutImage, (err2, result2) => {
        if (err2) {
          console.error("Database Error:", err2); 
          return res.json({ Status: false, Error: "Query Error" });
        }
        if (result2 && result2.length > 0) {
          return res.json({
            Status: true,
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
        full_name: result[0].full_name,
        email: result[0].email,
        image: result[0].image || null,
      });
    } else {
      return res.json({ Status: false, Error: "No admin records found" });
    }
  });
});

// Update admin profile image
const adminStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/images");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "_" + Date.now() + path.extname(file.originalname),
    );
  },
});
const adminUpload = multer({ storage: adminStorage });

router.put("/update_profile_image", adminUpload.single("image"), (req, res) => {
  if (!req.file) {
    return res.json({ Status: false, Error: "No image file uploaded" });
  }

  const imageFilename = req.file.filename;
  
  // Get the first/admin user ID and update their image
  const sqlGetId = "SELECT MIN(id) as min_id FROM admin";
  
  con.query(sqlGetId, (err, result) => {
    if (err) {
      console.error("Error getting admin ID:", err);
      return res.json({ Status: false, Error: "Error getting admin info" });
    }
    
    const adminId = result[0].min_id;
    
    // Now update the image for that admin
    const sqlUpdate = "UPDATE admin SET image = ? WHERE id = ?";
    
    con.query(sqlUpdate, [imageFilename, adminId], (err2, result2) => {
      if (err2) {
        console.error("Error updating image:", err2);
        return res.json({ Status: false, Error: "Error updating profile image" });
      }
      
      return res.json({ Status: true, Message: "Profile image updated successfully", image: imageFilename });
    });
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

router.post("/auth/add_admin", (req, res) => {
  const { full_name, email, password } = req.body;

  // 1. Hash the password
  const saltRounds = 10;
  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) return res.json({ Status: false, Error: "Hashing Error" });

    // 2. Insert into database
    const sql =
      "INSERT INTO admin (full_name, email, password) VALUES (?, ?, ?)";
    const values = [full_name, email, hash];

    con.query(sql, values, (err, result) => {
      if (err) {
        // Handle duplicate email error
        if (err.code === "ER_DUP_ENTRY") {
          return res.json({ Status: false, Error: "Email already exists" });
        }
        return res.json({ Status: false, Error: "Query Error" });
      }
      return res.json({ Status: true });
    });
  });
});

// ==================== DEPARTMENT MANAGEMENT ROUTES ====================

// to add department use Post () method
// NOTE: Frontend calls POST /add_department (no /auth). Keep /auth/add_department and also support /add_department.
router.post("/add_department", (req, res) => {
  const sql = `INSERT INTO department(name) VALUES(?)`;
  con.query(sql, [req.body.department], (err, result) => {
    if (err) return res.json({ Status: false, Error: err });
    return res.json({ Status: true, Message: "Department Added Successfully" });
  });
});

router.post("/auth/add_department", (req, res) => {
  const sql = `INSERT INTO department(name) VALUES(?)`;
  con.query(sql, [req.body.department], (err, result) => {
    if (err) return res.json({ Status: false, Error: err });
    return res.json({ Status: true, Message: "Department Added Successfully" });
  });
});
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

// for deleting department
router.delete("/auth/delete_department/:ID", (req, res) => {
  const id = req.params.ID;
  const sql = "DELETE FROM department WHERE id = ?";
  con.query(sql, [id], (err, result) => {
    if (err) return res.json({ Status: false, Error: err });
    if (result.affectedRows === 0)
      return res.json({ Status: false, Error: "Department not found" });
    return res.json({ Status: true, Message: "Department Deleted Successfully" });
  });
});

//for editing department PUT () use to update the rows or values
router.put("/auth/edit_department/:ID", (req, res) => {
  const ID = req.params.ID;
  const { name } = req.body;

  const sql = "UPDATE department SET name = ? WHERE id = ?";

  con.query(sql, [name, ID], (err, result) => {
    if (err) {
      return res.json({ Status: false, Error: "Query Error" });
    }

    return res.json({ Status: true });
  });
});

// ==================== LEAVE MANAGEMENT ROUTES ====================

// Get all leaves with employee details
router.get("/leaves", (req, res) => {
  const sql = `SELECT l.*, e.full_name as employee_name 
               FROM leaves l 
               JOIN employee e ON l.employee_id = e.id 
               ORDER BY l.applied_date DESC`;
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: err });
    return res.json({ Status: true, Result: result });
  });
});

// Get leave counts by status
router.get("/leave_counts", (req, res) => {
  const sql = `SELECT status, COUNT(*) as count FROM leaves GROUP BY status`;
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: err });
    const counts = { applied: 0, approved: 0, rejected: 0, pending: 0 };
    result.forEach(row => {
      if (counts.hasOwnProperty(row.status)) {
        counts[row.status] = row.count;
      }
    });
    counts.applied = result.reduce((sum, row) => sum + row.count, 0);
    
    return res.json({ Status: true, Result: counts });
  });
});

// Get all leaves with employee details (supports pagination)
// Query params: limit, offset
router.get("/leaves", (req, res) => {
  const limit = Math.max(parseInt(req.query.limit || "20", 10), 1);
  const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);

  const sqlCount = `SELECT COUNT(*) as total
                     FROM leaves l
                     JOIN employee e ON l.employee_id = e.id`;

  const sql = `SELECT l.*, e.full_name as employee_name 
               FROM leaves l 
               JOIN employee e ON l.employee_id = e.id 
               ORDER BY l.applied_date DESC
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

// Add new leave
router.post("/leaves", (req, res) => {
  const { employee_id, leave_type, start_date, end_date, reason } = req.body;
  if (!employee_id || !leave_type || !start_date || !end_date || !reason?.trim()) {
    return res.status(400).json({ Status: false, Error: "All leave fields are required" });
  }
  if (new Date(end_date) < new Date(start_date)) {
    return res.status(400).json({ Status: false, Error: "End date cannot be before start date" });
  }
  const sql = `INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason, status, applied_date) 
               VALUES (?, ?, ?, ?, ?, 'pending', NOW())`;
  con.query(sql, [employee_id, leave_type, start_date, end_date, reason], (err, result) => {
    if (err) return res.json({ Status: false, Error: err.message || String(err) });
    return res.json({ Status: true, Message: "Leave applied successfully" });
  });
});


// Approve leave
router.put("/leaves/:id/approve", (req, res) => {
  const sql = "UPDATE leaves SET status = 'approved' WHERE id = ?";
  con.query(sql, [req.params.id], (err, result) => {
    if (err) return res.json({ Status: false, Error: err.message || String(err) });
    return res.json({ Status: true, Message: "Leave approved" });
  });
});

// Reject leave
router.put("/leaves/:id/reject", (req, res) => {
  const sql = "UPDATE leaves SET status = 'rejected' WHERE id = ?";
  con.query(sql, [req.params.id], (err, result) => {
    if (err) return res.json({ Status: false, Error: err.message || String(err) });
    return res.json({ Status: true, Message: "Leave rejected" });
  });
});

// Delete leave
router.delete("/leaves/:id", (req, res) => {
  const sql = "DELETE FROM leaves WHERE id = ?";
  con.query(sql, [req.params.id], (err, result) => {
    if (err) return res.json({ Status: false, Error: err.message || String(err) });
    return res.json({ Status: true, Message: "Leave deleted successfully" });
  });
});

// ==================== ATTENDANCE MANAGEMENT ROUTES ====================

// Get all attendances with employee details
router.get("/attendances", (req, res) => {
  const sql = `SELECT a.*, e.full_name as employee_name, e.email 
               FROM attendance a 
               JOIN employee e ON a.employee_id = e.id 
               ORDER BY a.submitted_at DESC`;
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: err });
    return res.json({ Status: true, Result: result });
  });
});

// Get pending attendance count
router.get("/pending_attendance_count", (req, res) => {
  const sql = "SELECT COUNT(id) as pending FROM attendance WHERE status = 'pending'";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: err });
    return res.json({ Status: true, Result: result });
  });
});

// Approve attendance
router.put("/attendances/:id/approve", (req, res) => {
  const sql = "UPDATE attendance SET status = 'approved' WHERE id = ?";
  con.query(sql, [req.params.id], (err, result) => {
    if (err) return res.json({ Status: false, Error: err.message || String(err) });
    return res.json({ Status: true, Message: "Attendance approved" });
  });
});

// Reject attendance
router.put("/attendances/:id/reject", (req, res) => {
  const sql = "UPDATE attendance SET status = 'rejected' WHERE id = ?";
  con.query(sql, [req.params.id], (err, result) => {
    if (err) return res.json({ Status: false, Error: err.message || String(err) });
    return res.json({ Status: true, Message: "Attendance rejected" });
  });
});

// Backward compatible alias for frontend which calls /auth/dashboard/admin-profile
router.get("/auth/dashboard/admin-profile", (req, res) => {
  // Forward to the actual route handler by directly invoking the DB logic
  // to avoid using internal express internals like router._router.handle.
  const sqlWithImage = "SELECT full_name, email, image FROM admin LIMIT 1";

  con.query(sqlWithImage, (err, result) => {
    if (err) {
      const sqlWithoutImage = "SELECT full_name, email FROM admin LIMIT 1";
      con.query(sqlWithoutImage, (err2, result2) => {
        if (err2) {
          console.error("Database Error:", err2);
          return res.json({ Status: false, Error: "Query Error" });
        }
        if (result2 && result2.length > 0) {
          return res.json({
            Status: true,
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
        full_name: result[0].full_name,
        email: result[0].email,
        image: result[0].image || null,
      });
    }

    return res.json({ Status: false, Error: "No admin records found" });
  });
});

// ==================== HOME: DEPARTMENT PERFORMANCE ====================
// Frontend expects:
// GET /departments_performance -> [] of { id, name, user_count, skill_title, avg_experience_score }
router.get("/departments_performance", (req, res) => {
  const sql = `
    SELECT d.id, d.name, COUNT(e.id) AS user_count
    FROM department d
    LEFT JOIN employee e ON e.department_id = d.id
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
      user_count: Number(department.user_count),
      skill_title: "N/A",
      avg_experience_score: null,
    }));

    const io = globalThis.io;
    if (io) io.emit("departmentPerformanceUpdated", { departments: result });

    return res.json({ Status: true, Result: result });
  });
});

export { router as adminRouter };

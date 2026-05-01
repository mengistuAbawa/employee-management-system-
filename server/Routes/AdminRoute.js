import express from "express";

import con from "../utils/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";

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

// Employee Routes
router.get("/employee", (req, res) => {
  const sql =
    "SELECT e.*, c.name as category_name FROM employee e JOIN category c ON e.category_id = c.id";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result });
  });
});

// Get pending employees
router.get("/pending_employees", (req, res) => {
  const sql = `SELECT e.*, c.name as category_name 
               FROM employee e 
               JOIN category c ON e.category_id = c.id 
               WHERE e.approval_status = 'pending'`;
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: err });
    return res.json({ Status: true, Result: result });
  });
});

// Approve employee
router.put("/employees/:id/approve", (req, res) => {
  const sql = "UPDATE employee SET approval_status = 'approved' WHERE id = ?";
  con.query(sql, [req.params.id], (err, result) => {
    if (err) return res.json({ Status: false, Error: err.message || String(err) });
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
  const { full_name, email, salary, address, category_id, password } = req.body;

  bcrypt.hash(password || "defaultpassword", 10, (err, hash) => {
    if (err) return res.json({ Status: false, Error: "Hashing Error" });

    const sql = `INSERT INTO employee (full_name, email, password, salary, address, image, category_id, approval_status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, 'approved')`;

    const values = [
      full_name,
      email,
      hash,
      salary,
      address,
      req.file ? req.file.filename : null,
      category_id,
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
  const { full_name, email, salary, address, category_id } = req.body;

  const sql = `UPDATE employee 
               SET full_name = ?, email = ?, salary = ?, address = ?, category_id = ? 
               WHERE id = ?`;

  const values = [full_name, email, salary, address, category_id, id];

  con.query(sql, values, (err, result) => {
    if (err) {
      return res.json({ Status: false, Error: "Query Error: " + err });
    }
    return res.json({ Status: true, Message: "Employee Updated Successfully" });
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

// Add new leave
router.post("/leaves", (req, res) => {
  const { employee_id, leave_type, start_date, end_date, reason } = req.body;
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

// Search employees
router.get("/search_employees", (req, res) => {
  const search = req.query.q || "";
  const sql = `SELECT e.*, c.name as category_name 
               FROM employee e 
               JOIN category c ON e.category_id = c.id 
               WHERE e.full_name LIKE ? OR e.email LIKE ?`;
  con.query(sql, [`%${search}%`, `%${search}%`], (err, result) => {
    if (err) return res.json({ Status: false, Error: err });
    return res.json({ Status: true, Result: result });
  });
});

export { router as adminRouter };

import express from "express";
import con from "../utils/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";

const router = express.Router();

// Middleware for auth (inline since circular import issue)
const verifyUser = (req, res, next) => {
  const token = req.cookies.token;
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return res.json({ Status: false, Error: "Wrong Token" });
      req.id = decoded.id;
      req.role = decoded.role;
      next();
    });
  } else {
    return res.json({ Status: false, Error: "Not authenticated" });
  }
};

// Image upload configuration
const storage = multer.diskStorage({
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

const upload = multer({ storage: storage });

router.post("/employee_login", (req, res) => {
  const sql = `SELECT * FROM employee WHERE email = ?`;
  con.query(sql, [req.body.email], (err, result) => {
    if (err)
      return res
        .status(500)
        .json({ loginStatus: false, Error: "Database error" });

    if (result.length > 0) {
      const employee = result[0];
      if (employee.approval_status === "pending") {
        return res.status(403).json({ loginStatus: false, Error: "Your account is pending admin approval." });
      }
      if (employee.approval_status === "rejected") {
        return res.status(403).json({ loginStatus: false, Error: "Your account has been rejected by admin." });
      }
      bcrypt.compare(req.body.password, employee.password, (err, response) => {
        if (err)
          return res.json({ loginStatus: false, Error: "Comparison error" });

        if (response) {
          const email = employee.email;
          const token = jwt.sign(
            { role: "employee", email: email, id: employee.id },
            process.env.JWT_SECRET,
            { expiresIn: "1d" },
          );

          res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "strict",
          });
          return res.json({ loginStatus: true, id: employee.id });
        } else {
          return res.json({ loginStatus: false, Error: "Wrong email or password" });
        }
      });
    } else {
      return res.json({ loginStatus: false, Error: "Wrong email or password" });
    }
  });
});

// Employee self-registration (pending approval)
router.post("/register", (req, res) => {
  const { full_name, email, password, salary, address, category_id, department_id } = req.body;
  if (!full_name || !email || !password || !category_id || !department_id) {
    return res.json({ Status: false, Error: "Missing required fields" });
  }

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.json({ Status: false, Error: "Hashing Error" });

    const sql = `INSERT INTO employee 
      (full_name, email, password, salary, address, category_id, department_id, approval_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`;
    const values = [
      full_name,
      email,
      hash,
      salary || 0,
      address || "",
      category_id,
      department_id,
    ];

    con.query(sql, values, (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.json({ Status: false, Error: "Email already exists" });
        }
        return res.json({ Status: false, Error: err.message || String(err) });
      }
      return res.json({ Status: true, Message: "Registration successful. Awaiting admin approval." });
    });
  });
});

// Detail
router.get("/detail/:id", verifyUser, (req, res) => {
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
router.get("/leaves/:id", verifyUser, (req, res) => {
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

// Salary
router.get("/salary/:id", verifyUser, (req, res) => {
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

// Update employee profile
router.put("/update/:id", verifyUser, (req, res) => {
  const { id } = req.params;
  const { full_name, email, address, password } = req.body;

  const fields = [];
  const values = [];

  if (full_name !== undefined) {
    fields.push("full_name = ?");
    values.push(full_name);
  }
  if (email !== undefined) {
    fields.push("email = ?");
    values.push(email);
  }
  if (address !== undefined) {
    fields.push("address = ?");
    values.push(address);
  }

  if (fields.length === 0 && !password) {
    return res.status(400).json({ Status: false, Error: "No fields to update" });
  }

  const updateBasic = () => {
    if (fields.length > 0) {
      const sql = `UPDATE employee SET ${fields.join(", ")} WHERE id = ?`;
      values.push(id);
      con.query(sql, values, (err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ Status: false, Error: "Update Error" });
        }
        return res.json({ Status: true, Message: "Profile updated successfully" });
      });
    } else {
      return res.json({ Status: true, Message: "Profile updated successfully" });
    }
  };

  if (password) {
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) return res.json({ Status: false, Error: "Hashing Error" });
      fields.push("password = ?");
      values.push(hash);
      updateBasic();
    });
  } else {
    updateBasic();
  }
});

// Logout
router.get("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false,
    sameSite: "strict",
  });
  return res.json({ Status: true });
});

// Update profile image
router.put("/update_profile_image/:id", verifyUser, upload.single("image"), (req, res) => {
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

// Get personal attendance history
router.get("/attendance", verifyUser, (req, res) => {
  const employee_id = req.id; // From verifyUser middleware
  const sql = `
    SELECT * FROM attendance 
    WHERE employee_id = ? 
    ORDER BY date DESC, submitted_at DESC
  `;
  con.query(sql, [employee_id], (err, result) => {
    if (err) {
      console.error("Attendance fetch error:", err);
      return res.json({ Status: false, Error: "Database error" });
    }
    return res.json({ Status: true, Result: result });
  });
});

// Submit attendance
router.post("/attendance", verifyUser, (req, res) => {
  const { employee_id, date, clock_in_time, clock_out_time } = req.body;
  if (!employee_id || !date || !clock_in_time) {
    return res.json({ Status: false, Error: "Missing required fields" });
  }

  const sql = `
    INSERT INTO attendance (employee_id, date, clock_in_time, clock_out_time, status) 
    VALUES (?, ?, ?, ?, 'pending')
    ON DUPLICATE KEY UPDATE 
      clock_out_time = VALUES(clock_out_time),
      status = 'pending'
  `;
  const values = [employee_id, date, clock_in_time, clock_out_time || null];

  con.query(sql, values, (err, result) => {
    if (err) {
      console.error("Attendance error:", err);
      return res.json({ Status: false, Error: err.message || "Database error" });
    }
    return res.json({ Status: true, Message: "Attendance submitted successfully" });
  });
});

export { router as EmployeeRouter };

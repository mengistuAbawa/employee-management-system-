USE employees;

-- Categories Table
CREATE TABLE IF NOT EXISTS category (
  ID INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Departments Table
CREATE TABLE IF NOT EXISTS department (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE department
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Insert initial departments
INSERT IGNORE INTO department (name) VALUES 
('UI/UX'), 
('Art'), 
('Design'), 
('Development');

-- Leaves Table
CREATE TABLE IF NOT EXISTS leaves (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  leave_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  applied_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE
);

-- Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  date DATE NOT NULL,
  clock_in_time TIME,
  clock_out_time TIME,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_attendance (employee_id, date),
  FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE
);

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add image column to admin table (if not exists)
ALTER TABLE admin ADD COLUMN IF NOT EXISTS image VARCHAR(255);

-- Alter employee table additions (image if missing, approval_status, etc.)
ALTER TABLE employee ADD COLUMN IF NOT EXISTS image VARCHAR(255);
ALTER TABLE employee ADD COLUMN IF NOT EXISTS approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending';
ALTER TABLE employee ADD COLUMN IF NOT EXISTS category_id INT;
ALTER TABLE employee ADD COLUMN IF NOT EXISTS department_id INT NULL;
ALTER TABLE employee ADD FOREIGN KEY (category_id) REFERENCES category(ID);

SET @department_fk_exists = (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'employee'
    AND CONSTRAINT_NAME = 'fk_employee_department'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @department_fk_sql = IF(
  @department_fk_exists = 0,
  'ALTER TABLE employee ADD CONSTRAINT fk_employee_department FOREIGN KEY (department_id) REFERENCES department(id) ON DELETE SET NULL',
  'SELECT 1'
);

PREPARE department_fk_statement FROM @department_fk_sql;
EXECUTE department_fk_statement;
DEALLOCATE PREPARE department_fk_statement;

-- Add users table if needed (placeholder - adjust if schema differs)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'employee') DEFAULT 'employee',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample categories if empty
INSERT IGNORE INTO category (name) VALUES ('Frontend'), ('Backend'), ('Designer'), ('QA');

-- Note: Ensure base tables (admin, employee) exist before running this.
-- Run: mysql -u root -p employees < server/utils/init_database.sql

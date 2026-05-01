-- Run this SQL to create the leaves table in your MySQL database

CREATE TABLE IF NOT EXISTS leaves (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  leave_type VARCHAR(50) NOT NULL DEFAULT 'Annual',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  applied_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE
);

-- Optional: insert sample data
-- INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason, status) 
-- VALUES (1, 'Annual', '2025-06-01', '2025-06-05', 'Family vacation', 'pending');


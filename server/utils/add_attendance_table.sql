USE employees;

CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  date DATE NOT NULL,
  clock_in_time TIME,
  clock_out_time TIME,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_employee_date (employee_id, date),
  FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE
);

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

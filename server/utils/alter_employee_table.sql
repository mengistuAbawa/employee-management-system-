-- Add approval_status column to employee table for registration workflow
ALTER TABLE employee
ADD COLUMN approval_status ENUM('pending','approved','rejected') DEFAULT 'pending'
AFTER category_id;

-- Update existing employees to approved so they can still log in
UPDATE employee SET approval_status = 'approved' WHERE approval_status IS NULL;


-- Fix for attendance duplicates
-- Ensure one row per employee per date

ALTER TABLE attendance
  ADD UNIQUE KEY uniq_employee_date (employee_id, date);


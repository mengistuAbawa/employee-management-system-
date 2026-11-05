ALTER TABLE admin
  ADD COLUMN IF NOT EXISTS image VARCHAR(255),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE category
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE department
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE employee
  ADD COLUMN IF NOT EXISTS image VARCHAR(255),
  ADD COLUMN IF NOT EXISTS category_id INTEGER,
  ADD COLUMN IF NOT EXISTS department_id INTEGER,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS employment_status VARCHAR(20);

ALTER TABLE employee
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20);

UPDATE employee
SET approval_status = 'approved'
WHERE approval_status IS NULL;

ALTER TABLE employee
  ALTER COLUMN approval_status SET DEFAULT 'pending',
  ALTER COLUMN approval_status SET NOT NULL;

UPDATE employee
SET employment_status = 'active'
WHERE employment_status IS NULL;

ALTER TABLE employee
  ALTER COLUMN employment_status SET DEFAULT 'active',
  ALTER COLUMN employment_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'employee'::regclass
      AND conname = 'employee_approval_status_check'
  ) THEN
    ALTER TABLE employee
      ADD CONSTRAINT employee_approval_status_check
      CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'employee'::regclass
      AND conname = 'employee_employment_status_check'
  ) THEN
    ALTER TABLE employee
      ADD CONSTRAINT employee_employment_status_check
      CHECK (employment_status IN ('active', 'departed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'employee'::regclass
      AND contype = 'f'
      AND confrelid = 'category'::regclass
  ) THEN
    ALTER TABLE employee
      ADD CONSTRAINT employee_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES category(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'employee'::regclass
      AND contype = 'f'
      AND confrelid = 'department'::regclass
  ) THEN
    ALTER TABLE employee
      ADD CONSTRAINT employee_department_id_fkey
      FOREIGN KEY (department_id) REFERENCES department(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS unique_attendance_employee_date
  ON attendance(employee_id, date);

CREATE TABLE IF NOT EXISTS employee_departures (
  employee_id INTEGER PRIMARY KEY REFERENCES employee(id),
  reason TEXT NOT NULL,
  admin_id INTEGER REFERENCES admin(id) ON DELETE SET NULL,
  departed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS employee_department_idx ON employee(department_id);
CREATE INDEX IF NOT EXISTS employee_category_idx ON employee(category_id);
CREATE INDEX IF NOT EXISTS employee_status_idx ON employee(employment_status, approval_status);
CREATE INDEX IF NOT EXISTS leaves_employee_dates_idx ON leaves(employee_id, start_date, end_date);

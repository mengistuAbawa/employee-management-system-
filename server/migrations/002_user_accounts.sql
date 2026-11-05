CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'employee')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT LOWER(email) AS normalized_email FROM admin
      UNION ALL
      SELECT LOWER(email) FROM employee
    ) AS accounts
    GROUP BY normalized_email
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot migrate accounts: an email is shared by multiple admin/employee records'
      USING HINT = 'Resolve duplicate email addresses across admin and employee accounts, then rerun the migration.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM users u
    JOIN (
      SELECT LOWER(email) AS normalized_email, 'admin' AS role FROM admin
      UNION ALL
      SELECT LOWER(email), 'employee' FROM employee
    ) AS legacy ON LOWER(u.email) = legacy.normalized_email
    WHERE u.role <> legacy.role
  ) THEN
    RAISE EXCEPTION 'Cannot migrate accounts: a users record conflicts with a legacy account role'
      USING HINT = 'Review the existing users table and resolve the conflicting account before rerunning.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_case_insensitive_idx
  ON users(LOWER(email));

ALTER TABLE admin ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE employee ADD COLUMN IF NOT EXISTS user_id INTEGER;

INSERT INTO users (full_name, email, password_hash, role, is_active)
SELECT full_name, email, password, 'admin', TRUE FROM admin
UNION ALL
SELECT full_name, email, password, 'employee', employment_status = 'active' FROM employee
ON CONFLICT DO NOTHING;

UPDATE admin a
SET user_id = u.id
FROM users u
WHERE LOWER(u.email) = LOWER(a.email)
  AND u.role = 'admin'
  AND a.user_id IS NULL;

UPDATE employee e
SET user_id = u.id
FROM users u
WHERE LOWER(u.email) = LOWER(e.email)
  AND u.role = 'employee'
  AND e.user_id IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM admin WHERE user_id IS NULL)
     OR EXISTS (SELECT 1 FROM employee WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'Account migration did not link every admin and employee record';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'admin'::regclass AND conname = 'admin_user_id_fkey'
  ) THEN
    ALTER TABLE admin
      ADD CONSTRAINT admin_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'employee'::regclass AND conname = 'employee_user_id_fkey'
  ) THEN
    ALTER TABLE employee
      ADD CONSTRAINT employee_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS admin_user_id_unique_idx
  ON admin(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS employee_user_id_unique_idx
  ON employee(user_id);

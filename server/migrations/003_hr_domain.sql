ALTER TABLE employee
  ADD COLUMN IF NOT EXISTS position_id INTEGER;

CREATE TABLE IF NOT EXISTS positions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  department_id INTEGER REFERENCES department(id) ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (department_id, title)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'employee'::regclass
      AND conname = 'employee_position_id_fkey'
  ) THEN
    ALTER TABLE employee
      ADD CONSTRAINT employee_position_id_fkey
      FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS leave_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO leave_types (name)
VALUES ('Annual'), ('Sick'), ('Casual'), ('Maternity'), ('Other')
ON CONFLICT (name) DO NOTHING;

INSERT INTO leave_types (name)
SELECT DISTINCT BTRIM(leave_type)
FROM leaves
WHERE NULLIF(BTRIM(leave_type), '') IS NOT NULL
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS leave_balances (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employee(id) ON DELETE RESTRICT,
  leave_type_id INTEGER NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
  balance_year SMALLINT NOT NULL,
  entitled_days NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (entitled_days >= 0),
  used_days NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (used_days >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (employee_id, leave_type_id, balance_year)
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employee(id) ON DELETE RESTRICT,
  leave_type_id INTEGER NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (end_date >= start_date)
);

INSERT INTO leave_requests (id, employee_id, leave_type_id, start_date, end_date, reason, status, applied_at)
SELECT l.id, l.employee_id, t.id, l.start_date, l.end_date, l.reason, l.status, l.applied_date
FROM leaves l
JOIN leave_types t ON t.name = BTRIM(l.leave_type)
ON CONFLICT (id) DO NOTHING;

SELECT setval(
  pg_get_serial_sequence('leave_requests', 'id'),
  GREATEST(COALESCE((SELECT MAX(id) FROM leave_requests), 1), 1),
  EXISTS (SELECT 1 FROM leave_requests)
);

CREATE TABLE IF NOT EXISTS salary_structures (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employee(id) ON DELETE RESTRICT,
  base_salary NUMERIC(12,2) NOT NULL CHECK (base_salary >= 0),
  currency_code CHAR(3),
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (effective_to IS NULL OR effective_to >= effective_from),
  UNIQUE (employee_id, effective_from)
);

INSERT INTO salary_structures (employee_id, base_salary, effective_from)
SELECT id, salary, COALESCE(created_at::date, CURRENT_DATE)
FROM employee
WHERE salary IS NOT NULL
ON CONFLICT (employee_id, effective_from) DO NOTHING;

CREATE TABLE IF NOT EXISTS payroll_runs (
  id SERIAL PRIMARY KEY,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'finalized', 'cancelled')),
  currency_code CHAR(3),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  finalized_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (period_end >= period_start),
  UNIQUE (period_start, period_end)
);

CREATE TABLE IF NOT EXISTS payroll (
  id SERIAL PRIMARY KEY,
  payroll_run_id INTEGER NOT NULL REFERENCES payroll_runs(id) ON DELETE RESTRICT,
  employee_id INTEGER NOT NULL REFERENCES employee(id) ON DELETE RESTRICT,
  salary_structure_id INTEGER REFERENCES salary_structures(id) ON DELETE SET NULL,
  base_pay NUMERIC(12,2) NOT NULL CHECK (base_pay >= 0),
  overtime_pay NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (overtime_pay >= 0),
  bonus NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (bonus >= 0),
  deductions NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (deductions >= 0),
  net_pay NUMERIC(12,2) NOT NULL CHECK (net_pay >= 0),
  currency_code CHAR(3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (payroll_run_id, employee_id)
);

CREATE TABLE IF NOT EXISTS payslips (
  id SERIAL PRIMARY KEY,
  payroll_id INTEGER NOT NULL UNIQUE REFERENCES payroll(id) ON DELETE RESTRICT,
  employee_id INTEGER NOT NULL REFERENCES employee(id) ON DELETE RESTRICT,
  document_key TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS performance_reviews (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employee(id) ON DELETE RESTRICT,
  reviewer_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  rating NUMERIC(3,2) CHECK (rating >= 0 AND rating <= 5),
  summary TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'acknowledged')),
  submitted_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (period_end >= period_start)
);

CREATE TABLE IF NOT EXISTS performance_goals (
  id SERIAL PRIMARY KEY,
  review_id INTEGER NOT NULL REFERENCES performance_reviews(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed', 'cancelled')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  published_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (expires_at IS NULL OR published_at IS NULL OR expires_at >= published_at)
);

CREATE TABLE IF NOT EXISTS announcement_departments (
  announcement_id INTEGER NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  department_id INTEGER NOT NULL REFERENCES department(id) ON DELETE CASCADE,
  PRIMARY KEY (announcement_id, department_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(80) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  entity_type VARCHAR(80),
  entity_id INTEGER,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employee_documents (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employee(id) ON DELETE RESTRICT,
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  document_key TEXT NOT NULL UNIQUE,
  file_name VARCHAR(255) NOT NULL,
  content_type VARCHAR(150) NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id TEXT,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organization_settings (
  setting_key VARCHAR(120) PRIMARY KEY,
  setting_value JSONB NOT NULL,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO organization_settings (setting_key, setting_value)
VALUES ('timezone', '"UTC"'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

CREATE INDEX IF NOT EXISTS leave_requests_employee_status_idx
  ON leave_requests(employee_id, status, start_date);
CREATE INDEX IF NOT EXISTS salary_structures_employee_effective_idx
  ON salary_structures(employee_id, effective_from DESC);
CREATE INDEX IF NOT EXISTS payroll_runs_period_status_idx
  ON payroll_runs(period_start, period_end, status);
CREATE INDEX IF NOT EXISTS payroll_employee_idx ON payroll(employee_id);
CREATE INDEX IF NOT EXISTS performance_reviews_employee_period_idx
  ON performance_reviews(employee_id, period_start DESC);
CREATE INDEX IF NOT EXISTS announcements_published_idx
  ON announcements(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON notifications(user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS employee_documents_employee_idx
  ON employee_documents(employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx
  ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx
  ON audit_logs(actor_user_id, created_at DESC);

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS clock_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clock_out_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE leaves
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE employee_departures
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE salary_structures
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE payroll
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE payslips
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE employee_documents
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE announcement_departments
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE payroll
  ADD CONSTRAINT payroll_net_pay_formula_check
  CHECK (net_pay = base_pay + overtime_pay + bonus - deductions) NOT VALID;

ALTER TABLE payroll
  VALIDATE CONSTRAINT payroll_net_pay_formula_check;

ALTER TABLE payroll_runs
  ADD CONSTRAINT payroll_finalization_metadata_check
  CHECK (status <> 'finalized' OR (finalized_at IS NOT NULL AND finalized_by IS NOT NULL)) NOT VALID;

ALTER TABLE payroll_runs
  VALIDATE CONSTRAINT payroll_finalization_metadata_check;

CREATE OR REPLACE FUNCTION prevent_finalized_payroll_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_run_status VARCHAR(20);
BEGIN
  IF TG_TABLE_NAME = 'payroll_runs' THEN
    IF OLD.status = 'finalized' THEN
      RAISE EXCEPTION 'Finalized payroll runs cannot be changed or deleted';
    END IF;
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP <> 'INSERT' THEN
    SELECT status INTO target_run_status FROM payroll_runs WHERE id = OLD.payroll_run_id;
    IF target_run_status = 'finalized' THEN
      RAISE EXCEPTION 'Items in finalized payroll runs cannot be changed or deleted';
    END IF;
  END IF;

  IF TG_OP <> 'DELETE' THEN
    SELECT status INTO target_run_status FROM payroll_runs WHERE id = NEW.payroll_run_id;
    IF target_run_status = 'finalized' THEN
      RAISE EXCEPTION 'Items cannot be added to finalized payroll runs';
    END IF;
    RETURN NEW;
  END IF;

  RETURN OLD;
END;
$$;

CREATE TRIGGER payroll_runs_immutable_after_finalization
BEFORE UPDATE OR DELETE ON payroll_runs
FOR EACH ROW EXECUTE FUNCTION prevent_finalized_payroll_mutation();

CREATE TRIGGER payroll_items_immutable_after_finalization
BEFORE INSERT OR UPDATE OR DELETE ON payroll
FOR EACH ROW EXECUTE FUNCTION prevent_finalized_payroll_mutation();

CREATE OR REPLACE FUNCTION validate_payslip_finalization()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  run_status VARCHAR(20);
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'Payslips are immutable after creation';
  END IF;

  SELECT r.status INTO run_status
  FROM payroll p
  JOIN payroll_runs r ON r.id = p.payroll_run_id
  WHERE p.id = NEW.payroll_id;

  IF run_status IS DISTINCT FROM 'finalized' THEN
    RAISE EXCEPTION 'Payslips can only be created for finalized payroll';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER payslips_require_finalized_payroll
BEFORE INSERT OR UPDATE OR DELETE ON payslips
FOR EACH ROW EXECUTE FUNCTION validate_payslip_finalization();

CREATE OR REPLACE VIEW employees AS
SELECT id, user_id, full_name, email, salary, address, image, category_id,
       department_id, position_id, approval_status, employment_status,
       created_at, updated_at
FROM employee;

CREATE OR REPLACE VIEW departments AS
SELECT id, name, created_at, updated_at
FROM department;

ALTER TABLE employee
  ADD COLUMN IF NOT EXISTS department_id INT NULL AFTER category_id;

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

import con from "../utils/db.js";

const organizationLocalDateSql = `(
  CURRENT_TIMESTAMP AT TIME ZONE COALESCE(
    (SELECT setting_value #>> '{}' FROM organization_settings WHERE setting_key = 'timezone'),
    'UTC'
  )
)::date`;

const toCents = (value) => Math.round(Number(value) * 100);
const fromCents = (value) => (value / 100).toFixed(2);
const isFullCalendarMonth = (periodStart, periodEnd) => {
  const start = new Date(`${periodStart}T00:00:00Z`);
  const end = new Date(`${periodEnd}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
  const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
  return start.getUTCDate() === 1 && end.getTime() === lastDay.getTime();
};

const employeePaySql = (periodStart, periodEnd) => `
  SELECT employee.id AS employee_id,
         structure.id AS salary_structure_id,
         COALESCE(
           structure.base_salary,
           CASE WHEN NOT EXISTS (
             SELECT 1 FROM salary_structures history
             WHERE history.employee_id = employee.id
           ) THEN employee.salary END
         ) AS compensation,
         structure.currency_code AS salary_currency
  FROM employee
  LEFT JOIN LATERAL (
    SELECT id, base_salary, currency_code
    FROM salary_structures
    WHERE employee_id = employee.id
      AND effective_from <= ${periodStart}::date
      AND (effective_to IS NULL OR effective_to >= ${periodStart}::date)
    ORDER BY effective_from DESC, id DESC
    LIMIT 1
  ) structure ON TRUE
  WHERE employee.employment_status = 'active'
    AND employee.approval_status = 'approved'
    AND employee.created_at::date <= ${periodEnd}::date
`;

export const saveSalaryStructure = async (client, { employeeId, baseSalary, currencyCode, actorUserId }) => {
  const dateResult = await client.query(`SELECT ${organizationLocalDateSql}::text AS effective_from`);
  const effectiveFrom = dateResult.rows[0].effective_from;
  const latest = await client.query(`
    SELECT currency_code
    FROM salary_structures
    WHERE employee_id = $1 AND effective_from <= $2::date
    ORDER BY effective_from DESC, id DESC
    LIMIT 1
  `, [employeeId, effectiveFrom]);
  const currency = String(currencyCode || latest.rows[0]?.currency_code || "USD").trim().toUpperCase();

  await client.query(`
    UPDATE salary_structures
    SET effective_to = $2::date - 1, updated_at = CURRENT_TIMESTAMP
    WHERE employee_id = $1 AND effective_from < $2::date
      AND (effective_to IS NULL OR effective_to >= $2::date)
  `, [employeeId, effectiveFrom]);

  await client.query(`
    INSERT INTO salary_structures
      (employee_id, base_salary, currency_code, effective_from, created_by)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (employee_id, effective_from)
    DO UPDATE SET base_salary = EXCLUDED.base_salary,
                  currency_code = EXCLUDED.currency_code,
                  effective_to = NULL,
                updated_at = CURRENT_TIMESTAMP,
                created_by = COALESCE(EXCLUDED.created_by, salary_structures.created_by)
  `, [employeeId, baseSalary, currency, effectiveFrom, actorUserId || null]);

  return { effectiveFrom, currencyCode: currency };
};

const validateRunSalaries = async (client, { periodStart, periodEnd, currencyCode }) => client.query(`
  SELECT COUNT(*) AS employee_count,
         COUNT(*) FILTER (WHERE compensation IS NULL) AS missing_salary_count,
         COUNT(*) FILTER (WHERE compensation < 0) AS invalid_salary_count,
         COUNT(*) FILTER (
           WHERE salary_currency IS NOT NULL AND UPPER(BTRIM(salary_currency)) <> $3
         ) AS currency_mismatch_count
  FROM (${employeePaySql("$1", "$2")}) active_employees
`, [periodStart, periodEnd, currencyCode]);

export const createPayrollRun = async ({ periodStart, periodEnd, currencyCode, actorUserId }) =>
  con.transaction(async (client) => {
    if (!isFullCalendarMonth(periodStart, periodEnd)) {
      return { outcome: "invalid_period" };
    }
    const validation = await validateRunSalaries(client, { periodStart, periodEnd, currencyCode });
    const summary = validation.rows[0];
    if (Number(summary.employee_count) === 0) return { outcome: "no_employees" };
    if (Number(summary.missing_salary_count) > 0) return { outcome: "missing_salary" };
    if (Number(summary.invalid_salary_count) > 0) return { outcome: "invalid_salary" };
    if (Number(summary.currency_mismatch_count) > 0) return { outcome: "currency_mismatch" };

    const run = await client.query(`
      INSERT INTO payroll_runs
        (period_start, period_end, status, currency_code, created_by)
      VALUES ($1, $2, 'draft', $3, $4)
      RETURNING id, period_start, period_end, status, currency_code, created_at
    `, [periodStart, periodEnd, currencyCode, actorUserId || null]);
    const runId = run.rows[0].id;

    const items = await client.query(`
      INSERT INTO payroll
        (payroll_run_id, employee_id, salary_structure_id, base_pay,
         overtime_pay, bonus, deductions, net_pay, currency_code)
      SELECT $1, active_employees.employee_id, active_employees.salary_structure_id, active_employees.compensation,
             0, 0, 0, active_employees.compensation, $2
      FROM (${employeePaySql("$3", "$4")}) active_employees
      WHERE active_employees.compensation IS NOT NULL
    `, [runId, currencyCode, periodStart, periodEnd]);
    await client.query(`
      INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
      VALUES ($1, 'payroll.run_created', 'payroll_run', $2, $3::jsonb)
    `, [
      actorUserId || null,
      String(runId),
      JSON.stringify({ ...run.rows[0], itemCount: items.rowCount }),
    ]);
    return { outcome: "created", run: run.rows[0], itemCount: items.rowCount };
  });

export const updatePayrollItem = async ({ runId, itemId, values, actorUserId }) =>
  con.transaction(async (client) => {
    const run = await client.query("SELECT id, status FROM payroll_runs WHERE id = $1 FOR UPDATE", [runId]);
    if (!run.rowCount) return { outcome: "run_not_found" };
    if (run.rows[0].status !== "draft") return { outcome: "not_draft" };

    const current = await client.query(`
      SELECT p.id, p.employee_id, p.base_pay, p.overtime_pay, p.bonus, p.deductions, p.net_pay
      FROM payroll p
      WHERE p.id = $1 AND p.payroll_run_id = $2
      FOR UPDATE
    `, [itemId, runId]);
    if (!current.rowCount) return { outcome: "item_not_found" };

    const amountCents = {
      basePay: toCents(values.basePay),
      overtimePay: toCents(values.overtimePay),
      bonus: toCents(values.bonus),
      deductions: toCents(values.deductions),
    };
    const netPayCents = amountCents.basePay + amountCents.overtimePay + amountCents.bonus - amountCents.deductions;
    if (netPayCents < 0) return { outcome: "negative_net_pay" };
    if (netPayCents > 999999999999) return { outcome: "net_pay_limit_exceeded" };

    const updated = await client.query(`
      UPDATE payroll
      SET base_pay = $1, overtime_pay = $2, bonus = $3, deductions = $4,
          net_pay = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 AND payroll_run_id = $7
      RETURNING id, employee_id, base_pay, overtime_pay, bonus, deductions, net_pay
    `, [
      fromCents(amountCents.basePay),
      fromCents(amountCents.overtimePay),
      fromCents(amountCents.bonus),
      fromCents(amountCents.deductions),
      fromCents(netPayCents),
      itemId,
      runId,
    ]);
    await client.query(`
      INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data)
      VALUES ($1, 'payroll.item_updated', 'payroll_item', $2, $3::jsonb, $4::jsonb)
    `, [
      actorUserId || null,
      String(itemId),
      JSON.stringify(current.rows[0]),
      JSON.stringify(updated.rows[0]),
    ]);
    return { outcome: "updated", item: updated.rows[0] };
  });

export const finalizePayrollRun = async ({ runId, actorUserId }) => con.transaction(async (client) => {
  const run = await client.query("SELECT id, status FROM payroll_runs WHERE id = $1 FOR UPDATE", [runId]);
  if (!run.rowCount) return { outcome: "run_not_found" };
  if (run.rows[0].status !== "draft") return { outcome: "not_draft" };

  const items = await client.query(`
    SELECT COUNT(*) AS total,
           COUNT(*) FILTER (WHERE net_pay < 0) AS invalid_total
    FROM payroll
    WHERE payroll_run_id = $1
  `, [runId]);
  if (Number(items.rows[0].total) === 0) return { outcome: "empty" };
  if (Number(items.rows[0].invalid_total) > 0) return { outcome: "invalid_total" };

  const finalized = await client.query(`
    UPDATE payroll_runs
    SET status = 'finalized', finalized_at = CURRENT_TIMESTAMP,
        finalized_by = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2 AND status = 'draft'
    RETURNING id, period_start, period_end, status, finalized_at
  `, [actorUserId, runId]);
  if (!finalized.rowCount) return { outcome: "not_draft" };

  const payslips = await client.query(`
    INSERT INTO payslips (payroll_id, employee_id, document_key)
    SELECT id, employee_id, 'payroll-item:' || id::text
    FROM payroll
    WHERE payroll_run_id = $1
    RETURNING id
  `, [runId]);
  await client.query(`
    INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
    VALUES ($1, 'payroll.run_finalized', 'payroll_run', $2, $3::jsonb)
  `, [
    actorUserId,
    String(runId),
    JSON.stringify({ ...finalized.rows[0], payslipCount: payslips.rowCount }),
  ]);
  return { outcome: "finalized", run: finalized.rows[0], payslipCount: payslips.rowCount };
});

export const deleteDraftPayrollRun = async ({ runId, actorUserId }) => con.transaction(async (client) => {
  const run = await client.query("SELECT id, status, period_start, period_end FROM payroll_runs WHERE id = $1 FOR UPDATE", [runId]);
  if (!run.rowCount) return { outcome: "run_not_found" };
  if (run.rows[0].status !== "draft") return { outcome: "not_draft" };

  await client.query("DELETE FROM payroll WHERE payroll_run_id = $1", [runId]);
  await client.query("DELETE FROM payroll_runs WHERE id = $1", [runId]);
  await client.query(`
    INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, before_data)
    VALUES ($1, 'payroll.draft_deleted', 'payroll_run', $2, $3::jsonb)
  `, [actorUserId || null, String(runId), JSON.stringify(run.rows[0])]);
  return { outcome: "deleted" };
});

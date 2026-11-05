import con from "../utils/db.js";

const reportRowLimit = 1000;

const limitRows = (rows) => ({
  rows: rows.slice(0, reportRowLimit),
  truncated: rows.length > reportRowLimit,
});

export const getManagementReport = async ({ from, to }) => {
  const [
    employeeStatuses,
    attendanceByDay,
    attendanceRows,
    leaveSummary,
    leaveRows,
    payrollSummary,
    payrollRows,
    performanceSummary,
    performanceRows,
  ] = await Promise.all([
    con.query(`
      SELECT COALESCE(d.name, 'Unassigned') AS department_name,
             e.employment_status, e.approval_status, COUNT(*) AS employee_count
      FROM employee e
      LEFT JOIN department d ON d.id = e.department_id
      GROUP BY d.name, e.employment_status, e.approval_status
      ORDER BY department_name, e.employment_status, e.approval_status
    `),
    con.query(`
      WITH weekdays AS (
        SELECT workday::date AS report_date
        FROM generate_series($1::date, $2::date, INTERVAL '1 day') AS series(workday)
        WHERE EXTRACT(ISODOW FROM workday) BETWEEN 1 AND 5
      ),
      active_employees AS (
        SELECT id FROM employee
        WHERE employment_status = 'active' AND approval_status = 'approved'
      ),
      active_count AS (
        SELECT COUNT(*) AS employee_count FROM active_employees
      ),
      daily_attendance AS (
        SELECT a.date AS report_date, COUNT(DISTINCT a.employee_id) AS present_count
        FROM attendance a
        JOIN active_employees e ON e.id = a.employee_id
        WHERE a.date BETWEEN $1::date AND $2::date
          AND a.clock_in_time IS NOT NULL
          AND a.status <> 'rejected'
        GROUP BY a.date
      ),
      daily_leave AS (
        SELECT day.report_date, COUNT(DISTINCT l.employee_id) AS leave_count
        FROM weekdays day
        JOIN leaves l
          ON l.status = 'approved'
          AND l.start_date <= day.report_date
          AND l.end_date >= day.report_date
        JOIN active_employees e ON e.id = l.employee_id
        GROUP BY day.report_date
      )
      SELECT day.report_date::text AS report_date,
             GREATEST(active_count.employee_count - COALESCE(leave.leave_count, 0), 0) AS expected_count,
             COALESCE(attendance.present_count, 0) AS present_count,
             GREATEST(
               active_count.employee_count
                 - COALESCE(leave.leave_count, 0)
                 - COALESCE(attendance.present_count, 0),
               0
             ) AS absent_estimate,
             COALESCE(leave.leave_count, 0) AS approved_leave_count
      FROM weekdays day
      CROSS JOIN active_count
      LEFT JOIN daily_attendance attendance ON attendance.report_date = day.report_date
      LEFT JOIN daily_leave leave ON leave.report_date = day.report_date
      ORDER BY day.report_date
    `, [from, to]),
    con.query(`
      SELECT a.id, a.date::text AS date, e.full_name AS employee_name,
             COALESCE(d.name, 'Unassigned') AS department_name,
             a.clock_in_time::text AS clock_in_time,
             a.clock_out_time::text AS clock_out_time, a.status
      FROM attendance a
      JOIN employee e ON e.id = a.employee_id
      LEFT JOIN department d ON d.id = e.department_id
      WHERE a.date BETWEEN $1::date AND $2::date
      ORDER BY a.date DESC, e.full_name, a.id
      LIMIT $3
    `, [from, to, reportRowLimit + 1]),
    con.query(`
      SELECT l.leave_type, l.status, COUNT(*) AS request_count
      FROM leaves l
      WHERE l.start_date <= $2::date AND l.end_date >= $1::date
      GROUP BY l.leave_type, l.status
      ORDER BY l.leave_type, l.status
    `, [from, to]),
    con.query(`
      SELECT l.id, e.full_name AS employee_name,
             COALESCE(d.name, 'Unassigned') AS department_name,
             l.leave_type, l.start_date::text AS start_date, l.end_date::text AS end_date,
             l.status, l.applied_date::text AS applied_date
      FROM leaves l
      JOIN employee e ON e.id = l.employee_id
      LEFT JOIN department d ON d.id = e.department_id
      WHERE l.start_date <= $2::date AND l.end_date >= $1::date
      ORDER BY l.applied_date DESC NULLS LAST, l.id DESC
      LIMIT $3
    `, [from, to, reportRowLimit + 1]),
    con.query(`
      SELECT r.id AS payroll_run_id, r.period_start::text AS period_start,
             r.period_end::text AS period_end, BTRIM(COALESCE(r.currency_code, '')) AS currency_code,
             COUNT(p.id) AS employee_count, COALESCE(SUM(p.net_pay), 0) AS total_net_pay
      FROM payroll_runs r
      LEFT JOIN payroll p ON p.payroll_run_id = r.id
      WHERE r.status = 'finalized'
        AND r.period_start <= $2::date AND r.period_end >= $1::date
      GROUP BY r.id
      ORDER BY r.period_start DESC, r.id DESC
    `, [from, to]),
    con.query(`
      SELECT r.period_start::text AS period_start, r.period_end::text AS period_end,
             BTRIM(COALESCE(p.currency_code, r.currency_code, '')) AS currency_code,
             e.full_name AS employee_name, COALESCE(d.name, 'Unassigned') AS department_name,
             p.base_pay, p.overtime_pay, p.bonus, p.deductions, p.net_pay
      FROM payroll_runs r
      JOIN payroll p ON p.payroll_run_id = r.id
      JOIN employee e ON e.id = p.employee_id
      LEFT JOIN department d ON d.id = e.department_id
      WHERE r.status = 'finalized'
        AND r.period_start <= $2::date AND r.period_end >= $1::date
      ORDER BY r.period_start DESC, e.full_name, p.id
      LIMIT $3
    `, [from, to, reportRowLimit + 1]),
    con.query(`
      SELECT COALESCE(d.name, 'Unassigned') AS department_name,
             r.status, COUNT(*) AS review_count, ROUND(AVG(r.rating), 2) AS average_rating
      FROM performance_reviews r
      JOIN employee e ON e.id = r.employee_id
      LEFT JOIN department d ON d.id = e.department_id
      WHERE r.period_start <= $2::date AND r.period_end >= $1::date
      GROUP BY d.name, r.status
      ORDER BY department_name, r.status
    `, [from, to]),
    con.query(`
      SELECT r.id, e.full_name AS employee_name,
             COALESCE(d.name, 'Unassigned') AS department_name,
             r.period_start::text AS period_start, r.period_end::text AS period_end,
             r.rating, r.status, r.submitted_at::text AS submitted_at
      FROM performance_reviews r
      JOIN employee e ON e.id = r.employee_id
      LEFT JOIN department d ON d.id = e.department_id
      WHERE r.period_start <= $2::date AND r.period_end >= $1::date
      ORDER BY r.period_end DESC, e.full_name, r.id DESC
      LIMIT $3
    `, [from, to, reportRowLimit + 1]),
  ]);

  const attendanceRecords = limitRows(attendanceRows);
  const leaveRecords = limitRows(leaveRows);
  const payrollRecords = limitRows(payrollRows);
  const performanceRecords = limitRows(performanceRows);

  return {
    period: { from, to },
    employeeStatuses: employeeStatuses.map((row) => ({
      ...row,
      employee_count: Number(row.employee_count),
    })),
    attendanceByDay: attendanceByDay.map((row) => ({
      ...row,
      expected_count: Number(row.expected_count),
      present_count: Number(row.present_count),
      absent_estimate: Number(row.absent_estimate),
      approved_leave_count: Number(row.approved_leave_count),
    })),
    attendance: attendanceRecords.rows,
    leaveSummary: leaveSummary.map((row) => ({
      ...row,
      request_count: Number(row.request_count),
    })),
    leaves: leaveRecords.rows,
    payrollSummary: payrollSummary.map((row) => ({
      ...row,
      employee_count: Number(row.employee_count),
      total_net_pay: Number(row.total_net_pay),
    })),
    payroll: payrollRecords.rows,
    performanceSummary: performanceSummary.map((row) => ({
      ...row,
      review_count: Number(row.review_count),
      average_rating: row.average_rating === null ? null : Number(row.average_rating),
    })),
    performance: performanceRecords.rows,
    truncated: {
      attendance: attendanceRecords.truncated,
      leaves: leaveRecords.truncated,
      payroll: payrollRecords.truncated,
      performance: performanceRecords.truncated,
    },
  };
};

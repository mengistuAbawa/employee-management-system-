import con from "../utils/db.js";

export const isValidIsoDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const getDaysByYear = (startDate, endDate) => {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const daysByYear = [];
  let segmentStart = start;

  while (segmentStart <= end) {
    const nextYear = new Date(Date.UTC(segmentStart.getUTCFullYear() + 1, 0, 1));
    const segmentEnd = nextYear <= end ? new Date(nextYear.getTime() - 86400000) : end;
    daysByYear.push({
      year: segmentStart.getUTCFullYear(),
      days: Math.floor((segmentEnd - segmentStart) / 86400000) + 1,
    });
    segmentStart = new Date(segmentEnd.getTime() + 86400000);
  }

  return daysByYear;
};

export const createLeaveRequest = async ({
  employeeId,
  leaveType,
  startDate,
  endDate,
  reason,
  actorUserId,
}) => con.transaction(async (client) => {
  const employee = await client.query(`
    SELECT id FROM employee
    WHERE id = $1 AND employment_status = 'active' AND approval_status = 'approved'
    FOR UPDATE
  `, [employeeId]);
  if (!employee.rowCount) {
    const error = new Error("Active approved employee not found");
    error.code = "EMPLOYEE_NOT_ACTIVE";
    throw error;
  }

  const type = await client.query(
    "SELECT id, name FROM leave_types WHERE LOWER(name) = LOWER($1) AND is_active = TRUE",
    [leaveType],
  );
  if (!type.rowCount) {
    const error = new Error("Selected leave type is not active");
    error.code = "LEAVE_TYPE_NOT_FOUND";
    throw error;
  }

  const overlap = await client.query(`
    SELECT id FROM leaves
    WHERE employee_id = $1
      AND status IN ('pending', 'approved')
      AND start_date <= $3::date
      AND end_date >= $2::date
    LIMIT 1
  `, [employeeId, startDate, endDate]);
  if (overlap.rowCount) {
    const error = new Error("This leave period overlaps another pending or approved request");
    error.code = "LEAVE_PERIOD_OVERLAP";
    throw error;
  }

  const created = await client.query(`
    INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason, status, applied_date)
    VALUES ($1, $2, $3, $4, $5, 'pending', CURRENT_TIMESTAMP)
    RETURNING id, employee_id, leave_type, start_date, end_date, reason, status, applied_date
  `, [employeeId, type.rows[0].name, startDate, endDate, reason]);

  await client.query(`
    INSERT INTO leave_requests
      (id, employee_id, leave_type_id, start_date, end_date, reason, status, applied_at)
    VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
  `, [
    created.rows[0].id,
    employeeId,
    type.rows[0].id,
    startDate,
    endDate,
    reason,
    created.rows[0].applied_date,
  ]);

  await client.query(`
    INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
    VALUES ($1, 'leave.requested', 'leave', $2, $3::jsonb)
  `, [actorUserId || null, String(created.rows[0].id), JSON.stringify(created.rows[0])]);

  return created.rows[0];
});

export const reviewLeaveRequest = async ({ leaveId, actorUserId, status }) => con.transaction(async (client) => {
  const result = await client.query(`
    SELECT id, employee_id, leave_type, start_date, end_date, reason, status
    FROM leaves
    WHERE id = $1
    FOR UPDATE
  `, [leaveId]);
  if (!result.rowCount) return { outcome: "not_found" };
  const leave = result.rows[0];
  if (leave.status !== "pending") return { outcome: "not_pending" };

  const leaveType = await client.query(
    "SELECT id FROM leave_types WHERE LOWER(name) = LOWER($1)",
    [leave.leave_type],
  );
  if (!leaveType.rowCount) {
    const error = new Error("Leave type is no longer available");
    error.code = "LEAVE_TYPE_NOT_FOUND";
    throw error;
  }

  if (status === "approved") {
    for (const balance of getDaysByYear(String(leave.start_date).slice(0, 10), String(leave.end_date).slice(0, 10))) {
      await client.query(`
        INSERT INTO leave_balances (employee_id, leave_type_id, balance_year, used_days)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (employee_id, leave_type_id, balance_year)
        DO UPDATE SET used_days = leave_balances.used_days + EXCLUDED.used_days,
                      updated_at = CURRENT_TIMESTAMP
      `, [leave.employee_id, leaveType.rows[0].id, balance.year, balance.days]);
    }
  }

  const updated = await client.query(`
    UPDATE leaves
    SET status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2 AND status = 'pending'
    RETURNING id
  `, [status, leaveId]);
  if (!updated.rowCount) return { outcome: "not_pending" };

  await client.query(`
    INSERT INTO leave_requests
      (id, employee_id, leave_type_id, start_date, end_date, reason, status,
       applied_at, reviewed_by, reviewed_at)
    SELECT l.id, l.employee_id, $2, l.start_date, l.end_date, l.reason, $3,
           COALESCE(l.applied_date, CURRENT_TIMESTAMP), $4, CURRENT_TIMESTAMP
    FROM leaves l
    WHERE l.id = $1
    ON CONFLICT (id) DO UPDATE
    SET status = EXCLUDED.status, reviewed_by = EXCLUDED.reviewed_by,
        reviewed_at = EXCLUDED.reviewed_at, updated_at = CURRENT_TIMESTAMP
  `, [leaveId, leaveType.rows[0].id, status, actorUserId || null]);
  await client.query(`
    INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data)
    VALUES ($1, $2, 'leave', $3, $4::jsonb, $5::jsonb)
  `, [
    actorUserId || null,
    `leave.${status}`,
    String(leaveId),
    JSON.stringify(leave),
    JSON.stringify({ ...leave, status }),
  ]);

  return { outcome: "updated" };
});

export const deleteLeaveRequest = async (leaveId, actorUserId) => con.transaction(async (client) => {
  const result = await client.query("SELECT id, status FROM leaves WHERE id = $1 FOR UPDATE", [leaveId]);
  if (!result.rowCount) return { outcome: "not_found" };
  if (result.rows[0].status === "approved") return { outcome: "approved" };

  await client.query("DELETE FROM leave_requests WHERE id = $1", [leaveId]);
  await client.query("DELETE FROM leaves WHERE id = $1", [leaveId]);
  await client.query(`
    INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, before_data)
    VALUES ($1, 'leave.deleted', 'leave', $2, $3::jsonb)
  `, [actorUserId || null, String(leaveId), JSON.stringify(result.rows[0])]);
  return { outcome: "deleted" };
});

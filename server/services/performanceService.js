import con from "../utils/db.js";

const insertGoals = async (client, reviewId, goals) => {
  for (const goal of goals) {
    await client.query(`
      INSERT INTO performance_goals (review_id, title, description, status, due_date)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      reviewId,
      goal.title.trim(),
      goal.description?.trim() || null,
      goal.status || "not_started",
      goal.due_date || null,
    ]);
  }
};

const writeAudit = (client, actorUserId, action, reviewId, beforeData, afterData) =>
  client.query(`
    INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data)
    VALUES ($1, $2, 'performance_review', $3, $4::jsonb, $5::jsonb)
  `, [
    actorUserId || null,
    action,
    String(reviewId),
    beforeData ? JSON.stringify(beforeData) : null,
    afterData ? JSON.stringify(afterData) : null,
  ]);

export const createPerformanceReview = async ({
  employeeId,
  reviewerUserId,
  periodStart,
  periodEnd,
  rating,
  summary,
  goals,
}) => con.transaction(async (client) => {
  const employee = await client.query(`
    SELECT id FROM employee
    WHERE id = $1 AND employment_status = 'active' AND approval_status = 'approved'
    FOR UPDATE
  `, [employeeId]);
  if (!employee.rowCount) return { outcome: "employee_not_found" };

  const duplicate = await client.query(`
    SELECT id FROM performance_reviews
    WHERE employee_id = $1 AND period_start = $2 AND period_end = $3
    LIMIT 1
  `, [employeeId, periodStart, periodEnd]);
  if (duplicate.rowCount) return { outcome: "duplicate_period" };

  const review = await client.query(`
    INSERT INTO performance_reviews
      (employee_id, reviewer_user_id, period_start, period_end, rating, summary)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, employee_id, reviewer_user_id, period_start, period_end,
              rating, summary, status, created_at
  `, [employeeId, reviewerUserId, periodStart, periodEnd, rating, summary?.trim() || null]);
  await insertGoals(client, review.rows[0].id, goals);
  await writeAudit(client, reviewerUserId, "performance.review_created", review.rows[0].id, null, {
    ...review.rows[0],
    goals,
  });
  return { outcome: "created", review: review.rows[0] };
});

export const updatePerformanceReviewDraft = async ({
  reviewId,
  reviewerUserId,
  rating,
  summary,
  goals,
}) => con.transaction(async (client) => {
  const review = await client.query(`
    SELECT id, employee_id, period_start, period_end, rating, summary, status
    FROM performance_reviews
    WHERE id = $1
    FOR UPDATE
  `, [reviewId]);
  if (!review.rowCount) return { outcome: "not_found" };
  if (review.rows[0].status !== "draft") return { outcome: "not_draft" };

  const previousGoals = await client.query(`
    SELECT id, title, description, status, due_date
    FROM performance_goals
    WHERE review_id = $1
    ORDER BY id
  `, [reviewId]);
  const updated = await client.query(`
    UPDATE performance_reviews
    SET rating = $1, summary = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = $3 AND status = 'draft'
    RETURNING id, employee_id, period_start, period_end, rating, summary, status
  `, [rating, summary?.trim() || null, reviewId]);
  await client.query("DELETE FROM performance_goals WHERE review_id = $1", [reviewId]);
  await insertGoals(client, reviewId, goals);
  await writeAudit(client, reviewerUserId, "performance.review_updated", reviewId, {
    ...review.rows[0],
    goals: previousGoals.rows,
  }, {
    ...updated.rows[0],
    goals,
  });
  return { outcome: "updated", review: updated.rows[0] };
});

export const submitPerformanceReview = async ({ reviewId, reviewerUserId }) =>
  con.transaction(async (client) => {
    const review = await client.query(`
      SELECT id, rating, summary, status
      FROM performance_reviews
      WHERE id = $1
      FOR UPDATE
    `, [reviewId]);
    if (!review.rowCount) return { outcome: "not_found" };
    if (review.rows[0].status !== "draft") return { outcome: "not_draft" };
    if (review.rows[0].rating === null || !review.rows[0].summary?.trim()) {
      return { outcome: "incomplete" };
    }

    const submitted = await client.query(`
      UPDATE performance_reviews
      SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status = 'draft'
      RETURNING id, employee_id, period_start, period_end, rating, summary,
                status, submitted_at
    `, [reviewId]);
    await writeAudit(client, reviewerUserId, "performance.review_submitted", reviewId, review.rows[0], submitted.rows[0]);
    return { outcome: "submitted", review: submitted.rows[0] };
  });

export const deletePerformanceReviewDraft = async ({ reviewId, reviewerUserId }) =>
  con.transaction(async (client) => {
    const review = await client.query(`
      SELECT id, employee_id, period_start, period_end, rating, summary, status
      FROM performance_reviews
      WHERE id = $1
      FOR UPDATE
    `, [reviewId]);
    if (!review.rowCount) return { outcome: "not_found" };
    if (review.rows[0].status !== "draft") return { outcome: "not_draft" };
    const goals = await client.query(`
      SELECT id, title, description, status, due_date
      FROM performance_goals
      WHERE review_id = $1
      ORDER BY id
    `, [reviewId]);
    await client.query("DELETE FROM performance_reviews WHERE id = $1", [reviewId]);
    await writeAudit(client, reviewerUserId, "performance.review_deleted", reviewId, {
      ...review.rows[0],
      goals: goals.rows,
    }, null);
    return { outcome: "deleted" };
  });

export const acknowledgePerformanceReview = async ({ reviewId, employeeId, employeeUserId }) =>
  con.transaction(async (client) => {
    const review = await client.query(`
      SELECT id, employee_id, status, rating, summary, period_start, period_end
      FROM performance_reviews
      WHERE id = $1 AND employee_id = $2
      FOR UPDATE
    `, [reviewId, employeeId]);
    if (!review.rowCount) return { outcome: "not_found" };
    if (review.rows[0].status === "acknowledged") return { outcome: "already_acknowledged" };
    if (review.rows[0].status !== "submitted") return { outcome: "not_submitted" };

    const acknowledged = await client.query(`
      UPDATE performance_reviews
      SET status = 'acknowledged', acknowledged_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND employee_id = $2 AND status = 'submitted'
      RETURNING id, employee_id, status, rating, summary, period_start,
                period_end, submitted_at, acknowledged_at
    `, [reviewId, employeeId]);
    await writeAudit(client, employeeUserId, "performance.review_acknowledged", reviewId, review.rows[0], acknowledged.rows[0]);
    return { outcome: "acknowledged", review: acknowledged.rows[0] };
  });

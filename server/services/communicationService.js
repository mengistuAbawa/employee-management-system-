import con from "../utils/db.js";

const recordAudit = (client, actorUserId, action, entityType, entityId, beforeData, afterData) =>
  client.query(`
    INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data)
    VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
  `, [
    actorUserId || null,
    action,
    entityType,
    String(entityId),
    beforeData ? JSON.stringify(beforeData) : null,
    afterData ? JSON.stringify(afterData) : null,
  ]);

const validateDepartments = async (client, departmentIds) => {
  if (departmentIds.length === 0) return true;
  const result = await client.query(
    "SELECT COUNT(*) AS total FROM department WHERE id = ANY($1::integer[])",
    [departmentIds],
  );
  return Number(result.rows[0].total) === departmentIds.length;
};

const replaceAnnouncementDepartments = async (client, announcementId, departmentIds) => {
  await client.query("DELETE FROM announcement_departments WHERE announcement_id = $1", [announcementId]);
  for (const departmentId of departmentIds) {
    await client.query(
      "INSERT INTO announcement_departments (announcement_id, department_id) VALUES ($1, $2)",
      [announcementId, departmentId],
    );
  }
};

const createAnnouncementNotifications = async (client, announcementId) => {
  const result = await client.query(`
    INSERT INTO notifications
      (user_id, notification_type, title, body, entity_type, entity_id)
    SELECT u.id, 'announcement', 'New announcement', a.title,
           'announcement', a.id
    FROM announcements a
    JOIN users u ON u.role = 'employee' AND u.is_active = TRUE
    JOIN employee e ON e.user_id = u.id
      AND e.employment_status = 'active'
      AND e.approval_status = 'approved'
    WHERE a.id = $1
      AND (
        NOT EXISTS (
          SELECT 1 FROM announcement_departments ad
          WHERE ad.announcement_id = a.id
        )
        OR EXISTS (
          SELECT 1 FROM announcement_departments ad
          WHERE ad.announcement_id = a.id AND ad.department_id = e.department_id
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM notifications existing
        WHERE existing.user_id = u.id
          AND existing.notification_type = 'announcement'
          AND existing.entity_type = 'announcement'
          AND existing.entity_id = a.id
      )
    RETURNING id
  `, [announcementId]);
  return result.rowCount;
};

export const createAnnouncement = async ({
  title,
  body,
  expiresAt,
  departmentIds,
  actorUserId,
}) => con.transaction(async (client) => {
  if (!await validateDepartments(client, departmentIds)) return { outcome: "invalid_departments" };
  const announcement = await client.query(`
    INSERT INTO announcements (title, body, expires_at, published_by)
    VALUES ($1, $2, $3, $4)
    RETURNING id, title, body, expires_at, is_published, published_at, created_at
  `, [title.trim(), body.trim(), expiresAt, actorUserId]);
  const announcementId = announcement.rows[0].id;
  await replaceAnnouncementDepartments(client, announcementId, departmentIds);
  await recordAudit(client, actorUserId, "announcement.created", "announcement", announcementId, null, {
    ...announcement.rows[0],
    departmentIds,
  });
  return { outcome: "created", announcement: announcement.rows[0] };
});

export const updateAnnouncement = async ({
  announcementId,
  title,
  body,
  expiresAt,
  departmentIds,
  actorUserId,
}) => con.transaction(async (client) => {
  const current = await client.query(`
    SELECT id, title, body, expires_at, is_published, published_at
    FROM announcements
    WHERE id = $1
    FOR UPDATE
  `, [announcementId]);
  if (!current.rowCount) return { outcome: "not_found" };
  if (!await validateDepartments(client, departmentIds)) return { outcome: "invalid_departments" };
  const previousDepartments = await client.query(
    "SELECT department_id FROM announcement_departments WHERE announcement_id = $1 ORDER BY department_id",
    [announcementId],
  );
  const updated = await client.query(`
    UPDATE announcements
    SET title = $1, body = $2, expires_at = $3, updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
    RETURNING id, title, body, expires_at, is_published, published_at, updated_at
  `, [title.trim(), body.trim(), expiresAt, announcementId]);
  await replaceAnnouncementDepartments(client, announcementId, departmentIds);
  await recordAudit(client, actorUserId, "announcement.updated", "announcement", announcementId, {
    ...current.rows[0],
    departmentIds: previousDepartments.rows.map((row) => row.department_id),
  }, {
    ...updated.rows[0],
    departmentIds,
  });
  return { outcome: "updated", announcement: updated.rows[0] };
});

export const setAnnouncementPublished = async ({ announcementId, isPublished, actorUserId }) =>
  con.transaction(async (client) => {
    const current = await client.query(`
      SELECT id, title, is_published, published_at, expires_at,
             expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP AS expired
      FROM announcements
      WHERE id = $1
      FOR UPDATE
    `, [announcementId]);
    if (!current.rowCount) return { outcome: "not_found" };
    if (isPublished && current.rows[0].expired) return { outcome: "expired" };
    const updated = await client.query(`
      UPDATE announcements
      SET is_published = $1,
          published_at = CASE
            WHEN $1 = TRUE AND is_published = FALSE THEN CURRENT_TIMESTAMP
            ELSE published_at
          END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, title, is_published, published_at, expires_at
    `, [isPublished, announcementId]);
    let notificationCount = 0;
    if (isPublished && !current.rows[0].is_published) {
      notificationCount = await createAnnouncementNotifications(client, announcementId);
    }
    await recordAudit(
      client,
      actorUserId,
      isPublished ? "announcement.published_status" : "announcement.unpublished",
      "announcement",
      announcementId,
      current.rows[0],
      { ...updated.rows[0], notificationCount },
    );
    return { outcome: "updated", announcement: updated.rows[0], notificationCount };
  });

export const deleteDraftAnnouncement = async ({ announcementId, actorUserId }) =>
  con.transaction(async (client) => {
    const current = await client.query(`
      SELECT id, title, body, is_published, published_at
      FROM announcements
      WHERE id = $1
      FOR UPDATE
    `, [announcementId]);
    if (!current.rowCount) return { outcome: "not_found" };
    if (current.rows[0].is_published) return { outcome: "published" };
    const departments = await client.query(
      "SELECT department_id FROM announcement_departments WHERE announcement_id = $1 ORDER BY department_id",
      [announcementId],
    );
    await client.query("DELETE FROM announcements WHERE id = $1", [announcementId]);
    await recordAudit(client, actorUserId, "announcement.deleted", "announcement", announcementId, {
      ...current.rows[0],
      departmentIds: departments.rows.map((row) => row.department_id),
    }, null);
    return { outcome: "deleted" };
  });

export const sendAdminNotification = async ({
  audience,
  employeeId,
  departmentId,
  title,
  body,
  actorUserId,
}) => con.transaction(async (client) => {
  let recipients;
  if (audience === "employee") {
    recipients = await client.query(`
      INSERT INTO notifications (user_id, notification_type, title, body)
      SELECT u.id, 'admin_message', $1, $2
      FROM employee e
      JOIN users u ON u.id = e.user_id
      WHERE e.id = $3 AND e.employment_status = 'active'
        AND e.approval_status = 'approved' AND u.is_active = TRUE
      RETURNING id
    `, [title.trim(), body.trim(), employeeId]);
  } else if (audience === "department") {
    recipients = await client.query(`
      INSERT INTO notifications (user_id, notification_type, title, body)
      SELECT u.id, 'admin_message', $1, $2
      FROM employee e
      JOIN users u ON u.id = e.user_id
      WHERE e.department_id = $3 AND e.employment_status = 'active'
        AND e.approval_status = 'approved' AND u.is_active = TRUE
      RETURNING id
    `, [title.trim(), body.trim(), departmentId]);
  } else {
    recipients = await client.query(`
      INSERT INTO notifications (user_id, notification_type, title, body)
      SELECT u.id, 'admin_message', $1, $2
      FROM employee e
      JOIN users u ON u.id = e.user_id
      WHERE e.employment_status = 'active'
        AND e.approval_status = 'approved' AND u.is_active = TRUE
      RETURNING id
    `, [title.trim(), body.trim()]);
  }
  await recordAudit(client, actorUserId, "notification.sent", "notification", audience, null, {
    audience,
    employeeId: employeeId || null,
    departmentId: departmentId || null,
    recipientCount: recipients.rowCount,
  });
  return { outcome: recipients.rowCount ? "sent" : "no_recipients", recipientCount: recipients.rowCount };
});

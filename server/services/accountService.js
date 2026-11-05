import con from "../utils/db.js";
import { saveSalaryStructure } from "./payrollService.js";

export const createAdminAccount = async ({ fullName, email, passwordHash }) =>
  con.transaction(async (client) => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = fullName.trim();
    const user = await client.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin')
       RETURNING id`,
      [normalizedName, normalizedEmail, passwordHash],
    );
    const admin = await client.query(
      `INSERT INTO admin (full_name, email, password, user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [normalizedName, normalizedEmail, passwordHash, user.rows[0].id],
    );
    return { userId: user.rows[0].id, profileId: admin.rows[0].id };
  });

export const createEmployeeAccount = async ({
  fullName,
  email,
  passwordHash,
  salary,
  address,
  image,
  categoryId,
  departmentId,
  positionId = null,
  approvalStatus,
  createdBy,
}) =>
  con.transaction(async (client) => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = fullName.trim();
    const isActive = approvalStatus === "approved";
    const user = await client.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, 'employee', $4)
       RETURNING id`,
      [normalizedName, normalizedEmail, passwordHash, isActive],
    );
    const employee = await client.query(
      `INSERT INTO employee
         (full_name, email, password, salary, address, image, category_id,
          department_id, position_id, approval_status, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        normalizedName,
        normalizedEmail,
        passwordHash,
        salary,
        address || "",
        image || null,
        categoryId,
        departmentId,
        positionId,
        approvalStatus,
        user.rows[0].id,
      ],
    );
    if (salary !== undefined && salary !== null) {
      await saveSalaryStructure(client, {
        employeeId: employee.rows[0].id,
        baseSalary: salary,
        actorUserId: createdBy,
      });
    }
    return { userId: user.rows[0].id, profileId: employee.rows[0].id };
  });

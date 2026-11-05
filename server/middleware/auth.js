import jwt from "jsonwebtoken";
import con from "../utils/db.js";

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" || process.env.COOKIE_SAME_SITE === "none",
  sameSite: process.env.COOKIE_SAME_SITE || "strict",
  maxAge: 24 * 60 * 60 * 1000,
});

export const setAuthCookie = (res, { userId, profileId, role, email }) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required to issue an authentication session");
  }
  const token = jwt.sign(
    { role, email, id: profileId },
    process.env.JWT_SECRET,
    { subject: String(userId), expiresIn: process.env.JWT_EXPIRES_IN || "1d" },
  );
  res.cookie("token", token, cookieOptions());
};

export const clearAuthCookie = (res) => {
  const { maxAge, ...clearOptions } = cookieOptions();
  res.clearCookie("token", clearOptions);
};

const rejectSession = (res, status, message) => {
  clearAuthCookie(res);
  return res.status(status).json({ Status: false, Error: message });
};

export const authenticateSession = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return rejectSession(res, 401, "Authentication required");
  }
  if (!process.env.JWT_SECRET) {
    console.error("Cannot verify session: JWT_SECRET is not configured");
    return res.status(500).json({ Status: false, Error: "Authentication service is unavailable" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
    if (error || !decoded?.sub) {
      return rejectSession(res, 401, "Authentication required");
    }

    con.query(
      `SELECT u.id AS user_id, u.email, u.role, u.is_active,
              a.id AS admin_id, e.id AS employee_id,
              e.approval_status, e.employment_status
       FROM users u
       LEFT JOIN admin a ON a.user_id = u.id
       LEFT JOIN employee e ON e.user_id = u.id
       WHERE u.id = ?`,
      [decoded.sub],
      (queryError, accounts) => {
        if (queryError) {
          console.error("Session account lookup failed:", queryError);
          return res.status(500).json({ Status: false, Error: "Could not verify account" });
        }
        const account = accounts[0];
        if (!account || !account.is_active || account.role !== decoded.role) {
          return rejectSession(res, 401, "Authentication required");
        }

        if (account.role === "admin" && !account.admin_id) {
          return rejectSession(res, 403, "Administrator account is unavailable");
        }
        if (
          account.role === "employee" &&
          (!account.employee_id ||
            account.employment_status !== "active" ||
            account.approval_status !== "approved")
        ) {
          return rejectSession(res, 403, "This employee account is not active or approved");
        }

        req.userId = account.user_id;
        req.role = account.role;
        req.id = account.role === "admin" ? account.admin_id : account.employee_id;
        req.email = account.email;
        return next();
      },
    );
  });
};

export const authenticateRole = (role) => (req, res, next) => {
  authenticateSession(req, res, () => {
    if (req.role !== role) {
      return res.status(403).json({ Status: false, Error: `${role === "admin" ? "Administrator" : "Employee"} access required` });
    }
    return next();
  });
};

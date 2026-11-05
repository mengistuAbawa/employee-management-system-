import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import helmet from "helmet";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
dotenv.config();

if (process.env.NODE_ENV === "production" && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error("Set JWT_SECRET to a random value of at least 32 characters in production.");
}

import { adminRouter } from "./Routes/AdminRoute.js";
import { EmployeeRouter } from "./Routes/EmployeeRoute_fixed.js";
import con from "./utils/db.js";
import { authenticateSession } from "./middleware/auth.js";
const app = express();

app.use(helmet());
app.use(cors({
    origin:[...new Set([
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL.replace(/\/$/, '')] : []),
    ])],
    methods:['GET','POST','PUT','DELETE'],
    credentials:true
}));
app.use(cookieParser());
app.use(express.json());
app.use((err, req, res, next) => {
  if (err?.type === "entity.parse.failed") {
    return res
      .status(400)
      .json({ Status: false, Error: "Invalid JSON in request body" });
  }
  return next(err);
});
app.use(adminRouter);
app.use("/employee", EmployeeRouter);

const publicDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "public");
app.use("/images", express.static(resolve(publicDirectory, "images")));
app.get("/verify", authenticateSession, (req, res) => {
  return res.json({ Status: true, role: req.role, id: req.id, userId: req.userId });
});
import http from "http";
import { Server } from "socket.io";

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL.replace(/\/$/, "")] : []),
    ],
    credentials: true,
  },
});

// Make io accessible to emitter modules
globalThis.io = io;

// --- Socket auth + admin presence tracking ---
const onlineAdmins = new Map(); // adminId -> Set(socketId)

const getTokenFromCookieHeader = (cookieHeader) => {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
};

io.use((socket, next) => {
  const cookieHeader = socket.handshake.headers?.cookie;
  const token = getTokenFromCookieHeader(cookieHeader);
  if (!token || !process.env.JWT_SECRET) {
    return next(new Error("Authentication required"));
  }

  jwt.verify(token, process.env.JWT_SECRET, (tokenError, decoded) => {
    if (tokenError || !decoded?.sub) {
      return next(new Error("Authentication required"));
    }
    con.query(
      `SELECT u.role, u.is_active, a.id AS admin_id, e.id AS employee_id,
              e.approval_status, e.employment_status
       FROM users u
       LEFT JOIN admin a ON a.user_id = u.id
       LEFT JOIN employee e ON e.user_id = u.id
       WHERE u.id = ?`,
      [decoded.sub],
      (queryError, accounts) => {
        if (queryError) {
          console.error("Socket session verification failed:", queryError);
          return next(new Error("Could not verify account"));
        }
        const account = accounts[0];
        if (!account || !account.is_active || account.role !== decoded.role) {
          return next(new Error("Authentication required"));
        }
        if (account.role === "admin" && !account.admin_id) {
          return next(new Error("Administrator account is unavailable"));
        }
        if (
          account.role === "employee" &&
          (!account.employee_id ||
            account.approval_status !== "approved" ||
            account.employment_status !== "active")
        ) {
          return next(new Error("Employee account is not active or approved"));
        }
        socket.data.role = account.role;
        socket.data.adminId = account.role === "admin" ? account.admin_id : null;
        return next();
      },
    );
  });
});

io.on("connection", (socket) => {
  const { adminId } = socket.data;
  if (adminId) {
    const set = onlineAdmins.get(adminId) || new Set();
    set.add(socket.id);
    onlineAdmins.set(adminId, set);

    // Broadcast presence state
    // (Admin list with `is_online` will be refreshed by routes that emit adminListUpdated,
    // but we also patch it quickly here when presence changes.)
    io.emit("adminPresenceChanged", {
      activeCount: onlineAdmins.size,
      // Keep adminListState null; frontend can still show active count.
      adminListState: null,
    });
  }

  socket.on("disconnect", () => {
    if (adminId) {
      const set = onlineAdmins.get(adminId);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) onlineAdmins.delete(adminId);
        else onlineAdmins.set(adminId, set);
      }

      io.emit("adminPresenceChanged", {
        activeCount: onlineAdmins.size,
        adminListState: null,
      });
    }
  });
});

const port = Number(process.env.PORT) || 3000;

const startServer = async () => {
  await con.connect();
  if (process.env.AUTO_MIGRATE === "true" || process.env.AUTO_INIT_SCHEMA === "true") {
    await con.migrate();
  }
  httpServer.listen(port, () => {
    console.log(`The server is done (HTTP + Socket.IO) on port ${port}`);
  });
};

startServer().catch((error) => {
  console.error("Server startup failed:", error.message);
  process.exitCode = 1;
});

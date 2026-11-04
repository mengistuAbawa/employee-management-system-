import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

// Fail fast if JWT secret is missing to avoid confusing login errors
if (!process.env.JWT_SECRET) {
  console.warn("[WARN] JWT_SECRET is not set. Admin/Employee login tokens will fail.");
}

import { adminRouter } from "./Routes/AdminRoute.js";
import { EmployeeRouter } from "./Routes/EmployeeRoute_fixed.js";
const app = express();

app.use(cors({
    origin:['http://localhost:5173', 'http://127.0.0.1:5173'],
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

app.use(express.static('public'))
const verifyUser = (req, res, next) => {
  const token = req.cookies.token;
  if (token) {
jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return res.json({ Status: false, Error: "Wrong Token" });

      req.id = decoded.id;
      req.role = decoded.role;
      next();
    });
  } else {
    return res.json({ Status: false, Error: "Not authenticated" });
  }
};

app.get("/verify", verifyUser, (req, res) => {
  return res.json({ Status: true, role: req.role, id: req.id });
});
import http from "http";
import { Server } from "socket.io";

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  },
});

// Make io accessible to emitter modules
globalThis.io = io;

// Helper: parse and verify JWT from cookie for socket auth


// --- Socket auth + admin presence tracking ---
const onlineAdmins = new Map(); // adminId -> Set(socketId)

const getTokenFromCookieHeader = (cookieHeader) => {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

const emitDashboardCounts = async () => {
  // Local require to avoid circular deps; reuse REST endpoints by querying DB here would be ideal,
  // but for now we emit via REST-like SQL in mutation routes.
};

io.on("connection", (socket) => {
  const cookieHeader = socket.handshake.headers?.cookie;
  const token = getTokenFromCookieHeader(cookieHeader);

  let decoded = null;
  try {
    if (token && process.env.JWT_SECRET) {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    }
  } catch {
    decoded = null;
  }

  const role = decoded?.role;
  const adminId = role === "admin" ? decoded?.id : null;
  socket.data.role = role;
  socket.data.adminId = adminId;

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

httpServer.listen(3000, () => {
  console.log("The server is done (HTTP + Socket.IO)");
});


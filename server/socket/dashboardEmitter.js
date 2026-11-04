// Centralized dashboard event emitters.
// This module expects the Socket.IO server instance to be attached to globalThis.io
// from `server/index.js`.

const safeGetIo = () => {
  const io = globalThis.io;
  return io;
};

export const emitDashboardCounts = async () => {
  const io = safeGetIo();
  if (!io) return;
  // Emitters are triggered from mutation routes for now.
};

export const emitEmployeeCountUpdated = (total) => {
  const io = safeGetIo();
  if (!io) return;
  io.emit("employeeCountUpdated", { total });
};

export const emitPendingEmployeesUpdated = (total) => {
  const io = safeGetIo();
  if (!io) return;
  io.emit("pendingEmployeesUpdated", { total });
};

export const emitLeaveStatsUpdated = (leaveStats) => {
  const io = safeGetIo();
  if (!io) return;
  io.emit("leaveStatsUpdated", leaveStats);
};

export const emitAdminListUpdated = (adminList) => {
  const io = safeGetIo();
  if (!io) return;
  // Keep payload compatible with Home reducer (adminListState)
  io.emit("adminListUpdated", { adminListState: adminList });
};


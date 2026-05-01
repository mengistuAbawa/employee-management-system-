// const fs = require('fs');

// // 1. Create Leave.jsx frontend component
// const leaveJsx = `import React, { useState, useEffect } from "react";
// import axios from "axios";

// const Leave = () => {
//   const [leaves, setLeaves] = useState([]);
//   const [employees, setEmployees] = useState([]);
//   const [form, setForm] = useState({
//     employee_id: "",
//     leave_type: "Annual",
//     start_date: "",
//     end_date: "",
//     reason: "",
//     status: "Pending",
//   });
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     fetchLeaves();
//     fetchEmployees();
//   }, []);

//   const fetchLeaves = () => {
//     axios
//       .get("http://localhost:3000/leaves", { withCredentials: true })
//       .then((res) => {
//         if (res.data.Status) {
//           setLeaves(res.data.Result || []);
//         }
//       })
//       .catch((err) => console.error("Fetch leaves error:", err));
//   };

//   const fetchEmployees = () => {
//     axios
//       .get("http://localhost:3000/auth/employee", { withCredentials: true })
//       .then((res) => {
//         if (res.data.Status) {
//           setEmployees(res.data.Result || []);
//         }
//       })
//       .catch((err) => console.error("Fetch employees error:", err));
//   };

//   const handleChange = (e) =>
//     setForm({ ...form, [e.target.name]: e.target.value });

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     try {
//       const res = await axios.post(
//         "http://localhost:3000/leaves",
//         form,
//         { withCredentials: true }
//       );
//       if (res.data.Status) {
//         setForm({
//           employee_id: "",
//           leave_type: "Annual",
//           start_date: "",
//           end_date: "",
//           reason: "",
//           status: "Pending",
//         });
//         fetchLeaves();
//       } else {
//         alert(res.data.Error || "Failed to add leave");
//       }
//     } catch (err) {
//       console.error(err);
//       alert("Error adding leave");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleStatusUpdate = async (id, status) => {
//     try {
//       const res = await axios.put(
//         \\`http://localhost:3000/leaves/\\${id}\\`,
//         { status },
//         { withCredentials: true }
//       );
//       if (res.data.Status) {
//         fetchLeaves();
//       } else {
//         alert(res.data.Error || "Failed to update status");
//       }
//     } catch (err) {
//       console.error(err);
//       alert("Error updating status");
//     }
//   };

//   const handleDelete = async (id) => {
//     if (!window.confirm("Delete this leave record?")) return;
//     try {
//       const res = await axios.delete(
//         \\`http://localhost:3000/leaves/\\${id}\\`,
//         { withCredentials: true }
//       );
//       if (res.data.Status) {
//         fetchLeaves();
//       } else {
//         alert(res.data.Error || "Failed to delete");
//       }
//     } catch (err) {
//       console.error(err);
//       alert("Error deleting leave");
//     }
//   };

//   const getStatusBadge = (status) => {
//     switch (status) {
//       case "Approved":
//         return <span className="badge bg-success">{status}</span>;
//       case "Rejected":
//         return <span className="badge bg-danger">{status}</span>;
//       default:
//         return <span className="badge bg-warning text-dark">{status}</span>;
//     }
//   };

//   return (
//     <div className="container mt-3">
//       <h3 className="mb-4">Leave Management</h3>

//       <div className="card mb-4 shadow-sm">
//         <div className="card-header bg-primary text-white">
//           <h5 className="mb-0">Apply for Leave</h5>
//         </div>
//         <div className="card-body">
//           <form onSubmit={handleSubmit}>
//             <div className="row g-3">
//               <div className="col-md-3">
//                 <label className="form-label">Employee</label>
//                 <select
//                   name="employee_id"
//                   className="form-select"
//                   value={form.employee_id}
//                   onChange={handleChange}
//                   required
//                 >
//                   <option value="">Select Employee</option>
//                   {employees.map((emp) => (
//                     <option key={emp.id} value={emp.id}>
//                       {emp.full_name}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//               <div className="col-md-2">
//                 <label className="form-label">Leave Type</label>
//                 <select
//                   name="leave_type"
//                   className="form-select"
//                   value={form.leave_type}
//                   onChange={handleChange}
//                   required
//                 >
//                   <option value="Annual">Annual</option>
//                   <option value="Sick">Sick</option>
//                   <option value="Casual">Casual</option>
//                   <option value="Maternity">Maternity</option>
//                   <option value="Other">Other</option>
//                 </select>
//               </div>
//               <div className="col-md-2">
//                 <label className="form-label">Start Date</label>
//                 <input
//                   type="date"
//                   name="start_date"
//                   className="form-control"
//                   value={form.start_date}
//                   onChange={handleChange}
//                   required
//                 />
//               </div>
//               <div className="col-md-2">
//                 <label className="form-label">End Date</label>
//                 <input
//                   type="date"
//                   name="end_date"
//                   className="form-control"
//                   value={form.end_date}
//                   onChange={handleChange}
//                   required
//                 />
//               </div>
//               <div className="col-md-3">
//                 <label className="form-label">Reason</label>
//                 <input
//                   type="text"
//                   name="reason"
//                   className="form-control"
//                   placeholder="Enter reason"
//                   value={form.reason}
//                   onChange={handleChange}
//                   required
//                 />
//               </div>
//             <div className="mt-3">
//               <button
//                 type="submit"
//                 className="btn btn-primary"
//                 disabled={loading}
//               >
//                 {loading ? "Submitting..." : "Submit Leave"}
//               </button>
//             </div>
//           </form>
//         </div>

//       <div className="card shadow-sm">
//         <div className="card-header bg-dark text-white">
//           <h5 className="mb-0">Leave Records</h5>
//         </div>
//         <div className="card-body">
//           <table className="table table-striped table-hover">
//             <thead className="table-dark">
//               <tr>
//                 <th>#</th>
//                 <th>Employee</th>
//                 <th>Type</th>
//                 <th>Start Date</th>
//                 <th>End Date</th>
//                 <th>Reason</th>
//                 <th>Status</th>
//                 <th>Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {leaves.length === 0 ? (
//                 <tr>
//                   <td colSpan="8" className="text-center text-muted">
//                     No leave records found
//                   </td>
//                 </tr>
//               ) : (
//                 leaves.map((leave, idx) => (
//                   <tr key={leave.id}>
//                     <td>{idx + 1}</td>
//                     <td>{leave.employee_name || leave.employee_id}</td>
//                     <td>{leave.leave_type}</td>
//                     <td>{leave.start_date}</td>
//                     <td>{leave.end_date}</td>
//                     <td>{leave.reason}</td>
//                     <td>{getStatusBadge(leave.status)}</td>
//                     <td>
//                       {leave.status === "Pending" && (
//                         <>
//                           <button
//                             className="btn btn-success btn-sm me-1"
//                             onClick={() => handleStatusUpdate(leave.id, "Approved")}
//                           >
//                             Approve
//                           </button>
//                           <button
//                             className="btn btn-danger btn-sm me-1"
//                             onClick={() => handleStatusUpdate(leave.id, "Rejected")}
//                           >
//                             Reject
//                           </button>
//                         </>
//                       )}
//                       <button
//                         className="btn btn-outline-danger btn-sm"
//                         onClick={() => handleDelete(leave.id)}
//                       >
//                         Delete
//                       </button>
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>
//     </div>
//   );
// };

// export default Leave;
// `;

// // 2. Create LeaveRoute.js backend route
// const leaveRoute = `import express from "express";
// import con from "../utils/db.js";

// const router = express.Router();

// router.get("/", (req, res) => {
//   const sql = \\`
//     SELECT l.*, e.full_name as employee_name 
//     FROM leaves l 
//     LEFT JOIN employee e ON l.employee_id = e.id 
//     ORDER BY l.created_at DESC
//   \\`;
//   con.query(sql, (err, result) => {
//     if (err) {
//       console.error("DB query error:", err);
//       return res.status(500).json({ Status: false, Error: "Database error" });
//     }
//     return res.json({ Status: true, Result: result });
//   });
// });

// router.post("/", (req, res) => {
//   const { employee_id, leave_type, start_date, end_date, reason, status } = req.body;
//   const sql = \\`
//     INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason, status) 
//     VALUES (?, ?, ?, ?, ?, ?)
//   \\`;
//   con.query(sql, [employee_id, leave_type, start_date, end_date, reason, status || "Pending"], (err, result) => {
//     if (err) {
//       console.error("DB query error:", err);
//       return res.status(500).json({ Status: false, Error: "Database error" });
//     }
//     return res.json({ Status: true, Message: "Leave added successfully", InsertId: result.insertId });
//   });
// });

// router.put("/:id", (req, res) => {
//   const { id } = req.params;
//   const { status } = req.body;
//   const sql = "UPDATE leaves SET status = ? WHERE id = ?";
//   con.query(sql, [status, id], (err, result) => {
//     if (err) {
//       console.error("DB query error:", err);
//       return res.status(500).json({ Status: false, Error: "Database error" });
//     }
//     if (result.affectedRows === 0) {
//       return res.json({ Status: false, Error: "Leave record not found" });
//     }
//     return res.json({ Status: true, Message: "Status updated successfully" });
//   });
// });

// router.delete("/:id", (req, res) => {
//   const { id } = req.params;
//   const sql = "DELETE FROM leaves WHERE id = ?";
//   con.query(sql, [id], (err, result) => {
//     if (err) {
//       console.error("DB query error:", err);
//       return res.status(500).json({ Status: false, Error: "Database error" });
//     }
//     if (result.affectedRows === 0) {
//       return res.json({ Status: false, Error: "Leave record not found" });
//     }
//     return res.json({ Status: true, Message: "Leave deleted successfully" });
//   });
// });

// export { router as LeaveRouter };
// `;

// fs.writeFileSync('d:/xampp/htdocs/EmployeeMS/employeeMS/src/Component/Leave.jsx', leaveJsx, 'utf8');
// fs.writeFileSync('d:/xampp/htdocs/EmployeeMS/server/Routes/LeaveRoute.js', leaveRoute, 'utf8');

// console.log('Leave files created successfully');

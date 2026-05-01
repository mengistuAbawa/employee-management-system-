import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./ThemeContext";
import Login from "./Component/Login";
import Dashboard from "./Component/Dashboard";
import Home from "./Component/Home";
import Employee from "./Component/Employee";
import Category from "./Component/Category";
import Profile from "./Component/Profile";
import AddCategory from "./Component/AddCategory";
import AddEmployee from "./Component/AddEmployee";
import EditEmployee from "./Component/EditEmployee";
import EditCategory from "./Component/EditCategory";
import EditAdmin from "./Component/EditAdmin";
import AddAdmin from "./Component/AddAdmin";
import Start from "./Component/Start";
import EmployeeLogin from "./Component/EmployeeLogin";
import EmployeeDetail from "./Component/EmployeeDetail";
import Leave from "./Component/Leave";
import AddLeave from "./Component/AddLeave";
import Salary from "./Component/Salary";
import EmployeeDashboard from "./Component/EmployeeDashboard";
import EmployeeDashboardHome from "./Component/EmployeeDashboardHome";
import EmployeeAttendance from "./Component/EmployeeAttendance";
import EmployeeMyLeaves from "./Component/EmployeeMyLeaves";
import EmployeePayroll from "./Component/EmployeePayroll";
import EmployeeSettings from "./Component/EmployeeSettings";
import PendingEmployees from "./Component/PendingEmployees";
import ProtectedRoute from "./Component/ProtectedRoute";

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Start />} />
          <Route path="/adminlogin" element={<Login />} />
          <Route path="/employee_login" element={<EmployeeLogin />} />
          <Route path="/employee_detail/:id" element={<EmployeeDetail />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          >
            <Route index element={<Home />} />
            <Route path="employee" element={<Employee />} />
            <Route path="category" element={<Category />} />
            <Route path="profile" element={<Profile />} />
            <Route path="add_category" element={<AddCategory />} />
            <Route path="add_employee" element={<AddEmployee />} />
            <Route path="add_admin" element={<AddAdmin />} />
            <Route path="admin" element={<Home />} />
            <Route path="leaves" element={<Leave />} />
            <Route path="add_leave/:id" element={<AddLeave />} />
            <Route path="salary" element={<Salary />} />
            <Route path="edit_employee/:id" element={<EditEmployee />} />
            <Route path="edit_category/:id" element={<EditCategory />} />
            <Route path="edit_admin/:id" element={<EditAdmin />} />
            <Route path="pending_employees" element={<PendingEmployees />} />
          </Route>
          <Route
            path="/employee/dashboard"
            element={
              <ProtectedRoute>
                <EmployeeDashboard />
              </ProtectedRoute>
            }
          >
            <Route index element={<EmployeeDashboardHome />} />
            <Route path="attendance" element={<EmployeeAttendance />} />
            <Route path="leaves" element={<EmployeeMyLeaves />} />
            <Route path="payroll" element={<EmployeePayroll />} />
            <Route path="settings" element={<EmployeeSettings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

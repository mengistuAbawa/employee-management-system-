# Employee Management System (EMS)

## Features
- Dual dashboards: Admin & Employee
- Employee management w/ approval workflow
- Attendance tracking & approval
- Leave applications & approvals
- Department/Category management
- Salary updates & payroll views
- Profile management w/ image upload
- Responsive design + Dark mode
- JWT auth + MySQL backend

## Tech Stack
- **Frontend**: React 19 + Vite + Tailwind CSS + React Router
- **Backend**: Node.js + Express + MySQL + Multer + JWT + bcrypt
- **Database**: MySQL (see server/utils/*.sql)

## Quick Start
```bash
# Backend
cd server
npm install
npm start  # Runs on http://localhost:3000

# Frontend (new terminal)
cd employeeMS
npm install
npm run dev  # Runs on http://localhost:5173
```

## Default Login
- Admin: Register via UI (first admin auto-created)
- Employee: Self-register → Await admin approval

## API Endpoints
All protected by JWT. See server/Routes/*.js

## Database Setup
Run SQL scripts in `server/utils/` against your MySQL DB.

**Production-ready Full-Stack EMS! 🎉**


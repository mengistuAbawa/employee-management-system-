# Employee Management System (EMS)

## Features
- Dual dashboards: Admin & Employee
- Employee management w/ approval workflow
- Attendance tracking & approval
- Leave applications & approvals
- Department/Category management
- Salary updates & payroll views
- Profile management w. camera or disk image uploads
- Responsive design + Dark mode
- JWT authentication + PostgreSQL backend

## Tech Stack
- **Frontend**: React 19 + Vite + Tailwind CSS + React Router
- **Backend**: Node.js + Express + PostgreSQL + Multer + JWT + bcrypt
- **Database**: PostgreSQL (see `server/utils/postgres_schema.sql`)

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
Create the `employees` database in PostgreSQL, copy `server/.env.example` to `server/.env`, and run `server/utils/postgres_schema.sql`.

**Production-ready Full-Stack EMS! 🎉**

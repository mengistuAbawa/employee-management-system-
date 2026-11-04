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

## Initial administrator
Public administrator sign-up is disabled. To create the first administrator, set
`ADMIN_FULL_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in the server environment,
then run `npm run create-admin` from `server`. The command only creates an
administrator when the admin table is empty; remove the bootstrap variables after
the command completes.

For production, set a randomly generated `JWT_SECRET` (at least 32 characters),
`NODE_ENV=production`, and the frontend's exact origin in `FRONTEND_URL`. If the
frontend and API are on different sites, configure `COOKIE_SAME_SITE=none` and
serve both over HTTPS.

**Production-ready Full-Stack EMS! 🎉**

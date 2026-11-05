# Employee Management System (EMS)

## Features
- Dual dashboards: Admin & Employee
- Employee management w/ approval workflow
- Attendance tracking & approval
- Leave applications & approvals
- Department/Category management
- Salary updates & payroll views
- Performance reviews, employee acknowledgement & goals
- Profile management w. camera or disk image uploads
- Responsive design + Dark mode
- JWT authentication + PostgreSQL backend

## Tech Stack
- **Frontend**: React 19 + Vite + Tailwind CSS + React Router
- **Backend**: Node.js + Express + PostgreSQL + Multer + JWT + bcrypt
- **Database**: PostgreSQL (see `server/utils/postgres_schema.sql`)

## Quick Start (Windows Command Prompt)
From the repository root, start the backend in the first terminal:

```cmd
cd server
copy .env.example .env
npm install
npm run migrate
npm start
```

Then start the frontend from the repository root in a second terminal:

```cmd
cd employeeMS
npm install
npm run dev
```

## Default Login
- Admin: Create the first administrator with the secure bootstrap command below.
- Employee: Self-register → Await admin approval

## API Endpoints
All protected by JWT. See server/Routes/*.js

The employee dashboard uses `GET /employee/dashboard-summary` and `GET /employee/payroll/:id`. Both require an employee session and return only that employee's records. The dashboard summary includes profile, attendance, leave, finalized payroll, unread notifications, applicable announcements, and published performance reviews. Employee clock-in/out uses `POST /employee/attendance` with `{ "action": "clock_in" }` or `{ "action": "clock_out" }`; the server records the current database date and time. `GET /employee/attendance` returns personal history and the current database date. Employee profile-photo uploads accept JPEG, PNG, WebP, or GIF files up to 5 MB.

Administrators manage job positions with `GET /positions`, `POST /positions`, and `PUT /positions/:id`. Positions may be department-specific or organization-wide; employee assignment is optional for compatibility with existing records. Deactivate positions instead of deleting them so employee history remains linked. Departments with assigned employees or positions cannot be deleted until those assignments are changed.

Admins review attendance through paginated `GET /attendances` (optional `status`, `date`, `search`, `limit`, and `offset` filters), then use `PUT /attendances/:id/approve` or `PUT /attendances/:id/reject`. Leave requests are submitted by employees at `POST /employee/leaves` or by admins at `POST /leaves`, and reviewed with `PUT /leaves/:id/approve` or `PUT /leaves/:id/reject`. Active/approved employees cannot submit overlapping pending or approved leave dates. Approvals update the normalized leave request, audit history, and yearly leave balances. Admins configure yearly entitlements with `GET /leave-balances/:employeeId?year=YYYY` and `PUT /leave-balances`; the employee dashboard exposes configured balances and used days.

Admins manage salary history through employee creation/editing and `PUT /update_salary/:id`; each salary change is recorded with its effective date and audit entry. Payroll runs are managed at `GET /payroll/runs`, `GET /payroll/runs/:id`, and `POST /payroll/runs`. A run covers exactly one calendar month and uses the full monthly base salary effective on the first day of that month; it does not prorate partial months. Any recorded salary currency must match the payroll run currency. Draft items are editable with `PUT /payroll/runs/:runId/items/:itemId`, then finalized with `POST /payroll/runs/:id/finalize`; net pay is base pay + overtime + bonus - deductions. Drafts can be deleted with `DELETE /payroll/runs/:id`. Finalized payroll and its payslip records are immutable. Employees can view only their own finalized payroll history at `GET /employee/payroll/:id` and their own printable payslip at `GET /employee/payroll/:id/payslips/:payslipId`.

Admins manage performance reviews with `GET /performance/reviews`, `POST /performance/reviews`, and `GET`/`PUT`/`DELETE /performance/reviews/:id`. Draft reviews support a 0–5 rating, summary, and up to 25 goals; only drafts can be edited or deleted. `POST /performance/reviews/:id/submit` publishes a complete review, after which it is read-only. Employees can access only their own submitted/acknowledged reviews at `GET /employee/performance/:id` and acknowledge receipt with `POST /employee/performance/:id/reviews/:reviewId/acknowledge`. Acknowledgement confirms receipt, not agreement. Review changes and acknowledgement actions are audited.

Admins manage announcements with `GET /announcements`, `POST /announcements`, `PUT /announcements/:id`, `POST /announcements/:id/publish`, and `DELETE /announcements/:id`. Announcements can target selected departments or all active, approved employees, and may have an optional future expiration. Publishing creates deduplicated in-app notifications for the selected audience; expired announcements cannot be published, and published announcements must be unpublished before deletion. Admins can send targeted in-app messages with `POST /notifications` using an `audience` of `all`, `department`, or `employee`, and review recent notifications with `GET /notifications`. Employees can view their own inbox with `GET /employee/notifications/:id`, mark one notification read with `PUT /employee/notifications/:id/:notificationId/read`, or mark all as read with `PUT /employee/notifications/:id/read-all`. The employee routes enforce ownership against the authenticated account. Announcement and notification changes are recorded in the audit log.

Admins can generate filtered workforce, attendance, absence-estimate, leave, finalized-payroll, and performance reports with `GET /reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` (date range limited to 366 days). Workforce and department totals reflect current employee status; other reports use the selected dates. Detailed report lists are capped at 1,000 rows, with a truncation indicator, while summary counts remain complete. Absence estimates use the current active approved workforce, weekdays, recorded clock-ins, and approved leave; no holiday calendar or historical employment dates are configured. Payroll totals stay grouped by finalized run and currency. The Reports & Analytics page exports the selected table as an Excel-compatible CSV and supports browser print / Save as PDF.

The admin dashboard loads its organization metrics, department distribution, recent registrations, recent audit activity, and admin list from authenticated PostgreSQL APIs. It distinguishes approved active employees from pending accounts, shows current salary commitments and finalized monthly payroll grouped by currency, and links directly to the payroll run workflow. Use Refresh data to reload dashboard values.

## Database Setup and Migrations
Create the PostgreSQL database named `employees`, configure `server/.env`, then run:

```cmd
cd server
npm run migrate
```

Migrations are ordered, transactional, checksummed, and safe to rerun. They retain the existing admin, employee, attendance, leave, department, and category records. If a migration fails, it reports the migration filename and rolls back that migration; resolve the reported data conflict before retrying. Back up the database before applying migrations to production.

For deployments that intentionally apply migrations during server startup, set `AUTO_MIGRATE=true`. `AUTO_INIT_SCHEMA=true` is retained as a backward-compatible alias. Otherwise run `npm run migrate` as a deployment step before starting the API.

The base schema in `server/utils/postgres_schema.sql` initializes the legacy tables. Incremental changes belong in `server/migrations/` and must not edit migrations that have already been applied. The migrations create normalized account and HR tables, keep the legacy tables available for compatibility, add plural `employees`/`departments` views, and backfill existing account, leave, and salary records without creating sample employees. They seed only the existing leave-type choices and a configurable UTC timezone setting.

Configure `.env` before running migrations. For production, back up PostgreSQL first and run the migration step once as part of deployment.

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

All sign-ins and protected requests use the linked `users` account as the
authority for role and active status; legacy admin/employee profile IDs remain
in API responses for compatibility. Employee self-registration creates a
pending account without accepting a salary value, and an administrator must
approve it before sign-in. New accounts and credential/profile changes are
written to the account and legacy profile tables transactionally. Admin and
employee passwords must be at least 12 characters and no more than bcrypt's
72-byte input limit.

**Production-ready Full-Stack EMS! 🎉**

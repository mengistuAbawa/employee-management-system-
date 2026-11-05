import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Award,
  Bell,
  CalendarCheck2,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

const services = [
  { icon: Users, title: "Employee records", description: "Keep team profiles, departments, and job details organized." },
  { icon: Clock3, title: "Attendance", description: "Record working hours and give managers a clear review workflow." },
  { icon: CalendarCheck2, title: "Leave management", description: "Submit time-off requests and follow approvals in one place." },
  { icon: CircleDollarSign, title: "Payroll", description: "Review salary information and manage monthly payroll runs." },
  { icon: Award, title: "Performance", description: "Create structured reviews, goals, and employee acknowledgements." },
  { icon: Bell, title: "Announcements", description: "Share important updates with the right teams." },
];

const Start = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-16 pb-8">
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-10 text-white shadow-2xl shadow-blue-950/15 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-700/60 via-slate-950 to-slate-950" />
        <div aria-hidden="true" className="absolute -right-28 -top-32 -z-10 h-96 w-96 rounded-full border border-white/10 sm:h-[32rem] sm:w-[32rem]" />
        <div aria-hidden="true" className="absolute -right-10 -top-14 -z-10 h-72 w-72 rounded-full border border-white/10 sm:h-96 sm:w-96" />
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-blue-100">
              <Sparkles size={14} /> PEOPLE OPERATIONS, MADE CLEAR
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Better tools for a better organized workplace.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Bring employee services and essential HR workflows together in one secure, easy-to-use workspace.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate("/employee_login")}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg transition hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Employee portal <ArrowRight size={17} />
              </button>
              <button
                type="button"
                onClick={() => navigate("/adminlogin")}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ShieldCheck size={17} /> Administrator access
              </button>
            </div>
            <div className="mt-8 flex items-center gap-2 text-sm text-slate-400">
              <ShieldCheck size={16} className="text-emerald-400" />
              Secure role-based access for employees and administrators
            </div>
          </div>

          <div className="mx-auto w-full max-w-md">
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 shadow-2xl backdrop-blur sm:p-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-blue-200">EmployeeMS</p>
                  <h2 className="mt-1 text-lg font-semibold">One connected workspace</h2>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/20 text-blue-200"><Users size={20} /></span>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  [Clock3, "Workforce & attendance", "Profiles, departments, and time records"],
                  [FileCheck2, "Requests & approvals", "Leave applications and review status"],
                  [CircleDollarSign, "Payroll & performance", "Salary workflows, reviews, and goals"],
                  [Bell, "Organization updates", "Announcements and employee notifications"],
                ].map(([Icon, title, description]) => (
                  <div key={title} className="flex items-center gap-3 rounded-xl border border-white/5 bg-slate-900/60 p-3.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-500/15 text-blue-200">{React.createElement(Icon, { size: 19 })}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{title}</p>
                      <p className="mt-0.5 text-xs leading-5 text-slate-400">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 border-t border-white/10 pt-4 text-xs leading-5 text-slate-400">
                Clear tools for daily work, with permissions that respect each role.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="overview-heading">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300">A complete HR workspace</p>
          <h2 id="overview-heading" className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
            Everything your team needs to stay in sync
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-600 dark:text-gray-400">
            Practical tools help employees handle everyday tasks while giving administrators the oversight to manage operations.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map(({ icon: Icon, title, description }) => (
            <article key={title} className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-900">
              <span className="mb-5 inline-flex rounded-xl bg-blue-50 p-3 text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-950/60 dark:text-blue-300">
                {React.createElement(Icon, { size: 21 })}
              </span>
              <h3 className="text-base font-semibold text-slate-950 dark:text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-gray-400">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-9" aria-labelledby="how-to-heading">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300">Getting started</p>
            <h2 id="how-to-heading" className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">A straightforward experience, from sign-in onward.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-gray-400">
              Sign in to your role-specific portal to access the tools and information available to you.
            </p>
          </div>
          <ol className="grid gap-5 sm:grid-cols-3">
            {[
              ["01", "Choose your portal", "Sign in as an employee or administrator using your organization account."],
              ["02", "Take care of daily work", "Record attendance, request leave, and keep up with personal updates."],
              ["03", "Manage with confidence", "Authorized administrators handle records, approvals, and payroll."],
            ].map(([number, title, description]) => (
              <li key={number} className="border-l-2 border-blue-200 pl-4 dark:border-blue-900">
                <span className="text-xs font-bold tracking-widest text-blue-700 dark:text-blue-300">{number}</span>
                <h3 className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{title}</h3>
                <p className="mt-1.5 text-sm leading-5 text-slate-600 dark:text-gray-400">{description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="flex flex-col gap-5 rounded-2xl bg-blue-50 px-6 py-7 dark:bg-blue-950/30 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Ready to access your workspace?</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">Choose the secure portal that matches your role.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => navigate("/employee_login")} className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800">
            Employee sign in
          </button>
          <button type="button" onClick={() => navigate("/adminlogin")} className="rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-800 transition hover:bg-blue-100 dark:border-blue-900 dark:bg-gray-900 dark:text-blue-200 dark:hover:bg-blue-950/40">
            Administrator sign in
          </button>
        </div>
      </section>
    </div>
  );
};

export default Start;

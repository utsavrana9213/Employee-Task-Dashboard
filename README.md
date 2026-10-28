# TaskFlow — Employee Task Dashboard

TaskFlow is a full-stack demo built for Aulten Digital Private Limited’s practical assignment. It gives employees one place to see work coming from two simulated sources—CRM and Helpdesk—and gives an administrator tools to manage demo tasks, employees, and support inquiries.

> **Demo data only:** CRM and Helpdesk are mock REST APIs in this project. They do not connect to or change a real CRM or ticketing system.

## Try the hosted demo

- **Website:** https://taskflow-employee-dashboard.vercel.app
- **Admin sign-in page:** https://taskflow-employee-dashboard.vercel.app/admin/login
- **API health:** https://taskflow-employee-dashboard.vercel.app/api/health
- **API reference:** https://taskflow-employee-dashboard.vercel.app/openapi.yaml
- **GitHub:** https://github.com/utsavrana9213/Employee-Task-Dashboard

Employees can create an account from the website. The hosted production admin password is Demo sign-ins:
- Admin: admin@gmail.com / 12345678
- Employee: alex@taskflow.demo / Demo1234!

## How it meets the assignment

1. **One employee dashboard:** The React app requests CRM and Helpdesk tasks from separate REST endpoints, then combines them in the employee workspace.
2. **Priority based on urgency and deadline:** Overdue critical work ranks first, followed by overdue high-urgency work, other overdue work, and work due soon. Completed tasks are not marked overdue.
3. **Filters:** Employees can filter and search their own work. Admins can also filter by employee, status, source, urgency, and search text.
4. **Clickable source links:** Each task opens a TaskFlow source-detail screen showing its simulated CRM or Helpdesk record.
5. **Errors and mobile layout:** API errors are shown with a retry option; if one mock source is unavailable, the other source can still load. Layouts adapt for desktop and mobile screens.

## Main features

### Employee workspace

- Register with an email and password, sign in, sign out, and edit profile details.
- View summary cards, assigned tasks, task details, deadlines, urgency, and task history.
- Browse all tasks, only your tasks, overdue tasks, CRM tasks, and Helpdesk tasks.
- Search and filter tasks, then open the task’s simulated source record.
- Submit support inquiries, view your inquiry history, and read administrator replies.

### Admin workspace

- View current task and employee totals, status breakdowns, source breakdowns, and recent activity.
- Search and filter the demo task list; assign tasks and update status, urgency, and deadline.
- Search employee accounts, review assignments, and activate or deactivate accounts.
- Review employee inquiries, change inquiry status, add private notes, and send an in-app reply.
- Review the activity log.

Inquiry replies appear inside TaskFlow. The demo does not send email.

## Page guide

| Page | Route | What to review |
| --- | --- | --- |
| Employee sign-in | `/` | Employee login and links to registration and admin sign-in. |
| Create account | `/register` | Employee self-registration. |
| Employee dashboard | `/dashboard` | Task overview, priority ordering, and summary cards. |
| Task lists | `/tasks`, `/tasks/mine`, `/tasks/overdue` | Search, status and urgency filters, and task details. |
| CRM and Helpdesk | `/tasks/crm`, `/tasks/helpdesk` | Separate mock-source task lists and source links. |
| Employee inquiries | `/inquiries`, `/inquiries/new` | Submit an inquiry and view replies. |
| Admin overview | `/admin/dashboard` | Workspace totals, charts, and recent activity. |
| Admin tasks | `/admin/tasks` | Filter by employee/status/source and edit demo tasks. |
| Admin employees | `/admin/employees` | Review employee accounts and their assignments. |
| Admin inquiries | `/admin/inquiries` | Update inquiries and add private notes or replies. |
| Admin activity | `/admin/activity` | Review recorded actions. |

## Technology used

| Area | Technology | What it does |
| --- | --- | --- |
| Frontend | JavaScript, React , React Router | Renders the employee and admin pages and handles navigation. |
| Build and local web server | Vite | Runs the frontend during development and creates the production files. |
| API backend | Node.js and Express | Provides the REST endpoints and enforces access rules. |
| Validation and security | Zod, bcryptjs, JWT, HttpOnly cookies, express-rate-limit | Checks request data, hashes passwords, protects sessions, and limits repeated sign-in attempts. |
| Database access | SQLite locally; `@libsql/client` and Turso in the hosted demo | Saves users, tasks, task history, inquiries, responses, and activity. |
| Hosting | Vercel | Serves the website and runs the Express API as a serverless function. |

## How the app works

1. The employee signs in or creates an account.
2. The React dashboard calls `/api/crm/tasks` and `/api/helpdesk/tasks` independently.
3. Express checks the session and limits employee results to that employee’s own tasks. Admin routes require an administrator session.
4. The UI combines the results, applies priority ordering, and displays any source that loaded successfully.
5. Changes made in TaskFlow—such as a task status or inquiry reply—are saved to the demo database. They are not written back to a real CRM or Helpdesk product.

The Vite development server forwards `/api` requests to Express locally. In production, Vercel serves the static React build and routes `/api/*` to the Express function.

## Demo accounts

The **admin account below is local-development only**. The employee accounts are seeded demo users in both the local app and hosted demo and can see only synthetic sample records. Do not reuse any demo password for a real account.

| Role | Email | Password | Sign-in page |
| --- | --- | --- | --- |
| Admin | `admin@gmail.com` | `12345678` | `http://localhost:5173/admin/login` |
| Employee — Alex | `alex@taskflow.demo` | `Demo1234!` | `http://localhost:5173/` |
| Employee — Jamie | `jamie@taskflow.demo` | `Demo1234!` | `http://localhost:5173/` |
| Employee — Taylor | `taylor@taskflow.demo` | `Demo1234!` | `http://localhost:5173/` |
| Employee — Riley | `riley@taskflow.demo` | `Demo1234!` | `http://localhost:5173/` |

Employees can also register their own accounts on the hosted app. Hosted admin credentials are separate from the local demo credentials and are not stored in this public repository.

## Run it on your computer

You need Node.js and npm installed.

```sh
git clone https://github.com/utsavrana9213/Employee-Task-Dashboard.git
cd Employee-Task-Dashboard
npm install
cp .env.example .env
npm run dev
```

Open **http://localhost:5173**. The Express API listens on **http://localhost:4000**. The first API request creates the local database at `data/taskflow.db` and adds sample employees, tasks, and inquiries. That database file is ignored by Git.

Useful commands:

```sh
npm run dev       # Start Vite and Express together
npm run build     # Build the frontend for deployment
npm start         # Start the Express API server
npm test          # Run the task-priority test suite
```

## REST API

The API base is `http://localhost:4000/api` locally and `https://taskflow-employee-dashboard.vercel.app/api` in production. The full OpenAPI description is in [`openapi.yaml`](openapi.yaml) and is also hosted at the API reference link above.

### Sign-in and health

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Public | Check API and database status. |
| `POST` | `/api/auth/register` | Public | Create an employee account. |
| `POST` | `/api/auth/login` | Public | Sign in an employee. |
| `POST` | `/api/admin/login` | Public, rate-limited | Sign in an administrator. |
| `POST` | `/api/auth/logout` | Signed in | Sign out and clear the session cookie. |
| `GET` | `/api/auth/me` | Signed in | Return the current account. |
| `PATCH` | `/api/profile` | Employee | Update allowed profile fields. |

### Tasks and employee support

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/crm/tasks` | Signed in | List CRM mock tasks. |
| `GET` | `/api/helpdesk/tasks` | Signed in | List Helpdesk mock tasks. |
| `GET` | `/api/tasks` | Signed in | List tasks from both mock sources. |
| `GET` | `/api/tasks/:id` | Signed in | Read a task and visible history. |
| `GET` | `/api/employees` | Signed in | Read the employee directory. |
| `POST` | `/api/inquiries` | Signed in | Submit a support inquiry. |
| `GET` | `/api/inquiries/my` | Signed in | View your inquiries and replies. |

### Admin management

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/admin/stats` | Dashboard totals and recent activity. |
| `GET` | `/api/admin/tasks` | Search and filter all tasks. |
| `PATCH` | `/api/admin/tasks/:id` | Assign a task or change its status, urgency, or deadline. |
| `GET` | `/api/admin/employees` | Search employees and see task counts. |
| `GET` | `/api/admin/employees/:id` | Read an employee profile and assignments. |
| `PATCH` | `/api/admin/employees/:id` | Activate or deactivate an employee account. |
| `GET` | `/api/admin/inquiries` | Search and filter the inquiry queue. |
| `GET` | `/api/admin/inquiries/:id` | Read an inquiry, replies, and status history. |
| `PATCH` | `/api/admin/inquiries/:id` | Update inquiry status and private notes. |
| `POST` | `/api/admin/inquiries/:id/reply` | Add an in-app reply for the employee. |
| `GET` | `/api/admin/activity` | Read recent activity. |

Task list routes accept `status`, `urgency`, `search`, and `sort`. The combined and admin task routes also accept `source`; admins may use `employeeId` to filter by employee. Invalid filters return `400`, unauthenticated requests return `401`, and employees trying to access another employee’s records receive `403`.

Example local requests after signing in:

```sh
curl -c /tmp/taskflow.cookies \
  -H 'Content-Type: application/json' \
  -d '{"email":"alex@taskflow.demo","password":"Demo1234!"}' \
  http://localhost:4000/api/auth/login

curl -b /tmp/taskflow.cookies \
  'http://localhost:4000/api/crm/tasks?status=Pending&sort=deadline'

curl -b /tmp/taskflow.cookies \
  'http://localhost:4000/api/helpdesk/tasks?status=Pending&sort=deadline'
```

## Data and configuration

- Local development uses a SQLite database file under `data/`.
- Vercel uses the persistent Turso database connected to this project.
- Database tokens and signing keys belong in private environment variables, never in GitHub.
- The hosted demo has a separate admin password. The production secret is not included in this public README.
- Google sign-in is not enabled in the UI. Email/password is the active sign-in method. The optional Google verification endpoint requires OAuth configuration before it can be used.

Environment variables are documented in [`.env.example`](.env.example). Production deployments need private values for `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET`, and a strong `DEMO_ADMIN_PASSWORD` set before the production database is first initialized.

## Project map

```text
src/             React pages, styling, and API client
server/app.js    Express REST routes and access checks
server/db.js     Database connection, schema, and demo seed data
server/data.js   Sample CRM and Helpdesk tasks and users
api/             Vercel function adapters for the Express app
openapi.yaml     Machine-readable REST API reference
public/          Static files copied into the Vite production build
tests/           Task-priority unit tests
```

## Security and demo limitations

- Passwords are stored as bcrypt hashes; sessions use signed HttpOnly cookies.
- Admin routes check the user’s role on the server. Employee routes only return the signed-in employee’s allowed data.
- Sign-in attempts are rate-limited and input is validated before it is saved.
- Production uses a separately configured strong admin password; the local `1234` password must never be used on a public deployment.
- CRM and Helpdesk records are simulated. Task edits stay in the TaskFlow demo database and do not change external applications.
- In-app inquiries and replies are stored in TaskFlow; they do not send email.

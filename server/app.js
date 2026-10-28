import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { initDb, query } from './db.js';

const app = express();
const googleClient = new OAuth2Client();
const cookieName = 'taskflow_session';
const statuses = ['Pending', 'In Progress', 'Completed'];
const urgencyLevels = ['Critical', 'High', 'Medium', 'Low'];
const inquiryStatuses = ['New', 'In Progress', 'Resolved', 'Closed'];
const inquiryCategories = ['General Inquiry', 'Task Related', 'Technical Support', 'Account Support', 'Feedback', 'Other'];

app.disable('x-powered-by');
app.use(cors({
  origin(origin, callback) {
    const allowed = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((item) => item.trim());
    const vercelHosts = [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean).map((host) => host.startsWith('http') ? host : `https://${host}`);
    allowed.push(...vercelHosts);
    if (!origin || allowed.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());

const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many sign-in attempts. Please wait a little and try again.' } });
const safeUser = (row) => row && ({ id: row.id, fullName: row.full_name, email: row.email, role: row.role, status: row.status, createdAt: row.created_at });
const makeId = (prefix) => `${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`;
const now = () => new Date().toISOString();

function signToken(user) {
  const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'local-development-only-change-me');
  if (!secret) throw Object.assign(new Error('Server authentication is not configured.'), { status: 503 });
  return jwt.sign({ sub: user.id, role: user.role }, secret, { expiresIn: '7d', issuer: 'taskflow-demo', audience: 'taskflow-web' });
}

function setSession(res, user) {
  const production = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  res.cookie(cookieName, signToken(user), { httpOnly: true, secure: production, sameSite: 'lax', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 });
}

async function requireAuth(req, res, next) {
  try {
    const token = req.cookies[cookieName];
    const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'local-development-only-change-me');
    if (!token || !secret) return res.status(401).json({ error: 'Please sign in to continue.' });
    const payload = jwt.verify(token, secret, { issuer: 'taskflow-demo', audience: 'taskflow-web' });
    const result = await query('SELECT * FROM users WHERE id = ?', [payload.sub]);
    const user = result.rows[0];
    if (!user || user.status !== 'active') return res.status(401).json({ error: 'This account is unavailable. Contact an administrator.' });
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Administrator access is required.' });
  return next();
}

async function logActivity(actor, action, entityType, entityId) {
  await query('INSERT INTO activity_logs(actor_id,actor_name,action,entity_type,entity_id,created_at) VALUES(?,?,?,?,?,?)', [actor?.id || null, actor?.full_name || 'System', action, entityType, entityId || null, now()]);
}

app.use('/api', async (_req, res, next) => {
  try { await initDb(); next(); }
  catch (error) { res.status(503).json({ error: error.message || 'The database is unavailable. Check the deployment configuration.' }); }
});

app.get('/api/health', async (_req, res) => {
  const result = await query('SELECT COUNT(*) AS tasks FROM tasks');
  res.json({ ok: true, service: 'TaskFlow API', database: 'connected', tasks: Number(result.rows[0].tasks), timestamp: now() });
});

app.post('/api/auth/register', authLimit, async (req, res) => {
  const parsed = z.object({ fullName: z.string().trim().min(2).max(90), email: z.string().trim().email().max(180), password: z.string().min(8).max(100) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Please check your details.' });
  const { fullName, password } = parsed.data;
  const email = parsed.data.email.toLowerCase();
  const duplicate = await query('SELECT id FROM users WHERE email = ?', [email]);
  if (duplicate.rows.length) return res.status(409).json({ error: 'An account with this email already exists.' });
  const user = { id: randomUUID(), full_name: fullName, email, role: 'employee', status: 'active', created_at: now() };
  const hash = await bcrypt.hash(password, 12);
  await query('INSERT INTO users(id,full_name,email,password_hash,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)', [user.id, user.full_name, user.email, hash, user.role, user.status, user.created_at, user.created_at]);
  setSession(res, user);
  await logActivity(user, 'Created employee account', 'user', user.id);
  return res.status(201).json({ user: safeUser(user) });
});

app.post('/api/auth/login', authLimit, async (req, res) => {
  const parsed = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(100) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email and password.' });
  const found = await query('SELECT * FROM users WHERE email = ?', [parsed.data.email.toLowerCase()]);
  const user = found.rows[0];
  if (!user || user.role !== 'employee' || !user.password_hash || !(await bcrypt.compare(parsed.data.password, user.password_hash))) return res.status(401).json({ error: 'Email or password is incorrect.' });
  if (user.status !== 'active') return res.status(403).json({ error: 'This account has been deactivated. Contact your administrator.' });
  setSession(res, user);
  await logActivity(user, 'Signed in', 'user', user.id);
  return res.json({ user: safeUser(user) });
});

app.post('/api/admin/login', authLimit, async (req, res) => {
  const parsed = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(100) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid admin email and password.' });
  const found = await query('SELECT * FROM users WHERE email = ? AND role = ?', [parsed.data.email.toLowerCase(), 'admin']);
  const user = found.rows[0];
  if (!user || !user.password_hash || !(await bcrypt.compare(parsed.data.password, user.password_hash))) return res.status(401).json({ error: 'Admin email or password is incorrect.' });
  setSession(res, user);
  await logActivity(user, 'Signed in to admin console', 'user', user.id);
  return res.json({ user: safeUser(user) });
});

app.post('/api/auth/google', authLimit, async (req, res) => {
  const credential = z.string().min(20).safeParse(req.body?.credential);
  if (!credential.success) return res.status(400).json({ error: 'Google sign-in did not return a valid credential.' });
  if (!process.env.GOOGLE_CLIENT_ID) return res.status(503).json({ error: 'Google sign-in is not configured yet. Add GOOGLE_CLIENT_ID to the server environment.' });
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential.data, audience: process.env.GOOGLE_CLIENT_ID });
    const profile = ticket.getPayload();
    if (!profile?.email || !profile.email_verified || !profile.sub) return res.status(401).json({ error: 'Google could not verify this email address.' });
    let found = await query('SELECT * FROM users WHERE email = ?', [profile.email.toLowerCase()]);
    let user = found.rows[0];
    if (user?.role === 'admin') return res.status(403).json({ error: 'Administrator accounts must use the admin login page.' });
    if (!user) {
      const created = { id: randomUUID(), full_name: profile.name || profile.email.split('@')[0], email: profile.email.toLowerCase(), role: 'employee', status: 'active', created_at: now() };
      await query('INSERT INTO users(id,full_name,email,google_sub,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)', [created.id, created.full_name, created.email, profile.sub, created.role, created.status, created.created_at, created.created_at]);
      user = { ...created, google_sub: profile.sub };
      await logActivity(user, 'Registered with Google', 'user', user.id);
    } else {
      if (user.status !== 'active') return res.status(403).json({ error: 'This account has been deactivated. Contact your administrator.' });
      await query('UPDATE users SET google_sub = COALESCE(google_sub, ?), updated_at = ? WHERE id = ?', [profile.sub, now(), user.id]);
    }
    setSession(res, user);
    return res.json({ user: safeUser(user) });
  } catch {
    return res.status(401).json({ error: 'Google sign-in could not be verified. Please try again.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(cookieName, { httpOnly: true, secure: process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL), sameSite: 'lax', path: '/' });
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: safeUser(req.user) }));

app.patch('/api/profile', requireAuth, async (req, res) => {
  const parsed = z.object({ fullName: z.string().trim().min(2).max(90) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a name with at least 2 characters.' });
  await query('UPDATE users SET full_name = ?, updated_at = ? WHERE id = ?', [parsed.data.fullName, now(), req.user.id]);
  const updated = { ...req.user, full_name: parsed.data.fullName };
  await logActivity(updated, 'Updated profile', 'user', updated.id);
  res.json({ user: safeUser(updated) });
});

const taskFilterSchema = z.object({
  employeeId: z.string().trim().min(1).max(80).optional(),
  status: z.enum(statuses).optional(),
  source: z.enum(['CRM', 'Helpdesk']).optional(),
  urgency: z.enum(urgencyLevels).optional(),
  search: z.string().trim().max(120).optional(),
  sort: z.enum(['deadline', 'deadline_desc', 'urgency', 'newest']).optional(),
});

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

async function listTasks(req, res, fixedSource) {
  const parsed = taskFilterSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid task filter.' });
  const filters = parsed.data;
  if (fixedSource && filters.source && filters.source !== fixedSource) {
    return res.status(400).json({ error: `The ${fixedSource} endpoint cannot return ${filters.source} tasks.` });
  }
  if (req.user.role !== 'admin' && filters.employeeId && filters.employeeId !== req.user.id) {
    return res.status(403).json({ error: 'Employees can only view their own tasks.' });
  }

  const clauses = [];
  const args = [];
  const source = fixedSource || filters.source;
  if (source) { clauses.push('source = ?'); args.push(source); }
  if (req.user.role === 'admin') {
    if (filters.employeeId) { clauses.push('employee_id = ?'); args.push(filters.employeeId); }
  } else {
    clauses.push('employee_id = ?'); args.push(req.user.id);
  }
  if (filters.status) { clauses.push('status = ?'); args.push(filters.status); }
  if (filters.urgency) { clauses.push('urgency = ?'); args.push(filters.urgency); }
  if (filters.search) {
    clauses.push('(id LIKE ? OR title LIKE ? OR description LIKE ? OR employee_name LIKE ?)');
    const match = `%${filters.search}%`;
    args.push(match, match, match, match);
  }
  const orderBy = {
    deadline: 'deadline ASC',
    deadline_desc: 'deadline DESC',
    newest: 'created_at DESC',
    urgency: "CASE urgency WHEN 'Critical' THEN 0 WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END, deadline ASC",
  }[filters.sort || 'deadline'];
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await query(`SELECT * FROM tasks ${where} ORDER BY ${orderBy}, id ASC`, args);
  return res.json({ tasks: result.rows, count: result.rows.length, filters: { ...filters, source } });
}

app.get('/api/crm/tasks', requireAuth, asyncRoute((req, res) => listTasks(req, res, 'CRM')));
app.get('/api/helpdesk/tasks', requireAuth, asyncRoute((req, res) => listTasks(req, res, 'Helpdesk')));
app.get('/api/tasks', requireAuth, asyncRoute((req, res) => listTasks(req, res)));
app.get('/api/tasks/:id', requireAuth, async (req, res) => {
  const result = await query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  const task = result.rows[0];
  if (!task || (req.user.role !== 'admin' && task.employee_id !== req.user.id)) return res.status(404).json({ error: 'Task not found.' });
  const history = (await query('SELECT h.*, u.full_name AS actor_name FROM task_history h LEFT JOIN users u ON u.id = h.actor_id WHERE task_id = ? ORDER BY h.created_at DESC', [task.id])).rows;
  res.json({ task, history });
});

app.get('/api/employees', requireAuth, async (req, res) => {
  const sql = `SELECT u.id,u.full_name,u.email,u.role,u.status,u.created_at,COUNT(t.id) AS assigned_tasks FROM users u LEFT JOIN tasks t ON t.employee_id=u.id WHERE u.role='employee' AND u.status='active' GROUP BY u.id ORDER BY u.full_name`;
  const rows = (await query(sql)).rows;
  res.json({ employees: req.user.role === 'admin' ? rows : rows.filter((item) => item.id === req.user.id) });
});

app.post('/api/inquiries', requireAuth, async (req, res) => {
  const parsed = z.object({
    fullName: z.string().trim().min(2).max(90), email: z.string().trim().email().max(180),
    subject: z.string().trim().min(4).max(150), category: z.enum(inquiryCategories),
    relatedTaskId: z.string().trim().max(40).optional().nullable(), message: z.string().trim().min(10).max(5000),
    priority: z.enum(['Low', 'Normal', 'High', 'Urgent']),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Please check the inquiry details.' });
  const data = parsed.data;
  if (data.relatedTaskId) {
    const taskResult = await query('SELECT employee_id FROM tasks WHERE id = ?', [data.relatedTaskId]);
    if (!taskResult.rows[0] || (req.user.role !== 'admin' && taskResult.rows[0].employee_id !== req.user.id)) return res.status(400).json({ error: 'Choose one of your tasks as the related task.' });
  }
  const id = makeId('INQ');
  const createdAt = now();
  await query('INSERT INTO inquiries(id,user_id,full_name,email,subject,category,related_task_id,message,priority,status,internal_notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)', [id, req.user.id, data.fullName, data.email.toLowerCase(), data.subject, data.category, data.relatedTaskId || null, data.message, data.priority, 'New', '', createdAt, createdAt]);
  await query('INSERT INTO inquiry_history(inquiry_id,actor_id,action,old_value,new_value,created_at) VALUES(?,?,?,?,?,?)', [id, req.user.id, 'Inquiry submitted', null, 'New', createdAt]);
  await logActivity(req.user, 'Submitted an inquiry', 'inquiry', id);
  const result = await query('SELECT * FROM inquiries WHERE id = ?', [id]);
  res.status(201).json({ inquiry: result.rows[0] });
});

app.get('/api/inquiries/my', requireAuth, async (req, res) => {
  const inquiries = (await query('SELECT id,user_id,full_name,email,subject,category,related_task_id,message,priority,status,created_at,updated_at FROM inquiries WHERE user_id = ? ORDER BY created_at DESC', [req.user.id])).rows;
  const rows = [];
  for (const inquiry of inquiries) {
    const responses = (await query('SELECT response,created_at FROM inquiry_responses WHERE inquiry_id = ? ORDER BY created_at DESC', [inquiry.id])).rows;
    rows.push({ ...inquiry, responses });
  }
  res.json({ inquiries: rows });
});

app.get('/api/admin/stats', requireAuth, requireAdmin, async (_req, res) => {
  const [users, employees, tasks, inquiries] = await Promise.all([
    query(`SELECT COUNT(*) AS total FROM users WHERE role='employee'`),
    query(`SELECT COUNT(*) AS total, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active FROM users WHERE role='employee'`),
    query(`SELECT COUNT(*) AS total, SUM(CASE WHEN status='Pending' THEN 1 ELSE 0 END) AS pending, SUM(CASE WHEN status='In Progress' THEN 1 ELSE 0 END) AS in_progress, SUM(CASE WHEN status='Completed' THEN 1 ELSE 0 END) AS completed, SUM(CASE WHEN status!='Completed' AND deadline < ? THEN 1 ELSE 0 END) AS overdue FROM tasks`, [now()]),
    query(`SELECT COUNT(*) AS total, SUM(CASE WHEN status='New' THEN 1 ELSE 0 END) AS new, SUM(CASE WHEN status='In Progress' THEN 1 ELSE 0 END) AS in_progress, SUM(CASE WHEN status='Resolved' THEN 1 ELSE 0 END) AS resolved FROM inquiries`),
  ]);
  const recentInquiries = (await query('SELECT id,full_name,email,subject,category,priority,status,created_at FROM inquiries ORDER BY created_at DESC LIMIT 5')).rows;
  const recentUsers = (await query(`SELECT id,full_name,email,role,created_at FROM users WHERE role='employee' ORDER BY created_at DESC LIMIT 5`)).rows;
  const sourceDistribution = (await query('SELECT source,COUNT(*) AS count FROM tasks GROUP BY source')).rows;
  const taskStatusDistribution = (await query('SELECT status,COUNT(*) AS count FROM tasks GROUP BY status')).rows;
  const activity = (await query('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 8')).rows;
  res.json({
    users: Number(users.rows[0].total || 0), employees: Number(employees.rows[0].total || 0), activeEmployees: Number(employees.rows[0].active || 0),
    tasks: Object.fromEntries(Object.entries(tasks.rows[0]).map(([key, value]) => [key, Number(value || 0)])),
    inquiries: Object.fromEntries(Object.entries(inquiries.rows[0]).map(([key, value]) => [key, Number(value || 0)])),
    recentInquiries, recentUsers, sourceDistribution, taskStatusDistribution, activity,
  });
});

app.get('/api/admin/inquiries', requireAuth, requireAdmin, async (req, res) => {
  const clauses = [];
  const args = [];
  if (req.query.status && inquiryStatuses.includes(req.query.status)) { clauses.push('status = ?'); args.push(req.query.status); }
  if (req.query.category && inquiryCategories.includes(req.query.category)) { clauses.push('category = ?'); args.push(req.query.category); }
  if (req.query.priority && ['Low', 'Normal', 'High', 'Urgent'].includes(req.query.priority)) { clauses.push('priority = ?'); args.push(req.query.priority); }
  if (typeof req.query.search === 'string' && req.query.search.trim()) {
    clauses.push('(id LIKE ? OR full_name LIKE ? OR email LIKE ? OR subject LIKE ? OR message LIKE ?)');
    const match = `%${req.query.search.trim()}%`; args.push(match, match, match, match, match);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const order = req.query.sort === 'oldest' ? 'ASC' : 'DESC';
  const rows = (await query(`SELECT * FROM inquiries ${where} ORDER BY created_at ${order}`, args)).rows;
  res.json({ inquiries: rows });
});

app.get('/api/admin/inquiries/:id', requireAuth, requireAdmin, async (req, res) => {
  const result = await query('SELECT * FROM inquiries WHERE id = ?', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Inquiry not found.' });
  const [responses, history] = await Promise.all([
    query('SELECT r.*,u.full_name AS admin_name FROM inquiry_responses r LEFT JOIN users u ON u.id=r.admin_id WHERE inquiry_id=? ORDER BY r.created_at DESC', [req.params.id]),
    query('SELECT h.*,u.full_name AS actor_name FROM inquiry_history h LEFT JOIN users u ON u.id=h.actor_id WHERE inquiry_id=? ORDER BY h.created_at DESC', [req.params.id]),
  ]);
  res.json({ inquiry: result.rows[0], responses: responses.rows, history: history.rows });
});

app.patch('/api/admin/inquiries/:id', requireAuth, requireAdmin, async (req, res) => {
  const parsed = z.object({ status: z.enum(inquiryStatuses).optional(), internalNotes: z.string().max(5000).optional() }).safeParse(req.body);
  if (!parsed.success || !Object.keys(parsed.data || {}).length) return res.status(400).json({ error: 'Provide a valid inquiry status or internal note.' });
  const found = await query('SELECT * FROM inquiries WHERE id = ?', [req.params.id]);
  const inquiry = found.rows[0];
  if (!inquiry) return res.status(404).json({ error: 'Inquiry not found.' });
  if (parsed.data.status && parsed.data.status !== inquiry.status) {
    await query('UPDATE inquiries SET status=?,updated_at=? WHERE id=?', [parsed.data.status, now(), inquiry.id]);
    await query('INSERT INTO inquiry_history(inquiry_id,actor_id,action,old_value,new_value,created_at) VALUES(?,?,?,?,?,?)', [inquiry.id, req.user.id, 'Status changed', inquiry.status, parsed.data.status, now()]);
    await logActivity(req.user, `Changed inquiry status to ${parsed.data.status}`, 'inquiry', inquiry.id);
  }
  if (parsed.data.internalNotes !== undefined && parsed.data.internalNotes !== inquiry.internal_notes) {
    await query('UPDATE inquiries SET internal_notes=?,updated_at=? WHERE id=?', [parsed.data.internalNotes, now(), inquiry.id]);
    await query('INSERT INTO inquiry_history(inquiry_id,actor_id,action,old_value,new_value,created_at) VALUES(?,?,?,?,?,?)', [inquiry.id, req.user.id, 'Internal notes updated', null, 'Saved notes', now()]);
    await logActivity(req.user, 'Updated inquiry internal notes', 'inquiry', inquiry.id);
  }
  const updated = await query('SELECT * FROM inquiries WHERE id=?', [inquiry.id]);
  res.json({ inquiry: updated.rows[0] });
});

app.post('/api/admin/inquiries/:id/reply', requireAuth, requireAdmin, async (req, res) => {
  const parsed = z.object({ response: z.string().trim().min(2).max(5000) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Write a response before saving.' });
  const found = await query('SELECT id FROM inquiries WHERE id=?', [req.params.id]);
  if (!found.rows[0]) return res.status(404).json({ error: 'Inquiry not found.' });
  const createdAt = now();
  await query('INSERT INTO inquiry_responses(inquiry_id,admin_id,response,created_at) VALUES(?,?,?,?)', [req.params.id, req.user.id, parsed.data.response, createdAt]);
  await query(`UPDATE inquiries SET status=CASE WHEN status='New' THEN 'In Progress' ELSE status END,updated_at=? WHERE id=?`, [createdAt, req.params.id]);
  await query('INSERT INTO inquiry_history(inquiry_id,actor_id,action,old_value,new_value,created_at) VALUES(?,?,?,?,?,?)', [req.params.id, req.user.id, 'Admin response added', null, 'Response visible to user', createdAt]);
  await logActivity(req.user, 'Responded to an inquiry', 'inquiry', req.params.id);
  res.status(201).json({ ok: true, message: 'Response saved and visible in My Inquiries.' });
});

app.get('/api/admin/employees', requireAuth, requireAdmin, async (req, res) => {
  const clauses = ["u.role='employee'"];
  const args = [];
  if (req.query.status && ['active', 'inactive'].includes(req.query.status)) { clauses.push('u.status=?'); args.push(req.query.status); }
  if (typeof req.query.search === 'string' && req.query.search.trim()) { clauses.push('(u.full_name LIKE ? OR u.email LIKE ?)'); args.push(`%${req.query.search.trim()}%`, `%${req.query.search.trim()}%`); }
  const employees = (await query(`SELECT u.id,u.full_name,u.email,u.role,u.status,u.created_at,COUNT(t.id) AS assigned_tasks FROM users u LEFT JOIN tasks t ON t.employee_id=u.id WHERE ${clauses.join(' AND ')} GROUP BY u.id ORDER BY u.created_at DESC`, args)).rows;
  res.json({ employees });
});

app.get('/api/admin/employees/:id', requireAuth, requireAdmin, async (req, res) => {
  const found = await query("SELECT id,full_name,email,role,status,created_at FROM users WHERE id=? AND role='employee'", [req.params.id]);
  if (!found.rows[0]) return res.status(404).json({ error: 'Employee not found.' });
  const tasks = (await query('SELECT * FROM tasks WHERE employee_id=? ORDER BY deadline ASC', [req.params.id])).rows;
  res.json({ employee: found.rows[0], tasks });
});

app.patch('/api/admin/employees/:id', requireAuth, requireAdmin, async (req, res) => {
  const parsed = z.object({ status: z.enum(['active', 'inactive']) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Choose active or inactive.' });
  const found = await query("SELECT * FROM users WHERE id=? AND role='employee'", [req.params.id]);
  if (!found.rows[0]) return res.status(404).json({ error: 'Employee not found.' });
  await query('UPDATE users SET status=?,updated_at=? WHERE id=?', [parsed.data.status, now(), req.params.id]);
  await logActivity(req.user, `${parsed.data.status === 'active' ? 'Activated' : 'Deactivated'} employee ${found.rows[0].full_name}`, 'user', req.params.id);
  res.json({ employee: { ...found.rows[0], status: parsed.data.status } });
});

app.get('/api/admin/tasks', requireAuth, requireAdmin, asyncRoute((req, res) => listTasks(req, res)));

app.patch('/api/admin/tasks/:id', requireAuth, requireAdmin, async (req, res) => {
  const parsed = z.object({ status: z.enum(statuses).optional(), urgency: z.enum(urgencyLevels).optional(), deadline: z.string().datetime().optional(), employeeId: z.string().min(1).optional() }).safeParse(req.body);
  if (!parsed.success || !Object.keys(parsed.data || {}).length) return res.status(400).json({ error: 'Provide a valid task update.' });
  const found = await query('SELECT * FROM tasks WHERE id=?', [req.params.id]);
  const task = found.rows[0];
  if (!task) return res.status(404).json({ error: 'Task not found.' });
  const changes = { ...parsed.data };
  if (changes.employeeId && changes.employeeId !== task.employee_id) {
    const employee = await query("SELECT id,full_name,email,status FROM users WHERE id=? AND role='employee'", [changes.employeeId]);
    if (!employee.rows[0] || employee.rows[0].status !== 'active') return res.status(400).json({ error: 'Choose an active employee.' });
    changes.employeeName = employee.rows[0].full_name;
    changes.employeeEmail = employee.rows[0].email;
  }
  const columns = { status: 'status', urgency: 'urgency', deadline: 'deadline', employeeId: 'employee_id', employeeName: 'employee_name', employeeEmail: 'employee_email' };
  const fieldLabels = { status: 'status', urgency: 'urgency', deadline: 'deadline', employeeId: 'assigned employee' };
  const updates = [];
  const args = [];
  for (const [key, column] of Object.entries(columns)) {
    if (!(key in changes)) continue;
    const oldValue = task[column];
    const newValue = changes[key];
    if (oldValue === newValue) continue;
    updates.push(`${column}=?`); args.push(newValue);
    if (fieldLabels[key]) await query('INSERT INTO task_history(task_id,actor_id,action,old_value,new_value,created_at) VALUES(?,?,?,?,?,?)', [task.id, req.user.id, `Updated ${fieldLabels[key]}`, String(oldValue), String(newValue), now()]);
  }
  if (updates.length) {
    updates.push('updated_at=?'); args.push(now(), task.id);
    await query(`UPDATE tasks SET ${updates.join(',')} WHERE id=?`, args);
    await logActivity(req.user, `Updated task ${task.id}`, 'task', task.id);
  }
  const updated = await query('SELECT * FROM tasks WHERE id=?', [task.id]);
  res.json({ task: updated.rows[0], demoNotice: 'Saved in the TaskFlow demo database. This does not sync with an external CRM or Helpdesk.' });
});

app.get('/api/admin/activity', requireAuth, requireAdmin, async (_req, res) => {
  const activity = (await query('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 100')).rows;
  res.json({ activity });
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));
app.use((error, _req, res, _next) => {
  if (res.headersSent) return;
  const status = error.status || 500;
  if (status >= 500) console.error('[TaskFlow API]', error.message);
  res.status(status).json({ error: status >= 500 ? (error.status ? error.message : 'Something went wrong. Please try again.') : error.message });
});

export default app;

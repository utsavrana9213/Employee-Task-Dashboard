import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { demoUsers, demoTasks, taskRow, sampleInquiries, daysFromNow } from './data.js';

let client;
let initPromise;

function getClient() {
  if (client) return client;
  if (process.env.VERCEL && !process.env.TURSO_DATABASE_URL) {
    throw new Error('A persistent Turso database is required for Vercel. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.');
  }
  const localPath = path.resolve(process.cwd(), 'data/taskflow.db');
  if (!process.env.TURSO_DATABASE_URL) fs.mkdirSync(path.dirname(localPath), { recursive: true });
  client = createClient({
    url: process.env.TURSO_DATABASE_URL || `file:${localPath}`,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  });
  return client;
}

export async function query(sql, args = []) {
  return getClient().execute({ sql, args });
}

export async function initDb() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const db = getClient();
    const schema = [
      `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, full_name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT, google_sub TEXT UNIQUE, role TEXT NOT NULL DEFAULT 'employee', status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, employee_id TEXT NOT NULL, employee_name TEXT NOT NULL, employee_email TEXT NOT NULL, status TEXT NOT NULL, urgency TEXT NOT NULL, deadline TEXT NOT NULL, source TEXT NOT NULL, source_url TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS task_history (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id TEXT NOT NULL, actor_id TEXT, action TEXT NOT NULL, old_value TEXT, new_value TEXT, created_at TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS inquiries (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, full_name TEXT NOT NULL, email TEXT NOT NULL, subject TEXT NOT NULL, category TEXT NOT NULL, related_task_id TEXT, message TEXT NOT NULL, priority TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'New', internal_notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS inquiry_responses (id INTEGER PRIMARY KEY AUTOINCREMENT, inquiry_id TEXT NOT NULL, admin_id TEXT NOT NULL, response TEXT NOT NULL, created_at TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS inquiry_history (id INTEGER PRIMARY KEY AUTOINCREMENT, inquiry_id TEXT NOT NULL, actor_id TEXT NOT NULL, action TEXT NOT NULL, old_value TEXT, new_value TEXT, created_at TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS activity_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_id TEXT, actor_name TEXT, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT, created_at TEXT NOT NULL)`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_employee ON tasks(employee_id)`,
      `CREATE INDEX IF NOT EXISTS idx_inquiries_user ON inquiries(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status)`,
      `CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at)`,
    ];
    for (const sql of schema) await db.execute(sql);

    const now = new Date().toISOString();
    const adminEmail = (process.env.DEMO_ADMIN_EMAIL || 'admin@gmail.com').toLowerCase();
    const production = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    const adminPassword = process.env.DEMO_ADMIN_PASSWORD || (production ? '' : '1234');
    if (production && (adminPassword.length < 12 || adminPassword === '1234')) {
      throw new Error('Set a unique DEMO_ADMIN_PASSWORD of at least 12 characters before initializing a production database.');
    }
    const adminHash = await bcrypt.hash(adminPassword, 12);
    const existingAdmin = await db.execute({ sql: 'SELECT id,role FROM users WHERE email = ?', args: [adminEmail] });
    if (existingAdmin.rows.length) {
      if (existingAdmin.rows[0].id !== 'admin-demo' && existingAdmin.rows[0].role !== 'admin') {
        throw new Error('DEMO_ADMIN_EMAIL is already assigned to an employee account. Choose a different admin email.');
      }
      await db.execute({ sql: `UPDATE users SET role = 'admin', status = 'active' WHERE email = ?`, args: [adminEmail] });
    } else {
      await db.execute({ sql: 'INSERT INTO users(id,full_name,email,password_hash,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)', args: ['admin-demo', 'TaskFlow Admin', adminEmail, adminHash, 'admin', 'active', now, now] });
    }

    for (const user of demoUsers) {
      const found = await db.execute({ sql: 'SELECT id FROM users WHERE id = ?', args: [user.id] });
      if (!found.rows.length) {
        const passwordHash = await bcrypt.hash('Demo1234!', 10);
        await db.execute({ sql: 'INSERT INTO users(id,full_name,email,password_hash,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)', args: [user.id, user.fullName, user.email, passwordHash, 'employee', 'active', daysFromNow(-24), now] });
      }
    }

    const taskCount = await db.execute('SELECT COUNT(*) AS count FROM tasks');
    if (Number(taskCount.rows[0].count) === 0) {
      for (const task of demoTasks) {
        await db.execute({ sql: 'INSERT INTO tasks(id,title,description,employee_id,employee_name,employee_email,status,urgency,deadline,source,source_url,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)', args: [...taskRow(task), now] });
      }
    }

    const inquiryCount = await db.execute('SELECT COUNT(*) AS count FROM inquiries');
    if (Number(inquiryCount.rows[0].count) === 0) {
      for (const item of sampleInquiries) {
        const createdAt = daysFromNow(item.id.endsWith('1001') ? -4 : item.id.endsWith('1002') ? -2 : -0.4);
        await db.execute({ sql: 'INSERT INTO inquiries(id,user_id,full_name,email,subject,category,related_task_id,message,priority,status,internal_notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?, ?,?)', args: [item.id, item.userId, item.name, item.email, item.subject, item.category, item.related, item.message, item.priority, item.status, '', createdAt, now] });
        await db.execute({ sql: 'INSERT INTO inquiry_history(inquiry_id,actor_id,action,old_value,new_value,created_at) VALUES(?,?,?,?,?,?)', args: [item.id, item.userId, 'Inquiry submitted', null, item.status, createdAt] });
        if (item.response) await db.execute({ sql: 'INSERT INTO inquiry_responses(inquiry_id,admin_id,response,created_at) VALUES(?,?,?,?)', args: [item.id, 'admin-demo', item.response, daysFromNow(-1)] });
      }
    }

    const logCount = await db.execute('SELECT COUNT(*) AS count FROM activity_logs');
    if (Number(logCount.rows[0].count) === 0) {
      await db.execute({ sql: 'INSERT INTO activity_logs(actor_id,actor_name,action,entity_type,entity_id,created_at) VALUES(?,?,?,?,?,?)', args: ['admin-demo', 'TaskFlow Admin', 'Seeded demonstration workspace', 'system', 'demo', now] });
    }
    return db;
  })().catch((error) => {
    initPromise = undefined;
    throw error;
  });
  return initPromise;
}

export function resetDbForTests() {
  initPromise = undefined;
  client?.close();
  client = undefined;
}

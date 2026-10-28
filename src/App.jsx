import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Bell, BriefcaseBusiness, CalendarDays,
  Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, Command, ExternalLink, FileText,
  Filter, Headphones, Home, Inbox, LayoutDashboard, ListChecks, LoaderCircle, LockKeyhole, LogOut, Mail, Menu,
  MessageSquareText, MoreHorizontal, Plus, RefreshCw, Search, Settings, ShieldCheck, SlidersHorizontal, Sparkles,
  UserRound, Users, X,
} from 'lucide-react';
import { api } from './api.js';
import { deadlineLabel, formatDate, formatDateTime, isOverdue, prioritizeTasks } from './utils/priority.js';

const AuthContext = createContext(null);
const DEMO_CREDIT = 'Created by Utsav Rana as Demo for AULTEN DIGITAL PRIVATE LIMITED';
const cx = (...values) => values.filter(Boolean).join(' ');

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  useEffect(() => {
    api('/auth/me').then((data) => setUser(data.user)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);
  const notify = (message, tone = 'success') => {
    setToast({ message, tone });
    window.clearTimeout(window.__taskFlowToast);
    window.__taskFlowToast = window.setTimeout(() => setToast(null), 3600);
  };
  const value = useMemo(() => ({ user, setUser, loading, notify, toast, dismissToast: () => setToast(null) }), [user, loading, toast]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() { return useContext(AuthContext); }

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>;
}

function AppRoutes() {
  const { toast, dismissToast } = useAuth();
  return <>
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route element={<RequireRole role="employee" />}>
        <Route element={<UserShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/tasks/mine" element={<TasksPage mode="mine" />} />
          <Route path="/tasks/overdue" element={<TasksPage mode="overdue" />} />
          <Route path="/tasks/crm" element={<TasksPage source="CRM" />} />
          <Route path="/tasks/helpdesk" element={<TasksPage source="Helpdesk" />} />
          <Route path="/tasks/:id" element={<TaskDetailPage />} />
          <Route path="/inquiries" element={<MyInquiriesPage />} />
          <Route path="/inquiries/new" element={<NewInquiryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/mock-source/:source/:id" element={<MockSourcePage />} />
        </Route>
      </Route>
      <Route element={<RequireRole role="admin" />}>
        <Route element={<AdminShell />}>
          <Route path="/admin/dashboard" element={<AdminOverviewPage />} />
          <Route path="/admin/inquiries" element={<AdminInquiriesPage />} />
          <Route path="/admin/employees" element={<AdminEmployeesPage />} />
          <Route path="/admin/tasks" element={<AdminTasksPage />} />
          <Route path="/admin/tasks/:id" element={<AdminTaskDetailPage />} />
          <Route path="/admin/crm" element={<AdminTasksPage source="CRM" />} />
          <Route path="/admin/helpdesk" element={<AdminTasksPage source="Helpdesk" />} />
          <Route path="/admin/activity" element={<AdminActivityPage />} />
          <Route path="/admin/settings" element={<AdminSettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    {toast && <div className={cx('toast', toast.tone === 'error' && 'toast-error')} role="status"><span className="toast-icon">{toast.tone === 'error' ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} />}</span>{toast.message}<button onClick={dismissToast} aria-label="Dismiss notification"><X size={16} /></button></div>}
  </>;
}

function RequireRole({ role }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to={role === 'admin' ? '/admin/login' : '/login'} replace state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />;
  return <Outlet />;
}

function FullPageLoader() { return <div className="full-loader"><LoaderCircle className="spin" size={24} /><span>Preparing your workspace…</span></div>; }

function DeveloperCredit() {
  return <footer className="developer-credit"><span className="credit-mark"><Sparkles size={13} /></span>{DEMO_CREDIT}<span className="credit-demo">DEMO</span></footer>;
}

function Brand({ light = false }) {
  return <Link to="/" className={cx('brand', light && 'brand-light')}><span className="brand-mark"><ListChecks size={19} strokeWidth={2.4} /></span><span className="brand-word">taskflow<span className="brand-dot">.</span></span></Link>;
}

const userNav = [
  { label: 'Workspace', items: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/tasks', label: 'All tasks', icon: ListChecks },
    { to: '/tasks/mine', label: 'My tasks', icon: UserRound },
    { to: '/tasks/overdue', label: 'Overdue', icon: Clock3, attention: true },
  ] },
  { label: 'Sources', items: [
    { to: '/tasks/crm', label: 'CRM tasks', icon: BriefcaseBusiness, source: 'crm' },
    { to: '/tasks/helpdesk', label: 'Helpdesk tasks', icon: Headphones, source: 'helpdesk' },
  ] },
  { label: 'Support', items: [
    { to: '/inquiries', label: 'My inquiries', icon: Inbox },
    { to: '/inquiries/new', label: 'Submit inquiry', icon: Plus },
    { to: '/settings', label: 'Settings', icon: Settings },
  ] },
];
const adminNav = [
  { label: 'Management', items: [
    { to: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/inquiries', label: 'All inquiries', icon: Inbox, badge: 'inquiries' },
    { to: '/admin/employees', label: 'Employees', icon: Users },
    { to: '/admin/tasks', label: 'All tasks', icon: ListChecks },
    { to: '/admin/crm', label: 'CRM tasks', icon: BriefcaseBusiness },
    { to: '/admin/helpdesk', label: 'Helpdesk tasks', icon: Headphones },
    { to: '/admin/activity', label: 'Activity logs', icon: Activity },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ] },
];

function UserShell() {
  const { user, notify, setUser } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => setMobileOpen(false), [location.pathname]);
  async function logout() {
    try { await api('/auth/logout', { method: 'POST' }); } finally { setUser(null); notify('You have been signed out.'); navigate('/login'); }
  }
  return <div className="app-shell">
    {mobileOpen && <button className="sidebar-scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
    <aside className={cx('sidebar', mobileOpen && 'sidebar-open')}>
      <div className="sidebar-top"><Brand /><button className="icon-button sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} /></button></div>
      <div className="workspace-switch"><span className="workspace-avatar">A</span><span><strong>AULTEN Digital</strong><small>Employee workspace</small></span><ChevronDown size={14} /></div>
      <nav className="side-nav">
        {userNav.map((section) => <div className="nav-section" key={section.label}><p className="nav-caption">{section.label}</p>{section.items.map(({ to, label, icon: Icon, end, source }) => <NavLink key={to} end={end} to={to} className={({ isActive }) => cx('nav-link', isActive && 'nav-active')}><Icon size={17} /><span>{label}</span>{source && <span className={cx('source-dot', `source-${source}`)} />}{label === 'Overdue' && <span className="nav-pulse" />}</NavLink>)}</div>)}
      </nav>
      <div className="sidebar-bottom"><div className="sidebar-help"><span className="help-icon"><CircleHelp size={17} /></span><span><strong>Need a hand?</strong><small>Our team is here to help</small></span><Link to="/inquiries/new" aria-label="Submit a support inquiry"><ArrowRight size={15} /></Link></div>
        <div className="user-profile"><div className="avatar avatar-indigo">{initials(user?.fullName)}</div><span className="profile-copy"><strong>{user?.fullName}</strong><small>{user?.email}</small></span><button className="icon-button profile-more" onClick={logout} title="Sign out" aria-label="Sign out"><LogOut size={16} /></button></div>
      </div>
    </aside>
    <main className="main-area"><header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={19} /></button><div className="breadcrumb"><span>Workspace</span><ChevronRight size={13} /><strong>{pageName(location.pathname)}</strong></div><div className="topbar-right"><div className="top-search"><Search size={15} /><input aria-label="Search tasks" placeholder="Search anything…" onKeyDown={(e) => { if (e.key === 'Enter' && e.currentTarget.value) navigate(`/tasks?search=${encodeURIComponent(e.currentTarget.value)}`); }} /><kbd>⌘ K</kbd></div><span className="top-divider" /><span className="demo-pill"><span className="status-dot" />Live demo</span><button className="icon-button notification-button" aria-label="Notifications" onClick={() => notify('You’re all caught up.')}><Bell size={17} /></button><div className="avatar avatar-indigo top-avatar">{initials(user?.fullName)}</div></div></header><div className="page-content"><Outlet /></div><DeveloperCredit /></main>
  </div>;
}

function AdminShell() {
  const { user, notify, setUser } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation(); const navigate = useNavigate();
  useEffect(() => setMobileOpen(false), [location.pathname]);
  async function logout() {
    try { await api('/auth/logout', { method: 'POST' }); } finally { setUser(null); notify('Admin session ended.'); navigate('/admin/login'); }
  }
  return <div className="app-shell admin-shell">
    {mobileOpen && <button className="sidebar-scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
    <aside className={cx('sidebar', mobileOpen && 'sidebar-open')}>
      <div className="sidebar-top"><Brand /><span className="admin-mini">ADMIN</span><button className="icon-button sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} /></button></div>
      <div className="workspace-switch"><span className="workspace-avatar workspace-admin"><ShieldCheck size={15} /></span><span><strong>Admin console</strong><small>AULTEN Digital demo</small></span><ChevronDown size={14} /></div>
      <nav className="side-nav">{adminNav.map((section) => <div className="nav-section" key={section.label}><p className="nav-caption">{section.label}</p>{section.items.map(({ to, label, icon: Icon, end }) => <NavLink key={to} end={end} to={to} className={({ isActive }) => cx('nav-link', isActive && 'nav-active')}><Icon size={17} /><span>{label}</span>{label === 'All inquiries' && <span className="nav-count">New</span>}</NavLink>)}</div>)}</nav>
      <div className="sidebar-bottom"><div className="admin-demo-notice"><ShieldCheck size={16} /><span><strong>Demo environment</strong><small>Task changes stay in this workspace</small></span></div><div className="user-profile"><div className="avatar avatar-amber">{initials(user?.fullName)}</div><span className="profile-copy"><strong>{user?.fullName}</strong><small>Administrator</small></span><button className="icon-button profile-more" onClick={logout} title="Sign out" aria-label="Sign out"><LogOut size={16} /></button></div></div>
    </aside>
    <main className="main-area"><header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={19} /></button><div className="breadcrumb"><span>Admin</span><ChevronRight size={13} /><strong>{pageName(location.pathname)}</strong></div><div className="topbar-right"><div className="top-search"><Search size={15} /><input aria-label="Search admin data" placeholder="Search workspace…" onKeyDown={(e) => { if (e.key === 'Enter' && e.currentTarget.value) navigate(`/admin/tasks?search=${encodeURIComponent(e.currentTarget.value)}`); }} /><kbd>⌘ K</kbd></div><span className="top-divider" /><span className="demo-pill"><span className="status-dot" />Admin mode</span><div className="avatar avatar-amber top-avatar">{initials(user?.fullName)}</div></div></header><div className="page-content"><Outlet /></div><DeveloperCredit /></main>
  </div>;
}

function pageName(path) {
  if (path === '/dashboard' || path === '/admin/dashboard') return 'Dashboard';
  if (path.includes('/inquiries/new')) return 'Submit inquiry';
  if (path.includes('/inquiries')) return path.includes('/admin/') ? 'All inquiries' : 'My inquiries';
  if (path.includes('/employees')) return 'Employees';
  if (path.includes('/activity')) return 'Activity logs';
  if (path.includes('/settings')) return 'Settings';
  if (path.includes('/mock-source')) return 'Source preview';
  if (path.includes('/tasks/overdue')) return 'Overdue tasks';
  if (path.includes('/tasks/mine')) return 'My tasks';
  if (path.includes('/tasks/crm') || path.endsWith('/crm')) return 'CRM tasks';
  if (path.includes('/tasks/helpdesk') || path.endsWith('/helpdesk')) return 'Helpdesk tasks';
  if (path.includes('/tasks')) return 'All tasks';
  return 'Workspace';
}

function initials(name = '') { return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'TF'; }

function AuthFrame({ children, admin = false }) {
  return <main className="auth-page">
    <div className="auth-top"><Brand /><span className="auth-badge"><span className="status-dot" />{admin ? 'Secure admin access' : 'Your work, in flow'}</span></div>
    <div className="auth-main">{children}</div>
    <div className="auth-bottom"><DeveloperCredit /><span className="auth-bottom-note">A focused workspace for the work that matters.</span></div>
    <div className="auth-decoration auth-decoration-one" /><div className="auth-decoration auth-decoration-two" />
  </main>;
}

function LoginPage() {
  const { user, setUser, notify, loading } = useAuth(); const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' }); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  if (!loading && user) return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />;
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { const data = await api('/auth/login', { method: 'POST', body: form }); setUser(data.user); notify(`Welcome back, ${data.user.fullName.split(' ')[0]}.`); navigate('/dashboard'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <AuthFrame><section className="auth-card auth-card-wide"><div className="auth-intro"><span className="eyebrow"><span className="eyebrow-star">✳</span> Employee workspace</span><h1>Good work starts<br />with a clear <em>head.</em></h1><p>Sign in to see what needs your attention and move the important work forward.</p></div>
    <form className="auth-form" onSubmit={submit}><div className="form-heading"><div><h2>Welcome back</h2><p>Enter your details to continue.</p></div><div className="form-shield"><LockKeyhole size={18} /></div></div>
      {error && <div className="form-error"><AlertTriangle size={16} />{error}</div>}
      <label className="field-label">Work email<input type="email" required autoComplete="email" placeholder="you@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
      <label className="field-label">Password<input type="password" required autoComplete="current-password" placeholder="Enter your password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
      <div className="form-inline"><span className="quiet-text"><LockKeyhole size={13} /> Secure session</span><span className="quiet-text">Expires after 7 days</span></div>
      <button className="button button-primary button-block" disabled={busy}>{busy ? <LoaderCircle size={17} className="spin" /> : <>Sign in <ArrowRight size={16} /></>}</button>
      <div className="auth-split"><span />New to TaskFlow?<span /></div><Link className="button button-secondary button-block" to="/register"><UserRound size={15} />Create a free employee account</Link>
      <div className="auth-footline">Admin? <Link to="/admin/login">Open admin sign-in <ArrowUpRight size={13} /></Link></div>
    </form>
    <div className="auth-proof"><span><Check size={13} /> Task updates saved as you work</span><span><Check size={13} /> Secure, role-based access</span><span><span className="avatar-stack"><i>A</i><i>J</i><i>T</i></span> Built for teams in motion</span></div>
  </section></AuthFrame>;
}

function RegisterPage() {
  const { user, setUser, notify, loading } = useAuth(); const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' }); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  if (!loading && user) return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />;
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { const data = await api('/auth/register', { method: 'POST', body: form }); setUser(data.user); notify('Your employee workspace is ready.'); navigate('/dashboard'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <AuthFrame><section className="auth-card auth-card-register"><div className="auth-intro"><span className="eyebrow"><span className="eyebrow-star">✳</span> Join your workspace</span><h1>Make room for<br />your best <em>work.</em></h1><p>Create an account to manage tasks, track progress, and stay connected with your team.</p></div>
    <form className="auth-form" onSubmit={submit}><div className="form-heading"><div><h2>Create account</h2><p>It only takes a moment to get started.</p></div><div className="form-shield"><UserRound size={18} /></div></div>
      {error && <div className="form-error"><AlertTriangle size={16} />{error}</div>}
      <label className="field-label">Full name<input required autoComplete="name" minLength={2} placeholder="Your name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label>
      <label className="field-label">Work email<input type="email" required autoComplete="email" placeholder="you@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
      <label className="field-label">Password<input type="password" required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><small className="field-help">Use 8 or more characters.</small></label>
      <button className="button button-primary button-block" disabled={busy}>{busy ? <LoaderCircle size={17} className="spin" /> : <>Create account <ArrowRight size={16} /></>}</button>
      <div className="auth-footline">Already have an account? <Link to="/login">Sign in <ArrowUpRight size={13} /></Link></div>
    </form>
  </section></AuthFrame>;
}

function AdminLoginPage() {
  const { user, setUser, notify, loading } = useAuth(); const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' }); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  if (!loading && user) return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />;
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { const data = await api('/admin/login', { method: 'POST', body: form }); setUser(data.user); notify('Admin console unlocked.'); navigate('/admin/dashboard'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <AuthFrame admin><section className="auth-card auth-card-admin"><div className="admin-login-symbol"><ShieldCheck size={24} /></div><div className="auth-intro admin-intro"><span className="eyebrow eyebrow-amber">Administrator access</span><h1>Welcome to the<br /><em>control room.</em></h1><p>Sign in to manage employee access, task changes, and incoming inquiries.</p></div>
    <form className="auth-form" onSubmit={submit}><div className="form-heading"><div><h2>Admin sign in</h2><p>Use your administrator credentials.</p></div><div className="admin-only-pill">ADMIN</div></div>
      <div className="demo-credential-note"><span className="demo-credential-icon"><ShieldCheck size={15} /></span><span><strong>Demonstration account</strong><small>Local demo credentials are configured on the server.</small></span></div>
      {error && <div className="form-error"><AlertTriangle size={16} />{error}</div>}
      <label className="field-label">Admin email<input type="email" required autoComplete="username" placeholder="admin@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
      <label className="field-label">Password<input type="password" required autoComplete="current-password" placeholder="Enter admin password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
      <button className="button button-admin button-block" disabled={busy}>{busy ? <LoaderCircle size={17} className="spin" /> : <>Enter admin console <ArrowRight size={16} /></>}</button>
      <div className="auth-footline"><Link to="/login"><ArrowLeft size={13} /> Back to employee sign-in</Link></div>
    </form><p className="admin-local-note"><LockKeyhole size={13} /> Demo only · Replace the default account before production use.</p>
  </section></AuthFrame>;
}

function useTaskBuckets() {
  const [tasks, setTasks] = useState([]); const [warnings, setWarnings] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [lastUpdated, setLastUpdated] = useState(null);
  const refresh = async () => {
    setLoading(true); setError('');
    const [crm, helpdesk] = await Promise.allSettled([api('/crm/tasks'), api('/helpdesk/tasks')]);
    const merged = [...(crm.status === 'fulfilled' ? crm.value.tasks : []), ...(helpdesk.status === 'fulfilled' ? helpdesk.value.tasks : [])];
    const failed = [crm.status === 'rejected' ? 'CRM' : null, helpdesk.status === 'rejected' ? 'Helpdesk' : null].filter(Boolean);
    setTasks(merged); setWarnings(failed); setLastUpdated(new Date());
    if (failed.length === 2) setError('We couldn’t reach either task source. Check your connection and retry.');
    else setError('');
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);
  return { tasks, warnings, loading, error, lastUpdated, refresh, setTasks };
}

function useTaskList(endpoint) {
  const [tasks, setTasks] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [lastUpdated, setLastUpdated] = useState(null);
  const refresh = async () => {
    setLoading(true); setError('');
    try { const result = await api(endpoint); setTasks(result.tasks); setLastUpdated(new Date()); }
    catch (e) { setError(e.message || 'Tasks could not be loaded.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, [endpoint]);
  return { tasks, setTasks, loading, error, lastUpdated, refresh };
}

function PageTitle({ eyebrow, title, description, actions, icon: Icon }) {
  return <div className="page-title-row"><div className="page-heading"><span className="eyebrow">{Icon && <Icon size={13} />}{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="page-actions">{actions}</div>}</div>;
}

function DashboardPage() {
  const { tasks, warnings, loading, error, lastUpdated, refresh } = useTaskBuckets();
  const { user } = useAuth(); const navigate = useNavigate();
  const [health, setHealth] = useState('checking');
  useEffect(() => { api('/health').then(() => setHealth('connected')).catch(() => setHealth('disconnected')); }, []);
  const counts = useMemo(() => ({
    total: tasks.length,
    pending: tasks.filter((task) => task.status === 'Pending').length,
    progress: tasks.filter((task) => task.status === 'In Progress').length,
    completed: tasks.filter((task) => task.status === 'Completed').length,
    overdue: tasks.filter((task) => isOverdue(task)).length,
  }), [tasks]);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const today = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  const upcoming = prioritizeTasks(tasks).filter((task) => task.status !== 'Completed').slice(0, 5);
  return <>
    <PageTitle eyebrow={today} title={<>{greeting}, {user?.fullName.split(' ')[0]} <span className="title-period">✳</span></>} description="Here’s what’s happening across your work today." actions={<><span className={cx('api-status', health === 'connected' && 'api-ok', health === 'disconnected' && 'api-down')}><i />API {health === 'connected' ? 'connected' : health === 'checking' ? 'checking' : 'offline'}</span><button className="button button-secondary button-refresh" onClick={refresh} disabled={loading}>{loading ? <LoaderCircle size={15} className="spin" /> : <RefreshCw size={15} />}<span>Refresh</span></button></>} />
    <div className="dashboard-meta"><span><span className="wave-dot" />Your task overview</span><span>Last refreshed {lastUpdated ? formatDateTime(lastUpdated) : 'just now'}</span></div>
    {warnings.length > 0 && warnings.length < 2 && <div className="inline-warning"><AlertTriangle size={16} /><span><strong>{warnings[0]} tasks are temporarily unavailable.</strong> The other source is still ready.</span><button onClick={refresh}>Retry <ArrowRight size={14} /></button></div>}
    {error && <ErrorBanner message={error} onRetry={refresh} />}
    <div className="summary-grid summary-grid-five">
      <SummaryCard label="Total tasks" value={counts.total} icon={ListChecks} color="blue" trend="Across both sources" onClick={() => navigate('/tasks')} />
      <SummaryCard label="Pending" value={counts.pending} icon={Clock3} color="slate" trend="Waiting to start" onClick={() => navigate('/tasks?status=Pending')} />
      <SummaryCard label="In progress" value={counts.progress} icon={Activity} color="violet" trend="Moving forward" onClick={() => navigate('/tasks?status=In%20Progress')} />
      <SummaryCard label="Completed" value={counts.completed} icon={CheckCircle2} color="green" trend="Nice momentum" onClick={() => navigate('/tasks?status=Completed')} />
      <SummaryCard label="Overdue" value={counts.overdue} icon={AlertTriangle} color="red" trend="Needs attention" onClick={() => navigate('/tasks/overdue')} />
    </div>
    <div className="dashboard-columns">
      <section className="panel priority-panel"><div className="panel-heading"><div><span className="panel-kicker"><span className="live-pulse" />Priority queue</span><h2>Up next</h2></div><Link to="/tasks" className="text-link">View all <ArrowRight size={14} /></Link></div>
        {loading ? <TaskSkeleton count={4} /> : upcoming.length ? <div className="priority-list">{upcoming.map((task, index) => <TaskPriorityRow task={task} key={task.id} rank={index + 1} />)}</div> : <EmptyState icon={CheckCircle2} title="All clear for now" detail="No open tasks are assigned to your account." action={<Link className="button button-secondary" to="/tasks">Browse tasks</Link>} />}
      </section>
      <section className="panel focus-panel"><div className="panel-heading"><div><span className="panel-kicker">Your focus</span><h2>Source snapshot</h2></div><span className="mini-badge">{counts.total} tasks</span></div>
        <div className="source-stat"><span className="source-icon source-icon-crm"><BriefcaseBusiness size={17} /></span><div className="source-stat-copy"><strong>CRM</strong><small>Customer relationships</small></div><div className="source-stat-value">{tasks.filter((t) => t.source === 'CRM').length}<span>tasks</span></div></div>
        <div className="source-stat"><span className="source-icon source-icon-help"><Headphones size={17} /></span><div className="source-stat-copy"><strong>Helpdesk</strong><small>Customer support</small></div><div className="source-stat-value">{tasks.filter((t) => t.source === 'Helpdesk').length}<span>tasks</span></div></div>
        <div className="focus-note"><div className="focus-note-icon"><Sparkles size={15} /></div><p><strong>Keep your momentum.</strong> Tasks marked critical or overdue rise to the top automatically.</p></div>
        <div className="focus-footer"><span><span className="status-dot" />{warnings.length ? 'Partial source data' : 'All sources connected'}</span><button className="quiet-button" onClick={refresh}><RefreshCw size={13} />Refresh data</button></div>
      </section>
    </div>
    <section className="panel recent-panel"><div className="panel-heading"><div><span className="panel-kicker">From your team</span><h2>Recent activity</h2></div><button className="text-button" onClick={() => notify('Activity feed is up to date.')}>See activity <ArrowRight size={14} /></button></div>
      <div className="activity-feed"><ActivityItem name="Jamie Chen" color="mint" action="completed a task" task="Close duplicate opportunity" time="18 min ago" icon={Check} /><ActivityItem name="Taylor Brooks" color="peach" action="updated a task" task="Investigate SSO sign-in issue" time="42 min ago" icon={Activity} /><ActivityItem name="Riley Patel" color="lavender" action="shared a new task" task="Restore report export access" time="1 hr ago" icon={Plus} /></div>
    </section>
  </>;
}

function SummaryCard({ label, value, icon: Icon, color, trend, onClick }) {
  return <button className="summary-card" onClick={onClick}><div className="summary-top"><span className={cx('summary-icon', `summary-${color}`)}><Icon size={17} /></span><ArrowUpRight className="summary-arrow" size={15} /></div><strong className="summary-value">{value}</strong><span className="summary-label">{label}</span><span className="summary-trend">{trend}</span></button>;
}

function TaskPriorityRow({ task, rank }) {
  return <Link to={`/tasks/${task.id}`} className="priority-row"><span className="priority-number">{String(rank).padStart(2, '0')}</span><span className={cx('priority-line', `priority-${task.urgency.toLowerCase()}`)} /><span className="priority-task"><strong>{task.title}</strong><small><span>{task.id}</span><span className="tiny-sep">·</span>{task.source}</small></span><span className={cx('deadline-label', isOverdue(task) && 'deadline-overdue')}>{deadlineLabel(task)}</span><ChevronRight size={15} className="row-chevron" /></Link>;
}

function ActivityItem({ name, color, action, task, time, icon: Icon }) {
  return <div className="activity-item"><div className={cx('activity-avatar', `activity-${color}`)}>{initials(name)}</div><div className="activity-content"><p><strong>{name}</strong> {action}</p><span>{task}</span></div><span className="activity-time">{time}</span><span className="activity-action-icon"><Icon size={14} /></span></div>;
}

function TasksPage({ source: fixedSource, mode }) {
  const [params, setParams] = useSearchParams();
  const endpoint = fixedSource ? `/${fixedSource.toLowerCase()}/tasks` : '/tasks';
  const { tasks, loading, error, lastUpdated, refresh } = useTaskList(endpoint);
  const [search, setSearch] = useState(params.get('search') || '');
  const [status, setStatus] = useState(params.get('status') || 'All statuses');
  const [source, setSource] = useState(fixedSource || 'All sources');
  const [sort, setSort] = useState('Recommended Priority');
  const [urgency, setUrgency] = useState('All urgency');
  const [employee, setEmployee] = useState('All employees');
  const [employees, setEmployees] = useState([]);
  useEffect(() => { api('/employees').then((r) => setEmployees(r.employees)).catch(() => {}); }, []);
  useEffect(() => { setStatus(params.get('status') || 'All statuses'); if (params.get('search') !== null) setSearch(params.get('search')); }, [params]);
  const filtered = useMemo(() => {
    let list = tasks;
    if (mode === 'overdue') list = list.filter((task) => isOverdue(task));
    if (status !== 'All statuses') list = list.filter((task) => task.status === status);
    if (source !== 'All sources') list = list.filter((task) => task.source === source);
    if (urgency !== 'All urgency') list = list.filter((task) => task.urgency === urgency);
    if (employee !== 'All employees') list = list.filter((task) => task.employee_id === employee);
    if (search.trim()) { const query = search.toLowerCase(); list = list.filter((task) => [task.id, task.title, task.description, task.employee_name].some((field) => field?.toLowerCase().includes(query))); }
    return prioritizeTasks(list, sort);
  }, [tasks, mode, status, source, urgency, employee, search, sort]);
  const title = mode === 'overdue' ? 'Overdue tasks' : mode === 'mine' ? 'My tasks' : fixedSource ? `${fixedSource} tasks` : 'All tasks';
  function resetFilters() { setSearch(''); setStatus('All statuses'); setSource(fixedSource || 'All sources'); setUrgency('All urgency'); setEmployee('All employees'); setSort('Recommended Priority'); setParams({}); }
  return <>
    <PageTitle eyebrow={fixedSource ? `${fixedSource} source` : 'Task workspace'} title={title} description="A clear view of the work in motion across your connected sources." actions={<><span className="last-refresh">Updated {lastUpdated ? formatDateTime(lastUpdated) : '—'}</span><button className="button button-secondary button-refresh" onClick={refresh} disabled={loading}>{loading ? <LoaderCircle size={15} className="spin" /> : <RefreshCw size={15} />}<span>Refresh</span></button></>} />
    {error && <ErrorBanner message={error} onRetry={refresh} />}
    <div className="task-summary-strip"><span><span className="wave-dot" />Showing <strong>{filtered.length}</strong> of {tasks.length} tasks</span><span className="task-source-count"><span className="source-dot source-crm" />{tasks.filter((t) => t.source === 'CRM').length} CRM <i /> <span className="source-dot source-helpdesk" />{tasks.filter((t) => t.source === 'Helpdesk').length} Helpdesk</span></div>
    <section className="panel task-list-panel"><div className="filter-toolbar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, employee, ID…" aria-label="Search tasks" /><kbd>⌘ F</kbd></div><div className="filter-controls">
      {!fixedSource && <FilterSelect icon={BriefcaseBusiness} value={source} onChange={setSource} label="Source" options={['All sources', 'CRM', 'Helpdesk']} />}
      <FilterSelect icon={Activity} value={status} onChange={(v) => { setStatus(v); setParams(v === 'All statuses' ? {} : { status: v }); }} label="Status" options={['All statuses', ...['Pending', 'In Progress', 'Completed']]} />
      <FilterSelect icon={AlertTriangle} value={urgency} onChange={setUrgency} label="Urgency" options={['All urgency', 'Critical', 'High', 'Medium', 'Low']} />
      {employees.length > 1 && <FilterSelect icon={UserRound} value={employee} onChange={setEmployee} label="Employee" options={['All employees', ...employees.map((item) => ({ label: item.full_name, value: item.id }))]} />}
      <button className="filter-reset" onClick={resetFilters}><X size={14} /> Reset</button>
    </div></div>
      <div className="table-heading-row"><div><span className="panel-kicker">{filtered.length ? 'Prioritized list' : 'Task list'}</span><h2>{mode === 'overdue' ? 'Needs attention' : 'Tasks'} <span className="count-badge">{filtered.length}</span></h2></div><label className="sort-select"><SlidersHorizontal size={14} /><span>Sort by</span><select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort tasks"><option>Recommended Priority</option><option>Nearest Deadline</option><option>Highest Urgency</option><option>Newest Tasks</option></select><ChevronDown size={13} /></label></div>
      {loading ? <TaskSkeleton count={5} /> : error && !tasks.length ? <ErrorBanner message={error} onRetry={refresh} /> : filtered.length ? <TaskTable tasks={filtered} /> : <EmptyState icon={Filter} title="No tasks match these filters" detail="Try changing your search or resetting the filters." action={<button className="button button-secondary" onClick={resetFilters}>Reset filters</button>} />}
      <div className="table-footer"><span>Tasks stay synchronized when you refresh your workspace.</span><span>{tasks.length} total records</span></div>
    </section>
  </>;
}

function FilterSelect({ icon: Icon, value, onChange, label, options }) {
  return <label className="filter-select" title={label}><Icon size={14} /><select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>{options.map((option) => typeof option === 'string' ? <option key={option} value={option}>{option}</option> : <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown size={12} /></label>;
}

function TaskTable({ tasks }) {
  return <><div className="desktop-task-table"><table><thead><tr><th>Task</th><th>Employee</th><th>Source</th><th>Deadline</th><th>Urgency</th><th>Status</th><th /></tr></thead><tbody>{tasks.map((task) => <TaskTableRow task={task} key={task.id} />)}</tbody></table></div>
    <div className="mobile-task-cards">{tasks.map((task) => <TaskCard task={task} key={task.id} />)}</div></>;
}

function TaskTableRow({ task }) {
  return <tr><td><Link className="task-name-cell" to={`/tasks/${task.id}`}><span className={cx('task-type-icon', task.source === 'CRM' ? 'type-crm' : 'type-help')}><TaskSourceIcon source={task.source} size={15} /></span><span><strong>{task.title}</strong><small>{task.id}</small></span></Link></td><td><span className="employee-cell"><span className={cx('avatar avatar-small', `person-${(task.employee_name || 'A').charCodeAt(0) % 5}`)}>{initials(task.employee_name)}</span>{task.employee_name}</span></td><td><SourceBadge source={task.source} /></td><td><span className={cx('date-cell', isOverdue(task) && 'date-overdue')}>{deadlineLabel(task)}</span><small className="table-date">{formatDate(task.deadline)}</small></td><td><UrgencyBadge urgency={task.urgency} /></td><td><StatusBadge status={task.status} /></td><td><Link className="row-open" to={`/tasks/${task.id}`} aria-label={`Open ${task.title}`}><ArrowUpRight size={16} /></Link></td></tr>;
}

function TaskCard({ task, basePath = '/tasks' }) {
  return <article className="task-mobile-card"><div className="task-mobile-top"><span className={cx('task-type-icon', task.source === 'CRM' ? 'type-crm' : 'type-help')}><TaskSourceIcon source={task.source} size={15} /></span><span className="task-id">{task.id}</span><SourceBadge source={task.source} /></div><Link className="task-mobile-title" to={`${basePath}/${task.id}`}>{task.title}</Link><div className="task-mobile-owner"><span className={cx('avatar avatar-small', `person-${(task.employee_name || 'A').charCodeAt(0) % 5}`)}>{initials(task.employee_name)}</span>{task.employee_name}<span className="task-card-date"><CalendarDays size={13} />{formatDate(task.deadline)}</span></div><div className="task-mobile-bottom"><UrgencyBadge urgency={task.urgency} /><StatusBadge status={task.status} /><Link className="button button-small button-secondary" to={`${basePath}/${task.id}`}>Open task <ArrowUpRight size={14} /></Link></div></article>;
}

function TaskSourceIcon({ source, size = 16 }) { return source === 'CRM' ? <BriefcaseBusiness size={size} /> : <Headphones size={size} />; }
function SourceBadge({ source }) { return <span className={cx('source-badge', source === 'CRM' ? 'badge-crm' : 'badge-helpdesk')}><span className={cx('source-dot', source === 'CRM' ? 'source-crm' : 'source-helpdesk')} />{source}</span>; }
function StatusBadge({ status }) { return <span className={cx('status-badge', `status-${status.toLowerCase().replaceAll(' ', '-')}`)}><i />{status}</span>; }
function UrgencyBadge({ urgency }) { return <span className={cx('urgency-badge', `urgency-${urgency.toLowerCase()}`)}><i />{urgency}</span>; }

function TaskDetailPage() {
  const { id } = useParams(); const { notify } = useAuth();
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  async function load() { setLoading(true); setError(''); try { setData(await api(`/tasks/${encodeURIComponent(id)}`)); } catch (e) { setError(e.message); } finally { setLoading(false); } }
  useEffect(() => { load(); }, [id]);
  if (loading) return <div className="detail-loading"><LoaderCircle className="spin" />Loading task…</div>;
  if (!data) return <><Link className="back-link" to="/tasks"><ArrowLeft size={14} /> Back to tasks</Link><ErrorBanner message={error || 'Task not found.'} onRetry={load} /></>;
  const task = data.task;
  return <>
    <Link className="back-link" to="/tasks"><ArrowLeft size={14} /> Back to all tasks</Link>
    <div className="task-detail-grid"><section className="panel task-detail-main"><div className="task-detail-meta"><SourceBadge source={task.source} /><span className="task-id">{task.id}</span><span className="task-detail-dot">·</span><span>Created {formatDate(task.created_at)}</span><button className="icon-button detail-more" onClick={() => notify('Task actions are managed by your administrator.')} aria-label="More options"><MoreHorizontal size={18} /></button></div><h1 className="task-detail-title">{task.title}</h1><p className="task-detail-description">{task.description}</p><div className="task-detail-badges"><StatusBadge status={task.status} /><UrgencyBadge urgency={task.urgency} /><span className={cx('deadline-label', isOverdue(task) && 'deadline-overdue')}><Clock3 size={13} />{deadlineLabel(task)}</span></div>
      <div className="detail-separator" /><div className="detail-section-head"><div><span className="panel-kicker">Task activity</span><h2>History</h2></div><span className="activity-count">{data.history.length || 1} updates</span></div>
      {data.history.length ? <div className="task-history">{data.history.map((item) => <div className="history-item" key={item.id}><span className="history-dot" /><span><strong>{item.action}</strong><small>{item.actor_name || 'System'} · {formatDateTime(item.created_at)}{item.new_value ? ` · ${item.old_value || '—'} → ${item.new_value}` : ''}</small></span></div>)}</div> : <div className="history-item"><span className="history-dot" /><span><strong>Task added to TaskFlow</strong><small>Mock integration · {formatDateTime(task.created_at)}</small></span></div>}
    </section><aside className="task-detail-side"><section className="panel detail-properties"><div className="panel-heading"><div><span className="panel-kicker">Task details</span><h2>Properties</h2></div></div><PropertyRow icon={UserRound} label="Assigned to"><span className="property-person"><span className="avatar avatar-small avatar-indigo">{initials(task.employee_name)}</span>{task.employee_name}</span></PropertyRow><PropertyRow icon={CalendarDays} label="Deadline">{formatDate(task.deadline)}</PropertyRow><PropertyRow icon={BriefcaseBusiness} label="Source"><SourceBadge source={task.source} /></PropertyRow><PropertyRow icon={Command} label="Task ID"><span className="task-id code-id">{task.id}</span></PropertyRow></section>
      <div className="detail-source-callout"><div className="source-callout-icon"><ExternalLink size={17} /></div><div><strong>Open source task</strong><p>View this record in the simulated {task.source} workspace.</p></div><Link to={task.source_url} className="button button-primary button-block">Open {task.source} task <ArrowUpRight size={14} /></Link><small className="demo-microcopy">Demo integration · Changes don’t sync externally</small></div></aside></div>
  </>;
}

function PropertyRow({ icon: Icon, label, children }) { return <div className="property-row"><span className="property-icon"><Icon size={15} /></span><span className="property-label">{label}</span><span className="property-value">{children}</span></div>; }

function MockSourcePage() {
  const { source, id } = useParams(); const [data, setData] = useState(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  useEffect(() => { api(`/tasks/${encodeURIComponent(id)}`).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, [id]);
  const task = data?.task;
  return <><Link className="back-link" to={`/tasks/${id}`}><ArrowLeft size={14} /> Back to TaskFlow task</Link><div className="mock-source-banner"><div className="mock-source-logo"><TaskSourceIcon source={source.toLowerCase() === 'crm' ? 'CRM' : 'Helpdesk'} size={17} /></div><div><strong>{source.toUpperCase()} Workspace Preview</strong><small>Simulated source application · Demonstration data</small></div><span className="source-preview-pill">MOCK SOURCE</span></div>
    {loading ? <div className="detail-loading"><LoaderCircle className="spin" />Loading source record…</div> : !task ? <ErrorBanner message={error || 'This source task is unavailable.'} /> : <div className="mock-record panel"><div className="mock-record-top"><span className="mock-record-id">RECORD · {task.id}</span><StatusBadge status={task.status} /></div><h1>{task.title}</h1><p>{task.description}</p><div className="mock-record-grid"><div><small>OWNER</small><strong>{task.employee_name}</strong></div><div><small>PRIORITY</small><UrgencyBadge urgency={task.urgency} /></div><div><small>DUE DATE</small><strong>{formatDate(task.deadline)}</strong></div><div><small>SOURCE</small><SourceBadge source={task.source} /></div></div><div className="mock-data-note"><AlertTriangle size={15} /><span>This is a simulated {task.source} record. TaskFlow demo updates are stored locally and are not synchronized with a live source system.</span></div></div>}
  </>;
}

function NewInquiryPage() {
  const { user, notify } = useAuth(); const navigate = useNavigate();
  const { tasks } = useTaskList('/tasks');
  const [form, setForm] = useState({ fullName: user?.fullName || '', email: user?.email || '', subject: '', category: 'General Inquiry', relatedTaskId: '', message: '', priority: 'Normal' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await api('/inquiries', { method: 'POST', body: form }); notify('Inquiry submitted. You can track the reply in My inquiries.'); navigate('/inquiries'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <>
    <PageTitle eyebrow="Support center" title="How can we help?" description="Send a message to the TaskFlow admin team. Replies will show up in your inquiry inbox." actions={<Link className="button button-secondary" to="/inquiries"><Inbox size={15} /> My inquiries</Link>} />
    <div className="inquiry-page-grid"><form className="panel inquiry-form-panel" onSubmit={submit}><div className="panel-heading"><div><span className="panel-kicker">New request</span><h2>Tell us what’s going on</h2></div><span className="required-hint">* Required</span></div>
      {error && <div className="form-error"><AlertTriangle size={16} />{error}</div>}
      <div className="form-grid-two"><label className="field-label">Full name *<input required minLength={2} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label><label className="field-label">Email address *<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label></div>
      <label className="field-label">Subject *<input required minLength={4} maxLength={150} placeholder="A short summary of your request" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></label>
      <div className="form-grid-two"><label className="field-label">Category *<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{['General Inquiry', 'Task Related', 'Technical Support', 'Account Support', 'Feedback', 'Other'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="field-label">Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{['Low', 'Normal', 'High', 'Urgent'].map((item) => <option key={item}>{item}</option>)}</select></label></div>
      <label className="field-label">Related task <span className="optional-text">Optional</span><select value={form.relatedTaskId} onChange={(e) => setForm({ ...form, relatedTaskId: e.target.value })}><option value="">No related task</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.id} · {task.title}</option>)}</select></label>
      <label className="field-label">Message *<textarea required minLength={10} maxLength={5000} rows={6} placeholder="Share the details that will help us respond…" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /><small className="field-help textarea-count">{form.message.length}/5000</small></label>
      <div className="form-submit-row"><span className="quiet-text"><LockKeyhole size={13} /> Only you and the admin team can view this request.</span><button className="button button-primary" disabled={busy}>{busy ? <LoaderCircle size={16} className="spin" /> : <>Submit inquiry <ArrowRight size={15} /></>}</button></div>
    </form><aside className="inquiry-help"><div className="inquiry-help-art"><div className="help-art-ring ring-one" /><div className="help-art-ring ring-two" /><div className="help-art-center"><MessageSquareText size={25} /></div><span className="help-art-star star-one">✳</span><span className="help-art-star star-two">✦</span></div><span className="panel-kicker">A note from the team</span><h3>Good questions deserve good answers.</h3><p>Your message is saved securely. Our admin team will respond here, and you’ll find the reply in My inquiries.</p><div className="help-response-time"><Clock3 size={15} /><span><strong>Response tracking</strong><small>Check your inquiry status any time.</small></span></div><div className="help-response-time"><ShieldCheck size={15} /><span><strong>Private by default</strong><small>Your request is only visible to you and admins.</small></span></div></aside></div>
  </>;
}

function MyInquiriesPage() {
  const [inquiries, setInquiries] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  async function refresh() { setLoading(true); setError(''); try { const result = await api('/inquiries/my'); setInquiries(result.inquiries); } catch (e) { setError(e.message); } finally { setLoading(false); } }
  useEffect(() => { refresh(); }, []);
  return <><PageTitle eyebrow="Support center" title="My inquiries" description="Track your requests and read responses from the admin team." actions={<><button className="button button-secondary" onClick={refresh} disabled={loading}><RefreshCw size={15} /> Refresh</button><Link className="button button-primary" to="/inquiries/new"><Plus size={15} /> New inquiry</Link></>} />
    {error && <ErrorBanner message={error} onRetry={refresh} />}
    <div className="inquiry-inbox-bar"><div className="inbox-icon"><Inbox size={18} /></div><div><strong>Your private support inbox</strong><small>Only your submissions are shown here.</small></div><span className="inbox-count">{inquiries.length} {inquiries.length === 1 ? 'request' : 'requests'}</span></div>
    <div className="my-inquiry-list">{loading ? <TaskSkeleton count={3} /> : inquiries.length ? inquiries.map((inquiry) => <article className="panel my-inquiry-card" key={inquiry.id}><div className="my-inquiry-main"><div className="my-inquiry-top"><span className="inquiry-id">{inquiry.id}</span><StatusBadge status={inquiry.status} /></div><h2>{inquiry.subject}</h2><p>{inquiry.message}</p><div className="inquiry-meta"><span>{inquiry.category}</span><i />{inquiry.related_task_id && <><span>{inquiry.related_task_id}</span><i /></>}<span>Submitted {formatDateTime(inquiry.created_at)}</span></div></div><div className="inquiry-priority"><span className="panel-kicker">Priority</span><UrgencyBadge urgency={inquiry.priority === 'Urgent' ? 'Critical' : inquiry.priority === 'Normal' ? 'Medium' : inquiry.priority} /></div>
      {inquiry.responses?.length > 0 && <div className="inquiry-response-box"><div className="response-icon"><MessageSquareText size={16} /></div><div><span className="panel-kicker">Admin response · {formatDateTime(inquiry.responses[0].created_at)}</span><p>{inquiry.responses.map((item) => item.response).join('\n\n')}</p><small>You can reply by submitting a new inquiry.</small></div></div>}
      {inquiry.internal_notes && null}
    </article>) : <EmptyState icon={Inbox} title="Your inbox is clear" detail="When you submit a question or support request, it will appear here." action={<Link className="button button-primary" to="/inquiries/new"><Plus size={15} /> Submit an inquiry</Link>} />}</div>
  </>;
}

function SettingsPage() {
  const { user, setUser, notify } = useAuth(); const [name, setName] = useState(user?.fullName || ''); const [busy, setBusy] = useState(false);
  async function save(event) { event.preventDefault(); setBusy(true); try { const data = await api('/profile', { method: 'PATCH', body: { fullName: name } }); setUser(data.user); notify('Your profile has been updated.'); } catch (e) { notify(e.message, 'error'); } finally { setBusy(false); } }
  return <><PageTitle eyebrow="Your account" title="Settings" description="Manage your profile and session preferences." />
    <div className="settings-layout"><form className="panel settings-card" onSubmit={save}><div className="panel-heading"><div><span className="panel-kicker">Profile</span><h2>Personal information</h2></div><div className="settings-icon"><UserRound size={17} /></div></div><div className="settings-profile-head"><div className="avatar avatar-indigo avatar-large">{initials(user?.fullName)}</div><div><strong>{user?.fullName}</strong><small>Employee account</small></div><span className="account-status"><i /> Active</span></div><label className="field-label">Full name<input minLength={2} required value={name} onChange={(e) => setName(e.target.value)} /></label><label className="field-label">Email address<input value={user?.email || ''} disabled /><small className="field-help">Email changes are managed by your administrator.</small></label><div className="settings-form-footer"><span className="quiet-text">Changes are saved to your TaskFlow profile.</span><button className="button button-primary" disabled={busy}>{busy ? <LoaderCircle size={16} className="spin" /> : <>Save changes <Check size={15} /></>}</button></div></form>
      <section className="settings-side"><div className="settings-callout"><span className="settings-callout-icon"><ShieldCheck size={20} /></span><span className="panel-kicker">Account security</span><h3>Your access is protected.</h3><p>TaskFlow uses secure, role-based sessions. Only your assigned tasks and your own inquiries are visible to your account.</p><div className="security-line"><LockKeyhole size={14} /> Signed in as <strong>{user?.role}</strong></div></div><div className="panel settings-session"><span className="panel-kicker">Current session</span><div><span className="session-browser-icon"><Command size={16} /></span><span><strong>Browser session</strong><small>Secure cookie · Expires after 7 days</small></span><i /></div></div></section></div>
  </>;
}

function AdminOverviewPage() {
  const [stats, setStats] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  async function refresh() { setLoading(true); setError(''); try { setStats(await api('/admin/stats')); } catch (e) { setError(e.message); } finally { setLoading(false); } }
  useEffect(() => { refresh(); }, []);
  const taskCounts = stats?.tasks || {}; const inquiries = stats?.inquiries || {};
  return <><PageTitle eyebrow="Administration" title="Workspace overview" description="A live view of your people, task flow, and support queue." actions={<><span className="admin-live-badge"><span className="status-dot" />Live workspace</span><button className="button button-secondary button-refresh" onClick={refresh} disabled={loading}>{loading ? <LoaderCircle size={15} className="spin" /> : <RefreshCw size={15} />}<span>Refresh</span></button></>} />
    {error && <ErrorBanner message={error} onRetry={refresh} />}
    <div className="admin-stat-label"><span>Workspace health</span><span>Updated {stats ? 'just now' : '—'}</span></div>
    <div className="summary-grid admin-summary-grid">
      <SummaryCard label="Registered users" value={loading ? '—' : stats?.users ?? 0} icon={Users} color="blue" trend="Employee accounts" onClick={() => window.location.assign('/admin/employees')} />
      <SummaryCard label="Active employees" value={loading ? '—' : stats?.activeEmployees ?? 0} icon={UserRound} color="violet" trend={`${stats?.employees || 0} total employees`} onClick={() => window.location.assign('/admin/employees')} />
      <SummaryCard label="Total tasks" value={loading ? '—' : taskCounts.total ?? 0} icon={ListChecks} color="slate" trend="CRM + Helpdesk" onClick={() => window.location.assign('/admin/tasks')} />
      <SummaryCard label="Overdue tasks" value={loading ? '—' : taskCounts.overdue ?? 0} icon={AlertTriangle} color="red" trend="Incomplete and past due" onClick={() => window.location.assign('/admin/tasks')} />
    </div>
    <div className="summary-grid admin-summary-grid admin-summary-grid-lower">
      <SummaryCard label="Pending tasks" value={loading ? '—' : taskCounts.pending ?? 0} icon={Clock3} color="amber" trend="Ready for work" onClick={() => window.location.assign('/admin/tasks')} />
      <SummaryCard label="Completed tasks" value={loading ? '—' : taskCounts.completed ?? 0} icon={CheckCircle2} color="green" trend="Across all sources" onClick={() => window.location.assign('/admin/tasks')} />
      <SummaryCard label="Total inquiries" value={loading ? '—' : inquiries.total ?? 0} icon={Inbox} color="blue" trend={`${inquiries.new || 0} new`} onClick={() => window.location.assign('/admin/inquiries')} />
      <SummaryCard label="In progress / resolved" value={loading ? '—' : `${inquiries.in_progress || 0} / ${inquiries.resolved || 0}`} icon={MessageSquareText} color="violet" trend="Inquiry statuses" onClick={() => window.location.assign('/admin/inquiries')} />
    </div>
    <div className="admin-overview-grid"><section className="panel chart-panel"><div className="panel-heading"><div><span className="panel-kicker">Task distribution</span><h2>Tasks by status</h2></div><span className="chart-period">All time <ChevronDown size={13} /></span></div><TaskDistribution data={stats?.taskStatusDistribution || []} total={taskCounts.total || 0} /><div className="chart-legend"><LegendItem color="legend-pending" label="Pending" value={taskCounts.pending || 0} /><LegendItem color="legend-progress" label="In progress" value={taskCounts.in_progress || 0} /><LegendItem color="legend-complete" label="Completed" value={taskCounts.completed || 0} /></div></section>
      <section className="panel source-chart-panel"><div className="panel-heading"><div><span className="panel-kicker">Connected sources</span><h2>Task origin</h2></div><span className="mini-badge">Demo APIs</span></div><div className="source-chart">{(stats?.sourceDistribution || []).map((item) => <div className="source-chart-row" key={item.source}><div className="source-chart-label"><SourceBadge source={item.source} /><strong>{item.count}</strong></div><div className="source-bar"><i style={{ width: `${Math.max(5, (item.count / Math.max(1, taskCounts.total)) * 100)}%` }} className={item.source === 'CRM' ? 'bar-crm' : 'bar-helpdesk'} /></div></div>)}</div><div className="source-chart-note"><Sparkles size={14} /> Source data is simulated for this demonstration.</div></section></div>
    <div className="admin-bottom-grid"><section className="panel recent-inquiries-panel"><div className="panel-heading"><div><span className="panel-kicker">Needs a response</span><h2>Recent inquiries</h2></div><Link className="text-link" to="/admin/inquiries">View all <ArrowRight size={14} /></Link></div>{loading ? <TaskSkeleton count={3} /> : stats?.recentInquiries?.length ? <div className="admin-recent-list">{stats.recentInquiries.map((item) => <Link to="/admin/inquiries" className="admin-recent-item" key={item.id}><span className="inquiry-avatar">{initials(item.full_name)}</span><span className="admin-recent-copy"><strong>{item.subject}</strong><small>{item.full_name} · {formatDateTime(item.created_at)}</small></span><StatusBadge status={item.status} /><ChevronRight size={14} /></Link>)}</div> : <EmptyState icon={Inbox} title="No inquiries yet" detail="New employee inquiries will appear here." />}</section>
      <section className="panel quick-actions-panel"><div className="panel-heading"><div><span className="panel-kicker">Workspace tools</span><h2>Quick actions</h2></div></div><div className="quick-actions-list"><Link to="/admin/inquiries" className="quick-action"><span className="quick-icon quick-violet"><Inbox size={17} /></span><span><strong>Review inquiry queue</strong><small>{inquiries.new || 0} new request{inquiries.new === 1 ? '' : 's'}</small></span><ArrowRight size={15} /></Link><Link to="/admin/employees" className="quick-action"><span className="quick-icon quick-blue"><Users size={17} /></span><span><strong>Manage employees</strong><small>Account access and task views</small></span><ArrowRight size={15} /></Link><Link to="/admin/tasks" className="quick-action"><span className="quick-icon quick-amber"><ListChecks size={17} /></span><span><strong>Update task assignments</strong><small>Edit demo task records</small></span><ArrowRight size={15} /></Link></div></section></div>
  </>;
}

function TaskDistribution({ data, total }) {
  const values = { 'Pending': 0, 'In Progress': 0, 'Completed': 0, ...Object.fromEntries(data.map((item) => [item.status, Number(item.count)])) };
  const pending = total ? values.Pending / total * 100 : 0; const progress = total ? values['In Progress'] / total * 100 : 0; const completed = total ? values.Completed / total * 100 : 0;
  return <div className="distribution"><div className="distribution-ring" style={{ '--pending': `${pending}%`, '--progress': `${pending + progress}%` }}><div><strong>{total}</strong><small>tasks</small></div></div><div className="distribution-side"><strong>{values.Completed}</strong><span>completed this cycle</span><div className="distribution-track"><i style={{ width: `${completed}%` }} /></div><small>{Math.round(completed)}% of all tasks</small></div></div>;
}

function LegendItem({ color, label, value }) { return <span className="legend-item"><i className={color} />{label}<strong>{value}</strong></span>; }

function AdminInquiriesPage() {
  const { notify } = useAuth();
  const [inquiries, setInquiries] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [search, setSearch] = useState(''); const [status, setStatus] = useState('All statuses'); const [category, setCategory] = useState('All categories'); const [priority, setPriority] = useState('All priorities'); const [sort, setSort] = useState('newest');
  const [active, setActive] = useState(null); const [detail, setDetail] = useState(null);
  async function refresh() {
    setLoading(true); setError('');
    const query = new URLSearchParams(); if (search.trim()) query.set('search', search.trim()); if (status !== 'All statuses') query.set('status', status); if (category !== 'All categories') query.set('category', category); if (priority !== 'All priorities') query.set('priority', priority); if (sort !== 'newest') query.set('sort', sort);
    try { const result = await api(`/admin/inquiries?${query}`); setInquiries(result.inquiries); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { const timer = window.setTimeout(refresh, 180); return () => window.clearTimeout(timer); }, [search, status, category, priority, sort]);
  async function openInquiry(id) { setActive(id); try { setDetail(await api(`/admin/inquiries/${id}`)); } catch (e) { notify(e.message, 'error'); setActive(null); } }
  async function refreshDetail() { if (!active) return; setDetail(await api(`/admin/inquiries/${active}`)); await refresh(); }
  return <><PageTitle eyebrow="Support center" title="All inquiries" description="Review, respond to, and resolve every request submitted by employees." actions={<><span className="admin-live-badge"><span className="status-dot" />{inquiries.length} in view</span><button className="button button-secondary" onClick={refresh} disabled={loading}><RefreshCw size={15} /> Refresh</button></>} />
    {error && <ErrorBanner message={error} onRetry={refresh} />}
    <div className="inquiry-stats-row"><div className="inquiry-stat-chip"><span className="inquiry-stat-dot dot-new" /><strong>{inquiries.filter((item) => item.status === 'New').length}</strong><span>New</span></div><div className="inquiry-stat-chip"><span className="inquiry-stat-dot dot-progress" /><strong>{inquiries.filter((item) => item.status === 'In Progress').length}</strong><span>In progress</span></div><div className="inquiry-stat-chip"><span className="inquiry-stat-dot dot-resolved" /><strong>{inquiries.filter((item) => item.status === 'Resolved').length}</strong><span>Resolved</span></div><span className="inquiry-private-label"><LockKeyhole size={13} /> Admin-only queue</span></div>
    <section className="panel admin-table-panel"><div className="admin-filter-toolbar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, subject…" aria-label="Search inquiries" /><kbd>⌘ F</kbd></div><div className="filter-controls"><FilterSelect icon={Activity} value={status} onChange={setStatus} label="Status" options={['All statuses', 'New', 'In Progress', 'Resolved', 'Closed']} /><FilterSelect icon={MessageSquareText} value={category} onChange={setCategory} label="Category" options={['All categories', 'General Inquiry', 'Task Related', 'Technical Support', 'Account Support', 'Feedback', 'Other']} /><FilterSelect icon={AlertTriangle} value={priority} onChange={setPriority} label="Priority" options={['All priorities', 'Low', 'Normal', 'High', 'Urgent']} /><FilterSelect icon={CalendarDays} value={sort} onChange={setSort} label="Sort by" options={[{ label: 'Newest first', value: 'newest' }, { label: 'Oldest first', value: 'oldest' }]} /></div></div>
      {loading ? <TaskSkeleton count={4} /> : inquiries.length ? <><div className="admin-inquiries-table-wrap"><table className="admin-inquiries-table"><thead><tr><th>Inquiry</th><th>Employee</th><th>Category</th><th>Priority</th><th>Status</th><th>Submitted</th><th /></tr></thead><tbody>{inquiries.map((inquiry) => <tr key={inquiry.id} onClick={() => openInquiry(inquiry.id)} className="clickable-row"><td><span className="inquiry-subject-cell"><strong>{inquiry.subject}</strong><small>{inquiry.id} · {inquiry.message.slice(0, 70)}{inquiry.message.length > 70 ? '…' : ''}</small></span></td><td><span className="admin-employee-cell"><span className="avatar avatar-small avatar-indigo">{initials(inquiry.full_name)}</span><span><strong>{inquiry.full_name}</strong><small>{inquiry.email}</small></span></span></td><td><span className="category-pill">{inquiry.category}</span></td><td><PriorityLabel priority={inquiry.priority} /></td><td><StatusBadge status={inquiry.status} /></td><td><span className="table-date-main">{formatDate(inquiry.created_at)}</span><small className="table-date">{formatDateTime(inquiry.created_at).split(',').slice(-1)[0]?.trim()}</small></td><td><button className="row-open" aria-label={`Open inquiry ${inquiry.id}`}><ArrowUpRight size={15} /></button></td></tr>)}</tbody></table></div>
        <div className="mobile-admin-inquiries">{inquiries.map((item) => <button className="mobile-inquiry-card" key={item.id} onClick={() => openInquiry(item.id)}><span className="mobile-inquiry-head"><span className="inquiry-id">{item.id}</span><StatusBadge status={item.status} /></span><strong>{item.subject}</strong><span>{item.full_name} · {item.email}</span><small>{item.category} · {formatDate(item.created_at)}</small></button>)}</div>
        <div className="table-footer"><span>Click an inquiry to view details, history, notes, and replies.</span><span>{inquiries.length} inquiries</span></div></> : <EmptyState icon={Inbox} title="No inquiries found" detail="Try changing your filters, or wait for a new employee request." action={<button className="button button-secondary" onClick={() => { setSearch(''); setStatus('All statuses'); setCategory('All categories'); setPriority('All priorities'); }}>Clear filters</button>} />}
    </section>
    {active && <InquiryDrawer detail={detail} onClose={() => { setActive(null); setDetail(null); }} onRefresh={refreshDetail} />}
  </>;
}

function PriorityLabel({ priority }) { return <span className={cx('priority-label', `priority-label-${priority.toLowerCase()}`)}><i />{priority}</span>; }

function InquiryDrawer({ detail, onClose, onRefresh }) {
  const { notify } = useAuth(); const [status, setStatus] = useState(''); const [notes, setNotes] = useState(''); const [reply, setReply] = useState(''); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  useEffect(() => { if (detail?.inquiry) { setStatus(detail.inquiry.status); setNotes(detail.inquiry.internal_notes || ''); } }, [detail]);
  if (!detail) return <div className="drawer-backdrop" onClick={onClose}><div className="drawer-card drawer-loading" onClick={(e) => e.stopPropagation()}><LoaderCircle className="spin" /></div></div>;
  const item = detail.inquiry;
  async function saveStatusAndNotes() { setSaving(true); setError(''); try { await api(`/admin/inquiries/${item.id}`, { method: 'PATCH', body: { status, internalNotes: notes } }); notify('Inquiry updated.'); await onRefresh(); } catch (e) { setError(e.message); } finally { setSaving(false); } }
  async function sendReply(event) { event.preventDefault(); setSaving(true); setError(''); try { await api(`/admin/inquiries/${item.id}/reply`, { method: 'POST', body: { response: reply } }); setReply(''); notify('Response saved to the user’s inbox.'); await onRefresh(); } catch (e) { setError(e.message); } finally { setSaving(false); } }
  return <div className="drawer-backdrop" onClick={onClose}><aside className="inquiry-drawer" onClick={(e) => e.stopPropagation()}><div className="drawer-header"><div><span className="panel-kicker">Inquiry details</span><strong>{item.id}</strong></div><button className="icon-button" onClick={onClose} aria-label="Close inquiry details"><X size={18} /></button></div>
    <div className="drawer-body">{error && <div className="form-error"><AlertTriangle size={15} />{error}</div>}<div className="drawer-employee"><span className="avatar avatar-indigo avatar-large">{initials(item.full_name)}</span><span><strong>{item.full_name}</strong><small><Mail size={12} />{item.email}</small></span><span className="verified-user"><Check size={12} />USER</span></div>
      <div className="drawer-subject"><div className="drawer-meta-row"><span className="category-pill">{item.category}</span><PriorityLabel priority={item.priority} /><span>{formatDateTime(item.created_at)}</span></div><h2>{item.subject}</h2>{item.related_task_id && <Link to={`/admin/tasks/${item.related_task_id}`} className="related-task-link" onClick={onClose}><ListChecks size={13} /> Related task · {item.related_task_id} <ArrowUpRight size={13} /></Link>}<div className="inquiry-message">{item.message}</div></div>
      <div className="drawer-field"><label className="field-label">Status<select value={status} onChange={(e) => setStatus(e.target.value)}>{['New', 'In Progress', 'Resolved', 'Closed'].map((value) => <option key={value}>{value}</option>)}</select></label><label className="field-label">Internal notes<textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Only admins can see these notes…" /></label><button className="button button-secondary button-block" onClick={saveStatusAndNotes} disabled={saving}>{saving ? <LoaderCircle size={15} className="spin" /> : <>Save status & notes <Check size={14} /></>}</button></div>
      <form className="drawer-reply-form" onSubmit={sendReply}><div className="drawer-reply-title"><span className="response-icon"><MessageSquareText size={15} /></span><span><strong>Write a response</strong><small>Visible to the employee in My inquiries</small></span></div>{detail.responses?.length > 0 && <div className="previous-replies">{detail.responses.map((response) => <div className="previous-reply" key={response.id}><p>{response.response}</p><small>{response.admin_name || 'Admin'} · {formatDateTime(response.created_at)}</small></div>)}</div>}<textarea required minLength={2} maxLength={5000} rows={4} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a helpful reply…" /><div className="reply-note"><AlertTriangle size={13} />This saves an in-app response. No email is sent.</div><button className="button button-primary button-block" disabled={saving || !reply.trim()}>{saving ? <LoaderCircle size={15} className="spin" /> : <>Save & send response <ArrowRight size={14} /></>}</button></form>
      <div className="drawer-history"><div className="drawer-section-title"><strong>Inquiry history</strong><span>{detail.history?.length || 0} events</span></div>{detail.history?.map((event) => <div className="history-item" key={event.id}><span className="history-dot" /><span><strong>{event.action}</strong><small>{event.actor_name || 'System'} · {formatDateTime(event.created_at)}{event.new_value ? ` · ${event.new_value}` : ''}</small></span></div>)}</div>
    </div>
  </aside></div>;
}

function AdminEmployeesPage() {
  const { notify } = useAuth(); const [employees, setEmployees] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [search, setSearch] = useState(''); const [status, setStatus] = useState('All accounts'); const [selected, setSelected] = useState(null); const [profile, setProfile] = useState(null);
  async function refresh() { setLoading(true); setError(''); const query = new URLSearchParams(); if (search.trim()) query.set('search', search.trim()); if (status !== 'All accounts') query.set('status', status); try { const result = await api(`/admin/employees?${query}`); setEmployees(result.employees); } catch (e) { setError(e.message); } finally { setLoading(false); } }
  useEffect(() => { const timer = setTimeout(refresh, 180); return () => clearTimeout(timer); }, [search, status]);
  async function open(id) { setSelected(id); try { setProfile(await api(`/admin/employees/${id}`)); } catch (e) { notify(e.message, 'error'); setSelected(null); } }
  async function toggle(item) { try { await api(`/admin/employees/${item.id}`, { method: 'PATCH', body: { status: item.status === 'active' ? 'inactive' : 'active' } }); notify(`${item.full_name} is now ${item.status === 'active' ? 'inactive' : 'active'}.`); await refresh(); if (selected === item.id) setProfile(await api(`/admin/employees/${item.id}`)); } catch (e) { notify(e.message, 'error'); } }
  return <><PageTitle eyebrow="People & access" title="Employees" description="Review accounts, manage access, and see each employee’s assigned work." actions={<><span className="admin-live-badge"><Users size={14} />{employees.length} shown</span><button className="button button-secondary" onClick={refresh} disabled={loading}><RefreshCw size={15} /> Refresh</button></>} />{error && <ErrorBanner message={error} onRetry={refresh} />}
    <div className="employee-stats-row"><div className="employee-stat"><span className="employee-stat-icon stat-blue"><Users size={16} /></span><span><strong>{employees.length}</strong><small>Accounts in view</small></span></div><div className="employee-stat"><span className="employee-stat-icon stat-green"><CheckCircle2 size={16} /></span><span><strong>{employees.filter((item) => item.status === 'active').length}</strong><small>Active</small></span></div><div className="employee-stat"><span className="employee-stat-icon stat-amber"><LockKeyhole size={16} /></span><span><strong>{employees.filter((item) => item.status === 'inactive').length}</strong><small>Deactivated</small></span></div><span className="employee-policy-note"><ShieldCheck size={14} />Only administrators can change account status.</span></div>
    <section className="panel admin-table-panel"><div className="admin-filter-toolbar"><div className="filter-search"><Search size={16} /><input placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search employees" /></div><FilterSelect icon={Activity} value={status} onChange={setStatus} label="Account status" options={['All accounts', 'active', 'inactive']} /></div>
      {loading ? <TaskSkeleton count={4} /> : employees.length ? <><div className="admin-inquiries-table-wrap"><table className="employee-table"><thead><tr><th>Employee</th><th>Role</th><th>Account status</th><th>Assigned tasks</th><th>Joined</th><th>Actions</th></tr></thead><tbody>{employees.map((item) => <tr key={item.id}><td><button className="employee-link-button" onClick={() => open(item.id)}><span className="avatar avatar-indigo">{initials(item.full_name)}</span><span><strong>{item.full_name}</strong><small>{item.email}</small></span></button></td><td><span className="role-pill">Employee</span></td><td><span className={cx('account-status', item.status === 'inactive' && 'account-inactive')}><i />{item.status === 'active' ? 'Active' : 'Inactive'}</span></td><td><span className="task-count-pill"><ListChecks size={13} />{item.assigned_tasks}</span></td><td>{formatDate(item.created_at)}</td><td><div className="employee-actions"><button className="button button-small button-secondary" onClick={() => open(item.id)}>View profile</button><button className={cx('button button-small', item.status === 'active' ? 'button-danger-soft' : 'button-secondary')} onClick={() => toggle(item)}>{item.status === 'active' ? 'Deactivate' : 'Activate'}</button></div></td></tr>)}</tbody></table></div><div className="mobile-admin-inquiries">{employees.map((item) => <div className="mobile-employee-card" key={item.id}><button className="employee-link-button" onClick={() => open(item.id)}><span className="avatar avatar-indigo">{initials(item.full_name)}</span><span><strong>{item.full_name}</strong><small>{item.email}</small></span></button><div className="mobile-employee-meta"><span className="account-status"><i />{item.status}</span><span>{item.assigned_tasks} tasks</span><button onClick={() => toggle(item)}>{item.status === 'active' ? 'Deactivate' : 'Activate'}</button></div></div>)}</div><div className="table-footer"><span>Demo employees are seeded sample accounts. New registrations appear here.</span><span>{employees.length} employees</span></div></> : <EmptyState icon={Users} title="No employees found" detail="Try adjusting your search or account filters." />}
    </section>
    {selected && <EmployeeDrawer profile={profile} onClose={() => { setSelected(null); setProfile(null); }} onToggle={toggle} />}
  </>;
}

function EmployeeDrawer({ profile, onClose, onToggle }) {
  if (!profile) return <div className="drawer-backdrop" onClick={onClose}><div className="drawer-card drawer-loading" onClick={(e) => e.stopPropagation()}><LoaderCircle className="spin" /></div></div>;
  const item = profile.employee;
  return <div className="drawer-backdrop" onClick={onClose}><aside className="employee-drawer" onClick={(e) => e.stopPropagation()}><div className="drawer-header"><div><span className="panel-kicker">Employee profile</span><strong>Account overview</strong></div><button className="icon-button" onClick={onClose} aria-label="Close employee details"><X size={18} /></button></div><div className="employee-profile-head"><span className="avatar avatar-indigo avatar-xl">{initials(item.full_name)}</span><h2>{item.full_name}</h2><p>{item.email}</p><span className={cx('account-status', item.status === 'inactive' && 'account-inactive')}><i />{item.status === 'active' ? 'Active account' : 'Inactive account'}</span><button className={cx('button', item.status === 'active' ? 'button-danger-soft' : 'button-primary')} onClick={() => onToggle(item)}>{item.status === 'active' ? 'Deactivate account' : 'Activate account'}</button></div><div className="employee-profile-props"><PropertyRow icon={UserRound} label="Role">Employee</PropertyRow><PropertyRow icon={CalendarDays} label="Joined">{formatDate(item.created_at)}</PropertyRow><PropertyRow icon={ListChecks} label="Assigned tasks">{profile.tasks.length}</PropertyRow></div><div className="drawer-section-title"><strong>Assigned tasks</strong><span>{profile.tasks.length} records</span></div><div className="employee-task-list">{profile.tasks.length ? profile.tasks.map((task) => <Link to={`/admin/tasks/${task.id}`} className="employee-task-row" key={task.id} onClick={onClose}><span className={cx('task-type-icon', task.source === 'CRM' ? 'type-crm' : 'type-help')}><TaskSourceIcon source={task.source} size={14} /></span><span><strong>{task.title}</strong><small>{task.id} · {formatDate(task.deadline)}</small></span><StatusBadge status={task.status} /></Link>) : <p className="empty-compact">No tasks are assigned to this employee yet.</p>}</div></aside></div>;
}

function AdminTasksPage({ source: fixedSource }) {
  const { notify } = useAuth(); const [tasks, setTasks] = useState([]); const [employees, setEmployees] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [search, setSearch] = useState(''); const [status, setStatus] = useState('All statuses'); const [urgency, setUrgency] = useState('All urgency'); const [source, setSource] = useState(fixedSource || 'All sources'); const [employee, setEmployee] = useState('All employees'); const [sort, setSort] = useState('Recommended Priority'); const [editing, setEditing] = useState(null);
  async function refresh() { setLoading(true); setError(''); const params = new URLSearchParams(); if (search.trim()) params.set('search', search.trim()); if (status !== 'All statuses') params.set('status', status); if (urgency !== 'All urgency') params.set('urgency', urgency); if (source !== 'All sources') params.set('source', source); if (employee !== 'All employees') params.set('employeeId', employee); try { const result = await api(`/admin/tasks?${params}`); setTasks(result.tasks); } catch (e) { setError(e.message); } finally { setLoading(false); } }
  useEffect(() => { api('/employees').then((r) => setEmployees(r.employees)).catch(() => {}); }, []);
  useEffect(() => { const timer = setTimeout(refresh, 150); return () => clearTimeout(timer); }, [search, status, urgency, source, employee]);
  const visible = useMemo(() => prioritizeTasks(tasks, sort), [tasks, sort]);
  const title = fixedSource ? `${fixedSource} task management` : 'Task management';
  async function saved(updated) { setTasks((current) => current.map((task) => task.id === updated.id ? updated : task)); setEditing(null); notify('Task changes saved to the demo database. No external system was updated.'); await refresh(); }
  function reset() { setSearch(''); setStatus('All statuses'); setUrgency('All urgency'); setSource(fixedSource || 'All sources'); setEmployee('All employees'); setSort('Recommended Priority'); }
  return <><PageTitle eyebrow="Task operations" title={title} description="Manage assignments and task details stored in the TaskFlow demonstration database." actions={<><span className="demo-sync-label"><span className="source-dot source-helpdesk" />Simulated integrations</span><button className="button button-secondary" onClick={refresh} disabled={loading}><RefreshCw size={15} /> Refresh</button></>} />
    <div className="demo-data-callout"><span className="demo-data-icon"><AlertTriangle size={16} /></span><div><strong>Updates stay inside TaskFlow.</strong><span>CRM and Helpdesk records are sample data. Edits are saved locally and are not synchronized with external systems.</span></div><button aria-label="Dismiss note"><X size={15} /></button></div>
    {error && <ErrorBanner message={error} onRetry={refresh} />}
    <div className="admin-task-metrics"><span><strong>{tasks.length}</strong> tasks in view</span><span><i className="metric-status pending" />{tasks.filter((t) => t.status === 'Pending').length} pending</span><span><i className="metric-status in-progress" />{tasks.filter((t) => t.status === 'In Progress').length} in progress</span><span><i className="metric-status completed" />{tasks.filter((t) => t.status === 'Completed').length} completed</span><span className="metric-overdue"><AlertTriangle size={13} />{tasks.filter((t) => isOverdue(t)).length} overdue</span></div>
    <section className="panel admin-table-panel"><div className="admin-filter-toolbar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, ID, employee…" aria-label="Search tasks" /></div><div className="filter-controls">{!fixedSource && <FilterSelect icon={BriefcaseBusiness} value={source} onChange={setSource} label="Source" options={['All sources', 'CRM', 'Helpdesk']} />}<FilterSelect icon={Activity} value={status} onChange={setStatus} label="Status" options={['All statuses', 'Pending', 'In Progress', 'Completed']} /><FilterSelect icon={UserRound} value={employee} onChange={setEmployee} label="Employee" options={['All employees', ...employees.map((item) => ({ label: item.full_name, value: item.id }))]} /><FilterSelect icon={AlertTriangle} value={urgency} onChange={setUrgency} label="Urgency" options={['All urgency', 'Critical', 'High', 'Medium', 'Low']} /><button className="filter-reset" onClick={reset}><X size={14} /> Reset</button></div></div>
      <div className="table-heading-row"><div><span className="panel-kicker">Persistent task overrides</span><h2>{fixedSource || 'All'} tasks <span className="count-badge">{visible.length}</span></h2></div><label className="sort-select"><SlidersHorizontal size={14} /><span>Sort by</span><select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort tasks"><option>Recommended Priority</option><option>Nearest Deadline</option><option>Highest Urgency</option><option>Newest Tasks</option></select><ChevronDown size={13} /></label></div>
      {loading ? <TaskSkeleton count={5} /> : visible.length ? <><div className="admin-inquiries-table-wrap"><table className="admin-task-table"><thead><tr><th>Task</th><th>Assignee</th><th>Source</th><th>Deadline</th><th>Urgency</th><th>Status</th><th>Manage</th></tr></thead><tbody>{visible.map((task) => <tr key={task.id}><td><Link className="task-name-cell" to={`/admin/tasks/${task.id}`}><span className={cx('task-type-icon', task.source === 'CRM' ? 'type-crm' : 'type-help')}><TaskSourceIcon source={task.source} size={15} /></span><span><strong>{task.title}</strong><small>{task.id}</small></span></Link></td><td><span className="employee-cell"><span className="avatar avatar-small avatar-indigo">{initials(task.employee_name)}</span>{task.employee_name}</span></td><td><SourceBadge source={task.source} /></td><td><span className={cx('date-cell', isOverdue(task) && 'date-overdue')}>{deadlineLabel(task)}</span><small className="table-date">{formatDate(task.deadline)}</small></td><td><UrgencyBadge urgency={task.urgency} /></td><td><StatusBadge status={task.status} /></td><td><button className="button button-small button-secondary" onClick={() => setEditing(task)}>Edit task <SlidersHorizontal size={13} /></button></td></tr>)}</tbody></table></div><div className="mobile-admin-inquiries">{visible.map((task) => <TaskCard task={task} basePath="/admin/tasks" key={task.id} />)}</div><div className="table-footer"><span>Every supported edit is recorded in the task history.</span><span>{tasks.length} task records</span></div></> : <EmptyState icon={ListChecks} title="No tasks match these filters" detail="Adjust your search or reset the task filters." action={<button className="button button-secondary" onClick={reset}>Reset filters</button>} />}
    </section>{editing && <TaskEditDialog task={editing} employees={employees} onClose={() => setEditing(null)} onSaved={saved} />}
  </>;
}

function TaskEditDialog({ task, employees, onClose, onSaved }) {
  const localDeadline = new Date(task.deadline); localDeadline.setMinutes(localDeadline.getMinutes() - localDeadline.getTimezoneOffset());
  const [form, setForm] = useState({ status: task.status, urgency: task.urgency, deadline: localDeadline.toISOString().slice(0, 16), employeeId: task.employee_id }); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event) { event.preventDefault(); setBusy(true); setError(''); try { const result = await api(`/admin/tasks/${task.id}`, { method: 'PATCH', body: { ...form, deadline: new Date(form.deadline).toISOString() } }); await onSaved(result.task); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  return <div className="modal-backdrop" onClick={onClose}><section className="task-edit-modal" onClick={(e) => e.stopPropagation()}><div className="modal-header"><div><span className="panel-kicker">{task.source} · {task.id}</span><h2>Edit task details</h2></div><button className="icon-button" onClick={onClose} aria-label="Close editor"><X size={18} /></button></div><form className="task-edit-form" onSubmit={submit}>{error && <div className="form-error"><AlertTriangle size={15} />{error}</div>}<label className="field-label">Assignee<select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>{!employees.some((item) => item.id === task.employee_id) && <option value={task.employee_id}>{task.employee_name} · current inactive assignment</option>}{employees.map((item) => <option key={item.id} value={item.id}>{item.full_name} · {item.email}</option>)}</select></label><div className="form-grid-two"><label className="field-label">Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{['Pending', 'In Progress', 'Completed'].map((value) => <option key={value}>{value}</option>)}</select></label><label className="field-label">Urgency<select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })}>{['Critical', 'High', 'Medium', 'Low'].map((value) => <option key={value}>{value}</option>)}</select></label></div><label className="field-label">Deadline<input type="datetime-local" required value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></label><div className="task-edit-notice"><AlertTriangle size={14} />Saved changes are local to this demo. They do not sync to the original source.</div><div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? <LoaderCircle size={15} className="spin" /> : <>Save task <Check size={14} /></>}</button></div></form></section></div>;
}

function AdminTaskDetailPage() {
  const { id } = useParams(); const [data, setData] = useState(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [editing, setEditing] = useState(false); const [employees, setEmployees] = useState([]); const { notify } = useAuth();
  async function refresh() { setLoading(true); setError(''); try { setData(await api(`/tasks/${id}`)); } catch (e) { setError(e.message); } finally { setLoading(false); } }
  useEffect(() => { refresh(); api('/employees').then((result) => setEmployees(result.employees)).catch(() => {}); }, [id]);
  if (loading) return <div className="detail-loading"><LoaderCircle className="spin" />Loading task…</div>;
  if (!data) return <><Link className="back-link" to="/admin/tasks"><ArrowLeft size={14} /> Back to tasks</Link><ErrorBanner message={error || 'Task not found.'} onRetry={refresh} /></>;
  const task = data.task;
  async function saved(updated) { setData((current) => ({ ...current, task: updated })); setEditing(false); notify('Task saved in the TaskFlow demo database.'); await refresh(); }
  return <><Link className="back-link" to="/admin/tasks"><ArrowLeft size={14} /> Back to task management</Link><div className="admin-task-detail-toolbar"><span className="demo-sync-label"><AlertTriangle size={14} /> Demo record · no external sync</span><button className="button button-primary" onClick={() => setEditing(true)}><SlidersHorizontal size={15} /> Edit task</button></div><TaskDetailContent task={task} history={data.history} admin /><p className="admin-detail-notice"><AlertTriangle size={14} />This task belongs to a simulated {task.source} source. TaskFlow saves supported edits locally without synchronizing to an external system.</p>{editing && <TaskEditDialog task={task} employees={employees} onClose={() => setEditing(false)} onSaved={saved} />}</>;
}

function TaskDetailContent({ task, history, admin = false }) {
  return <div className="task-detail-grid"><section className="panel task-detail-main"><div className="task-detail-meta"><SourceBadge source={task.source} /><span className="task-id">{task.id}</span><span className="task-detail-dot">·</span><span>Created {formatDate(task.created_at)}</span></div><h1 className="task-detail-title">{task.title}</h1><p className="task-detail-description">{task.description}</p><div className="task-detail-badges"><StatusBadge status={task.status} /><UrgencyBadge urgency={task.urgency} /><span className={cx('deadline-label', isOverdue(task) && 'deadline-overdue')}><Clock3 size={13} />{deadlineLabel(task)}</span></div><div className="detail-separator" /><div className="detail-section-head"><div><span className="panel-kicker">Task activity</span><h2>History</h2></div><span className="activity-count">{history.length || 1} updates</span></div>{history.length ? <div className="task-history">{history.map((item) => <div className="history-item" key={item.id}><span className="history-dot" /><span><strong>{item.action}</strong><small>{item.actor_name || 'System'} · {formatDateTime(item.created_at)}{item.new_value ? ` · ${item.old_value || '—'} → ${item.new_value}` : ''}</small></span></div>)}</div> : <div className="history-item"><span className="history-dot" /><span><strong>Task added to TaskFlow</strong><small>Mock integration · {formatDateTime(task.created_at)}</small></span></div>}</section><aside className="task-detail-side"><section className="panel detail-properties"><div className="panel-heading"><div><span className="panel-kicker">Task details</span><h2>Properties</h2></div></div><PropertyRow icon={UserRound} label="Assigned to"><span className="property-person"><span className="avatar avatar-small avatar-indigo">{initials(task.employee_name)}</span>{task.employee_name}</span></PropertyRow><PropertyRow icon={CalendarDays} label="Deadline">{formatDate(task.deadline)}</PropertyRow><PropertyRow icon={BriefcaseBusiness} label="Source"><SourceBadge source={task.source} /></PropertyRow><PropertyRow icon={Command} label="Task ID"><span className="task-id code-id">{task.id}</span></PropertyRow></section>{!admin && <div className="detail-source-callout"><div className="source-callout-icon"><ExternalLink size={17} /></div><div><strong>Open source task</strong><p>View this record in the simulated {task.source} workspace.</p></div><Link to={task.source_url} className="button button-primary button-block">Open {task.source} task <ArrowUpRight size={14} /></Link><small className="demo-microcopy">Demo integration · Changes don’t sync externally</small></div>}</aside></div>;
}

function AdminActivityPage() {
  const [activity, setActivity] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  async function refresh() { setLoading(true); setError(''); try { const result = await api('/admin/activity'); setActivity(result.activity); } catch (e) { setError(e.message); } finally { setLoading(false); } }
  useEffect(() => { refresh(); }, []);
  const iconFor = (type) => type === 'inquiry' ? MessageSquareText : type === 'task' ? ListChecks : type === 'user' ? UserRound : Activity;
  return <><PageTitle eyebrow="Audit trail" title="Activity logs" description="A chronological record of important actions in this demonstration workspace." actions={<button className="button button-secondary" onClick={refresh} disabled={loading}><RefreshCw size={15} /> Refresh</button>} />{error && <ErrorBanner message={error} onRetry={refresh} />}
    <section className="panel activity-log-panel"><div className="panel-heading"><div><span className="panel-kicker">Recent events</span><h2>Workspace activity</h2></div><span className="mini-badge">Latest 100</span></div>{loading ? <TaskSkeleton count={5} /> : activity.length ? <div className="activity-log-list">{activity.map((event) => { const Icon = iconFor(event.entity_type); return <div className="activity-log-row" key={event.id}><span className="activity-log-icon"><Icon size={16} /></span><div className="activity-log-copy"><strong>{event.actor_name || 'System'}</strong><span>{event.action}</span><small>{event.entity_type}{event.entity_id ? ` · ${event.entity_id}` : ''}</small></div><time>{formatDateTime(event.created_at)}</time></div>; })}</div> : <EmptyState icon={Activity} title="No activity yet" detail="Admin and employee actions will appear here." />}</section></>;
}

function AdminSettingsPage() {
  return <><PageTitle eyebrow="Workspace configuration" title="Admin settings" description="Review the current demonstration setup and deployment requirements." />
    <div className="settings-layout"><section className="panel settings-card"><div className="panel-heading"><div><span className="panel-kicker">Environment</span><h2>Connected services</h2></div><div className="settings-icon"><Settings size={17} /></div></div><div className="service-row"><span className="service-logo service-database"><ListChecks size={17} /></span><span><strong>TaskFlow database</strong><small>SQLite locally · Turso required on Vercel</small></span><span className="service-state"><i />API checks connection</span></div><div className="service-row"><span className="service-logo service-crm"><BriefcaseBusiness size={17} /></span><span><strong>CRM source</strong><small>Simulated REST API · No credentials required</small></span><span className="service-state"><i />Demo data</span></div><div className="service-row"><span className="service-logo service-help"><Headphones size={17} /></span><span><strong>Helpdesk source</strong><small>Simulated REST API · No credentials required</small></span><span className="service-state"><i />Demo data</span></div><div className="service-row"><span className="service-logo service-auth"><LockKeyhole size={17} /></span><span><strong>Authentication</strong><small>Email and password · Secure session cookie</small></span><span className="service-state"><i />Enabled</span></div></section>
      <section className="settings-side"><div className="settings-callout admin-settings-callout"><span className="settings-callout-icon"><ShieldCheck size={20} /></span><span className="panel-kicker">Demo account safety</span><h3>Replace demo credentials before launch.</h3><p>The seeded admin account is for controlled local review only. Set a strong DEMO_ADMIN_PASSWORD and JWT_SECRET before deployment. The password is hashed in the database.</p><span className="security-line"><LockKeyhole size={14} />Credentials are not displayed in the admin UI.</span></div><div className="panel settings-session"><span className="panel-kicker">Integration notes</span><p className="integration-help">Task and inquiry edits are persisted in the demo database. The simulated CRM and Helpdesk APIs do not receive write-back changes.</p><Link to="/admin/tasks" className="text-link">Manage demo tasks <ArrowRight size={14} /></Link></div></section></div>
  </>;
}

function ErrorBanner({ message, onRetry }) { return <div className="error-banner"><span><AlertTriangle size={17} /></span><div><strong>Something needs attention</strong><p>{message}</p></div>{onRetry && <button className="button button-secondary button-small" onClick={onRetry}><RefreshCw size={13} /> Retry</button>}</div>; }

function EmptyState({ icon: Icon, title, detail, action }) { return <div className="empty-state"><div className="empty-icon"><Icon size={21} /></div><h3>{title}</h3><p>{detail}</p>{action}</div>; }

function TaskSkeleton({ count = 4 }) { return <div className="skeleton-list">{Array.from({ length: count }, (_, i) => <div className="skeleton-row" key={i}><i /><span><b /><small /></span><i /><i /></div>)}</div>; }

function NotFoundPage() {
  const { user } = useAuth(); const to = user?.role === 'admin' ? '/admin/dashboard' : user ? '/dashboard' : '/login';
  return <main className="not-found"><Brand /><div className="not-found-card"><span className="not-found-code">404</span><span className="eyebrow">Wrong turn?</span><h1>This page is off the map.</h1><p>The page you’re looking for doesn’t exist or may have moved.</p><Link className="button button-primary" to={to}><ArrowLeft size={15} /> Back to your workspace</Link></div><DeveloperCredit /></main>;
}

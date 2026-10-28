const urgencyRank = { Critical: 0, High: 1, Medium: 2, Low: 3 };

export function isOverdue(task, now = Date.now()) {
  return task.status !== 'Completed' && new Date(task.deadline).getTime() < now;
}

function priorityBand(task, now) {
  if (task.status === 'Completed') return 9;
  const deadline = new Date(task.deadline).getTime();
  const overdue = deadline < now;
  if (overdue && task.urgency === 'Critical') return 0;
  if (overdue && task.urgency === 'High') return 1;
  if (overdue) return 2;
  if (deadline <= now + 24 * 60 * 60 * 1000 && task.urgency === 'Critical') return 3;
  if (deadline <= now + 24 * 60 * 60 * 1000 && task.urgency === 'High') return 4;
  if (deadline <= now + 24 * 60 * 60 * 1000 && task.urgency === 'Medium') return 5;
  if (deadline <= now + 24 * 60 * 60 * 1000 && task.urgency === 'Low') return 6;
  return 7;
}

export function prioritizeTasks(tasks, mode = 'Recommended Priority', now = Date.now()) {
  const copy = [...tasks];
  if (mode === 'Nearest Deadline') return copy.sort((a, b) => new Date(a.deadline) - new Date(b.deadline) || a.id.localeCompare(b.id));
  if (mode === 'Highest Urgency') return copy.sort((a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency] || new Date(a.deadline) - new Date(b.deadline) || a.id.localeCompare(b.id));
  if (mode === 'Newest Tasks') return copy.sort((a, b) => new Date(b.created_at) - new Date(a.created_at) || a.id.localeCompare(b.id));
  return copy.sort((a, b) => priorityBand(a, now) - priorityBand(b, now) || new Date(a.deadline) - new Date(b.deadline) || a.id.localeCompare(b.id));
}

export function deadlineLabel(task, now = new Date()) {
  if (task.status === 'Completed') return 'Completed';
  const due = new Date(task.deadline);
  if (due.getTime() < now.getTime()) return 'Overdue';
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const days = Math.round((startDue - startToday) / 86400000);
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}

export function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

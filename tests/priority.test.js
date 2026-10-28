import test from 'node:test';
import assert from 'node:assert/strict';
import { deadlineLabel, isOverdue, prioritizeTasks } from '../src/utils/priority.js';

const now = new Date('2026-10-27T12:00:00.000Z').getTime();
const task = (id, urgency, days, status = 'Pending', created = -2) => ({
  id,
  urgency,
  status,
  deadline: new Date(now + days * 86400000).toISOString(),
  created_at: new Date(now + created * 86400000).toISOString(),
});

test('recommended priority ranks overdue and due-soon work by the required order', () => {
  const tasks = [
    task('DUE-LOW', 'Low', .2), task('OVER-MED', 'Medium', -1), task('DUE-CRIT', 'Critical', .1),
    task('OVER-HIGH', 'High', -2), task('DUE-HIGH', 'High', .5), task('OVER-CRIT', 'Critical', -1),
    task('FUTURE', 'Critical', 4), task('DUE-MED', 'Medium', .3),
  ];
  assert.deepEqual(prioritizeTasks(tasks, 'Recommended Priority', now).map((item) => item.id), [
    'OVER-CRIT', 'OVER-HIGH', 'OVER-MED', 'DUE-CRIT', 'DUE-HIGH', 'DUE-MED', 'DUE-LOW', 'FUTURE',
  ]);
});

test('completed tasks are not overdue and sort behind incomplete tasks', () => {
  const completed = task('DONE', 'Critical', -10, 'Completed');
  assert.equal(isOverdue(completed, now), false);
  assert.equal(deadlineLabel(completed, new Date(now)), 'Completed');
  assert.deepEqual(prioritizeTasks([completed, task('OPEN', 'Low', 4)], 'Recommended Priority', now).map((item) => item.id), ['OPEN', 'DONE']);
});

test('deadline sorting breaks ties with the task id', () => {
  const sameDeadline = new Date(now + 86400000).toISOString();
  const items = [{ id: 'TASK-B', deadline: sameDeadline }, { id: 'TASK-A', deadline: sameDeadline }];
  assert.deepEqual(prioritizeTasks(items, 'Nearest Deadline', now).map((item) => item.id), ['TASK-A', 'TASK-B']);
});

test('alternate sort modes choose urgency and creation time', () => {
  const items = [task('OLDER', 'Low', 3, 'Pending', -4), task('NEWER', 'Medium', 2, 'Pending', -1), task('URGENT', 'Critical', 5, 'Pending', -2)];
  assert.deepEqual(prioritizeTasks(items, 'Highest Urgency', now).map((item) => item.id), ['URGENT', 'NEWER', 'OLDER']);
  assert.deepEqual(prioritizeTasks(items, 'Newest Tasks', now).map((item) => item.id), ['NEWER', 'URGENT', 'OLDER']);
});

test('deadline labels reflect overdue, today, tomorrow and later dates', () => {
  const base = new Date('2026-10-27T12:00:00.000Z');
  assert.equal(deadlineLabel(task('OLD', 'High', -1), base), 'Overdue');
  assert.equal(deadlineLabel(task('TODAY', 'High', .2), base), 'Due today');
  assert.equal(deadlineLabel(task('TOMORROW', 'High', 1), base), 'Due tomorrow');
  assert.equal(deadlineLabel(task('LATER', 'High', 3), base), 'Due in 3 days');
});

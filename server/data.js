const daysFromNow = (days, hours = 11) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hours, 0, 0, 0);
  return date.toISOString();
};

export const demoUsers = [
  { id: 'emp-alex', fullName: 'Alex Morgan', email: 'alex@taskflow.demo', role: 'employee' },
  { id: 'emp-jamie', fullName: 'Jamie Chen', email: 'jamie@taskflow.demo', role: 'employee' },
  { id: 'emp-taylor', fullName: 'Taylor Brooks', email: 'taylor@taskflow.demo', role: 'employee' },
  { id: 'emp-riley', fullName: 'Riley Patel', email: 'riley@taskflow.demo', role: 'employee' },
];

const crm = (id, title, description, employee, status, urgency, due, createdDays = -9) => ({
  id, title, description, employee, status, urgency, due, created: daysFromNow(createdDays, 9), source: 'CRM',
});
const helpdesk = (id, title, description, employee, status, urgency, due, createdDays = -6) => ({
  id, title, description, employee, status, urgency, due, created: daysFromNow(createdDays, 10), source: 'Helpdesk',
});

export const demoTasks = [
  crm('CRM-2401', 'Prepare renewal proposal for Northstar', 'Review the account plan and prepare a renewal package for the customer success review.', 'Alex Morgan', 'In Progress', 'Critical', -2),
  crm('CRM-2402', 'Follow up on Meridian onboarding', 'Confirm the launch checklist and collect the outstanding stakeholder approvals.', 'Jamie Chen', 'Pending', 'High', 0),
  crm('CRM-2403', 'Update Acme contact records', 'Verify decision-maker contact details and update the account record.', 'Taylor Brooks', 'Pending', 'Medium', 1),
  crm('CRM-2404', 'Schedule QBR with Pinecone Labs', 'Find a suitable date for the quarterly business review and send the agenda.', 'Riley Patel', 'In Progress', 'High', 2),
  crm('CRM-2405', 'Review expansion opportunity', 'Summarize usage trends and prepare the expansion discovery questions.', 'Alex Morgan', 'Pending', 'High', -1),
  crm('CRM-2406', 'Close duplicate opportunity', 'Check the opportunity history and merge the duplicate sales record.', 'Jamie Chen', 'Completed', 'Low', -4),
  crm('CRM-2407', 'Send pricing clarification', 'Share the revised pricing breakdown and answer the open commercial question.', 'Taylor Brooks', 'In Progress', 'Medium', 3),
  crm('CRM-2408', 'Refresh customer success plan', 'Add new goals and owners to the customer success plan before the next review.', 'Riley Patel', 'Pending', 'Low', 7),
  crm('CRM-2409', 'Confirm implementation milestones', 'Validate the project timeline with delivery and update the account notes.', 'Jamie Chen', 'Pending', 'Critical', 0),
  crm('CRM-2410', 'Document product feedback', 'Capture the feedback from the latest customer call and route it to product.', 'Alex Morgan', 'Completed', 'Medium', -3),
  helpdesk('HELP-8101', 'Investigate SSO sign-in issue', 'Trace the failed SAML assertion and share the next troubleshooting step.', 'Taylor Brooks', 'In Progress', 'Critical', -1),
  helpdesk('HELP-8102', 'Restore report export access', 'Check the workspace export permission for the finance team.', 'Riley Patel', 'Pending', 'High', 0),
  helpdesk('HELP-8103', 'Resolve mobile sync delay', 'Review sync logs and confirm the affected device version.', 'Alex Morgan', 'Pending', 'Medium', 1),
  helpdesk('HELP-8104', 'Answer API rate limit question', 'Clarify the current limits and explain the recommended retry behavior.', 'Jamie Chen', 'Completed', 'Low', -5),
  helpdesk('HELP-8105', 'Review invoice discrepancy', 'Compare the invoice line items with the active subscription plan.', 'Taylor Brooks', 'Pending', 'High', 2),
  helpdesk('HELP-8106', 'Update workspace member roles', 'Apply the approved role changes for the customer workspace.', 'Riley Patel', 'In Progress', 'Medium', 4),
  helpdesk('HELP-8107', 'Triage notification delivery', 'Check the delivery queue and identify why some alerts were delayed.', 'Alex Morgan', 'Pending', 'Critical', 0),
  helpdesk('HELP-8108', 'Share data retention guidance', 'Send the customer the current data retention and export guidance.', 'Jamie Chen', 'Pending', 'Low', 6),
  helpdesk('HELP-8109', 'Close resolved access request', 'Verify access is restored and document the resolution for the user.', 'Taylor Brooks', 'Completed', 'Medium', -2),
  helpdesk('HELP-8110', 'Check scheduled import status', 'Confirm the scheduled import completed and report any skipped records.', 'Riley Patel', 'Pending', 'High', -3),
];

export const taskRow = (task) => {
  const employee = demoUsers.find((item) => item.fullName === task.employee);
  return [
    task.id, task.title, task.description, employee.id, employee.fullName, employee.email,
    task.status, task.urgency, daysFromNow(task.due), task.source,
    `/mock-source/${task.source.toLowerCase()}/${task.id}`, task.created,
  ];
};

export const sampleInquiries = [
  {
    id: 'INQ-DEMO-1001', userId: 'emp-alex', name: 'Alex Morgan', email: 'alex@taskflow.demo',
    subject: 'Need a hand with a task reassignment', category: 'Task Related', related: 'CRM-2401',
    message: 'The renewal proposal needs a second reviewer. Could you help assign someone from the account team?',
    priority: 'High', status: 'In Progress', response: 'I have asked Jamie to review the proposal with you. The assignment is reflected in the task activity.',
  },
  {
    id: 'INQ-DEMO-1002', userId: 'emp-jamie', name: 'Jamie Chen', email: 'jamie@taskflow.demo',
    subject: 'Dashboard feedback', category: 'Feedback', related: null,
    message: 'A compact view of upcoming deadlines would be useful when planning my day.',
    priority: 'Low', status: 'Resolved', response: 'Thanks for the suggestion. It has been added to the demonstration feedback log.',
  },
  {
    id: 'INQ-DEMO-1003', userId: 'emp-taylor', name: 'Taylor Brooks', email: 'taylor@taskflow.demo',
    subject: 'Unable to open mock task source', category: 'Technical Support', related: 'HELP-8101',
    message: 'The source button opened a blank page earlier today. Can you confirm the demo source is available?',
    priority: 'Normal', status: 'New', response: null,
  },
];

export { daysFromNow };

// ============================================================
// VTcontroller – Central Mock Data & Types
// ============================================================

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high';
export type RiskLevel = 'green' | 'yellow' | 'red';
export type UserRole = 'admin' | 'manager' | 'member';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  department: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assignedTo: string[];
  projectId: string;
  subtasks: Subtask[];
  comments: Comment[];
  attachments: number;
  tags: string[];
  createdAt: string;
  delayReason?: string;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  managerId: string;
  members: string[];
  completion: number;
  overdueTasks: number;
  totalTasks: number;
  riskLevel: RiskLevel;
  color: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'on_hold';
}

export interface AIInsight {
  id: string;
  type: 'warning' | 'info' | 'danger';
  message: string;
  relatedTo: string;
  timestamp: string;
}

// ============================================================
// USERS
// ============================================================
export const USERS: User[] = [
  { id: 'u1', name: 'Priya Sharma', email: 'priya@vtc.io', avatar: 'PS', role: 'admin', department: 'Engineering' },
  { id: 'u2', name: 'Arjun Mehta', email: 'arjun@vtc.io', avatar: 'AM', role: 'manager', department: 'Design' },
  { id: 'u3', name: 'Shreya Patel', email: 'shreya@vtc.io', avatar: 'SP', role: 'member', department: 'Engineering' },
  { id: 'u4', name: 'Karan Singh', email: 'karan@vtc.io', avatar: 'KS', role: 'member', department: 'Marketing' },
  { id: 'u5', name: 'Ananya Iyer', email: 'ananya@vtc.io', avatar: 'AI', role: 'member', department: 'Engineering' },
  { id: 'u6', name: 'Rohit Verma', email: 'rohit@vtc.io', avatar: 'RV', role: 'manager', department: 'Product' },
  { id: 'u7', name: 'Neha Gupta', email: 'neha@vtc.io', avatar: 'NG', role: 'member', department: 'Design' },
];

// ============================================================
// PROJECTS
// ============================================================
export const PROJECTS: Project[] = [
  {
    id: 'p1', name: 'AI Dashboard Overhaul', description: 'Redesign the admin command dashboard with AI-powered insights and real-time charts.',
    managerId: 'u2', members: ['u1','u2','u3','u5'], completion: 72, overdueTasks: 3, totalTasks: 28,
    riskLevel: 'yellow', color: '#4f8ef7', startDate: '2026-01-10', endDate: '2026-04-15', status: 'active'
  },
  {
    id: 'p2', name: 'VTcontroller Mobile App', description: 'Build the native mobile companion app for iOS and Android.',
    managerId: 'u6', members: ['u3','u4','u6','u7'], completion: 34, overdueTasks: 7, totalTasks: 45,
    riskLevel: 'red', color: '#7c5af3', startDate: '2026-01-20', endDate: '2026-05-30', status: 'active'
  },
  {
    id: 'p3', name: 'API v2 Migration', description: 'Migrate all existing REST APIs to v2 with improved performance and new endpoints.',
    managerId: 'u1', members: ['u1','u3','u5'], completion: 89, overdueTasks: 1, totalTasks: 18,
    riskLevel: 'green', color: '#22c55e', startDate: '2025-12-01', endDate: '2026-03-31', status: 'active'
  },
  {
    id: 'p4', name: 'Marketing Automation Suite', description: 'Build email automation, campaign scheduling, and analytics reporting tools.',
    managerId: 'u2', members: ['u2','u4','u7'], completion: 55, overdueTasks: 4, totalTasks: 22,
    riskLevel: 'yellow', color: '#f59e0b', startDate: '2026-02-01', endDate: '2026-06-30', status: 'active'
  },
  {
    id: 'p5', name: 'User Onboarding Revamp', description: 'Completely overhaul the user onboarding flow to improve activation rates.',
    managerId: 'u6', members: ['u4','u5','u6'], completion: 100, overdueTasks: 0, totalTasks: 12,
    riskLevel: 'green', color: '#22d3ee', startDate: '2025-11-01', endDate: '2026-02-28', status: 'completed'
  },
];

// ============================================================
// TASKS
// ============================================================
export const TASKS: Task[] = [
  {
    id: 't1', title: 'Design new chart components for Admin Dashboard', description: 'Create Donut, Line, and Bar chart components using Recharts with our custom dark theme.',
    status: 'in_progress', priority: 'high', dueDate: '2026-03-22', assignedTo: ['u2','u3'],
    projectId: 'p1', subtasks: [
      { id: 'st1', title: 'Donut chart', done: true },
      { id: 'st2', title: 'Line chart', done: true },
      { id: 'st3', title: 'Bar chart', done: false },
    ],
    comments: [], attachments: 2, tags: ['design', 'charts'], createdAt: '2026-03-01',
  },
  {
    id: 't2', title: 'Implement JWT authentication middleware', description: 'Setup role-based JWT auth with refresh tokens and secure httpOnly cookies.',
    status: 'done', priority: 'high', dueDate: '2026-03-15', assignedTo: ['u3'],
    projectId: 'p3', subtasks: [
      { id: 'st4', title: 'Token generation', done: true },
      { id: 'st5', title: 'Refresh logic', done: true },
    ],
    comments: [], attachments: 0, tags: ['backend', 'auth'], createdAt: '2026-02-20',
  },
  {
    id: 't3', title: 'Mobile app navigation structure', description: 'Define the bottom tab navigator and drawer navigation for the mobile app.',
    status: 'blocked', priority: 'high', dueDate: '2026-03-10', assignedTo: ['u4'],
    projectId: 'p2', subtasks: [], comments: [], attachments: 1, tags: ['mobile', 'UX'],
    createdAt: '2026-02-25', delayReason: 'Blocked by dependency on design system tokens'
  },
  {
    id: 't4', title: 'Set up Redis caching layer', description: 'Configure Redis for API response caching with TTL policies per endpoint.',
    status: 'todo', priority: 'medium', dueDate: '2026-03-28', assignedTo: ['u5'],
    projectId: 'p3', subtasks: [
      { id: 'st6', title: 'Configure Redis connection', done: false },
      { id: 'st7', title: 'Cache invalidation strategy', done: false },
    ],
    comments: [], attachments: 0, tags: ['backend', 'performance'], createdAt: '2026-03-05',
  },
  {
    id: 't5', title: 'Email campaign builder UI', description: 'Build a drag-and-drop campaign email builder with template library.',
    status: 'in_progress', priority: 'medium', dueDate: '2026-04-10', assignedTo: ['u7'],
    projectId: 'p4', subtasks: [
      { id: 'st8', title: 'Template library', done: true },
      { id: 'st9', title: 'Drag & drop builder', done: false },
      { id: 'st10', title: 'Preview mode', done: false },
    ],
    comments: [], attachments: 3, tags: ['frontend', 'marketing'], createdAt: '2026-03-07',
  },
  {
    id: 't6', title: 'AI delay prediction model integration', description: 'Integrate the OpenAI API to generate smart delay predictions for overdue tasks.',
    status: 'todo', priority: 'high', dueDate: '2026-03-25', assignedTo: ['u1','u5'],
    projectId: 'p1', subtasks: [], comments: [], attachments: 0, tags: ['AI', 'backend'],
    createdAt: '2026-03-10', delayReason: 'No recent activity – last update 72hrs ago'
  },
  {
    id: 't7', title: 'Push notifications for mobile app', description: 'Implement Firebase push notifications for task updates and mentions.',
    status: 'todo', priority: 'low', dueDate: '2026-04-20', assignedTo: ['u4'],
    projectId: 'p2', subtasks: [], comments: [], attachments: 0, tags: ['mobile', 'notifications'],
    createdAt: '2026-03-12',
  },
  {
    id: 't8', title: 'Database schema migration for v2', description: 'Write and test all migration scripts for the new v2 database schema.',
    status: 'in_progress', priority: 'high', dueDate: '2026-03-18', assignedTo: ['u3','u1'],
    projectId: 'p3', subtasks: [
      { id: 'st11', title: 'Write migration scripts', done: true },
      { id: 'st12', title: 'Test on staging', done: false },
    ],
    comments: [], attachments: 0, tags: ['database', 'backend'], createdAt: '2026-03-01',
    delayReason: 'High workload – user assigned to 5+ active tasks'
  },
  {
    id: 't9', title: 'Analytics dashboard for campaigns', description: 'Build real-time analytics showing open rates, click rates, and conversion metrics.',
    status: 'blocked', priority: 'medium', dueDate: '2026-03-30', assignedTo: ['u2'],
    projectId: 'p4', subtasks: [], comments: [], attachments: 0, tags: ['analytics', 'frontend'],
    createdAt: '2026-03-08', delayReason: 'Blocked by dependency – waiting for API v2'
  },
  {
    id: 't10', title: 'Kanban board drag-and-drop feature', description: 'Implement smooth drag-and-drop for the Kanban board view with optimistic updates.',
    status: 'done', priority: 'high', dueDate: '2026-03-12', assignedTo: ['u3','u7'],
    projectId: 'p1', subtasks: [
      { id: 'st13', title: 'DnD library setup', done: true },
      { id: 'st14', title: 'API integration', done: true },
    ],
    comments: [], attachments: 0, tags: ['frontend', 'UX'], createdAt: '2026-02-28',
  },
];

// ============================================================
// AI INSIGHTS
// ============================================================
export const AI_INSIGHTS: AIInsight[] = [
  { id: 'ai1', type: 'danger', message: 'Project "VTcontroller Mobile App" may miss deadline — 7 overdue tasks detected and velocity dropping.', relatedTo: 'p2', timestamp: '2026-03-20T08:00:00Z' },
  { id: 'ai2', type: 'warning', message: 'Karan Singh is overloaded — assigned to 6 active tasks across 3 projects simultaneously.', relatedTo: 'u4', timestamp: '2026-03-20T07:30:00Z' },
  { id: 'ai3', type: 'warning', message: 'Team efficiency dropped 12% this week compared to last week. Check for blockers.', relatedTo: 'team', timestamp: '2026-03-19T18:00:00Z' },
  { id: 'ai4', type: 'info', message: 'AI Dashboard Overhaul is on track — 72% completion with 3 weeks remaining.', relatedTo: 'p1', timestamp: '2026-03-19T10:00:00Z' },
  { id: 'ai5', type: 'danger', message: 'Task "AI delay prediction model" has had no activity for 72+ hours. Risk of missing deadline.', relatedTo: 't6', timestamp: '2026-03-20T06:00:00Z' },
];

// ============================================================
// ANALYTICS DATA
// ============================================================
export const TASK_STATUS_DATA = [
  { name: 'Done', value: 32, color: '#22c55e' },
  { name: 'In Progress', value: 28, color: '#4f8ef7' },
  { name: 'Todo', value: 22, color: '#8892a4' },
  { name: 'Overdue', value: 18, color: '#ef4444' },
];

export const DELAY_TREND_DATA = [
  { date: 'Mar 1', delays: 4 },
  { date: 'Mar 5', delays: 6 },
  { date: 'Mar 8', delays: 3 },
  { date: 'Mar 10', delays: 8 },
  { date: 'Mar 12', delays: 5 },
  { date: 'Mar 15', delays: 11 },
  { date: 'Mar 17', delays: 9 },
  { date: 'Mar 20', delays: 15 },
];

export const TEAM_PERFORMANCE_DATA = [
  { name: 'Priya', completed: 12, delayed: 1 },
  { name: 'Arjun', completed: 8, delayed: 3 },
  { name: 'Shreya', completed: 15, delayed: 2 },
  { name: 'Karan', completed: 5, delayed: 6 },
  { name: 'Ananya', completed: 10, delayed: 1 },
  { name: 'Rohit', completed: 9, delayed: 2 },
  { name: 'Neha', completed: 7, delayed: 3 },
];

export const USER_PRODUCTIVITY = [
  { userId: 'u1', assigned: 14, completed: 12, pending: 1, overdue: 1, efficiency: 92 },
  { userId: 'u2', assigned: 13, completed: 8, pending: 2, overdue: 3, efficiency: 68 },
  { userId: 'u3', assigned: 19, completed: 15, pending: 2, overdue: 2, efficiency: 84 },
  { userId: 'u4', assigned: 17, completed: 5, pending: 6, overdue: 6, efficiency: 42 },
  { userId: 'u5', assigned: 12, completed: 10, pending: 1, overdue: 1, efficiency: 88 },
  { userId: 'u6', assigned: 11, completed: 9, pending: 2, overdue: 0, efficiency: 90 },
  { userId: 'u7', assigned: 10, completed: 7, pending: 3, overdue: 0, efficiency: 78 },
];

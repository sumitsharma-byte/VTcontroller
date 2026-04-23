import { useState, useEffect } from 'react';

export interface Notification {
  id: string;
  type: 'delay' | 'complete' | 'mention' | 'assignment' | 'ai';
  title: string;
  body: string;
  time: string;
  read: boolean;
  project?: string;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1', type: 'delay', read: false,
    title: 'Task at Risk of Delay',
    body: '"AI delay prediction model integration" is 72 hrs overdue with no recent activity.',
    time: '2 hours ago', project: 'AI Dashboard Overhaul',
  },
  {
    id: '2', type: 'ai', read: false,
    title: 'AI Insight: Team Bottleneck',
    body: 'Priya Sharma has 4 overdue tasks. Resource reallocation recommended.',
    time: '3 hours ago', project: 'General',
  },
  {
    id: '3', type: 'complete', read: false,
    title: 'Task Completed',
    body: '"Kanban board drag-and-drop feature" was marked Done by Neil Gupta.',
    time: '5 hours ago', project: 'VTcontroller Mobile App',
  },
  {
    id: '4', type: 'delay', read: true,
    title: 'Project Risk Level Changed',
    body: '"VTcontroller Mobile App" risk level changed to Critical due to 4 overdue tasks.',
    time: 'Yesterday', project: 'VTcontroller Mobile App',
  },
  {
    id: '5', type: 'assignment', read: true,
    title: 'New Task Assigned',
    body: 'You were assigned to "API v2 authentication refactor" by Arjun Mehta.',
    time: 'Yesterday', project: 'API v2 Migration',
  },
  {
    id: '6', type: 'mention', read: true,
    title: 'Mentioned in Comment',
    body: 'Shreya Patel mentioned you: "@priya can you review the design spec?"',
    time: '2 days ago', project: 'AI Dashboard Overhaul',
  },
];

let cachedNotifs: Notification[] | null = null;
const listeners = new Set<() => void>();

function getStored(): Notification[] {
  if (typeof window === 'undefined') return MOCK_NOTIFICATIONS;
  if (cachedNotifs) return cachedNotifs;
  try {
    const raw = localStorage.getItem('vtc_notifs');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [...MOCK_NOTIFICATIONS];
}

function persistAndNotify(data: Notification[]) {
  cachedNotifs = data;
  if (typeof window !== 'undefined') {
    localStorage.setItem('vtc_notifs', JSON.stringify(data));
  }
  listeners.forEach(l => l());
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(getStored());

  useEffect(() => {
    setNotifications(getStored()); // sync hydration
    const listener = () => setNotifications(getStored());
    listeners.add(listener);
    
    // Cross-tab sync
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'vtc_notifs') {
         cachedNotifs = null;
         listener();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const updateNotifications = (data: Notification[]) => persistAndNotify(data);

  const addNotification = (n: Omit<Notification, 'id'>) => {
    const newNotif = { ...n, id: Math.random().toString(36).substr(2, 9) };
    persistAndNotify([newNotif, ...getStored()]);
  };

  return { notifications, updateNotifications, addNotification };
}

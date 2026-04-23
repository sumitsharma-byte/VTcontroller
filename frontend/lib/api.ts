// ============================================================
// VTcontroller – API Client
// Centralized fetch wrapper with JWT auth, error handling,
// and typed responses for every endpoint.
// ============================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

// ── Token helpers ─────────────────────────────────────────
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('vtc_token');
};

export const setToken = (token: string) => {
  localStorage.setItem('vtc_token', token);
};

export const removeToken = () => {
  localStorage.removeItem('vtc_token');
  localStorage.removeItem('vtc_user');
};

export const setUser = (user: any) => {
  localStorage.setItem('vtc_user', JSON.stringify(user));
};

export const getUser = (): any | null => {
  if (typeof window === 'undefined') return null;
  const u = localStorage.getItem('vtc_user');
  return u ? JSON.parse(u) : null;
};

// ── Core fetch wrapper ────────────────────────────────────
async function request<T>(
  path: string,
  options: RequestInit = {},
  includeAuth = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (includeAuth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    removeToken();
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (!path.startsWith('/vtc-admin') && !path.startsWith('/admin')) {
        window.location.href = '/login';
      }
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const error = new Error(errData.message || `API error ${res.status}`) as any;
    error.status = res.status;
    error.errors = errData.errors;
    throw error;
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

// ── Types ─────────────────────────────────────────────────
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  avatar: string;
  role: 'admin' | 'manager' | 'member';
  department: string;
  current_workspace_id: number;
  last_active_at: string;
  efficiency: number;
}

export interface LoginResponse {
  message: string;
  user: AuthUser;
  token: string;
  token_type: string;
  expires_in: number;
}

export interface ApiProject {
  id: number;
  name: string;
  description: string;
  color: string;
  status: 'active' | 'completed' | 'on_hold' | 'cancelled';
  risk_level: 'green' | 'yellow' | 'red';
  completion: number;
  start_date: string;
  end_date: string;
  total_tasks: number;
  overdue_tasks: number;
  manager: { id: number; name: string; avatar: string } | null;
  members: { id: number; name: string; avatar: string }[];
  created_at: string;
}

export interface ApiTask {
  id: number;
  title: string;
  status: 'todo' | 'in_progress' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  delay_reason: string | null;
  is_overdue: boolean;
  position: number;
  project_id: number;
  parent_task_id: number | null;
  assignees: { id: number; name: string; avatar: string }[];
  tags: { id: number; name: string; color: string }[];
  subtasks_total: number;
  subtasks_done: number;
  created_by: number;
  created_at: string;
  // detailed
  description?: string;
  subtasks?: ApiTask[];
  comments?: ApiComment[];
  // my-tasks extras
  project?: { id: number; name: string; color: string } | null;
  folder?: { id: number; name: string } | null;
}

export interface MyTasksResponse {
  tasks: ApiTask[];
  grouped: {
    in_progress: ApiTask[];
    todo: ApiTask[];
    blocked: ApiTask[];
    done: ApiTask[];
  };
  totals: {
    all: number;
    in_progress: number;
    todo: number;
    blocked: number;
    done: number;
  };
}

export interface ApiComment {
  id: number;
  content: string;
  created_at: string;
  user: { id: number; name: string };
}

export interface AdminOverview {
  total_projects: number;
  active_projects: number;
  active_tasks: number;
  overdue_tasks: number;
  blocked_tasks: number;
  critical_count: number;
  team_efficiency: number;
}

export interface AdminAlert {
  id: number;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  delay_reason: string | null;
  project: { id: number; name: string; color: string };
  assignees: { id: number; name: string; avatar: string }[];
}

export interface AiInsight {
  id: string;
  type: 'danger' | 'warning' | 'info';
  message: string;
  relatedTo: string;
  timestamp: string;
}

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  avatar: string;
  role: string;
  department: string;
  assigned: number;
  completed: number;
  pending: number;
  overdue: number;
  efficiency: number;
  status: 'good' | 'warning' | 'risk';
}

export interface TeamPerf {
  user_id: number;
  name: string;
  full_name: string;
  avatar: string;
  completed: number;
  delayed: number;
  total: number;
}

export interface ProjectMonitor {
  id: number;
  name: string;
  color: string;
  status: string;
  completion: number;
  risk_level: string;
  total_tasks: number;
  overdue_tasks: number;
  manager: { id: number; name: string } | null;
  end_date: string | null;
}

// ── Auth API ──────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }, false),

  register: (data: { name: string; email: string; password: string; password_confirmation: string; department?: string }) =>
    request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false),

  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),

  me: () => request<{ user: AuthUser }>('/auth/me'),

  refresh: () => request<{ token: string }>('/auth/refresh', { method: 'POST' }),
};

// ── Workspaces API ────────────────────────────────────────
export interface WorkspaceMember {
  id: number;
  name: string;
  email: string;
  avatar: string;
  department: string;
  role: string;
}

export const workspacesApi = {
  members: (workspaceId: number) =>
    request<{ members: WorkspaceMember[] }>(`/workspaces/${workspaceId}/members`),
};

// ── Projects API ──────────────────────────────────────────
export const projectsApi = {
  list: (workspaceId: number) =>
    request<{ projects: ApiProject[] }>(`/workspaces/${workspaceId}/projects`),

  create: (workspaceId: number, data: Partial<ApiProject>) =>
    request<{ project: ApiProject }>(`/workspaces/${workspaceId}/projects`, {
      method: 'POST', body: JSON.stringify(data),
    }),

  get: (id: number) => request<{ project: ApiProject }>(`/projects/${id}`),

  update: (id: number, data: Partial<ApiProject>) =>
    request<{ project: ApiProject }>(`/projects/${id}`, {
      method: 'PUT', body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<{ message: string }>(`/projects/${id}`, { method: 'DELETE' }),

  stats: (id: number) => request<any>(`/projects/${id}/stats`),
};

// ── Tasks API ─────────────────────────────────────────────
export const tasksApi = {
  list: (projectId: number, filters?: Record<string, string>) => {
    const params = new URLSearchParams(filters ?? {}).toString();
    return request<{ tasks: ApiTask[] }>(`/projects/${projectId}/tasks${params ? '?' + params : ''}`);
  },

  create: (projectId: number, data: Partial<ApiTask> & { assignee_ids?: number[] }) =>
    request<{ task: ApiTask }>(`/projects/${projectId}/tasks`, {
      method: 'POST', body: JSON.stringify(data),
    }),

  get: (id: number) => request<{ task: ApiTask }>(`/tasks/${id}`),

  update: (id: number, data: Partial<ApiTask> & { assignee_ids?: number[] }) =>
    request<{ task: ApiTask }>(`/tasks/${id}`, {
      method: 'PUT', body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<{ message: string }>(`/tasks/${id}`, { method: 'DELETE' }),

  reorder: (tasks: { id: number; status: string; position: number }[]) =>
    request<{ message: string }>('/tasks/reorder', {
      method: 'PUT', body: JSON.stringify({ tasks }),
    }),

  addComment: (taskId: number, content: string) =>
    request<{ comment: ApiComment }>(`/tasks/${taskId}/comments`, {
      method: 'POST', body: JSON.stringify({ content }),
    }),

  share: (taskId: number, email: string) =>
    request<{ message: string }>(`/tasks/${taskId}/share`, {
      method: 'POST', body: JSON.stringify({ email }),
    }),

  myTasks: (workspaceId?: number) => {
    const q = workspaceId ? `?workspace_id=${workspaceId}` : '';
    return request<MyTasksResponse>(`/tasks/my-tasks${q}`);
  },
};

// ── Admin API ─────────────────────────────────────────────
export const adminApi = {
  overview: (workspaceId?: number) => {
    const q = workspaceId ? `?workspace_id=${workspaceId}` : '';
    return request<AdminOverview>(`/admin/overview${q}`);
  },

  taskDistribution: (workspaceId?: number) => {
    const q = workspaceId ? `?workspace_id=${workspaceId}` : '';
    return request<{ distribution: { name: string; value: number; color: string }[] }>(`/admin/task-distribution${q}`);
  },

  delayTrend: (workspaceId?: number) => {
    const q = workspaceId ? `?workspace_id=${workspaceId}` : '';
    return request<{ trend: { date: string; delays: number }[] }>(`/admin/delay-trend${q}`);
  },

  teamPerformance: (workspaceId?: number) => {
    const q = workspaceId ? `?workspace_id=${workspaceId}` : '';
    return request<{ team: TeamPerf[] }>(`/admin/team-performance${q}`);
  },

  criticalAlerts: (workspaceId?: number) => {
    const q = workspaceId ? `?workspace_id=${workspaceId}` : '';
    return request<{ alerts: AdminAlert[]; total: number }>(`/admin/critical-alerts${q}`);
  },

  projectMonitoring: (workspaceId?: number) => {
    const q = workspaceId ? `?workspace_id=${workspaceId}` : '';
    return request<{ projects: ProjectMonitor[] }>(`/admin/project-monitoring${q}`);
  },

  teamTable: (workspaceId?: number) => {
    const q = workspaceId ? `?workspace_id=${workspaceId}` : '';
    return request<{ team: TeamMember[] }>(`/admin/team-table${q}`);
  },

  aiInsights: (workspaceId?: number) => {
    const q = workspaceId ? `?workspace_id=${workspaceId}` : '';
    return request<{ insights: AiInsight[] }>(`/admin/ai-insights${q}`);
  },

  createUser: (data: { name: string; email: string; password: string; role: string; department?: string; workspace_id?: number }) =>
    request<{ message: string; user: any }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ── Chat Types ────────────────────────────────────────
export interface ChatUser {
  id: number;
  name: string;
  avatar: string;
  role: string;
  department?: string;
}

export interface ChatLatestMessage {
  content: string;
  type: string;
  created_at: string;
  user_name: string;
}

export interface ApiChat {
  id: number;
  type: 'direct' | 'group';
  name: string;
  avatar: string | null;
  other_user_id?: number;
  other_user_role?: string;
  members: ChatUser[];
  latest_message: ChatLatestMessage | null;
  unread_count: number;
  created_at: string;
}

export interface ApiChatMessage {
  id: number;
  chat_id: number;
  content: string;
  type: 'text' | 'image' | 'url';
  image_url: string | null;
  url: string | null;
  url_title: string | null;
  url_description: string | null;
  url_image: string | null;
  created_at: string;
  user: ChatUser;
}

// ── Chat API ──────────────────────────────────────────
export const chatApi = {
  users: () => request<{ users: ChatUser[] }>('/chats/users'),

  list: (auditUserId?: number) => {
    const q = auditUserId ? `?audit_user_id=${auditUserId}` : '';
    return request<{ chats: ApiChat[] }>(`/chats${q}`);
  },

  createDirect: (userId: number) =>
    request<{ chat: ApiChat }>('/chats', {
      method: 'POST',
      body: JSON.stringify({ type: 'direct', user_id: userId }),
    }),

  createGroup: (name: string, memberIds: number[]) =>
    request<{ chat: ApiChat }>('/chats', {
      method: 'POST',
      body: JSON.stringify({ type: 'group', name, member_ids: memberIds }),
    }),

  messages: (chatId: number, auditUserId?: number) => {
    const q = auditUserId ? `?audit_user_id=${auditUserId}` : '';
    return request<{ messages: ApiChatMessage[] }>(`/chats/${chatId}/messages${q}`);
  },

  sendText: (chatId: number, content: string) =>
    request<{ message: ApiChatMessage }>(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ type: 'text', content }),
    }),

  sendUrl: (chatId: number, url: string, content?: string) =>
    request<{ message: ApiChatMessage }>(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ type: 'url', url, content: content || url }),
    }),

  sendImage: async (chatId: number, file: File, caption?: string): Promise<{ message: ApiChatMessage }> => {
    const formData = new FormData();
    formData.append('type', 'image');
    formData.append('image', file);
    if (caption) formData.append('content', caption);

    const token = getToken();
    const res = await fetch(`${API_BASE}/chats/${chatId}/messages`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      let msg = err.message || `Upload error ${res.status}`;
      if (err.errors) {
        msg = Object.values(err.errors).flat().join(' ');
      }
      throw new Error(msg);
    }
    return res.json();
  },

  deleteMessage: (chatId: number, messageId: number) =>
    request<{ message: string }>(`/chats/${chatId}/messages/${messageId}`, { method: 'DELETE' }),
};

// ── Folder Types ──────────────────────────────────────
export interface ApiFolder {
  id: number;
  name: string;
  month: number;
  year: number;
  month_label: string;
  color: string;
  description: string | null;
  position: number;
  task_count: number;
  done_count: number;
  tasks: ApiTask[];
}

export const foldersApi = {
  list: (projectId: number) => 
    request<{ folders: ApiFolder[] }>(`/projects/${projectId}/folders`),
  
  create: (projectId: number, data: { month: number; year: number; name?: string; color?: string; description?: string }) =>
    request<{ folder: ApiFolder }>(`/projects/${projectId}/folders`, {
      method: 'POST', body: JSON.stringify(data),
    }),
  
  update: (projectId: number, folderId: number, data: { name?: string; color?: string; description?: string }) =>
    request<{ folder: ApiFolder }>(`/projects/${projectId}/folders/${folderId}`, {
      method: 'PUT', body: JSON.stringify(data),
    }),
  
  delete: (projectId: number, folderId: number) =>
    request<{ message: string }>(`/projects/${projectId}/folders/${folderId}`, {
      method: 'DELETE',
    }),
  
  createTask: (projectId: number, folderId: number, data: Partial<ApiTask> & { assignee_ids?: number[] }) =>
    request<{ task: ApiTask }>(`/projects/${projectId}/folders/${folderId}/tasks`, {
      method: 'POST', body: JSON.stringify(data),
    }),
  
  updateTask: (projectId: number, folderId: number, taskId: number, data: Partial<ApiTask> & { assignee_ids?: number[] }) =>
    request<{ task: ApiTask }>(`/tasks/${taskId}`, {
      method: 'PUT', body: JSON.stringify(data),
    }),
  
  deleteTask: (projectId: number, folderId: number, taskId: number) =>
    request<{ message: string }>(`/tasks/${taskId}`, {
      method: 'DELETE',
    }),
};

export const tagsApi = {
  list: () =>
    request<{ tags: { id: number; name: string; color: string }[] }>('/tags'),

  create: (name: string, color?: string) =>
    request<{ tag: { id: number; name: string; color: string } }>('/tags', {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    }),
};


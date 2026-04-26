<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{Project, Task, User, UserProductivity, ProjectHealth, Workspace};
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * AdminController – Powers the AI Command Dashboard
 * Routes protected by [auth:api, role:admin|manager]
 */
class AdminController extends Controller
{
    /**
     * GET /api/admin/overview
     * Returns top-level summary cards
     */
    public function overview(Request $request): JsonResponse
    {
        $workspaceId = $request->workspace_id ?? auth()->user()->current_workspace_id;

        $projects = Project::where('workspace_id', $workspaceId);
        $tasks    = Task::whereHas('project', fn($q) => $q->where('workspace_id', $workspaceId));

        $totalProjects   = (clone $projects)->count();
        $activeProjects  = (clone $projects)->where('status', 'active')->count();
        $activeTasks     = (clone $tasks)->where('status', 'in_progress')->count();
        $overdueTasks    = (clone $tasks)->where('status', '!=', 'done')->where('due_date', '<', now())->count();
        $blockedTasks    = (clone $tasks)->where('status', 'blocked')->count();

        // Team efficiency average
        $efficiency = UserProductivity::whereHas('workspace', fn($q) => $q->where('id', $workspaceId))
            ->latest('period_start')
            ->groupBy('user_id')
            ->selectRaw('user_id, AVG(efficiency_score) as avg_eff')
            ->get()
            ->avg('avg_eff') ?? 0;

        return response()->json([
            'total_projects'   => $totalProjects,
            'active_projects'  => $activeProjects,
            'active_tasks'     => $activeTasks,
            'overdue_tasks'    => $overdueTasks,
            'blocked_tasks'    => $blockedTasks,
            'critical_count'   => $overdueTasks + $blockedTasks,
            'team_efficiency'  => round($efficiency),
        ]);
    }

    /**
     * GET /api/admin/task-distribution
     * Returns task counts by status for donut chart
     */
    public function taskDistribution(Request $request): JsonResponse
    {
        $workspaceId = $request->workspace_id ?? auth()->user()->current_workspace_id;

        $data = Task::whereHas('project', fn($q) => $q->where('workspace_id', $workspaceId))
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->keyBy('status');

        return response()->json([
            'distribution' => [
                ['name' => 'Done',        'value' => $data['done']->count ?? 0,        'color' => '#22c55e'],
                ['name' => 'In Progress', 'value' => $data['in_progress']->count ?? 0, 'color' => '#4f8ef7'],
                ['name' => 'Todo',        'value' => $data['todo']->count ?? 0,         'color' => '#8892a4'],
                ['name' => 'Blocked',     'value' => $data['blocked']->count ?? 0,      'color' => '#ef4444'],
            ],
        ]);
    }

    /**
     * GET /api/admin/delay-trend
     * Returns delay count per day for the past 30 days (line chart)
     */
    public function delayTrend(Request $request): JsonResponse
    {
        $workspaceId = $request->workspace_id ?? auth()->user()->current_workspace_id;

        $trend = Task::whereHas('project', fn($q) => $q->where('workspace_id', $workspaceId))
            ->where('status', '!=', 'done')
            ->whereNotNull('due_date')
            ->where('due_date', '<', now())
            ->selectRaw('DATE(due_date) as date, count(*) as delays')
            ->groupBy('date')
            ->orderBy('date')
            ->limit(30)
            ->get();

        return response()->json(['trend' => $trend]);
    }

    /**
     * GET /api/admin/team-performance
     * Returns per-user completed vs delayed for bar chart
     */
    public function teamPerformance(Request $request): JsonResponse
    {
        $workspaceId = $request->workspace_id ?? auth()->user()->current_workspace_id;

        $users = User::whereHas('workspaces', fn($q) => $q->where('workspaces.id', $workspaceId))
            ->with(['assignedTasks' => fn($q) => $q->whereHas('project', fn($r) => $r->where('workspace_id', $workspaceId))])
            ->get()
            ->map(function (User $user) {
                $tasks     = $user->assignedTasks;
                $completed = $tasks->where('status', 'done')->count();
                $delayed   = $tasks->where('status', '!=', 'done')
                    ->filter(fn($t) => $t->due_date && $t->due_date->isPast())
                    ->count();

                return [
                    'user_id'   => $user->id,
                    'name'      => explode(' ', $user->name)[0],
                    'full_name' => $user->name,
                    'avatar'    => $user->avatar,
                    'completed' => $completed,
                    'delayed'   => $delayed,
                    'total'     => $tasks->count(),
                ];
            });

        return response()->json(['team' => $users]);
    }

    /**
     * GET /api/admin/critical-alerts
     * Returns blocked + overdue tasks with AI delay reasons
     */
    public function criticalAlerts(Request $request): JsonResponse
    {
        $workspaceId = $request->workspace_id ?? auth()->user()->current_workspace_id;

        $alerts = Task::whereHas('project', fn($q) => $q->where('workspace_id', $workspaceId))
            ->where(fn($q) => $q
                ->where('status', 'blocked')
                ->orWhere(fn($q2) => $q2->where('status', '!=', 'done')->where('due_date', '<', now()))
                ->orWhereNotNull('delay_reason')
            )
            ->with(['project:id,name,color', 'assignees:id,name,avatar'])
            ->orderBy('due_date')
            ->limit(20)
            ->get()
            ->map(fn(Task $task) => [
                'id'           => $task->id,
                'title'        => $task->title,
                'status'       => $task->status,
                'priority'     => $task->priority,
                'due_date'     => $task->due_date?->toDateString(),
                'delay_reason' => $task->delay_reason ?? $task->detectDelayReason(),
                'project'      => ['id' => $task->project->id, 'name' => $task->project->name, 'color' => $task->project->color],
                'assignees'    => $task->assignees->map(fn($u) => ['id' => $u->id, 'name' => $u->name, 'avatar' => $u->avatar]),
            ]);

        return response()->json(['alerts' => $alerts, 'total' => $alerts->count()]);
    }

    /**
     * GET /api/admin/project-monitoring
     * Project health table for admin
     */
    public function projectMonitoring(Request $request): JsonResponse
    {
        $workspaceId = $request->workspace_id ?? auth()->user()->current_workspace_id;

        $projects = Project::where('workspace_id', $workspaceId)
            ->with(['manager:id,name,avatar', 'members:id,name,avatar'])
            ->withCount(['tasks', 'tasks as overdue_count' => fn($q) =>
                $q->where('status', '!=', 'done')->where('due_date', '<', now())
            ])
            ->get()
            ->map(fn(Project $p) => [
                'id'           => $p->id,
                'name'         => $p->name,
                'color'        => $p->color,
                'status'       => $p->status,
                'completion'   => $p->completion,
                'risk_level'   => $p->risk_level,
                'total_tasks'  => $p->tasks_count,
                'overdue_tasks'=> $p->overdue_count,
                'manager'      => $p->manager ? ['id' => $p->manager->id, 'name' => $p->manager->name] : null,
                'end_date'     => $p->end_date?->toDateString(),
            ]);

        return response()->json(['projects' => $projects]);
    }

    /**
     * GET /api/admin/team-table
     * Full team performance table
     */
    public function teamTable(Request $request): JsonResponse
    {
        $workspaceId = $request->workspace_id ?? auth()->user()->current_workspace_id;

        $users = User::whereHas('workspaces', fn($q) => $q->where('workspaces.id', $workspaceId))
            ->get()
            ->map(function (User $user) use ($workspaceId) {
                $tasks = $user->assignedTasks()
                    ->whereHas('project', fn($q) => $q->where('workspace_id', $workspaceId))
                    ->get();

                $assigned  = $tasks->count();
                $completed = $tasks->where('status', 'done')->count();
                $overdue   = $tasks->filter(fn($t) => $t->isOverdue())->count();
                $pending   = $tasks->whereIn('status', ['todo', 'in_progress'])->count();
                $efficiency = $assigned > 0
                    ? round((($completed / $assigned) * 70) + (max(0, 1 - ($overdue / max($assigned, 1))) * 30))
                    : 0;

                return [
                    'id'         => $user->id,
                    'name'       => $user->name,
                    'email'      => $user->email,
                    'avatar'     => $user->avatar,
                    'role'       => $user->role,
                    'department' => $user->department,
                    'assigned'   => $assigned,
                    'completed'  => $completed,
                    'pending'    => $pending,
                    'overdue'    => $overdue,
                    'efficiency' => $efficiency,
                    'status'     => $efficiency >= 80 ? 'good' : ($efficiency >= 60 ? 'warning' : 'risk'),
                ];
            });

        return response()->json(['team' => $users]);
    }

    /**
     * GET /api/admin/ai-insights
     * AI-generated insights via OpenAI
     */
    public function aiInsights(Request $request): JsonResponse
    {
        $workspaceId = $request->workspace_id ?? auth()->user()->current_workspace_id;

        // Build context for AI
        $overdueTasks = Task::whereHas('project', fn($q) => $q->where('workspace_id', $workspaceId))
            ->where('status', '!=', 'done')
            ->where('due_date', '<', now())
            ->count();

        $blockedTasks = Task::whereHas('project', fn($q) => $q->where('workspace_id', $workspaceId))
            ->where('status', 'blocked')->count();

        $avgEfficiency = UserProductivity::whereHas('workspace', fn($q) => $q->where('id', $workspaceId))
            ->latest('period_start')->avg('efficiency_score') ?? 70;

        $criticalProjects = Project::where('workspace_id', $workspaceId)
            ->where('risk_level', 'red')->pluck('name')->toArray();

        // Try OpenAI, fallback to rule-based insights
        $insights = [];
        $openaiKey = config('openai.api_key');

        if ($openaiKey && strlen($openaiKey) > 10 && $openaiKey !== 'your-openai-api-key') {
            try {
                $client = \OpenAI::client($openaiKey);
                $prompt = "You are an AI work management assistant for VTcontroller. Based on this data, generate 4-5 concise, actionable insights in JSON format:\n- Overdue tasks: {$overdueTasks}\n- Blocked tasks: {$blockedTasks}\n- Team avg efficiency: " . round($avgEfficiency) . "%\n- Critical risk projects: " . implode(', ', $criticalProjects ?: ['None']) . "\n\nReturn JSON array: [{\"type\": \"danger|warning|info\", \"message\": \"...\", \"relatedTo\": \"...\"}]";

                $response = $client->chat()->create([
                    'model'      => 'gpt-4o-mini',
                    'messages'   => [['role' => 'user', 'content' => $prompt]],
                    'max_tokens' => 800,
                ]);

                $content = $response->choices[0]->message->content;
                preg_match('/\[.*\]/s', $content, $matches);
                $parsed = json_decode($matches[0] ?? '[]', true);
                if (!empty($parsed)) {
                    $insights = $parsed;
                }
            } catch (\Throwable) {
                // Fall through to rule-based
            }
        }

        // Always generate rule-based if we have no insights yet
        if (empty($insights)) {
            $insights = $this->generateRuleBasedInsights($overdueTasks, $blockedTasks, $avgEfficiency, $criticalProjects, $workspaceId);
        }

        return response()->json(['insights' => $insights]);
    }

    /**
     * POST /api/admin/users
     * Admin creating a new user inside their workspace
     */
    public function createUser(Request $request): JsonResponse
    {
        $workspaceId = $request->workspace_id ?? auth()->user()->current_workspace_id;
        
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'name'       => 'required|string|max:255',
            'email'      => 'required|email|unique:users',
            'password'   => 'required|string|min:6',
            'department' => 'nullable|string|max:100',
            'role'       => 'required|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::create([
            'name'       => $request->name,
            'email'      => $request->email,
            'password'   => \Illuminate\Support\Facades\Hash::make($request->password),
            'department' => $request->department,
            'role'       => $request->role,
            'current_workspace_id' => $workspaceId,
        ]);

        Workspace::find($workspaceId)->members()->attach($user->id, ['role' => $request->role]);

        return response()->json([
            'message' => 'User created successfully',
            'user'    => $user,
        ], 201);
    }

    /**
     * GET /api/admin/users/{user}/audit-chats
     * Admin auditing chats of another user
     */
    public function auditChats(Request $request, User $user): JsonResponse
    {
        $workspaceId = $request->workspace_id ?? auth()->user()->current_workspace_id;
        
        if (!$user->workspaces()->where('workspaces.id', $workspaceId)->exists()) {
            return response()->json(['message' => 'User not in workspace'], 403);
        }

        $chats = $user->chats()->with([
            'users:id,name,avatar,role',
            'messages' => fn($q) => $q->with('user:id,name,role,avatar')->latest()->limit(50)
        ])->get()->map(function($chat) use ($user) {
            $otherUsers = $chat->users->where('id', '!=', $user->id)->values();
            return [
                'id' => $chat->id,
                'type' => $chat->type,
                'target_user_name' => $user->name,
                'title' => $chat->type === 'direct' ? ($otherUsers->first()?->name ?? 'Unknown') : $chat->name,
                'messages' => $chat->messages->reverse()->values(),
            ];
        });

        return response()->json(['audit_chats' => $chats]);
    }

    /**
     * DELETE /api/admin/users/{user}
     */
    public function deleteUser(Request $request, User $user): JsonResponse
    {
        $workspaceId = $request->workspace_id ?? auth()->user()->current_workspace_id;
        if (!$user->workspaces()->where('workspaces.id', $workspaceId)->exists()) {
            return response()->json(['message' => 'User not in workspace'], 403);
        }

        // Prevent self-deletion
        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'Cannot delete yourself'], 403);
        }

        // Detach from workspace and delete user
        Workspace::find($workspaceId)->members()->detach($user->id);
        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }

    /**
     * POST /api/admin/users/{user}/reset-password
     */
    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $workspaceId = $request->workspace_id ?? auth()->user()->current_workspace_id;
        if (!$user->workspaces()->where('workspaces.id', $workspaceId)->exists()) {
            return response()->json(['message' => 'User not in workspace'], 403);
        }

        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user->update([
            'password' => \Illuminate\Support\Facades\Hash::make($request->password),
        ]);

        return response()->json(['message' => 'Password reset successfully']);
    }

    /**
     * PUT /api/admin/users/{user}/role
     */
    public function updateRole(Request $request, User $user): JsonResponse
    {
        $workspaceId = $request->workspace_id ?? auth()->user()->current_workspace_id;
        if (!$user->workspaces()->where('workspaces.id', $workspaceId)->exists()) {
            return response()->json(['message' => 'User not in workspace'], 403);
        }

        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'role' => 'required|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user->update(['role' => $request->role]);
        Workspace::find($workspaceId)->members()->updateExistingPivot($user->id, ['role' => $request->role]);

        return response()->json([
            'message' => 'User role updated successfully',
            'role'    => $request->role,
        ]);
    }

    // ── Private helpers ───────────────────────────────────
    private function generateRuleBasedInsights(int $overdue, int $blocked, float $efficiency, array $critical, int $workspaceId): array
    {
        $insights = [];

        if (!empty($critical)) {
            $insights[] = [
                'type'      => 'danger',
                'message'   => 'Project "' . implode(', ', $critical) . '" may be delayed due to ' . $overdue . ' overdue tasks. Immediate intervention recommended.',
                'relatedTo' => 'projects',
            ];
        }

        if ($blocked > 0) {
            $insights[] = [
                'type'      => 'warning',
                'message'   => $blocked . ' task(s) are currently blocked by unresolved dependencies. Review and unblock to maintain momentum.',
                'relatedTo' => 'tasks',
            ];
        }

        if ($efficiency < 70) {
            $insights[] = [
                'type'      => 'warning',
                'message'   => 'Team efficiency is at ' . round($efficiency) . '% — below the 70% target. Consider redistributing workload.',
                'relatedTo' => 'team',
            ];
        }

        // Check overloaded users
        $overloaded = User::whereHas('workspaces', fn($q) => $q->where('workspaces.id', $workspaceId))
            ->get()
            ->filter(fn($u) => $u->assignedTasks()->whereIn('status', ['todo', 'in_progress'])->count() >= 5);

        foreach ($overloaded->take(2) as $user) {
            $count = $user->assignedTasks()->whereIn('status', ['todo', 'in_progress'])->count();
            $insights[] = [
                'type'      => 'warning',
                'message'   => $user->name . ' is overloaded with ' . $count . ' active tasks. Consider reassignment.',
                'relatedTo' => 'user:' . $user->id,
            ];
        }

        if (empty($insights)) {
            $insights[] = [
                'type'      => 'info',
                'message'   => 'Team is performing well with ' . round($efficiency) . '% efficiency. Keep the momentum going!',
                'relatedTo' => 'team',
            ];
        }

        return collect($insights)->map(fn($i, $idx) => array_merge($i, [
            'id'        => 'ai_' . ($idx + 1),
            'timestamp' => now()->toISOString(),
        ]))->values()->all();
    }
}

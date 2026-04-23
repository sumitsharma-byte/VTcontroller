<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\Project;
use App\Models\TaskActivityLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class TaskController extends Controller
{
    /**
     * GET /api/projects/{project}/tasks
     */
    public function index(Project $project, Request $request): JsonResponse
    {
        $query = $project->tasks()
            ->with(['assignees:id,name,avatar', 'tags:id,name,color', 'subtasks'])
            ->whereNull('parent_task_id'); // top-level only by default

        // Filters
        if ($request->status) {
            $query->where('status', $request->status);
        }
        if ($request->priority) {
            $query->where('priority', $request->priority);
        }
        if ($request->assignee) {
            $query->whereHas('assignees', fn($q) => $q->where('users.id', $request->assignee));
        }
        if ($request->overdue) {
            $query->where('status', '!=', 'done')->where('due_date', '<', now());
        }

        $tasks = $query->orderBy('position')->orderBy('created_at')->get()
            ->map(fn($t) => $this->taskResource($t));

        return response()->json(['tasks' => $tasks]);
    }

    /**
     * POST /api/projects/{project}/tasks
     */
    public function store(Request $request, Project $project): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title'          => 'required|string|max:255',
            'description'    => 'nullable|string',
            'status'         => 'nullable|in:todo,in_progress,done,blocked',
            'priority'       => 'nullable|in:low,medium,high',
            'due_date'       => 'nullable|date',
            'assignee_ids'   => 'nullable|array',
            'assignee_ids.*' => 'exists:users,id',
            'tag_ids'        => 'nullable|array',
            'parent_task_id' => 'nullable|exists:tasks,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Determine which month/year to bucket this task into
        $date  = $request->due_date ? \Carbon\Carbon::parse($request->due_date) : now();
        $month = (int) $date->month;
        $year  = (int) $date->year;

        // Find or create the matching folder for this project + month + year
        $folder = \App\Models\ProjectFolder::firstOrCreate(
            ['project_id' => $project->id, 'month' => $month, 'year' => $year],
            [
                'created_by'  => auth()->id(),
                'name'        => $date->format('F Y'),
                'color'       => $project->color ?? '#49769F',
                'position'    => \App\Models\ProjectFolder::where('project_id', $project->id)->max('position') + 1,
            ]
        );

        $task = $project->tasks()->create([
            'created_by'       => auth()->id(),
            'parent_task_id'   => $request->parent_task_id,
            'folder_id'        => $folder->id,   // ← always assigned now
            'title'            => $request->title,
            'description'      => $request->description,
            'status'           => $request->status ?? 'todo',
            'priority'         => $request->priority ?? 'medium',
            'due_date'         => $request->due_date,
            'last_activity_at' => now(),
        ]);

        if ($request->assignee_ids) {
            $task->assignees()->sync($request->assignee_ids);
            
            // Dispatch Emails
            foreach ($request->assignee_ids as $userId) {
                if ($userId !== auth()->id()) {
                    $user = \App\Models\User::find($userId);
                    if ($user) {
                        \Illuminate\Support\Facades\Mail::to($user->email)->queue(
                            new \App\Mail\TaskAssignedMail($task, $user, auth()->user())
                        );
                    }
                }
            }
        }
        if ($request->tag_ids) {
            $task->tags()->sync($request->tag_ids);
        }

        // Log activity
        TaskActivityLog::create([
            'task_id'   => $task->id,
            'user_id'   => auth()->id(),
            'action'    => 'task.created',
            'to_status' => $task->status,
            'logged_at' => now(),
        ]);

        // Update project stats
        $project->recalculateCompletion();

        return response()->json(['task' => $this->taskResource($task->fresh(['assignees', 'tags', 'subtasks']))], 201);
    }

    /**
     * GET /api/tasks/{task}
     */
    public function show(Task $task): JsonResponse
    {
        $task->load(['assignees', 'tags', 'subtasks.assignees', 'comments.user', 'attachments', 'dependencies', 'activityLogs.user']);
        return response()->json(['task' => $this->taskResource($task, detailed: true)]);
    }

    /**
     * PUT /api/tasks/{task}
     */
    public function update(Request $request, Task $task): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title'        => 'sometimes|string|max:255',
            'description'  => 'nullable|string',
            'status'       => 'sometimes|in:todo,in_progress,done,blocked',
            'priority'     => 'sometimes|in:low,medium,high',
            'due_date'     => 'nullable|date',
            'position'     => 'nullable|integer',
            'assignee_ids' => 'nullable|array',
            'tag_ids'      => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $oldStatus = $task->status;
        $task->update(array_filter($request->only('title', 'description', 'status', 'priority', 'due_date', 'position'), fn($v) => !is_null($v)));

        $oldAssignees = $task->assignees()->pluck('users.id')->toArray();
        if ($request->has('assignee_ids')) {
            $task->assignees()->sync($request->assignee_ids);
            
            // Send emails to newly assigned users
            $added = array_diff($request->assignee_ids, $oldAssignees);
            foreach ($added as $userId) {
                if ($userId !== auth()->id()) {
                    $user = \App\Models\User::find($userId);
                    if ($user) {
                        \Illuminate\Support\Facades\Mail::to($user->email)->queue(
                            new \App\Mail\TaskAssignedMail($task, $user, auth()->user())
                        );
                    }
                }
            }
        }
        if ($request->has('tag_ids')) {
            $task->tags()->sync($request->tag_ids);
        }

        // Log status change
        if ($request->status && $oldStatus !== $request->status) {
            TaskActivityLog::create([
                'task_id'     => $task->id,
                'user_id'     => auth()->id(),
                'action'      => 'status.changed',
                'from_status' => $oldStatus,
                'to_status'   => $request->status,
                'logged_at'   => now(),
            ]);

            // Automation: If completed -> notify
            if ($request->status === 'done') {
                $creator = \App\Models\User::find($task->created_by);
                $manager = \App\Models\User::find($task->project->manager_id);
                $recipients = collect([$creator, $manager])->filter(fn($u) => $u && $u->id !== auth()->id())->unique('id');

                foreach ($recipients as $recipient) {
                    \Illuminate\Support\Facades\Mail::raw(
                        "Hello {$recipient->name},\n\nThe task '{$task->title}' in project '{$task->project->name}' has been marked as DONE by " . auth()->user()->name . ".\n\nGreat job team!",
                        function ($message) use ($recipient, $task) {
                            $message->to($recipient->email)
                                    ->subject("Task Completed: {$task->title}");
                        }
                    );
                }
            }
        }

        $task->touchActivity();

        // Recalculate delay reason
        $reason = $task->detectDelayReason();
        $task->update(['delay_reason' => $reason]);

        // Update project
        $task->project->recalculateCompletion();
        $task->project->recalculateRisk();

        return response()->json(['task' => $this->taskResource($task->fresh(['assignees', 'tags', 'subtasks']))]);
    }

    /**
     * DELETE /api/tasks/{task}
     */
    public function destroy(Task $task): JsonResponse
    {
        // Permission check: Only owner or admin/manager can delete
        $user = auth()->user();
        if ($task->created_by !== $user->id && $user->role === 'member') {
            return response()->json(['message' => 'Unauthorized. Only the task owner can delete this task.'], 403);
        }

        $project = $task->project;
        $task->delete();
        $project->recalculateCompletion();
        $project->recalculateRisk();
        return response()->json(['message' => 'Task deleted']);
    }

    /**
     * PUT /api/tasks/reorder  – Kanban drag & drop
     * Body: { tasks: [{ id, status, position }] }
     */
    public function reorder(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'tasks'            => 'required|array',
            'tasks.*.id'       => 'required|exists:tasks,id',
            'tasks.*.status'   => 'required|in:todo,in_progress,done,blocked',
            'tasks.*.position' => 'required|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        foreach ($request->tasks as $item) {
            $task = Task::find($item['id']);
            $old  = $task->status;
            $task->update(['status' => $item['status'], 'position' => $item['position']]);

            if ($old !== $item['status']) {
                TaskActivityLog::create([
                    'task_id'     => $task->id,
                    'user_id'     => auth()->id(),
                    'action'      => 'status.changed',
                    'from_status' => $old,
                    'to_status'   => $item['status'],
                    'logged_at'   => now(),
                ]);
                $task->touchActivity();
                $task->update(['delay_reason' => $task->detectDelayReason()]);
                $task->project->recalculateCompletion();
                $task->project->recalculateRisk();
            }
        }

        return response()->json(['message' => 'Tasks reordered']);
    }

    /**
     * GET /api/tasks/my-tasks
     * Returns all tasks assigned to the authenticated user across the workspace.
     */
    public function myTasks(Request $request): JsonResponse
    {
        $user        = auth()->user();
        $workspaceId = $request->workspace_id ?? $user->current_workspace_id;

        $tasks = Task::whereHas('assignees', fn($q) => $q->where('users.id', $user->id))
            ->whereHas('project', fn($q) => $q->where('workspace_id', $workspaceId))
            ->with([
                'assignees:id,name,avatar',
                'tags:id,name,color',
                'subtasks',
                'project:id,name,color',
                'folder:id,name,month,year',
            ])
            ->whereNull('parent_task_id')
            ->orderByRaw("CASE status WHEN 'in_progress' THEN 1 WHEN 'todo' THEN 2 WHEN 'blocked' THEN 3 WHEN 'done' THEN 4 ELSE 5 END")
            ->orderBy('due_date')
            ->get()
            ->map(function (Task $t) {
                $base = $this->taskResource($t);
                // Attach project + folder context for navigation
                $base['project'] = $t->project
                    ? ['id' => $t->project->id, 'name' => $t->project->name, 'color' => $t->project->color]
                    : null;
                $base['folder'] = $t->folder
                    ? ['id' => $t->folder->id, 'name' => $t->folder->name]
                    : null;
                return $base;
            });

        // Group by status for a kanban-style breakdown
        $grouped = [
            'in_progress' => $tasks->where('status', 'in_progress')->values(),
            'todo'        => $tasks->where('status', 'todo')->values(),
            'blocked'     => $tasks->where('status', 'blocked')->values(),
            'done'        => $tasks->where('status', 'done')->values(),
        ];

        return response()->json([
            'tasks'   => $tasks->values(),
            'grouped' => $grouped,
            'totals'  => [
                'all'         => $tasks->count(),
                'in_progress' => $tasks->where('status', 'in_progress')->count(),
                'todo'        => $tasks->where('status', 'todo')->count(),
                'blocked'     => $tasks->where('status', 'blocked')->count(),
                'done'        => $tasks->where('status', 'done')->count(),
            ],
        ]);
    }

    /**
     * POST /api/tasks/{task}/comments
     */
    public function addComment(Request $request, Task $task): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'content'   => 'required|string',
            'parent_id' => 'nullable|exists:comments,id',
        ]);
        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);

        $comment = $task->comments()->create([
            'commentable_type' => Task::class,
            'commentable_id'   => $task->id,
            'user_id'          => auth()->id(),
            'content'          => $request->content,
            'parent_id'        => $request->parent_id,
        ]);

        $task->touchActivity();
        TaskActivityLog::create([
            'task_id'   => $task->id,
            'user_id'   => auth()->id(),
            'action'    => 'comment.added',
            'logged_at' => now(),
        ]);

        return response()->json(['comment' => [
            'id'         => $comment->id,
            'content'    => $comment->content,
            'created_at' => $comment->created_at->toISOString(),
            'user'       => ['id' => auth()->id(), 'name' => auth()->user()->name, 'avatar' => auth()->user()->avatar],
        ]], 201);
    }

    /**
     * POST /api/tasks/{task}/share
     */
    public function share(Request $request, Task $task): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $sender = auth()->user();
        $recipientEmail = $request->email;

        try {
            \Illuminate\Support\Facades\Mail::to($recipientEmail)->queue(
                new \App\Mail\TaskSharedMail($task, $sender, $recipientEmail)
            );

            // Log activity
            TaskActivityLog::create([
                'task_id'   => $task->id,
                'user_id'   => $sender->id,
                'action'    => 'task.shared',
                'logged_at' => now(),
            ]);

            return response()->json(['message' => 'Task shared successfully with ' . $recipientEmail]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to share task: ' . $e->getMessage()], 500);
        }
    }

    // ── Private ───────────────────────────────────────────
    private function taskResource(Task $task, bool $detailed = false): array
    {
        $base = [
            'id'            => $task->id,
            'title'         => $task->title,
            'description'   => $task->description,   // always include
            'status'        => $task->status,
            'priority'      => $task->priority,
            'due_date'      => $task->due_date?->toDateString(),
            'delay_reason'  => $task->delay_reason,
            'is_overdue'    => $task->isOverdue(),
            'position'      => $task->position,
            'project_id'    => $task->project_id,
            'parent_task_id'=> $task->parent_task_id,
            'assignees'     => $task->relationLoaded('assignees') ? $task->assignees->map(fn($u) => [
                'id' => $u->id, 'name' => $u->name, 'avatar' => $u->avatar
            ]) : [],
            'tags'          => $task->relationLoaded('tags') ? $task->tags->map(fn($t) => [
                'id' => $t->id, 'name' => $t->name, 'color' => $t->color
            ]) : [],
            'subtasks_total'=> $task->relationLoaded('subtasks') ? $task->subtasks->count() : 0,
            'subtasks_done' => $task->relationLoaded('subtasks') ? $task->subtasks->where('status', 'done')->count() : 0,
            'created_by'    => $task->created_by,
            'created_at'    => $task->created_at->toISOString(),
        ];

        if ($detailed) {
            $base['description'] = $task->description;
            $base['subtasks']    = $task->relationLoaded('subtasks') ? $task->subtasks->map(fn($s) => $this->taskResource($s)) : [];
            $base['comments']    = $task->relationLoaded('comments') ? $task->comments->map(fn($c) => [
                'id' => $c->id, 'content' => $c->content, 'created_at' => $c->created_at->toISOString(),
                'user' => ['id' => $c->user->id, 'name' => $c->user->name],
            ]) : [];
        }

        return $base;
    }
}

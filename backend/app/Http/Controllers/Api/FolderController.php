<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{Project, ProjectFolder, Task, User};
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class FolderController extends Controller
{
    // ── Helpers ───────────────────────────────────────────
    private function formatTask(Task $t): array
    {
        return [
            'id'             => $t->id,
            'title'          => $t->title,
            'description'    => $t->description,
            'status'         => $t->status,
            'priority'       => $t->priority,
            'due_date'       => $t->due_date?->toDateString(),
            'position'       => $t->position,
            'folder_id'      => $t->folder_id,
            'is_overdue'     => $t->isOverdue(),
            'subtasks_total' => 0,
            'assignees'      => $t->assignees->map(fn($u) => [
                'id'     => $u->id,
                'name'   => $u->name,
                'avatar' => $u->avatar,
                'role'   => $u->role,
            ])->values(),
        ];
    }

    private function formatFolder(ProjectFolder $f): array
    {
        return [
            'id'          => $f->id,
            'name'        => $f->name,
            'month'       => $f->month,
            'year'        => $f->year,
            'month_label' => $f->month_label,
            'color'       => $f->color,
            'description' => $f->description,
            'position'    => $f->position,
            'task_count'  => $f->tasks->count(),
            'done_count'  => $f->tasks->where('status', 'done')->count(),
            'tasks'       => $f->tasks->map(fn($t) => $this->formatTask($t))->values(),
        ];
    }

    private function authorizeProject(Project $project): void
    {
        $user = auth()->user();
        // Any workspace member can access — not just project members
        abort_unless(
            $user->workspaces->contains($project->workspace_id) || $user->isAdmin(),
            403, 'Access denied'
        );
    }

    // ─────────────────────────────────────────────────────
    // GET /api/projects/{project}/folders
    // Returns all folders with their tasks for a project
    // ─────────────────────────────────────────────────────
    public function index(Project $project): JsonResponse
    {
        $this->authorizeProject($project);

        $folders = ProjectFolder::where('project_id', $project->id)
            ->with(['tasks.assignees:id,name,avatar,role'])
            ->orderBy('year')
            ->orderBy('month')
            ->orderBy('position')
            ->get()
            ->map(fn($f) => $this->formatFolder($f));

        return response()->json(['folders' => $folders]);
    }

    // ─────────────────────────────────────────────────────
    // POST /api/projects/{project}/folders
    // Create a new month folder
    // ─────────────────────────────────────────────────────
    public function store(Request $request, Project $project): JsonResponse
    {
        $this->authorizeProject($project);

        $request->validate([
            'month'       => 'required|integer|min:1|max:12',
            'year'        => 'required|integer|min:2020|max:2030',
            'name'        => 'nullable|string|max:100',
            'color'       => 'nullable|string|max:20',
            'description' => 'nullable|string|max:255',
        ]);

        $month = (int) $request->month;
        $year  = (int) $request->year;

        // Auto-generate name if not provided
        $name = $request->name ?? \Carbon\Carbon::createFromDate($year, $month, 1)->format('F Y');

        // Prevent duplicate month-year in same project
        $existing = ProjectFolder::where('project_id', $project->id)
            ->where('month', $month)
            ->where('year', $year)
            ->first();

        if ($existing) {
            $existing->load('tasks.assignees');
            return response()->json(['folder' => $this->formatFolder($existing)]);
        }

        $position = ProjectFolder::where('project_id', $project->id)->max('position') + 1;

        $folder = ProjectFolder::create([
            'project_id'  => $project->id,
            'created_by'  => auth()->id(),
            'name'        => $name,
            'month'       => $month,
            'year'        => $year,
            'color'       => $request->color ?? $project->color ?? '#4f8ef7',
            'description' => $request->description,
            'position'    => $position,
        ]);

        $folder->load('tasks.assignees');

        return response()->json(['folder' => $this->formatFolder($folder)], 201);
    }

    // ─────────────────────────────────────────────────────
    // PUT /api/projects/{project}/folders/{folder}
    // ─────────────────────────────────────────────────────
    public function update(Request $request, Project $project, ProjectFolder $folder): JsonResponse
    {
        $this->authorizeProject($project);
        abort_unless($folder->project_id === $project->id, 404);

        $request->validate([
            'name'        => 'nullable|string|max:100',
            'color'       => 'nullable|string|max:20',
            'description' => 'nullable|string|max:255',
        ]);

        $folder->update($request->only('name', 'color', 'description'));
        $folder->load('tasks.assignees');

        return response()->json(['folder' => $this->formatFolder($folder)]);
    }

    // ─────────────────────────────────────────────────────
    // DELETE /api/projects/{project}/folders/{folder}
    // ─────────────────────────────────────────────────────
    public function destroy(Project $project, ProjectFolder $folder): JsonResponse
    {
        $this->authorizeProject($project);
        abort_unless($folder->project_id === $project->id, 404);

        // Unlink tasks from folder (don't delete them)
        Task::where('folder_id', $folder->id)->update(['folder_id' => null]);
        $folder->delete();

        return response()->json(['message' => 'Folder deleted']);
    }

    // ─────────────────────────────────────────────────────
    // POST /api/projects/{project}/folders/{folder}/tasks
    // Create a task inside a folder — any member can assign to anyone
    // ─────────────────────────────────────────────────────
    public function storeTask(Request $request, Project $project, ProjectFolder $folder): JsonResponse
    {
        $this->authorizeProject($project);
        abort_unless($folder->project_id === $project->id, 404);

        $request->validate([
            'title'        => 'required|string|max:255',
            'description'  => 'nullable|string',
            'status'       => 'nullable|in:todo,in_progress,done,blocked',
            'priority'     => 'nullable|in:low,medium,high',
            'due_date'     => 'nullable|date',
            'assignee_ids' => 'nullable|array',
            'assignee_ids.*' => 'exists:users,id',
        ]);

        $position = Task::where('folder_id', $folder->id)->max('position') + 1;

        $task = Task::create([
            'project_id'  => $project->id,
            'folder_id'   => $folder->id,
            'created_by'  => auth()->id(),
            'title'       => $request->title,
            'description' => $request->description,
            'status'      => $request->status ?? 'todo',
            'priority'    => $request->priority ?? 'medium',
            'due_date'    => $request->due_date,
            'position'    => $position,
        ]);

        // Attach assignees — ANY user in workspace, not restricted by role
        if ($request->filled('assignee_ids')) {
            $wsUserIds = User::whereHas('workspaces', fn($q) =>
                $q->where('workspaces.id', $project->workspace_id)
            )->pluck('id')->toArray();

            $validIds = array_intersect($request->assignee_ids, $wsUserIds);
            $task->assignees()->attach($validIds);

            // Dispatch Emails
            foreach ($validIds as $userId) {
                if ($userId !== auth()->id()) {
                    $user = User::find($userId);
                    if ($user) {
                        \Illuminate\Support\Facades\Mail::to($user->email)->queue(
                            new \App\Mail\TaskAssignedMail($task, $user, auth()->user())
                        );
                    }
                }
            }
        }

        $task->load('assignees:id,name,avatar,role');

        return response()->json(['task' => $this->formatTask($task)], 201);
    }

    // ─────────────────────────────────────────────────────
    // PATCH /api/projects/{project}/folders/{folder}/tasks/{task}
    // Update a task's status, assignees, etc.
    // ─────────────────────────────────────────────────────
    public function updateTask(Request $request, Project $project, ProjectFolder $folder, Task $task): JsonResponse
    {
        $this->authorizeProject($project);
        abort_unless($task->folder_id === $folder->id, 404);

        $request->validate([
            'title'        => 'nullable|string|max:255',
            'description'  => 'nullable|string',
            'status'       => 'nullable|in:todo,in_progress,done,blocked',
            'priority'     => 'nullable|in:low,medium,high',
            'due_date'     => 'nullable|date',
            'assignee_ids' => 'nullable|array',
            'assignee_ids.*' => 'exists:users,id',
            'folder_id'    => 'nullable|exists:project_folders,id',
        ]);

        $task->update($request->only('title', 'description', 'status', 'priority', 'due_date', 'folder_id'));

        $oldAssignees = $task->assignees()->pluck('users.id')->toArray();
        if ($request->has('assignee_ids')) {
            $wsUserIds = User::whereHas('workspaces', fn($q) =>
                $q->where('workspaces.id', $project->workspace_id)
            )->pluck('id')->toArray();

            $validIds = array_intersect($request->assignee_ids, $wsUserIds);
            $task->assignees()->sync($validIds);

            // Send emails to newly assigned users
            $added = array_diff($validIds, $oldAssignees);
            foreach ($added as $userId) {
                if ($userId !== auth()->id()) {
                    $user = User::find($userId);
                    if ($user) {
                        \Illuminate\Support\Facades\Mail::to($user->email)->queue(
                            new \App\Mail\TaskAssignedMail($task, $user, auth()->user())
                        );
                    }
                }
            }
        }

        $task->load('assignees:id,name,avatar,role');

        return response()->json(['task' => $this->formatTask($task)]);
    }

    // ─────────────────────────────────────────────────────
    // DELETE /api/projects/{project}/folders/{folder}/tasks/{task}
    // ─────────────────────────────────────────────────────
    public function destroyTask(Project $project, ProjectFolder $folder, Task $task): JsonResponse
    {
        $this->authorizeProject($project);
        abort_unless($task->folder_id === $folder->id, 404);
        $task->delete();
        return response()->json(['message' => 'Task deleted']);
    }
}

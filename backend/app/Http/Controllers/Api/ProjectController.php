<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class ProjectController extends Controller
{
    /**
     * GET /api/workspaces/{workspace}/projects
     */
    public function index(Workspace $workspace): JsonResponse
    {
        $this->authorizeWorkspace($workspace);

        $query = $workspace->projects()
            ->with(['manager:id,name,avatar', 'members:id,name,avatar'])
            ->withCount(['tasks', 'tasks as overdue_tasks_count' => fn($q) =>
                $q->where('status', '!=', 'done')->where('due_date', '<', now())
            ]);

        $user = auth()->user();
        if (!$user->isAdmin()) {
            $query->whereHas('members', function ($q) use ($user) {
                $q->where('users.id', $user->id);
            });
        }

        $projects = $query->get()
            ->map(fn($p) => $this->projectResource($p));

        return response()->json(['projects' => $projects]);
    }

    /**
     * POST /api/workspaces/{workspace}/projects
     */
    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorizeWorkspace($workspace);

        $validator = Validator::make($request->all(), [
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
            'color'       => 'nullable|string|max:20',
            'start_date'  => 'nullable|date',
            'end_date'    => 'nullable|date|after:start_date',
            'member_ids'  => 'nullable|array',
            'member_ids.*'=> 'exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $project = $workspace->projects()->create([
            'manager_id'  => auth()->id(),
            'name'        => $request->name,
            'description' => $request->description,
            'color'       => $request->color ?? '#4f8ef7',
            'start_date'  => $request->start_date,
            'end_date'    => $request->end_date,
        ]);

        // Attach manager + given members
        $members = array_unique(array_merge(
            [$request->manager_id ?? auth()->id()],
            $request->member_ids ?? []
        ));
        $project->members()->attach($members, ['role' => 'member']);
        $project->members()->updateExistingPivot(auth()->id(), ['role' => 'manager']);

        activity_log('project.created', $project);

        return response()->json(['project' => $this->projectResource($project->fresh(['manager', 'members']))], 201);
    }

    /**
     * GET /api/projects/{project}
     */
    public function show(Project $project): JsonResponse
    {
        $this->authorizeProject($project);

        $project->load(['manager:id,name,avatar', 'members:id,name,avatar', 'tasks.assignees:id,name,avatar']);

        return response()->json(['project' => $this->projectResource($project)]);
    }

    /**
     * PUT /api/projects/{project}
     */
    public function update(Request $request, Project $project): JsonResponse
    {
        $this->authorizeProject($project);

        $validator = Validator::make($request->all(), [
            'name'        => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'color'       => 'nullable|string|max:20',
            'status'      => 'nullable|in:active,completed,on_hold,cancelled',
            'start_date'  => 'nullable|date',
            'end_date'    => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $project->update($request->only('name', 'description', 'color', 'status', 'start_date', 'end_date'));
        $project->recalculateRisk();

        activity_log('project.updated', $project);

        return response()->json(['project' => $this->projectResource($project->fresh(['manager', 'members']))]);
    }

    /**
     * DELETE /api/projects/{project}
     */
    public function destroy(Project $project): JsonResponse
    {
        $this->authorizeProject($project);
        $project->delete();
        return response()->json(['message' => 'Project deleted']);
    }

    /**
     * GET /api/projects/{project}/stats
     */
    public function stats(Project $project): JsonResponse
    {
        $this->authorizeProject($project);

        $tasks = $project->tasks();

        return response()->json([
            'total'      => $tasks->count(),
            'todo'       => (clone $tasks)->where('status', 'todo')->count(),
            'in_progress'=> (clone $tasks)->where('status', 'in_progress')->count(),
            'done'       => (clone $tasks)->where('status', 'done')->count(),
            'blocked'    => (clone $tasks)->where('status', 'blocked')->count(),
            'overdue'    => (clone $tasks)->where('status', '!=', 'done')->where('due_date', '<', now())->count(),
            'completion' => $project->completion,
            'risk_level' => $project->risk_level,
        ]);
    }

    /**
     * GET /api/workspaces/{workspace}/members
     */
    public function workspaceMembers(Workspace $workspace): JsonResponse
    {
        $this->authorizeWorkspace($workspace);

        $members = $workspace->members()
            ->select('users.id', 'users.name', 'users.email', 'users.avatar', 'users.department')
            ->withPivot('role')
            ->get()
            ->map(fn($u) => [
                'id'         => $u->id,
                'name'       => $u->name,
                'email'      => $u->email,
                'avatar'     => $u->avatar,
                'department' => $u->department,
                'role'       => $u->pivot->role,
            ]);

        return response()->json(['members' => $members]);
    }

    // ── Private helpers ───────────────────────────────────
    private function projectResource(Project $p): array
    {
        return [
            'id'           => $p->id,
            'name'         => $p->name,
            'description'  => $p->description,
            'color'        => $p->color,
            'status'       => $p->status,
            'risk_level'   => $p->risk_level,
            'completion'   => $p->completion,
            'start_date'   => $p->start_date?->toDateString(),
            'end_date'     => $p->end_date?->toDateString(),
            'total_tasks'  => $p->tasks_count ?? $p->tasks()->count(),
            'overdue_tasks'=> $p->overdue_tasks_count ?? $p->overdueTasks(),
            'manager'      => $p->relationLoaded('manager') ? [
                'id' => $p->manager->id, 'name' => $p->manager->name, 'avatar' => $p->manager->avatar
            ] : null,
            'members'      => $p->relationLoaded('members') ? $p->members->map(fn($u) => [
                'id' => $u->id, 'name' => $u->name, 'avatar' => $u->avatar
            ]) : [],
            'created_at'   => $p->created_at->toISOString(),
        ];
    }

    private function authorizeWorkspace(Workspace $workspace): void
    {
        abort_unless(
            auth()->user()->workspaces->contains($workspace->id) || auth()->user()->isAdmin(),
            403, 'Not a member of this workspace'
        );
    }

    private function authorizeProject(Project $project): void
    {
        $user = auth()->user();
        abort_unless(
            $user->isAdmin() || $project->members->contains($user->id),
            403, 'Not a member of this project'
        );
    }
}

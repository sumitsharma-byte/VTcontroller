<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Project extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'workspace_id', 'manager_id', 'name', 'description',
        'color', 'status', 'risk_level', 'start_date', 'end_date', 'completion',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    // ── Relationships ─────────────────────────────────────
    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'project_members')
            ->withPivot('role')
            ->withTimestamps();
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function healthSnapshots(): HasMany
    {
        return $this->hasMany(ProjectHealth::class);
    }

    // ── Computed ──────────────────────────────────────────
    public function overdueTasks(): int
    {
        return $this->tasks()
            ->where('status', '!=', 'done')
            ->where('due_date', '<', now()->toDateString())
            ->count();
    }

    public function recalculateCompletion(): void
    {
        $total = $this->tasks()->count();
        if ($total === 0) {
            $this->update(['completion' => 0]);
            return;
        }
        $done = $this->tasks()->where('status', 'done')->count();
        $this->update(['completion' => round(($done / $total) * 100)]);
    }

    public function recalculateRisk(): void
    {
        $overdue = $this->overdueTasks();
        $totalTasks = $this->tasks()->count();

        if ($totalTasks === 0) {
            $this->update(['risk_level' => 'green']);
            return;
        }

        $overduePercent = ($overdue / $totalTasks) * 100;

        $risk = match(true) {
            $overduePercent >= 30 => 'red',
            $overduePercent >= 15 => 'yellow',
            default => 'green',
        };

        $this->update(['risk_level' => $risk]);
    }
}

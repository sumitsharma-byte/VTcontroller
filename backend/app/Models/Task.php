<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Task extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'project_id', 'created_by', 'parent_task_id', 'folder_id',
        'title', 'description', 'status', 'priority',
        'due_date', 'delay_reason', 'last_activity_at', 'position',
    ];

    protected $casts = [
        'due_date' => 'datetime',
        'last_activity_at' => 'datetime',
    ];

    // ── Relationships ─────────────────────────────────────
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function folder(): BelongsTo
    {
        return $this->belongsTo(\App\Models\ProjectFolder::class, 'folder_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function parentTask(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'parent_task_id');
    }

    public function subtasks(): HasMany
    {
        return $this->hasMany(Task::class, 'parent_task_id');
    }

    public function assignees(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'task_assignees')->withTimestamps();
    }

    public function dependencies(): BelongsToMany
    {
        return $this->belongsToMany(Task::class, 'task_dependencies', 'task_id', 'depends_on_task_id');
    }

    public function dependents(): BelongsToMany
    {
        return $this->belongsToMany(Task::class, 'task_dependencies', 'depends_on_task_id', 'task_id');
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'task_tags');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class, 'commentable_id')
            ->where('commentable_type', Task::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class, 'attachable_id')
            ->where('attachable_type', Task::class);
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(TaskActivityLog::class);
    }

    // ── Helpers / Delay Engine ────────────────────────────
    public function isOverdue(): bool
    {
        return $this->due_date
            && $this->due_date->isPast()
            && $this->status !== 'done';
    }

    public function hoursSinceLastActivity(): float
    {
        if (!$this->last_activity_at) {
            return $this->created_at
                ? now()->diffInHours($this->created_at)
                : 999;
        }
        return now()->diffInHours($this->last_activity_at);
    }

    public function detectDelayReason(): ?string
    {
        // 1. Blocked by dependency (0 credits)
        $blockedDep = $this->dependencies()
            ->where('status', '!=', 'done')
            ->exists();
        if ($blockedDep) {
            return 'Blocked by dependency';
        }

        // 2. No recent activity (0 credits)
        if ($this->hoursSinceLastActivity() >= 48 && $this->status !== 'done') {
            return 'No recent activity – last update ' . round($this->hoursSinceLastActivity()) . 'hrs ago';
        }

        // 3. Overloaded user (0 credits)
        foreach ($this->assignees as $user) {
            $activeCount = $user->assignedTasks()
                ->whereIn('status', ['todo', 'in_progress'])
                ->count();
            if ($activeCount >= 5) {
                return 'High workload – user assigned to ' . $activeCount . '+ active tasks';
            }
        }

        // 4. Missed deadline (0 credits)
        if ($this->isOverdue()) {
            $daysOverdue = $this->due_date->diffInDays(now());
            return 'Missed deadline – ' . $daysOverdue . ' day(s) overdue';
        }

        // 5. Intelligent AI Prediction (Using cache to save API credits)
        return $this->getAiPrediction();
    }

    public function getAiPrediction(): ?string
    {
        // Save credits: Only run AI for tasks that might actually be at risk
        if ($this->status === 'done' || $this->hoursSinceLastActivity() < 24) {
            return null; 
        }

        // Save credits: Cache the AI evaluation for 24 hours so we don't query repeatedly
        $cacheKey = "task_{$this->id}_ai_delay_reason";
        
        return \Illuminate\Support\Facades\Cache::remember($cacheKey, now()->addHours(24), function () {
            $apiKey = config('services.openai.key');
            if (!$apiKey) {
                return null;
            }

            try {
                // Save credits: using gpt-3.5-turbo (cheaper) and very low max_tokens
                $response = \Illuminate\Support\Facades\Http::withToken($apiKey)
                    ->timeout(3)
                    ->post('https://api.openai.com/v1/chat/completions', [
                        'model' => 'gpt-3.5-turbo',
                        'temperature' => 0.3,
                        'max_tokens' => 15,
                        'messages' => [
                            ['role' => 'system', 'content' => 'You predict task delays. Output 1 short phrase (max 8 words).'],
                            ['role' => 'user', 'content' => "Task: {$this->title}, Priority: {$this->priority}, Due: {$this->due_date}, Activity: {$this->hoursSinceLastActivity()}hrs ago. Reason?"]
                        ]
                    ]);

                if ($response->successful()) {
                    return 'AI Insight: ' . trim($response->json('choices.0.message.content'), ' ".');
                }
            } catch (\Exception $e) {
                return null;
            }

            return null;
        });
    }

    public function touchActivity(): void
    {
        $this->update(['last_activity_at' => now()]);
    }
}

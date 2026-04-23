<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProjectFolder extends Model
{
    protected $fillable = [
        'project_id', 'created_by', 'name',
        'month', 'year', 'color', 'description', 'position',
    ];

    protected $casts = [
        'month' => 'integer',
        'year'  => 'integer',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class, 'folder_id')->orderBy('position');
    }

    /** Human-readable month label e.g. "April 2026" */
    public function getMonthLabelAttribute(): string
    {
        return \Carbon\Carbon::createFromDate($this->year, $this->month, 1)
            ->format('F Y');
    }
}

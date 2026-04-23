<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectHealth extends Model
{
    protected $table = 'project_health';
    protected $fillable = ['project_id','snapshot_date','completion','risk_level','overdue_tasks','total_tasks','ai_insight'];
    protected $casts = ['snapshot_date' => 'date'];

    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
}

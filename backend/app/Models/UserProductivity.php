<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserProductivity extends Model
{
    protected $table = 'user_productivity';
    protected $fillable = ['user_id','workspace_id','period_start','period_end','tasks_assigned','tasks_completed','tasks_overdue','tasks_pending','efficiency_score'];
    protected $casts = ['period_start' => 'date', 'period_end' => 'date'];

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function workspace(): BelongsTo { return $this->belongsTo(Workspace::class); }
}

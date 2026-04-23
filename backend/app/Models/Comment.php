<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Comment extends Model
{
    use SoftDeletes;

    protected $fillable = ['commentable_type', 'commentable_id', 'user_id', 'content', 'parent_id'];

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function commentable() { return $this->morphTo(); }
    public function replies(): HasMany { return $this->hasMany(Comment::class, 'parent_id'); }
    public function parent(): BelongsTo { return $this->belongsTo(Comment::class, 'parent_id'); }
}

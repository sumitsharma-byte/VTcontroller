<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Comments
        Schema::create('comments', function (Blueprint $table) {
            $table->id();
            $table->morphs('commentable'); // polymorphic: tasks, projects
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('content');
            $table->foreignId('parent_id')->nullable()->constrained('comments')->cascadeOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        // Attachments
        Schema::create('attachments', function (Blueprint $table) {
            $table->id();
            $table->morphs('attachable'); // polymorphic: tasks, comments
            $table->foreignId('uploaded_by')->constrained('users')->cascadeOnDelete();
            $table->string('filename');
            $table->string('original_filename');
            $table->string('mime_type');
            $table->unsignedBigInteger('size'); // bytes
            $table->string('path');
            $table->timestamps();
        });

        // Notifications
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->morphs('notifiable');
            $table->json('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });

        // Activity logs (for whole system)
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action'); // e.g. 'task.created', 'task.status_changed'
            $table->string('entity_type');
            $table->unsignedBigInteger('entity_id');
            $table->json('meta')->nullable(); // old/new values for status changes etc.
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();

            $table->index(['entity_type', 'entity_id']);
            $table->index('user_id');
        });

        // Task-specific activity for the delay engine
        Schema::create('task_activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action'); // e.g. 'comment', 'status_change', 'attachment_upload'
            $table->string('from_status')->nullable();
            $table->string('to_status')->nullable();
            $table->text('note')->nullable();
            $table->timestamp('logged_at');
            $table->timestamps();

            $table->index('task_id');
        });

        // User productivity snapshots (updated by scheduled jobs)
        Schema::create('user_productivity', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->date('period_start');
            $table->date('period_end');
            $table->unsignedInteger('tasks_assigned')->default(0);
            $table->unsignedInteger('tasks_completed')->default(0);
            $table->unsignedInteger('tasks_overdue')->default(0);
            $table->unsignedInteger('tasks_pending')->default(0);
            $table->unsignedTinyInteger('efficiency_score')->default(0); // 0-100
            $table->timestamps();

            $table->index(['user_id', 'period_start']);
        });

        // Project health snapshots
        Schema::create('project_health', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->date('snapshot_date');
            $table->unsignedTinyInteger('completion')->default(0);
            $table->enum('risk_level', ['green', 'yellow', 'red'])->default('green');
            $table->unsignedInteger('overdue_tasks')->default(0);
            $table->unsignedInteger('total_tasks')->default(0);
            $table->text('ai_insight')->nullable(); // AI-generated insight for this snapshot
            $table->timestamps();

            $table->index(['project_id', 'snapshot_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_health');
        Schema::dropIfExists('user_productivity');
        Schema::dropIfExists('task_activity_logs');
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('attachments');
        Schema::dropIfExists('comments');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Chat channels (direct + group) ────────────────
        Schema::create('chats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['direct', 'group'])->default('direct');
            $table->string('name')->nullable();          // null for direct chats
            $table->string('avatar')->nullable();        // group avatar/emoji
            $table->boolean('is_archived')->default(false);
            $table->timestamps();
        });

        // ── Chat members ──────────────────────────────────
        Schema::create('chat_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chat_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('last_read_at')->nullable();
            $table->timestamps();
            $table->unique(['chat_id', 'user_id']);
        });

        // ── Chat messages ─────────────────────────────────
        Schema::create('chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chat_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('content');                     // message text / caption
            $table->enum('type', ['text', 'image', 'url'])->default('text');
            $table->string('image_path')->nullable();    // stored image path
            $table->string('url')->nullable();           // shared URL
            $table->string('url_title')->nullable();     // URL preview title
            $table->string('url_description')->nullable();
            $table->string('url_image')->nullable();     // OG image of URL
            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_messages');
        Schema::dropIfExists('chat_members');
        Schema::dropIfExists('chats');
    }
};

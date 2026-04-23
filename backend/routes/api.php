<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\FolderController;
use App\Http\Controllers\Api\TagController;

/*
|--------------------------------------------------------------------------
| VTcontroller API Routes
|--------------------------------------------------------------------------
*/

// ── Public Auth Routes ────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login',    [AuthController::class, 'login']);

    // Google OAuth
    Route::get('google/redirect', [AuthController::class, 'googleRedirect']);
    Route::get('google/callback', [AuthController::class, 'googleCallback']);
});

// ── Authenticated Routes ──────────────────────────────────
Route::middleware('auth:api')->group(function () {

    // Auth
    Route::prefix('auth')->group(function () {
        Route::post('logout',         [AuthController::class, 'logout']);
        Route::post('refresh',        [AuthController::class, 'refresh']);
        Route::get('me',              [AuthController::class, 'me']);
        Route::put('profile',         [AuthController::class, 'updateProfile']);
    });

    // Workspace → Projects + Members
    Route::prefix('workspaces/{workspace}')->group(function () {
        Route::get('projects',        [ProjectController::class, 'index']);
        Route::post('projects',       [ProjectController::class, 'store']);
        Route::get('members',         [ProjectController::class, 'workspaceMembers']);
    });

    // Projects
    Route::prefix('projects/{project}')->group(function () {
        Route::get('/',               [ProjectController::class, 'show']);
        Route::put('/',               [ProjectController::class, 'update']);
        Route::delete('/',            [ProjectController::class, 'destroy']);
        Route::get('stats',           [ProjectController::class, 'stats']);
        Route::get('tasks',           [TaskController::class, 'index']);
        Route::post('tasks',          [TaskController::class, 'store']);
        
        // Folders
        Route::get('folders',                                 [FolderController::class, 'index']);
        Route::post('folders',                                [FolderController::class, 'store']);
        Route::put('folders/{folder}',                        [FolderController::class, 'update']);
        Route::delete('folders/{folder}',                     [FolderController::class, 'destroy']);
        Route::post('folders/{folder}/tasks',                 [FolderController::class, 'storeTask']);
        Route::patch('folders/{folder}/tasks/{task}',         [FolderController::class, 'updateTask']);
        Route::delete('folders/{folder}/tasks/{task}',        [FolderController::class, 'destroyTask']);
    });

    // Tasks
    Route::prefix('tasks')->group(function () {
        Route::get('my-tasks',        [TaskController::class, 'myTasks']);   // ← must be before {task}
        Route::put('reorder',         [TaskController::class, 'reorder']);
        Route::get('{task}',          [TaskController::class, 'show']);
        Route::put('{task}',          [TaskController::class, 'update']);
        Route::delete('{task}',       [TaskController::class, 'destroy']);
        Route::post('{task}/comments',[TaskController::class, 'addComment']);
        Route::post('{task}/share',   [TaskController::class, 'share']);
    });

    // ── Dashboard Data & Actions (admin + manager only) ───────────────
    Route::middleware('role.check:admin,manager')->prefix('admin')->group(function () {
        Route::get('overview',           [AdminController::class, 'overview']);
        Route::get('task-distribution',  [AdminController::class, 'taskDistribution']);
        Route::get('delay-trend',        [AdminController::class, 'delayTrend']);
        Route::get('team-performance',   [AdminController::class, 'teamPerformance']);
        Route::get('critical-alerts',    [AdminController::class, 'criticalAlerts']);
        Route::get('project-monitoring', [AdminController::class, 'projectMonitoring']);
        Route::get('team-table',         [AdminController::class, 'teamTable']);
        Route::get('ai-insights',        [AdminController::class, 'aiInsights']);
        Route::post('users',                             [AdminController::class, 'createUser']);
        Route::get('users/{user}/audit-chats',           [AdminController::class, 'auditChats']);
    });

    // ── Chat Routes ───────────────────────────────────────
    Route::prefix('chats')->group(function () {
        Route::get('users',                          [ChatController::class, 'workspaceUsers']);
        Route::get('/',                              [ChatController::class, 'index']);
        Route::post('/',                             [ChatController::class, 'store']);
        Route::get('{chat}/messages',                [ChatController::class, 'messages']);
        Route::post('{chat}/messages',               [ChatController::class, 'sendMessage']);
        Route::delete('{chat}/messages/{message}',   [ChatController::class, 'deleteMessage']);
    });

    // ── Tags (workspace-wide) ─────────────────────────────
    Route::get('tags',  [TagController::class, 'index']);
    Route::post('tags', [TagController::class, 'store']);
});

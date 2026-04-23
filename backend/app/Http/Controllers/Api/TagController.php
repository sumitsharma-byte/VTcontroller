<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tag;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class TagController extends Controller
{
    /**
     * GET /api/tags
     * Returns all tags for the authenticated user's current workspace.
     */
    public function index(Request $request): JsonResponse
    {
        $workspaceId = auth()->user()->current_workspace_id;

        $tags = Tag::where('workspace_id', $workspaceId)
            ->orderBy('name')
            ->get(['id', 'name', 'color']);

        return response()->json(['tags' => $tags]);
    }

    /**
     * POST /api/tags
     * Creates a new tag in the workspace.
     * Body: { name: string, color?: string }
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name'  => 'required|string|max:64',
            'color' => 'nullable|string|max:20',
        ]);

        $workspaceId = auth()->user()->current_workspace_id;

        // Prevent duplicates (case-insensitive)
        $existing = Tag::where('workspace_id', $workspaceId)
            ->whereRaw('LOWER(name) = ?', [strtolower($request->name)])
            ->first();

        if ($existing) {
            return response()->json(['tag' => $existing]);
        }

        $tag = Tag::create([
            'workspace_id' => $workspaceId,
            'name'         => $request->name,
            'color'        => $request->color ?? $this->randomColor(),
        ]);

        return response()->json(['tag' => $tag], 201);
    }

    private function randomColor(): string
    {
        $colors = ['#4f8ef7', '#30d158', '#ff9f0a', '#af52de', '#ff453a', '#64d2ff', '#ffd60a', '#ff6b6b'];
        return $colors[array_rand($colors)];
    }
}

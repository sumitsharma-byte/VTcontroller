<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{Chat, ChatMessage, User, Workspace};
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ChatController extends Controller
{
    // ── Format helpers ────────────────────────────────────
    private function formatChat(Chat $chat, int $authId): array
    {
        $other = $chat->type === 'direct'
            ? $chat->members->firstWhere('id', '!=', $authId)
            : null;

        $latest = $chat->messages()->latest()->first();

        // Unread count: messages after last_read_at for this user
        $pivot      = $chat->members->where('id', $authId)->first()?->pivot;
        $lastReadAt = $pivot?->last_read_at;
        $unread     = $lastReadAt
            ? $chat->messages()->where('created_at', '>', $lastReadAt)->where('user_id', '!=', $authId)->count()
            : $chat->messages()->where('user_id', '!=', $authId)->count();

        return [
            'id'             => $chat->id,
            'type'           => $chat->type,
            'name'           => $chat->type === 'direct' ? ($other?->name ?? 'Unknown') : $chat->name,
            'avatar'         => $chat->type === 'direct' ? ($other?->avatar ?? null) : $chat->avatar,
            'other_user_id'  => $other?->id,
            'other_user_role'=> $other?->role,
            'members'        => $chat->members->map(fn($u) => [
                'id' => $u->id, 'name' => $u->name, 'avatar' => $u->avatar, 'role' => $u->role,
            ])->values(),
            'latest_message' => $latest ? [
                'content'    => $latest->content,
                'type'       => $latest->type,
                'created_at' => $latest->created_at->toISOString(),
                'user_name'  => $latest->user?->name,
            ] : null,
            'unread_count'   => $unread,
            'created_at'     => $chat->created_at->toISOString(),
        ];
    }

    private function formatMessage(ChatMessage $msg): array
    {
        return [
            'id'              => $msg->id,
            'chat_id'         => $msg->chat_id,
            'content'         => $msg->content,
            'type'            => $msg->type,
            'image_url'       => $msg->image_path ? Storage::url($msg->image_path) : null,
            'url'             => $msg->url,
            'url_title'       => $msg->url_title,
            'url_description' => $msg->url_description,
            'url_image'       => $msg->url_image,
            'created_at'      => $msg->created_at->toISOString(),
            'user' => [
                'id'     => $msg->user->id,
                'name'   => $msg->user->name,
                'avatar' => $msg->user->avatar,
                'role'   => $msg->user->role,
            ],
        ];
    }

    // ─────────────────────────────────────────────────────
    // GET /api/chats
    // List all chats the authenticated user is a member of (or audit mode)
    // ─────────────────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $user        = auth()->user();
        $workspaceId = $user->current_workspace_id;

        $targetUserId = $user->id;
        if ($request->has('audit_user_id') && in_array($user->role, ['admin', 'manager'])) {
            $targetUserId = $request->audit_user_id;
        }

        $chats = Chat::where('workspace_id', $workspaceId)
            ->whereHas('members', fn($q) => $q->where('users.id', $targetUserId))
            ->with(['members', 'messages' => fn($q) => $q->with('user')->latest()->limit(1)])
            ->get()
            ->map(fn($c) => $this->formatChat($c, $targetUserId))
            ->sortByDesc(fn($c) => $c['latest_message']['created_at'] ?? $c['created_at'])
            ->values();

        return response()->json(['chats' => $chats]);
    }

    // ─────────────────────────────────────────────────────
    // POST /api/chats
    // Create or get an existing direct chat with a user,
    // or create a new group chat.
    // ─────────────────────────────────────────────────────
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'type'       => 'required|in:direct,group',
            'user_id'    => 'required_if:type,direct|integer',
            'name'       => 'required_if:type,group|string|max:80',
            'member_ids' => 'required_if:type,group|array',
        ]);

        $user        = auth()->user();
        $workspaceId = $user->current_workspace_id;

        if ($request->type === 'direct') {
            $otherId = $request->user_id;

            // Return existing direct chat if it exists
            $existing = Chat::where('workspace_id', $workspaceId)
                ->where('type', 'direct')
                ->whereHas('members', fn($q) => $q->where('users.id', $user->id))
                ->whereHas('members', fn($q) => $q->where('users.id', $otherId))
                ->with('members')
                ->first();

            if ($existing) {
                return response()->json(['chat' => $this->formatChat($existing, $user->id)]);
            }

            $chat = Chat::create(['workspace_id' => $workspaceId, 'type' => 'direct']);
            $chat->members()->attach([$user->id, $otherId]);
            $chat->load('members');

            return response()->json(['chat' => $this->formatChat($chat, $user->id)], 201);
        }

        // Group chat
        $chat = Chat::create([
            'workspace_id' => $workspaceId,
            'type'         => 'group',
            'name'         => $request->name,
            'avatar'       => $request->avatar ?? '💬',
        ]);

        $memberIds = collect($request->member_ids)->push($user->id)->unique()->toArray();
        $chat->members()->attach($memberIds);
        $chat->load('members');

        return response()->json(['chat' => $this->formatChat($chat, $user->id)], 201);
    }

    // ─────────────────────────────────────────────────────
    // GET /api/chats/{chat}/messages
    // ─────────────────────────────────────────────────────
    public function messages(Request $request, Chat $chat): JsonResponse
    {
        $user = auth()->user();

        $isAudit = $request->has('audit_user_id') && in_array($user->role, ['admin', 'manager']);

        // Only members can read, unless auditing
        if (!$isAudit) {
            abort_unless($chat->members()->where('users.id', $user->id)->exists(), 403);
            // Mark as read
            $chat->members()->updateExistingPivot($user->id, ['last_read_at' => now()]);
        }

        $messages = $chat->messages()
            ->with('user')
            ->orderBy('created_at')
            ->get()
            ->map(fn($m) => $this->formatMessage($m));

        return response()->json(['messages' => $messages]);
    }

    // ─────────────────────────────────────────────────────
    // POST /api/chats/{chat}/messages
    // Send a text, image, or URL message
    // ─────────────────────────────────────────────────────
    public function sendMessage(Request $request, Chat $chat): JsonResponse
    {
        $user = auth()->user();
        abort_unless($chat->members()->where('users.id', $user->id)->exists(), 403);

        $request->validate([
            'type'    => 'required|in:text,image,url',
            'content' => 'nullable|string|max:4000',
            'image'   => 'nullable|file|image|max:10240',   // 10 MB max
            'url'     => 'nullable|url|max:2000',
        ]);

        $data = [
            'chat_id' => $chat->id,
            'user_id' => $user->id,
            'type'    => $request->type,
            'content' => $request->content ?? '',
        ];

        if ($request->type === 'image' && $request->hasFile('image')) {
            $path          = $request->file('image')->store('chat-images', 'public');
            $data['image_path'] = $path;
            $data['content']    = $request->content ?? '';
        }

        if ($request->type === 'url' && $request->url) {
            $data['url']    = $request->url;
            $preview        = $this->fetchUrlPreview($request->url);
            $data['url_title']       = $preview['title'];
            $data['url_description'] = $preview['description'];
            $data['url_image']       = $preview['image'];
            $data['content']         = $request->content ?? $request->url;
        }

        $message = ChatMessage::create($data);
        $message->load('user');

        // Update sender's last_read_at
        $chat->members()->updateExistingPivot($user->id, ['last_read_at' => now()]);

        return response()->json(['message' => $this->formatMessage($message)], 201);
    }

    // ─────────────────────────────────────────────────────
    // GET /api/chats/users  – workspace members to chat with
    // ─────────────────────────────────────────────────────
    public function workspaceUsers(Request $request): JsonResponse
    {
        $user        = auth()->user();
        $workspaceId = $user->current_workspace_id;

        $users = User::whereHas('workspaces', fn($q) => $q->where('workspaces.id', $workspaceId))
            ->where('id', '!=', $user->id)
            ->get()
            ->map(fn($u) => [
                'id'         => $u->id,
                'name'       => $u->name,
                'avatar'     => $u->avatar,
                'role'       => $u->role,
                'department' => $u->department,
            ]);

        return response()->json(['users' => $users]);
    }

    // ─────────────────────────────────────────────────────
    // DELETE /api/chats/{chat}/messages/{message}
    // ─────────────────────────────────────────────────────
    public function deleteMessage(Chat $chat, ChatMessage $message): JsonResponse
    {
        $user = auth()->user();
        abort_unless($message->user_id === $user->id, 403);
        $message->delete();
        return response()->json(['message' => 'Deleted']);
    }

    // ── Private: URL preview scraper ──────────────────────
    private function fetchUrlPreview(string $url): array
    {
        try {
            $ctx = stream_context_create(['http' => ['timeout' => 4, 'header' => "User-Agent: Mozilla/5.0\r\n"]]);
            $html = @file_get_contents($url, false, $ctx);
            if (!$html) return ['title' => null, 'description' => null, 'image' => null];

            $doc = new \DOMDocument();
            @$doc->loadHTML(mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8'));
            $xpath = new \DOMXPath($doc);

            $title = $xpath->evaluate('string(//meta[@property="og:title"]/@content)')
                ?: $xpath->evaluate('string(//title)');
            $desc  = $xpath->evaluate('string(//meta[@property="og:description"]/@content)')
                ?: $xpath->evaluate('string(//meta[@name="description"]/@content)');
            $image = $xpath->evaluate('string(//meta[@property="og:image"]/@content)');

            return [
                'title'       => Str::limit($title, 80) ?: null,
                'description' => Str::limit($desc, 200) ?: null,
                'image'       => $image ?: null,
            ];
        } catch (\Throwable) {
            return ['title' => null, 'description' => null, 'image' => null];
        }
    }
}

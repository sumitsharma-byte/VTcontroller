<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Tymon\JWTAuth\Facades\JWTAuth;
use Tymon\JWTAuth\Exceptions\JWTException;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class AuthController extends Controller
{
    /**
     * POST /api/auth/register
     */
    public function register(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name'       => 'required|string|max:255',
            'email'      => 'required|email|unique:users',
            'password'   => 'required|string|min:8|confirmed',
            'department' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::create([
            'name'       => $request->name,
            'email'      => $request->email,
            'password'   => Hash::make($request->password),
            'department' => $request->department,
            'role'       => 'member',
        ]);

        // Create default workspace for the new user
        $workspace = Workspace::create([
            'name'     => $user->name . "'s Workspace",
            'slug'     => Str::slug($user->name . '-' . $user->id),
            'owner_id' => $user->id,
        ]);

        $user->update(['current_workspace_id' => $workspace->id]);
        $workspace->members()->attach($user->id, ['role' => 'admin']);

        $token = JWTAuth::fromUser($user);

        return response()->json([
            'message' => 'Registration successful',
            'user'    => $this->userResource($user),
            'token'   => $token,
            'token_type' => 'bearer',
            'expires_in' => config('jwt.ttl') * 60,
        ], 201);
    }

    /**
     * POST /api/auth/login
     */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->only('email', 'password');

        try {
            if (!$token = JWTAuth::attempt($credentials)) {
                return response()->json(['message' => 'Invalid email or password'], 401);
            }
        } catch (JWTException $e) {
            return response()->json(['message' => 'Could not create token'], 500);
        }

        $user = auth()->user();
        $user->update(['last_active_at' => now()]);

        return response()->json([
            'message'    => 'Login successful',
            'user'       => $this->userResource($user),
            'token'      => $token,
            'token_type' => 'bearer',
            'expires_in' => config('jwt.ttl') * 60,
        ]);
    }

    /**
     * POST /api/auth/logout
     */
    public function logout(): JsonResponse
    {
        JWTAuth::invalidate(JWTAuth::getToken());
        return response()->json(['message' => 'Logged out successfully']);
    }

    /**
     * POST /api/auth/refresh
     */
    public function refresh(): JsonResponse
    {
        try {
            $token = JWTAuth::refresh(JWTAuth::getToken());
            return response()->json([
                'token'      => $token,
                'token_type' => 'bearer',
                'expires_in' => config('jwt.ttl') * 60,
            ]);
        } catch (JWTException $e) {
            return response()->json(['message' => 'Token refresh failed'], 401);
        }
    }

    /**
     * GET /api/auth/me
     */
    public function me(): JsonResponse
    {
        $user = auth()->user();
        return response()->json(['user' => $this->userResource($user)]);
    }

    /**
     * PUT /api/auth/profile
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = auth()->user();

        $validator = Validator::make($request->all(), [
            'name'       => 'sometimes|string|max:255',
            'department' => 'sometimes|string|max:100',
            'avatar'     => 'sometimes|string|max:10', // initials
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user->update($request->only('name', 'department', 'avatar'));

        return response()->json(['user' => $this->userResource($user)]);
    }

    // ── Private helpers ───────────────────────────────────
    private function userResource(User $user): array
    {
        return [
            'id'                   => $user->id,
            'name'                 => $user->name,
            'email'                => $user->email,
            'avatar'               => $user->avatar ?? strtoupper(substr($user->name, 0, 2)),
            'role'                 => $user->role,
            'department'           => $user->department,
            'current_workspace_id' => $user->current_workspace_id,
            'last_active_at'       => $user->last_active_at?->toISOString(),
            'efficiency'           => $user->currentEfficiency(),
        ];
    }

    // ── Google OAuth ──────────────────────────────────────

    /**
     * GET /api/auth/google/redirect
     * Redirects the browser to Google's OAuth consent screen.
     */
    public function googleRedirect()
    {
        return Socialite::driver('google')->stateless()->redirect();
    }

    /**
     * GET /api/auth/google/callback
     * Google redirects here after user consents.
     * We find-or-create the user, issue a JWT, and redirect to the frontend.
     */
    public function googleCallback()
    {
        $frontendUrl = config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000'));

        try {
            $googleUser = Socialite::driver('google')->stateless()->user();
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Google OAuth callback failed', [
                'message' => $e->getMessage(),
                'class'   => get_class($e),
            ]);
            return redirect($frontendUrl . '/signup?google_error=1&reason=' . urlencode($e->getMessage()));
        }

        // Find existing user or create new one
        $user = User::where('email', $googleUser->getEmail())->first();

        if (!$user) {
            $user = User::create([
                'name'              => $googleUser->getName(),
                'email'             => $googleUser->getEmail(),
                'password'          => Hash::make(Str::random(32)), // unusable password
                'role'              => 'member',
                'google_id'         => $googleUser->getId(),
                'avatar'            => strtoupper(substr($googleUser->getName(), 0, 2)),
            ]);

            // Create default workspace for new Google user
            $workspace = Workspace::create([
                'name'     => $user->name . "'s Workspace",
                'slug'     => Str::slug($user->name . '-' . $user->id),
                'owner_id' => $user->id,
            ]);

            $user->update(['current_workspace_id' => $workspace->id]);
            $workspace->members()->attach($user->id, ['role' => 'admin']);
        } else {
            // Update google_id if not set
            if (!$user->google_id) {
                $user->update(['google_id' => $googleUser->getId()]);
            }
        }

        $user->update(['last_active_at' => now()]);
        $token = JWTAuth::fromUser($user);

        // Redirect to frontend with token in query string
        return redirect($frontendUrl . '/auth/callback?token=' . $token);
    }
}

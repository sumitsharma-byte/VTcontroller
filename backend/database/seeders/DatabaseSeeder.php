<?php

namespace Database\Seeders;

use App\Models\{User, Workspace, Project, Task, UserProductivity};
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── Users ─────────────────────────────────────────────
        $admin = User::create([
            'name' => 'VT Admin', 'email' => 'admin@vibethoery.ai',
            'password' => Hash::make('Admin@12345#@'), 'avatar' => 'VA',
            'role' => 'admin', 'department' => 'Management',
        ]);
        $arjun = User::create([
            'name' => 'Arjun Mehta', 'email' => 'arjun@vtc.io',
            'password' => Hash::make('password'), 'avatar' => 'AM',
            'role' => 'manager', 'department' => 'Design',
        ]);
        $shreya = User::create([
            'name' => 'Shreya Patel', 'email' => 'shreya@vtc.io',
            'password' => Hash::make('password'), 'avatar' => 'SP',
            'role' => 'member', 'department' => 'Engineering',
        ]);
        $karan = User::create([
            'name' => 'Karan Singh', 'email' => 'karan@vtc.io',
            'password' => Hash::make('password'), 'avatar' => 'KS',
            'role' => 'member', 'department' => 'Marketing',
        ]);
        $ananya = User::create([
            'name' => 'Ananya Iyer', 'email' => 'ananya@vtc.io',
            'password' => Hash::make('password'), 'avatar' => 'AI',
            'role' => 'member', 'department' => 'Engineering',
        ]);
        $rohit = User::create([
            'name' => 'Rohit Verma', 'email' => 'rohit@vtc.io',
            'password' => Hash::make('password'), 'avatar' => 'RV',
            'role' => 'manager', 'department' => 'Product',
        ]);
        $neha = User::create([
            'name' => 'Neha Gupta', 'email' => 'neha@vtc.io',
            'password' => Hash::make('password'), 'avatar' => 'NG',
            'role' => 'member', 'department' => 'Design',
        ]);

        $users = [$admin, $arjun, $shreya, $karan, $ananya, $rohit, $neha];

        // ── Workspace ─────────────────────────────────────────
        $workspace = Workspace::create([
            'name' => 'Vibetheory Inc.', 'slug' => 'vibetheory-inc',
            'owner_id' => $admin->id, 'description' => 'VTcontroller workspace for Vibetheory team',
        ]);

        foreach ($users as $u) {
            $workspace->members()->attach($u->id, ['role' => $u->role === 'admin' ? 'admin' : 'member']);
            $u->update(['current_workspace_id' => $workspace->id]);
        }

        // ── Projects ─────────────────────────────────────────
        $p1 = $workspace->projects()->create([
            'manager_id' => $arjun->id, 'name' => 'AI Dashboard Overhaul',
            'description' => 'Redesign the admin command dashboard with AI-powered insights.',
            'color' => '#4f8ef7', 'status' => 'active', 'risk_level' => 'yellow',
            'start_date' => '2026-01-10', 'end_date' => '2026-04-15', 'completion' => 72,
        ]);
        $p1->members()->attach([$admin->id, $arjun->id, $shreya->id, $ananya->id]);

        $p2 = $workspace->projects()->create([
            'manager_id' => $rohit->id, 'name' => 'VTcontroller Mobile App',
            'description' => 'Build the native mobile companion app for iOS and Android.',
            'color' => '#7c5af3', 'status' => 'active', 'risk_level' => 'red',
            'start_date' => '2026-01-20', 'end_date' => '2026-05-30', 'completion' => 34,
        ]);
        $p2->members()->attach([$shreya->id, $karan->id, $rohit->id, $neha->id]);

        $p3 = $workspace->projects()->create([
            'manager_id' => $admin->id, 'name' => 'API v2 Migration',
            'description' => 'Migrate all existing REST APIs to v2.',
            'color' => '#22c55e', 'status' => 'active', 'risk_level' => 'green',
            'start_date' => '2025-12-01', 'end_date' => '2026-03-31', 'completion' => 89,
        ]);
        $p3->members()->attach([$admin->id, $shreya->id, $ananya->id]);

        $p4 = $workspace->projects()->create([
            'manager_id' => $arjun->id, 'name' => 'Marketing Automation Suite',
            'description' => 'Build email automation and campaign scheduling tools.',
            'color' => '#f59e0b', 'status' => 'active', 'risk_level' => 'yellow',
            'start_date' => '2026-02-01', 'end_date' => '2026-06-30', 'completion' => 55,
        ]);
        $p4->members()->attach([$arjun->id, $karan->id, $neha->id]);

        // ── Tasks ─────────────────────────────────────────────
        $tasks = [
            ['project' => $p1, 'title' => 'Design new chart components', 'status' => 'in_progress', 'priority' => 'high',
             'due' => '2026-03-22', 'assignees' => [$arjun->id, $shreya->id], 'delay' => null],
            ['project' => $p3, 'title' => 'Implement JWT authentication middleware', 'status' => 'done', 'priority' => 'high',
             'due' => '2026-03-15', 'assignees' => [$shreya->id], 'delay' => null],
            ['project' => $p2, 'title' => 'Mobile app navigation structure', 'status' => 'blocked', 'priority' => 'high',
             'due' => '2026-03-10', 'assignees' => [$karan->id], 'delay' => 'Blocked by dependency on design system tokens'],
            ['project' => $p3, 'title' => 'Set up Redis caching layer', 'status' => 'todo', 'priority' => 'medium',
             'due' => '2026-03-28', 'assignees' => [$ananya->id], 'delay' => null],
            ['project' => $p4, 'title' => 'Email campaign builder UI', 'status' => 'in_progress', 'priority' => 'medium',
             'due' => '2026-04-10', 'assignees' => [$neha->id], 'delay' => null],
            ['project' => $p1, 'title' => 'AI delay prediction model integration', 'status' => 'todo', 'priority' => 'high',
             'due' => '2026-03-25', 'assignees' => [$admin->id, $ananya->id], 'delay' => 'No recent activity – last update 72hrs ago'],
            ['project' => $p2, 'title' => 'Push notifications for mobile app', 'status' => 'todo', 'priority' => 'low',
             'due' => '2026-04-20', 'assignees' => [$karan->id], 'delay' => null],
            ['project' => $p3, 'title' => 'Database schema migration for v2', 'status' => 'in_progress', 'priority' => 'high',
             'due' => '2026-03-18', 'assignees' => [$shreya->id, $admin->id], 'delay' => 'High workload – user assigned to 5+ active tasks'],
            ['project' => $p4, 'title' => 'Analytics dashboard for campaigns', 'status' => 'blocked', 'priority' => 'medium',
             'due' => '2026-03-30', 'assignees' => [$arjun->id], 'delay' => 'Blocked by dependency – waiting for API v2'],
            ['project' => $p1, 'title' => 'Kanban board drag-and-drop feature', 'status' => 'done', 'priority' => 'high',
             'due' => '2026-03-12', 'assignees' => [$shreya->id, $neha->id], 'delay' => null],
        ];

        foreach ($tasks as $i => $t) {
            $task = $t['project']->tasks()->create([
                'created_by'      => $admin->id,
                'title'           => $t['title'],
                'status'          => $t['status'],
                'priority'        => $t['priority'],
                'due_date'        => $t['due'],
                'delay_reason'    => $t['delay'],
                'position'        => $i,
                'last_activity_at'=> now()->subHours(rand(2, 96)),
            ]);
            $task->assignees()->sync($t['assignees']);
        }

        // ── User Productivity Snapshots ────────────────────────
        $efficiencies = [92, 68, 84, 42, 88, 90, 78];
        foreach ($users as $idx => $user) {
            UserProductivity::create([
                'user_id'          => $user->id,
                'workspace_id'     => $workspace->id,
                'period_start'     => Carbon::now()->startOfWeek(),
                'period_end'       => Carbon::now()->endOfWeek(),
                'tasks_assigned'   => rand(10, 20),
                'tasks_completed'  => rand(5, 15),
                'tasks_overdue'    => rand(0, 4),
                'tasks_pending'    => rand(1, 5),
                'efficiency_score' => $efficiencies[$idx],
            ]);
        }

        $this->command->info('✅ VTcontroller seeded successfully!');
        $this->command->info('Login: priya@vtc.io / password (admin)');
        $this->command->info('Login: arjun@vtc.io / password (manager)');
    }
}

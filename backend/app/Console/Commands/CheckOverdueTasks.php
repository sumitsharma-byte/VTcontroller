<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Task;
use App\Models\TaskActivityLog;

class CheckOverdueTasks extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tasks:check-overdue';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for tasks that are overdue and update their status/delay reason';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $overdueTasks = Task::where('status', '!=', 'done')
            ->where('due_date', '<', now()->toDateString())
            ->get();

        $count = 0;
        foreach ($overdueTasks as $task) {
            // "If overdue -> change status" -> we mark them as blocked if not progressing, or simply recalculate delay reasons
            // But per specs, let's just force update delay reason and status
            $oldStatus = $task->status;
            
            // To ensure it's logged as an issue, we can change it to blocked if it's past due without activity
            $statusToSet = 'blocked'; 

            $task->update([
                'status' => $statusToSet,
                'delay_reason' => 'Missed deadline'
            ]);

            if ($oldStatus !== $statusToSet) {
                TaskActivityLog::create([
                    'task_id'     => $task->id,
                    'user_id'     => null, // System
                    'action'      => 'status.changed',
                    'from_status' => $oldStatus,
                    'to_status'   => $statusToSet,
                    'logged_at'   => now(),
                ]);
            }
            
            $task->project->recalculateCompletion();
            $task->project->recalculateRisk();
            $count++;
        }

        $this->info("Checked and updated {$count} overdue tasks.");
    }
}

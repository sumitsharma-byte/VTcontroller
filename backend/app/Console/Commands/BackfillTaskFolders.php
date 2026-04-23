<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Task;
use App\Models\ProjectFolder;

class BackfillTaskFolders extends Command
{
    protected $signature   = 'tasks:backfill-folders';
    protected $description = 'Assign folder_id to all tasks that have none, based on due_date or created_at month';

    public function handle(): int
    {
        $tasks = Task::whereNull('folder_id')->get();

        if ($tasks->isEmpty()) {
            $this->info('No tasks need backfilling.');
            return 0;
        }

        $count = 0;
        foreach ($tasks as $task) {
            $date  = $task->due_date ?? $task->created_at;
            $month = (int) $date->month;
            $year  = (int) $date->year;

            $folder = ProjectFolder::firstOrCreate(
                [
                    'project_id' => $task->project_id,
                    'month'      => $month,
                    'year'       => $year,
                ],
                [
                    'created_by' => $task->created_by,
                    'name'       => $date->format('F Y'),
                    'color'      => '#49769F',
                    'position'   => ProjectFolder::where('project_id', $task->project_id)->max('position') + 1,
                ]
            );

            $task->update(['folder_id' => $folder->id]);
            $this->line("Task {$task->id} → Folder {$folder->id} ({$folder->name}) [Project {$task->project_id}]");
            $count++;
        }

        $this->info("Done. Backfilled {$count} tasks.");
        return 0;
    }
}

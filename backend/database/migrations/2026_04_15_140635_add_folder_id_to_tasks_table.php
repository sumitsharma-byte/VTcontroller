<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add the column only if it doesn't already exist
        if (!Schema::hasColumn('tasks', 'folder_id')) {
            Schema::table('tasks', function (Blueprint $table) {
                $table->unsignedBigInteger('folder_id')->nullable()->after('project_id');
                $table->foreign('folder_id')->references('id')->on('project_folders')->nullOnDelete();
            });
        }

        // 2. Backfill — assign every task to the correct month folder
        $tasks = DB::table('tasks')->whereNull('folder_id')->get();

        foreach ($tasks as $task) {
            $date  = $task->due_date
                ? Carbon::parse($task->due_date)
                : Carbon::parse($task->created_at);

            $month = (int) $date->month;
            $year  = (int) $date->year;

            // Find existing folder or create one
            $folder = DB::table('project_folders')
                ->where('project_id', $task->project_id)
                ->where('month', $month)
                ->where('year',  $year)
                ->first();

            if (!$folder) {
                $folderId = DB::table('project_folders')->insertGetId([
                    'project_id'  => $task->project_id,
                    'created_by'  => $task->created_by,
                    'name'        => $date->format('F Y'),
                    'month'       => $month,
                    'year'        => $year,
                    'color'       => '#49769F',
                    'position'    => DB::table('project_folders')
                                        ->where('project_id', $task->project_id)
                                        ->max('position') + 1,
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ]);
            } else {
                $folderId = $folder->id;
            }

            DB::table('tasks')->where('id', $task->id)->update(['folder_id' => $folderId]);
        }
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropForeign(['folder_id']);
            $table->dropColumn('folder_id');
        });
    }
};


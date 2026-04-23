<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('tasks:check-overdue', function () {
    $this->call('tasks:check-overdue');
})->purpose('Check and update overdue tasks')->daily();

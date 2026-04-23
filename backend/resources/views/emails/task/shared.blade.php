@component('mail::message')
# Task Shared with You

Hello,

**{{ $sender->name }}** has shared a task from VTcontroller with you.

**Task Title:** {{ $task->title }}
**Priority:** {{ ucfirst($task->priority) }}
**Status:** {{ str_replace('_', ' ', ucfirst($task->status)) }}

@if($task->description)
**Description:**
{{ $task->description }}
@endif

@if($task->due_date)
**Due Date:** {{ $task->due_date->format('M d, Y') }}
@endif

@component('mail::button', ['url' => config('app.frontend_url') . '/board'])
View Task on Board
@endcomponent

Thanks,<br>
{{ config('app.name') }}
@endcomponent

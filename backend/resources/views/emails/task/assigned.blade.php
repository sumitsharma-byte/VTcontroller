<x-mail::message>
# Hi {{ $assignee->name }},

You have been assigned a new task by **{{ $assigner->name }}** in VTcontroller.

**Task details:**
- **Project:** {{ $task->project->name }}
- **Title:** {{ $task->title }}
- **Priority:** {{ ucfirst($task->priority) }}
- **Due Date:** {{ $task->due_date ? \Carbon\Carbon::parse($task->due_date)->format('M d, Y') : 'No due date' }}

<x-mail::button :url="config('app.frontend_url') . '/board?project=' . $task->project_id">
View Board & Task
</x-mail::button>

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
